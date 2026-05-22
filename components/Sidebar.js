"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, SlidersHorizontal, BookOpen, X, Coffee } from "lucide-react";
import styles from "@/components/Sidebar.module.css";

const navigation = [
  { label: "Downloader", href: "/dashboard", icon: Download },
  { label: "How it works", href: "/blog", icon: BookOpen },

];

export default function Sidebar({ mobileOpen, onClose, hideDesktop = false }) {
  const pathname = usePathname();

  const content = (
    <div className={styles.sidebar}>
      <div className={styles.logoRow}>
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoCopy}>
            <strong>Downloader by The Atom</strong>
            <small>downloader.theatom.lk</small>
          </div>
        </Link>
        <button
          className={styles.closeMobile}
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className={styles.nav}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${active ? styles.active : ""}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span className={styles.linkLabel}>{item.label}</span>
            </Link>
          );
        })}
        <a
          href="https://buymeacoffee.com/theoneatom"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.coffeeLink}
          onClick={onClose}
          aria-label="Buy The Atom a coffee"
        >
          <Coffee size={16} />
          <span className={styles.linkLabel}>Buy me a coffee</span>
        </a>
      </nav>

      
    </div>
  );

  return (
    <>
      {!hideDesktop ? (
        <aside className={styles.desktop}>{content}</aside>
      ) : null}
      {mobileOpen ? (
        <div className={styles.mobileWrap}>
          <button
            className={styles.backdrop}
            onClick={onClose}
            aria-label="Close sidebar"
          />
          <div className={styles.mobile}>{content}</div>
        </div>
      ) : null}
    </>
  );
}
