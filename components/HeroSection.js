"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clipboard, Copy, Instagram, Link2, X } from "lucide-react";
import styles from "@/components/HeroSection.module.css";
import { useGlassEffect, GlassButton, LiquidGlassFilter } from "@zakisheriff/liquid-glass";
import { isValidSourceUrl } from "@/utils/helpers";

// Official YouTube Brand Icon (Red play shape + white triangle)
const YouTubeIcon = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ display: "block" }}
  >
    <path
      d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z"
      fill="#FF0000"
    />
    <path d="M9.545 15.568V8.432L15.818 12z" fill="#FFFFFF" />
  </svg>
);

// Official Instagram Brand Icon with gradient path
const InstagramIcon = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ display: "block" }}
  >
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      fill="url(#instagram-gradient)"
    />
  </svg>
);

// Official TikTok Brand Icon with cyan and magenta offset lines
const TikTokIcon = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ display: "block" }}
  >
    <g transform="translate(1, 1)">
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.27 6.27 0 0 0-3.1-.3A6.35 6.35 0 0 0 3 15.46a6.35 6.35 0 0 0 10.93 4.77 6.18 6.18 0 0 0 1.9-4.77V7.82a9.16 9.16 0 0 0 3.76 1.76V6.69z"
        fill="#25F4EE"
        transform="translate(-0.6, -0.6)"
      />
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.27 6.27 0 0 0-3.1-.3A6.35 6.35 0 0 0 3 15.46a6.35 6.35 0 0 0 10.93 4.77 6.18 6.18 0 0 0 1.9-4.77V7.82a9.16 9.16 0 0 0 3.76 1.76V6.69z"
        fill="#FE2C55"
        transform="translate(0.6, 0.6)"
      />
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.27 6.27 0 0 0-3.1-.3A6.35 6.35 0 0 0 3 15.46a6.35 6.35 0 0 0 10.93 4.77 6.18 6.18 0 0 0 1.9-4.77V7.82a9.16 9.16 0 0 0 3.76 1.76V6.69z"
        fill="currentColor"
      />
    </g>
  </svg>
);

// Official X Brand Icon (Modern letter glyph)
const XIcon = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    style={{ display: "block" }}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Official Facebook Brand Icon (Blue background with white f)
const FacebookIcon = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    style={{ display: "block" }}
  >
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      d="M14 20h-3v-8H9.5V9h1.5V7.5C11 5.5 12.3 4 14.5 4c.9 0 1.7.1 1.7.1V7h-1.3c-.9 0-1.1.4-1.1 1v1h2.5l-.3 3h-2.2v8z"
      fill="#FFFFFF"
    />
  </svg>
);

// Coffee icon (inline SVG)
const CoffeeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ display: "block", flexShrink: 0 }}>
    <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
  </svg>
);

function CustomGlassInputCard({ children, className, style: externalStyle, ...props }) {
  const { style: glassStyle } = useGlassEffect({
    intensity: 6,
    shimmer: true,
    thickness: 1
  });

  return (
    <div
      data-liquid-glass
      style={{ ...glassStyle, ...externalStyle }}
      className={`${className} lg-root lg-card`}
      {...props}
    >
      <div className="lg-backdrop-surface" aria-hidden="true" />
      <div className="lg-shadow" aria-hidden="true" />
      <div className="lg-surface">
        <div className={`${styles.inputCardContent} lg-content`}>
          {children}
        </div>
      </div>
    </div>
  );
}

const supportedApps = [
  { label: "YouTube", icon: YouTubeIcon, size: 18 },
  { label: "Instagram", icon: InstagramIcon, size: 18 },
  { label: "TikTok", icon: TikTokIcon, size: 18 },
  { label: "X", icon: XIcon, size: 15 },
  { label: "Facebook", icon: FacebookIcon, size: 18 }
];

