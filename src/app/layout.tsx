import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "AIbooking Clinic – AI receptionist for clinics, salons & therapists",
    template: "%s · AIbooking Clinic",
  },
  description:
    "AIbooking answers every call and every website visitor – books, rebooks and cancels appointments, explains prices and insurance, straight into your clinic's calendar.",
  openGraph: {
    title: "AIbooking Clinic – Your AI receptionist",
    description: "Your clinic answers every call – even when you're with a client.",
    locale: "en_GB",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#07110f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
