"use client";

import { Layers3, Minus } from "lucide-react";
import { useDepthMode } from "@/components/providers/DepthModeProvider";
import styles from "@/components/DepthModeToggle.module.css";

export default function DepthModeToggle({ variant = "floating" }) {
  const { is3d, toggleMode } = useDepthMode();

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`${styles.toggle} ${styles[variant] || ""}`.trim()}
      aria-pressed={is3d}
      aria-label={is3d ? "Turn off 3D mode" : "Turn on 3D mode"}
      title={is3d ? "Turn off 3D mode" : "Turn on 3D mode"}
    >
      <span className={styles.iconWrap}>
        {is3d ? <Layers3 size={15} /> : <Minus size={15} />}
      </span>
      <span className={styles.copy}>
        <strong>3D</strong>
        <small>{is3d ? "On" : "Off"}</small>
      </span>
    </button>
  );
}
