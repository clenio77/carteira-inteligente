import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://carteira.app'),
  title: {
    default: "Carteira Inteligente",
    template: "%s | Carteira Inteligente",
  },
  description: "Consolide e gerencie seus investimentos com o poder da Inteligência Artificial",
  manifest: "/manifest.json",
  keywords: ["investimentos", "carteira", "ações", "FIIs", "renda fixa", "inteligência artificial", "finanças"],
  authors: [{ name: "Clenio Consultory" }],
  creator: "Clenio Consultory",
  publisher: "Clenio Consultory",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/safari-pinned-tab.svg",
        color: "#16a34a",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Carteira",
    startupImage: [
      {
        url: "/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1170-2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Carteira Inteligente",
    title: "Carteira Inteligente",
    description: "Consolide e gerencie seus investimentos com o poder da Inteligência Artificial",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Carteira Inteligente - Seus investimentos em um só lugar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Carteira Inteligente",
    description: "Consolide e gerencie seus investimentos com IA",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

