import GlassCard from "@/components/GlassCard";
import styles from "@/components/EmptyState.module.css";

export default function EmptyState({ title, description }) {
  return (
    <GlassCard className={styles.card}>
      <h3>{title}</h3>
      <p>{description}</p>
    </GlassCard>
  );
}
