import "./globals.css";
import RouteShell from "@/components/RouteShell";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { DepthModeProvider } from "@/components/providers/DepthModeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { Analytics } from "@vercel/analytics/next";
import "@zakisheriff/liquid-glass/styles.css";

const siteUrl = "https://downloader.theatom.lk";
const siteTitle = "Downloader by The Atom — Free YouTube, Instagram & TikTok Video Downloader";
const siteDescription = "The fastest free video downloader. Download YouTube videos in 4K, Instagram Reels, TikTok clips, X/Twitter posts and more — no sign‑up, no ads. Choose MP4, WEBM or MP3 quality instantly.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Downloader by The Atom",
  title: {
    default: siteTitle,
    template: `%s | Downloader by The Atom`
  },
  description: siteDescription,
  keywords: [
    // Brand
    "Downloader by The Atom",
    "The Atom downloader",
    "theatom downloader",
    "downloader theatom lk",
    "Sri Lanka video downloader",
    "best free video downloader",
    // YouTube
    "YouTube video downloader",
    "YouTube 4K downloader",
    "YouTube MP3 downloader",
    "YouTube video downloader free",
    "YouTube video downloader free Sri Lanka",
     "download YouTube video 4K",
    "YouTube to MP4",
    "YouTube to MP3",
    "YouTube 1080p downloader",
    "YouTube downloader free",
    "download YouTube video 4K",
    "YouTube to MP4",
    "YouTube to MP3",
    "YouTube 1080p downloader",
    "download YouTube shorts",
    "yt downloader",
    // Instagram
    "Instagram Reel downloader",
    "Instagram video downloader",
    "download Instagram Reels",
    "save Instagram video",
    "Instagram downloader online",
    // TikTok
    "TikTok video downloader",
    "download TikTok without watermark",
    "TikTok downloader free",
    // Other platforms
    "Twitter video downloader",
    "X video downloader",
    "Facebook video downloader",
    // Generic
    "free video downloader online",
    "save video from link",
    "online video downloader no ads",
    "video downloader no signup",
    "download video from URL",
    "best free video downloader 2024",
    "best free video downloader 2025",
    "social media video downloader"
  ],
  authors: [{ name: "The Atom", url: "https://theatom.lk" }],
  creator: "The Atom",
  publisher: "The Atom",
  category: "technology",
  classification: "Video Downloader Tool",
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
    siteName: "Downloader by The Atom",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
    images: [
      {
        url: "/Logo.png",
        width: 1200,
        height: 630,
        alt: "Downloader by The Atom — Free video downloader for YouTube, Instagram, TikTok and more"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@theoneatom",
    images: ["/Logo.png"]
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  verification: {
    // Add your Google Search Console verification token here when you have it
    // google: "your-google-verification-token"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f1",
  colorScheme: "light"
};

// JSON-LD Structured Data — WebApplication + FAQPage schema
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      "name": "Downloader by The Atom",
      "url": siteUrl,
      "description": siteDescription,
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Any modern browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "YouTube 4K video download",
        "Instagram Reel download",
        "TikTok video download",
        "Twitter/X video download",
        "Facebook video download",
        "MP4 MP3 WEBM M4A format support",
        "No account required",
        "No ads"
      ],
      "creator": {
        "@type": "Person",
        "name": "The Atom",
        "url": "https://theatom.lk"
      }
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Downloader by The Atom",
      "description": siteDescription,
      "publisher": {
        "@type": "Person",
        "name": "The Atom"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteUrl}/dashboard?url={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I download a YouTube video for free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Paste your YouTube video link into Downloader by The Atom, click Find Media, then choose your preferred quality (up to 4K MP4) and click Download. No account or app needed."
          }
        },
        {
          "@type": "Question",
          "name": "Can I download Instagram Reels with this tool?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Paste the Instagram Reel or post URL into the input box on Downloader by The Atom and select the MP4 quality you want. Public Reels are supported directly."
          }
        },
        {
          "@type": "Question",
          "name": "Is this YouTube downloader free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Downloader by The Atom is completely free. No subscription, no sign-up, and no ads."
          }
        },
        {
          "@type": "Question",
          "name": "What video qualities can I download from YouTube?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Downloader by The Atom supports YouTube downloads from 144p all the way up to 4K (2160p) in MP4 and WEBM formats. Audio can be downloaded as MP3, M4A, or WEBM audio."
          }
        },
        {
          "@type": "Question",
          "name": "Can I download TikTok videos without a watermark?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Paste any public TikTok video link into Downloader by The Atom. The tool fetches the original source file which typically does not carry the in-app watermark."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ToastProvider>
          <DepthModeProvider>
            <SmoothScrollProvider>
              <RouteShell>{children}</RouteShell>
            </SmoothScrollProvider>
          </DepthModeProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
