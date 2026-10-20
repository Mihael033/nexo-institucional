import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ogImages, SITE_URL } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// Fuentes de acento: sin preload para no competir con el LCP (se cargan al usarse).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nexo Institucional · Conectamos instituciones con soluciones",
    template: "%s · Nexo Institucional",
  },
  description: "Proveemos productos y bienes para instituciones públicas y privadas de Bolivia.",
  applicationName: "Nexo Institucional",
  openGraph: { type: "website", locale: "es_BO", siteName: "Nexo Institucional", images: ogImages() },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
};

/** Layout raíz compartido por el sitio público `(public)` y el panel `(admin)`. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-BO"
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
