import "./globals.css";
import RouteShell from "@/components/RouteShell";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const siteUrl = "https://fetch.theatom.lk";
const siteTitle = "Downloader by The Atom";
const siteDescription = "Free video and post downloader for YouTube, Instagram, TikTok, X, and more. Paste a link, choose a format, and save it cleanly.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteTitle,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`
  },
  description: siteDescription,
  keywords: [
    "Downloader by The Atom",
    "video downloader",
    "YouTube downloader",
    "Instagram downloader",
    "TikTok downloader",
    "Twitter downloader",
    "X downloader",
    "save video from link",
    "fetch.theatom.lk"
  ],
  authors: [{ name: "The Atom" }],
  creator: "The Atom",
  publisher: "The Atom",
  category: "technology",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/Logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: ["/Logo.png"],
    apple: [{ url: "/apple-icon.png", sizes: "512x512", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/Logo.png",
        width: 1200,
        height: 1200,
        alt: `${siteTitle} logo`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/Logo.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f1",
  colorScheme: "light"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <SmoothScrollProvider>
            <RouteShell>{children}</RouteShell>
          </SmoothScrollProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
