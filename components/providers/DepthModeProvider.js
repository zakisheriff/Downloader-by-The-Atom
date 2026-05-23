"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DepthModeContext = createContext(null);

export function DepthModeProvider({ children }) {
  const [mode, setMode] = useState("flat");

  useEffect(() => {
    document.documentElement.dataset.depthMode = mode;
  }, [mode]);

  const toggleMode = () => {
    setMode((current) => (current === "3d" ? "flat" : "3d"));
  };

  const value = useMemo(() => ({
    mode,
    is3d: mode === "3d",
    setMode,
    toggleMode
  }), [mode]);

  return (
    <DepthModeContext.Provider value={value}>
      {children}
    </DepthModeContext.Provider>
  );
}

export function useDepthMode() {
  const context = useContext(DepthModeContext);

  if (!context) {
    throw new Error("useDepthMode must be used within DepthModeProvider");
  }

  return context;
}
