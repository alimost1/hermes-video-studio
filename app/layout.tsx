import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hermes Studio — Stories in motion",
  description:
    "Turn a website into an animated video with Hermes, ElevenLabs, and Remotion.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
