import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estat del pagament",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: "/success" },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
