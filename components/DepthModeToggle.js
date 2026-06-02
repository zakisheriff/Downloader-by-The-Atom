"use client";

import { Layers3, Minus } from "lucide-react";
import { GlassButton } from "@zakisheriff/liquid-glass";
import { useDepthMode } from "@/components/providers/DepthModeProvider";
import styles from "@/components/DepthModeToggle.module.css";

export default function DepthModeToggle({ variant = "floating" }) {
  const { is3d, toggleMode } = useDepthMode();

  return (
    <GlassButton
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleMode();
      }}
      className={`${styles.toggleGlass} ${styles[variant] || ""}`.trim()}
      intensity={is3d ? 6 : 2}
      variant={is3d ? "default" : "ghost"}
      size="lg"
      style={{
        width: variant === "sidebar" ? "100%" : "auto",
        justifyContent: "flex-start",
        gap: "10px"
      }}
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
    </GlassButton>
  );
}
