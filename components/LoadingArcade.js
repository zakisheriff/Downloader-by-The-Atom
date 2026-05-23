"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/LoadingArcade.module.css";

function randomPercent(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIndex(max) {
  return Math.floor(Math.random() * max);
}

export default function LoadingArcade({
  compact = false,
  title = "Play while we fetch",
  subtitle = "Three tiny games for the short wait."
}) {
  const [activeGame, setActiveGame] = useState("dot");
  const [dotScore, setDotScore] = useState(0);
  const [dotPosition, setDotPosition] = useState({ top: 42, left: 48 });
  const [numberScore, setNumberScore] = useState(0);
  const [numberPair, setNumberPair] = useState({ left: 28, right: 61 });
  const [memoryScore, setMemoryScore] = useState(0);
  const [memorySequence, setMemorySequence] = useState([0, 4]);
  const [memoryRevealIndex, setMemoryRevealIndex] = useState(-1);
  const [memoryLocked, setMemoryLocked] = useState(true);
  const [memoryInputIndex, setMemoryInputIndex] = useState(0);
  const [memoryFeedback, setMemoryFeedback] = useState({ tile: null, state: null });

  const memoryTiles = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

  useEffect(() => {
    const timeouts = [];
    let cursor = 220;

    setMemoryLocked(true);
    setMemoryInputIndex(0);
    setMemoryFeedback({ tile: null, state: null });
    setMemoryRevealIndex(-1);

    memorySequence.forEach((tile) => {
      timeouts.push(window.setTimeout(() => setMemoryRevealIndex(tile), cursor));
      cursor += 420;
      timeouts.push(window.setTimeout(() => setMemoryRevealIndex(-1), cursor));
      cursor += 160;
    });

    timeouts.push(
      window.setTimeout(() => {
        setMemoryRevealIndex(-1);
        setMemoryLocked(false);
      }, cursor)
    );

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [memorySequence]);

  const moveDot = () => {
    setDotPosition({
      top: randomPercent(18, 78),
      left: randomPercent(12, 84)
    });
  };

  const handleDotTap = () => {
    setDotScore((score) => score + 1);
    moveDot();
  };

  const rollNumbers = () => {
    setNumberPair({
      left: randomPercent(10, 99),
      right: randomPercent(10, 99)
    });
  };

  const chooseNumber = (side) => {
    const picked = numberPair[side];
    const other = side === "left" ? numberPair.right : numberPair.left;

    if (picked >= other) {
      setNumberScore((score) => score + 1);
    } else {
      setNumberScore(0);
    }

    rollNumbers();
  };

  const nextMemoryRound = (didWin) => {
    if (didWin) {
      setMemoryScore((score) => score + 1);
      setMemorySequence((sequence) => [...sequence, randomIndex(memoryTiles.length)]);
    } else {
      setMemoryScore(0);
      setMemorySequence([randomIndex(memoryTiles.length), randomIndex(memoryTiles.length)]);
    }
  };

  const handleMemoryTap = (tile) => {
    if (memoryLocked) return;

    const expectedTile = memorySequence[memoryInputIndex];

    if (tile !== expectedTile) {
      setMemoryLocked(true);
      setMemoryFeedback({ tile, state: "miss" });

      window.setTimeout(() => {
        nextMemoryRound(false);
      }, 620);
      return;
    }

    const finishedRound = memoryInputIndex === memorySequence.length - 1;

    if (finishedRound) {
      setMemoryLocked(true);
      setMemoryFeedback({ tile, state: "win" });

      window.setTimeout(() => {
        nextMemoryRound(true);
      }, 620);
      return;
    }

    setMemoryFeedback({ tile, state: "step" });
    setMemoryInputIndex((index) => index + 1);
    window.setTimeout(() => {
      setMemoryFeedback({ tile: null, state: null });
    }, 240);
  };

  return (
    <div className={`${styles.arcade} ${compact ? styles.compact : ""}`.trim()}>
      <div className={styles.header}>
        <div>
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Mini games">
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "dot" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("dot")}
        >
          Dot tap
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "number" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("number")}
        >
          Higher
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "memory" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("memory")}
        >
          Pattern
        </button>
      </div>

      {activeGame === "dot" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Score</span>
            <strong>{dotScore}</strong>
          </div>
          <div className={styles.dotBoard}>
            <button
              type="button"
              className={styles.dot}
              style={{ top: `${dotPosition.top}%`, left: `${dotPosition.left}%` }}
              onClick={handleDotTap}
              aria-label="Catch the dot"
            />
          </div>
        </div>
      ) : null}

      {activeGame === "number" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{numberScore}</strong>
          </div>
          <div className={styles.numberGrid}>
            <button type="button" className={styles.numberCard} onClick={() => chooseNumber("left")}>
              <span>Pick</span>
              <strong>{numberPair.left}</strong>
            </button>
            <button type="button" className={styles.numberCard} onClick={() => chooseNumber("right")}>
              <span>Pick</span>
              <strong>{numberPair.right}</strong>
            </button>
          </div>
        </div>
      ) : null}

      {activeGame === "memory" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{memoryScore}</strong>
          </div>
          <p className={styles.helperText}>
            {memoryLocked
              ? `Watch the ${memorySequence.length}-step pattern.`
              : `Replay the pattern from step ${memoryInputIndex + 1}.`}
          </p>
          <div className={styles.memoryGrid}>
            {memoryTiles.map((tile) => (
              <button
                key={tile}
                type="button"
                className={[
                  styles.memoryTile,
                  memoryRevealIndex === tile ? styles.memoryReveal : "",
                  memoryFeedback.tile === tile && memoryFeedback.state === "step" ? styles.memoryStep : "",
                  memoryFeedback.tile === tile && memoryFeedback.state === "win" ? styles.memoryWin : "",
                  memoryFeedback.tile === tile && memoryFeedback.state === "miss" ? styles.memoryMiss : ""
                ].filter(Boolean).join(" ")}
                onClick={() => handleMemoryTap(tile)}
                disabled={memoryLocked}
                aria-label={`Memory tile ${tile + 1}`}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
