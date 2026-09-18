import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Browser",
  description: "Browser.lol-style remote browser MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
