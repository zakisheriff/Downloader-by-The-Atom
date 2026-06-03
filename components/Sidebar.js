"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, SlidersHorizontal, BookOpen, X, Coffee } from "lucide-react";
import { GlassButton } from "@zakisheriff/liquid-glass";
import styles from "@/components/Sidebar.module.css";

const navigation = [
  { label: "Downloader", href: "/dashboard", icon: Download },
  { label: "How it works", href: "/blog", icon: BookOpen },
];

export default function Sidebar({ mobileOpen, onClose, hideDesktop = false }) {
  const pathname = usePathname();
  const router = useRouter();

  const content = (
    <div className={styles.sidebar}>
      <div className={styles.logoRow}>
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoCopy}>
            <strong>Go Home</strong>
            <small>downloader.theatom.lk</small>
          </div>
        </Link>
        <GlassButton
          className={styles.closeMobileGlass}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          size="md"
          intensity={6}
          aria-label="Close menu"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            padding: 0
          }}
        >
          <X size={18} />
        </GlassButton>
      </div>

      <nav className={styles.nav}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <GlassButton
              key={item.href}
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
                router.push(item.href);
              }}
              size="lg"
              variant={active ? "default" : "ghost"}
              intensity={active ? 6 : 2}
              className={`${styles.linkGlass} ${active ? styles.active : ""}`}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                gap: "12px"
              }}
            >
              <Icon size={18} />
              <span className={styles.linkLabel}>{item.label}</span>
            </GlassButton>
          );
        })}
        <GlassButton
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
            window.open("https://buymeacoffee.com/theoneatom", "_blank", "noopener,noreferrer");
          }}
          size="lg"
          intensity={6}
          className={styles.coffeeLinkGlass}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            gap: "12px"
          }}
          aria-label="Buy The Atom a coffee"
        >
          <Coffee size={16} />
          <span className={styles.linkLabel}>Buy me a coffee</span>
        </GlassButton>
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
