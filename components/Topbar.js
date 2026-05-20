"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
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
};

export default function Topbar({ onMenuOpen }) {
  const pathname = usePathname();
  const current = titles[pathname] || {
    title: "Downloader by The Atom",
    description: "A cleaner savefrom-style media downloader."
  };

  return (
    <div className={styles.topbar}>
      <button
        className={styles.mobileMenuButton}
        onClick={onMenuOpen}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div className={styles.titleBlock}>
        <strong>{current.title}</strong>
        <span>{current.description}</span>
      </div>
    </div>
  );
}
