import { DownloadCloud, HardDrive, Server, Wrench } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import styles from "@/app/settings/page.module.css";

const requirements = [
  {
    icon: Server,
    title: "Persistent Node host",
    copy: "This app needs a real Node server or VPS. It is not meant for serverless deployments if you want reliable downloads."
  },
  {
    icon: Wrench,
    title: "yt-dlp + ffmpeg installed",
    copy: "The runtime expects yt-dlp to be available on the host, and ffmpeg helps when platforms need media handling beyond a single direct file."
  },
  {
    icon: HardDrive,
    title: "Temporary server disk",
    copy: "Direct downloads stream to the browser, but the host still needs enough runtime room for yt-dlp and any platform-level media handling."
  },
  {
    icon: DownloadCloud,
    title: "Public content only",
    copy: "Links work best when the source is public and the server has permission to fetch the media without an authenticated browser session."
  }
];

export const metadata = {
  title: "Server setup",
  description: "Production notes for running Downloader by The Atom correctly with yt-dlp and a persistent Node environment."
};

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className="eyebrow">Production setup</span>
        <h1>What this app needs under the hood</h1>
        <p>The interface is intentionally simple for users. This page is where the honest server requirements live.</p>
      </div>

      <div className={styles.grid}>
        {requirements.map((item) => {
          const Icon = item.icon;

          return (
            <GlassCard key={item.title} className={styles.card}>
              <div className={styles.iconWrap}>
                <Icon size={18} />
              </div>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className={styles.codeCard}>
        <h2>Recommended server commands</h2>
        <pre>{`sudo apt update
sudo apt install -y ffmpeg python3 python3-pip
sudo pip3 install -U yt-dlp

npm install
npm run build
npm start`}</pre>
      </GlassCard>
    </div>
  );
}
