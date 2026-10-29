// A scheduler (including Hermes cron) can invoke this deterministic command.
const url = process.argv[2];
if (!url)
  throw new Error("Usage: npm run submit -- https://example.com/article");
if (!process.env.STUDIO_TOKEN) throw new Error("STUDIO_TOKEN is required.");
const response = await fetch(
  `${process.env.STUDIO_URL || "http://127.0.0.1:3000"}/api/projects`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STUDIO_TOKEN}`,
    },
    body: JSON.stringify({
      url,
      brand: process.env.VIDEO_BRAND || "My Studio",
      language: process.env.VIDEO_LANGUAGE || "darija",
      duration: 60,
      autoRender: true,
    }),
  },
);
const result = await response.json();
if (!response.ok) throw new Error(result.error);
console.log(JSON.stringify({ id: result.id, status: result.status }));

export {};
