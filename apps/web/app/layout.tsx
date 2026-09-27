import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BiblioTech Health — All your priors. One intelligence.",
  description:
    "An evidence-linked health brief from a completely synthetic longitudinal record.",
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