export default function HeroSection() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const [isLocalhost, setIsLocalhost] = useState(true);
  const [terminalCopied, setTerminalCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const local = hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname.startsWith("192.168.");
      setIsLocalhost(local);
    }
  }, []);

  const handleCopyTerminal = async () => {
    const text = `git clone https://github.com/zakisheriff/Downloader-by-The-Atom.git\ncd Downloader-by-The-Atom\nnpm install\nnpm run dev`;
    try {
      await navigator.clipboard.writeText(text);
      setTerminalCopied(true);
      setTimeout(() => setTerminalCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainerClick = (e) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      inputRef.current?.focus();
    }
  };

  const handleStart = () => {
    if (!input.trim()) return;
    router.push(`/dashboard?url=${encodeURIComponent(input.trim())}`);
  };

  const handleCopy = async () => {
    if (!input.trim()) return;
    try {
      await navigator.clipboard.writeText(input.trim());
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmedText = (text || "").trim();
      if (trimmedText) {
        setInput(trimmedText);
        router.push(`/dashboard?url=${encodeURIComponent(trimmedText)}`);
      }
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const handleClear = () => setInput("");

  return (
    <LiquidGlassFilter>
      <section className={styles.hero}>
      {/* Top nav bar on the landing page */}
      <nav className={styles.topNav}>
        <div className={styles.topNavActions}>
          <GlassButton
            onClick={(e) => {
              e.stopPropagation();
              router.push("/instagram-comments");
            }}
            size="md"
            intensity={6}
            className={styles.topNavLinkGlass}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Instagram size={16} />
            Comments
          </GlassButton>
          <GlassButton
            onClick={(e) => {
              e.stopPropagation();
              window.open("https://buymeacoffee.com/theoneatom", "_blank", "noopener,noreferrer");
            }}
            size="md"
            intensity={6}
            className={styles.topNavCoffeeGlass}
            aria-label="Buy The Atom a coffee"
          >
            <CoffeeIcon />
            <span className={styles.coffeeText}>Support</span>
          </GlassButton>
        </div>
      </nav>

      <div className={styles.glow} />
      <div className={styles.content} style={!isLocalhost ? { paddingTop: "70px", paddingBottom: "30px" } : {}}>
        <h1 className={styles.title}>{isLocalhost ? "Paste the link." : "Run Downloader Locally."}</h1>

        {isLocalhost ? (
          <CustomGlassInputCard className={styles.inputCard} onClick={handleContainerClick}>
            <div className={styles.inputWrap}>
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Paste https://youtube.com/... or any supported public link"
              />
              {input ? (
                <>
                  <GlassButton
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    title={copied ? "Copied!" : "Copy link"}
                    aria-label="Copy link"
                    type="button"
                    variant="ghost"
                    intensity={4}
                    size="sm"
                    style={{ minWidth: "32px", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </GlassButton>
                  <GlassButton
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    title="Clear"
                    aria-label="Clear input"
                    type="button"
                    variant="ghost"
                    intensity={4}
                    size="sm"
                    style={{ minWidth: "32px", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                  >
                    <X size={14} />
                  </GlassButton>
                </>
              ) : (
                <GlassButton
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePaste();
                  }}
                  title="Paste from clipboard"
                  aria-label="Paste from clipboard"
                  type="button"
                  variant="ghost"
                  intensity={4}
                  size="sm"
                  style={{ minWidth: "32px", width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
                >
                  <Clipboard size={14} />
                </GlassButton>
              )}
            </div>
            <GlassButton
              onClick={(e) => {
                e.stopPropagation();
                handleStart();
              }}
              disabled={!input.trim()}
              className={styles.startBtn}
              size="lg"
              intensity={6}
            >
              Find media
            </GlassButton>
          </CustomGlassInputCard>
        ) : (
          <CustomGlassInputCard className={styles.inputCard} style={{ maxWidth: "620px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 12px", textAlign: "center", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", background: "rgba(217, 59, 59, 0.12)", border: "1px solid rgba(217, 59, 59, 0.3)", color: "var(--danger)", marginBottom: "8px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h2 style={{ fontSize: "1.45rem", fontWeight: "700", color: "var(--text)", margin: 0 }}>Backend Service Offline</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.98rem", lineHeight: "1.6", margin: 0, maxWidth: "480px" }}>
                Our Hugging Face backend space has been flagged, making hosted downloads temporarily unavailable.
              </p>
              <p style={{ color: "var(--danger)", fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>
                However, you can run Downloader perfectly on your localhost!
              </p>
              <div style={{ width: "100%", height: "1px", background: "var(--stroke)", margin: "8px 0" }} />
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "600" }}>Run these simple commands to host it locally:</span>
                
                {/* macOS Terminal style container */}
                <div style={{
                  width: "100%",
                  maxWidth: "460px",
                  background: "#18181b",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textAlign: "left",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.82rem",
                  margin: "8px 0"
                }}>
                  {/* macOS Terminal Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#27272a",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    userSelect: "none"
                  }}>
                    {/* Window Controls */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                    </div>
                    {/* Shell Title */}
                    <span style={{ color: "#a1a1aa", fontSize: "0.75rem", fontWeight: "600" }}>zsh</span>
                    {/* Copy button */}
                    <button
                      onClick={handleCopyTerminal}
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: terminalCopied ? "#34d399" : "#a1a1aa",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        outline: "none",
                        transition: "all 0.15s ease"
                      }}
                      title="Copy code to clipboard"
                    >
                      {terminalCopied ? (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* macOS Terminal Body */}
                  <div style={{
                    padding: "16px 20px",
                    color: "#f4f4f5",
                    lineHeight: "1.6",
                    overflowX: "auto",
                    whiteSpace: "pre"
                  }}>
                    <span style={{ color: "#34d399" }}>$</span> git clone https://github.com/zakisheriff/Downloader-by-The-Atom.git<br />
                    <span style={{ color: "#34d399" }}>$</span> cd Downloader-by-The-Atom<br />
                    <span style={{ color: "#34d399" }}>$</span> npm install<br />
                    <span style={{ color: "#34d399" }}>$</span> npm run dev
                  </div>
                </div>
              </div>

              <GlassButton
                onClick={(e) => {
                  e.stopPropagation();
                  window.open("https://github.com/zakisheriff/Downloader-by-The-Atom", "_blank", "noopener,noreferrer");
                }}
                size="lg"
                intensity={8}
                style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "10px", width: "100%", maxWidth: "280px", justifyContent: "center" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                View Setup on GitHub
              </GlassButton>
            </div>
          </CustomGlassInputCard>
        )}

        <div className={styles.appRow} aria-label="Supported platforms">
          {supportedApps.map((app) => {
            const Icon = app.icon;

            return (
              <GlassButton
                key={app.label}
                className={styles.appBadge}
                title={app.label}
                intensity={4}
                style={{
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%"
                }}
              >
                {Icon ? <Icon size={app.size} /> : null}
              </GlassButton>
            );
          })}
        </div>
      </div>
      </section>
    </LiquidGlassFilter>
  );
}
