import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BiblioTech Health — All your priors. One intelligence.",
  description:
    "BiblioTech connects your medical history across specialties and turns it into evidence-grounded intelligence you can inspect, correct, and carry with you.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
