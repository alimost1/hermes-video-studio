import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";
import ipaddr from "ipaddr.js";

export function publicAddress(address: string): boolean {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}

export function validateUrl(raw: string): URL {
  const u = new URL(raw);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw new Error(
      "Only public HTTP(S) URLs on standard ports are supported.",
    );
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new Error("Private network URLs are not allowed.");
  return u;
}

// Pin the validated DNS address for the actual connection to prevent DNS rebinding.
export async function safeFetch(
  raw: string,
  maxBytes = 3_000_000,
  redirects = 0,
): Promise<{ body: Buffer; contentType: string; url: string }> {
  if (redirects > 4) throw new Error("Too many redirects.");
  const u = validateUrl(raw),
    host = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = await dns.lookup(host, { all: true });
  console.log('[safeFetch] DNS addresses:', JSON.stringify(addresses));
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("URL resolves to a private or reserved network.");
  const pinned = addresses[0];
  console.log('[safeFetch] Pinned:', pinned);
  console.log('[safeFetch] Creating HTTP request to:', u.href);
  return new Promise((resolve, reject) => {
    const lookupFn = (_hostname: string, _options: any, callback: any) => {
      console.log('[safeFetch] lookup callback invoked, pinned:', JSON.stringify(pinned), 'all:', _options.all);
      if (!pinned || !pinned.address) {
        console.error('[safeFetch] ERROR: pinned is invalid:', pinned);
        return callback(new Error('Pinned address is invalid'));
      }
      console.log('[safeFetch] Calling callback with:', pinned.address, pinned.family);
      if (_options.all) {
        callback(null, [{ address: pinned.address, family: pinned.family }], pinned.family);
      } else {
        callback(null, pinned.address, pinned.family);
      }
    };
    const request = (u.protocol === "https:" ? https : http).get(
      u,
      {
        lookup: lookupFn,
        headers: {
          "User-Agent": "HermesVideoStudio/1.0",
          Accept: "text/html,image/*;q=0.9,*/*;q=0.5",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          safeFetch(
            new URL(res.headers.location, u).href,
            maxBytes,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Source returned HTTP ${res.statusCode}.`));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(
              new Error("Source exceeds the download size limit."),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(res.headers["content-type"] || ""),
            url: u.href,
          }),
        );
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("Source request timed out.")),
      20000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });
}