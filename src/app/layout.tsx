import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Noto_Sans_Arabic } from "next/font/google";
import { LOCALE_LABEL } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: t("AIbooking Clinic – AI receptionist for clinics, salons & therapists"),
      template: "%s · AIbooking Clinic",
    },
    description: t("AIbooking answers every call and every website visitor – books, rebooks and cancels appointments, explains prices and insurance, straight into your clinic's calendar."),
    openGraph: {
      title: t("AIbooking Clinic – Your AI receptionist"),
      description: t("Your clinic answers every call – even when you're with a client."),
      locale: LOCALE_LABEL[locale].bcp47.split("-u-")[0].replace("-", "_"),
      type: "website",
    },
  };
}

export const viewport: Viewport = { themeColor: "#07110f", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale} dir={LOCALE_LABEL[locale].dir} className={`${inter.variable} ${fraunces.variable} ${arabic.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
