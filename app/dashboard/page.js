import { Suspense } from "react";
import LinkInspector from "@/components/LinkInspector";
import styles from "@/app/dashboard/page.module.css";

export const metadata = {
  title: "Downloader",
  description: "Paste a public media link, inspect the available formats, and download the version you want."
};

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <LinkInspector />
      </Suspense>
    </div>
  );
}
