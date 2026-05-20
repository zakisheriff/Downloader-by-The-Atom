import Link from "next/link";
import styles from "@/app/not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className="eyebrow">404</span>
        <h1>That route isn&apos;t in this fetch flow</h1>
        <p>The page you want is missing, but the downloader is still ready for the next link.</p>
        <Link href="/dashboard">Open downloader</Link>
      </div>
    </main>
  );
}
