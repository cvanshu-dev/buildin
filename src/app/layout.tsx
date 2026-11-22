import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Buildin — Creator partnerships, made clear", template: "%s | Buildin" },
  description: "A clearer way for brands to find talent, launch campaigns and manage creator partnerships from one workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
