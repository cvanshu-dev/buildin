import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Marketplace",
  description: "A platform connecting brands with creators, influencers and models."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
