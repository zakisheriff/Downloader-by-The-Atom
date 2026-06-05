import styles from "@/components/GlassCard.module.css";

export default function GlassCard({ className = "", children, ...props }) {
  return <div className={`${styles.card} ${className}`.trim()} {...props}>{children}</div>;
}
