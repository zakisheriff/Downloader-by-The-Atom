"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, SlidersHorizontal, X } from "lucide-react";
import styles from "@/components/Sidebar.module.css";

const navigation = [
  { label: "Downloader", href: "/dashboard", icon: Download },
  { label: "Setup", href: "/settings", icon: SlidersHorizontal },
];

export default function Sidebar({ mobileOpen, onClose, hideDesktop = false }) {
  const pathname = usePathname();

  const content = (
    <div className={styles.sidebar}>
      <div className={styles.logoRow}>
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoCopy}>
            <strong>Downloader by The Atom</strong>
            <small>fetch.theatom.lk</small>
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
