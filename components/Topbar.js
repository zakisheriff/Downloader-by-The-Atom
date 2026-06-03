"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { GlassButton } from "@zakisheriff/liquid-glass";
import styles from "@/components/Topbar.module.css";

const titles = {
  "/dashboard": {
    title: "Paste a link",
    description: "Inspect a public media URL and pick the format you want."
  },
  "/settings": {
    title: "Server setup",
    description: "What this app needs in production to fetch files correctly."
  },
  "/blog": {
    title: "How it works",
    description: "Guides on downloading from Social Media"
  }
};

// Buy Me a Coffee icon
const CoffeeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ display: "block", flexShrink: 0 }}>
    <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
  </svg>
);

export default function Topbar({ onMenuOpen }) {
  const pathname = usePathname();
  const current = (() => {
    if (titles[pathname]) return titles[pathname];
    if (pathname?.startsWith("/blog")) return titles["/blog"];
    return {
      title: "Downloader by The Atom",
      description: "A cleaner savefrom-style media downloader."
    };
  })();

  return (
    <div className={styles.topbar}>
      <GlassButton
        className={styles.mobileMenuButtonGlass}
        onClick={(e) => {
          e.stopPropagation();
          onMenuOpen();
        }}
        size="md"
        intensity={6}
        aria-label="Open menu"
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "35px",
          padding: 0
        }}
      >
        <Menu size={18} />
      </GlassButton>

      <div className={styles.titleBlock}>
        <strong>{current.title}</strong>
        <span>{current.description}</span>
      </div>

      <nav className={styles.actions}>
        <GlassButton
          onClick={(e) => {
            e.stopPropagation();
            window.open("https://buymeacoffee.com/theoneatom", "_blank", "noopener,noreferrer");
          }}
          size="md"
          intensity={6}
          className={styles.coffeeBtnGlass}
          aria-label="Buy The Atom a coffee"
        >
          <CoffeeIcon />
          <span>Buy me a coffee</span>
        </GlassButton>
      </nav>
    </div>
  );
}
