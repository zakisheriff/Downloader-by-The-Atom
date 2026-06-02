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
  subtitle = "Interactive games to pass the short wait."
}) {
  const [activeGame, setActiveGame] = useState("dot");

  // Game 1: Dot Tap
  const [dotScore, setDotScore] = useState(0);
  const [dotPosition, setDotPosition] = useState({ top: 42, left: 48 });

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

  // Game 2: Higher Number (Streak)
  const [numberScore, setNumberScore] = useState(0);
  const [numberPair, setNumberPair] = useState({ left: 28, right: 61 });
  const [numberFeedback, setNumberFeedback] = useState({ side: null, state: null }); // state: 'win' | 'miss'
  const [numberLocked, setNumberLocked] = useState(false);

  const rollNumbers = () => {
    const left = randomPercent(10, 99);
    let right = randomPercent(10, 99);
    while (left === right) {
      right = randomPercent(10, 99);
    }
    setNumberPair({ left, right });
  };

  const chooseNumber = (side) => {
    if (numberLocked) return;
    setNumberLocked(true);

    const picked = numberPair[side];
    const other = side === "left" ? numberPair.right : numberPair.left;
    const isCorrect = picked > other;

    if (isCorrect) {
      setNumberScore((score) => score + 1);
      setNumberFeedback({ side, state: "win" });
    } else {
      setNumberScore(0);
      setNumberFeedback({ side, state: "miss" });
    }

    window.setTimeout(() => {
      rollNumbers();
      setNumberFeedback({ side: null, state: null });
      setNumberLocked(false);
    }, 450);
  };

  // Game 3: Memory Pattern (Streak)
  const [memoryScore, setMemoryScore] = useState(0);
  const [memorySequence, setMemorySequence] = useState([0, 4]);
  const [memoryRevealIndex, setMemoryRevealIndex] = useState(-1);
  const [memoryLocked, setMemoryLocked] = useState(true);
  const [memoryInputIndex, setMemoryInputIndex] = useState(0);
  const [memoryFeedback, setMemoryFeedback] = useState({ tile: null, state: null });

  const memoryTiles = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

  useEffect(() => {
    if (activeGame !== "memory") {
      setMemoryLocked(true);
      setMemoryRevealIndex(-1);
      return;
    }

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
  }, [memorySequence, activeGame]);

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

  // Game 4: Rock Paper Scissors (RPS - Streak)
  const [rpsScore, setRpsScore] = useState(0);
  const [rpsResult, setRpsResult] = useState("Choose your element to begin!");
  const [rpsFeedback, setRpsFeedback] = useState({ choice: null, state: null }); // state: 'win' | 'miss' | 'draw'
  const [rpsLocked, setRpsLocked] = useState(false);

  const playRps = (userChoice) => {
    if (rpsLocked) return;
    setRpsLocked(true);

    const choices = ["rock", "paper", "scissors"];
    const compChoice = choices[randomIndex(3)];
    const emojiMap = { rock: "✊", paper: "✋", scissors: "✌️" };

    const draw = userChoice === compChoice;
    let win = false;
    if (!draw) {
      if (
        (userChoice === "rock" && compChoice === "scissors") ||
        (userChoice === "paper" && compChoice === "rock") ||
        (userChoice === "scissors" && compChoice === "paper")
      ) {
        win = true;
      }
    }

    setRpsFeedback({ choice: userChoice, state: draw ? "draw" : (win ? "win" : "miss") });

    if (draw) {
      setRpsResult(`Draw! Both chose ${emojiMap[userChoice]}.`);
    } else if (win) {
      setRpsScore((s) => s + 1);
      setRpsResult(`You won! ${emojiMap[userChoice]} beats ${emojiMap[compChoice]}.`);
    } else {
      setRpsScore(0);
      setRpsResult(`You lost! ${emojiMap[compChoice]} beats ${emojiMap[userChoice]}.`);
    }

    window.setTimeout(() => {
      setRpsFeedback({ choice: null, state: null });
      setRpsLocked(false);
    }, 850);
  };

  // Game 5: Tap Rush (CPS test)
  const [rushClicks, setRushClicks] = useState(0);
  const [rushHigh, setRushHigh] = useState(0);
  const [rushTimeLeft, setRushTimeLeft] = useState(5.0);
  const [rushActive, setRushActive] = useState(false);
  const [rushFinished, setRushFinished] = useState(false);

  const startRushGame = () => {
    setRushClicks(1);
    setRushTimeLeft(5.0);
    setRushActive(true);
    setRushFinished(false);
  };

  const clickRush = () => {
    if (rushFinished) {
      startRushGame();
      return;
    }
    if (!rushActive) {
      startRushGame();
      return;
    }
    setRushClicks((c) => c + 1);
  };

  useEffect(() => {
    if (!rushActive) return;
    const timer = window.setInterval(() => {
      setRushTimeLeft((t) => {
        if (t <= 0.1) {
          clearInterval(timer);
          setRushActive(false);
          setRushFinished(true);
          return 0;
        }
        return Math.round((t - 0.1) * 10) / 10;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [rushActive]);

  useEffect(() => {
    if (rushFinished && rushClicks > rushHigh) {
      setRushHigh(rushClicks);
    }
  }, [rushFinished, rushClicks, rushHigh]);

  // Game 6: Color Match (Stroop Effect - Streak)
  const [colorScore, setColorScore] = useState(0);
  const [colorLocked, setColorLocked] = useState(false);
  const [colorFeedback, setColorFeedback] = useState(null); // 'win' | 'miss'

  const colors = useMemo(() => ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE"], []);
  const colorValues = useMemo(() => ({
    RED: "#FF3B30",
    BLUE: "#007AFF",
    GREEN: "#34C759",
    YELLOW: "#FFCC00",
    PURPLE: "#AF52DE"
  }), []);

  const [currentColor, setCurrentColor] = useState({ text: "RED", valueName: "RED" });

  const rollColorMatch = () => {
    const text = colors[randomIndex(colors.length)];
    const matching = Math.random() > 0.4;
    let valueName;
    if (matching) {
      valueName = text;
    } else {
      valueName = colors[randomIndex(colors.length)];
      while (valueName === text) {
        valueName = colors[randomIndex(colors.length)];
      }
    }
    setCurrentColor({ text, valueName });
  };

  useEffect(() => {
    rollColorMatch();
  }, []);

  const answerColorMatch = (userAnswer) => {
    if (colorLocked) return;
    setColorLocked(true);

    const isMatch = currentColor.text === currentColor.valueName;
    const correct = userAnswer === isMatch;

    if (correct) {
      setColorScore((s) => s + 1);
      setColorFeedback("win");
    } else {
      setColorScore(0);
      setColorFeedback("miss");
    }

    window.setTimeout(() => {
      rollColorMatch();
      setColorFeedback(null);
      setColorLocked(false);
    }, 500);
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
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "rps" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("rps")}
        >
          RPS
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "rush" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("rush")}
        >
          Tap rush
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "color" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("color")}
        >
          Color Match
        </button>
      </div>

      {/* Game 1: Dot Tap */}
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

      {/* Game 2: Higher Number */}
      {activeGame === "number" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{numberScore}</strong>
          </div>
          <div className={styles.numberGrid}>
            <button
              type="button"
              className={[
                styles.numberCard,
                numberFeedback.side === "left" && numberFeedback.state === "win" ? styles.numberCardWin : "",
                numberFeedback.side === "left" && numberFeedback.state === "miss" ? styles.numberCardMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => chooseNumber("left")}
              disabled={numberLocked}
            >
              <span>Pick</span>
              <strong>{numberPair.left}</strong>
            </button>
            <button
              type="button"
              className={[
                styles.numberCard,
                numberFeedback.side === "right" && numberFeedback.state === "win" ? styles.numberCardWin : "",
                numberFeedback.side === "right" && numberFeedback.state === "miss" ? styles.numberCardMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => chooseNumber("right")}
              disabled={numberLocked}
            >
              <span>Pick</span>
              <strong>{numberPair.right}</strong>
            </button>
          </div>
        </div>
      ) : null}

      {/* Game 3: Memory Pattern */}
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

      {/* Game 4: Rock Paper Scissors */}
      {activeGame === "rps" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{rpsScore}</strong>
          </div>
          <p className={styles.rpsStatus}>{rpsResult}</p>
          <div className={styles.rpsGrid}>
            <button
              type="button"
              className={[
                styles.rpsCard,
                rpsFeedback.choice === "rock" && rpsFeedback.state === "win" ? styles.choiceWin : "",
                rpsFeedback.choice === "rock" && rpsFeedback.state === "draw" ? styles.memoryStep : "",
                rpsFeedback.choice === "rock" && rpsFeedback.state === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => playRps("rock")}
              disabled={rpsLocked}
            >
              ✊
            </button>
            <button
              type="button"
              className={[
                styles.rpsCard,
                rpsFeedback.choice === "paper" && rpsFeedback.state === "win" ? styles.choiceWin : "",
                rpsFeedback.choice === "paper" && rpsFeedback.state === "draw" ? styles.memoryStep : "",
                rpsFeedback.choice === "paper" && rpsFeedback.state === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => playRps("paper")}
              disabled={rpsLocked}
            >
              ✋
            </button>
            <button
              type="button"
              className={[
                styles.rpsCard,
                rpsFeedback.choice === "scissors" && rpsFeedback.state === "win" ? styles.choiceWin : "",
                rpsFeedback.choice === "scissors" && rpsFeedback.state === "draw" ? styles.memoryStep : "",
                rpsFeedback.choice === "scissors" && rpsFeedback.state === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => playRps("scissors")}
              disabled={rpsLocked}
            >
              ✌️
            </button>
          </div>
        </div>
      ) : null}

      {/* Game 5: Tap Rush */}
      {activeGame === "rush" ? (
        <div className={styles.rushPanel}>
          <div className={styles.rushMeta}>
            <span>Time Left: <strong>{rushTimeLeft.toFixed(1)}s</strong></span>
            <span>Record: <strong>{rushHigh} clicks</strong></span>
          </div>
          <button type="button" className={styles.rushBtn} onClick={clickRush}>
            {rushFinished
              ? `Done! Score: ${rushClicks} (Tap to retry)`
              : rushActive
              ? `Taps: ${rushClicks}`
              : "Tap here to start!"}
          </button>
        </div>
      ) : null}

      {/* Game 6: Color Match */}
      {activeGame === "color" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{colorScore}</strong>
          </div>
          <div className={styles.colorWordBox}>
            <span
              className={styles.colorWord}
              style={{ color: colorValues[currentColor.valueName] }}
            >
              {currentColor.text}
            </span>
          </div>
          <p className={styles.helperText} style={{ textAlign: "center", fontSize: "0.85rem" }}>
            Does the word match its font color?
          </p>
          <div className={styles.choiceGrid}>
            <button
              type="button"
              className={[
                styles.choiceCard,
                colorFeedback === "win" ? styles.choiceWin : "",
                colorFeedback === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => answerColorMatch(true)}
              disabled={colorLocked}
            >
              Yes
            </button>
            <button
              type="button"
              className={[
                styles.choiceCard,
                colorFeedback === "win" ? styles.choiceWin : "",
                colorFeedback === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => answerColorMatch(false)}
              disabled={colorLocked}
            >
              No
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
