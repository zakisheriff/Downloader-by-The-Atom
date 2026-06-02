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

  // Game 4: Tic Tac Toe (vs Basic AI - Streak of wins)
  const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
  const [tttScore, setTttScore] = useState(0);
  const [tttWinner, setTttWinner] = useState(null); // 'X' | 'O' | 'draw'
  const [tttStatus, setTttStatus] = useState("Your turn (X)");
  const [tttLocked, setTttLocked] = useState(false);

  const checkTttWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every((cell) => cell !== null)) return "draw";
    return null;
  };

  const resetTtt = (finalWinner = null) => {
    setTttBoard(Array(9).fill(null));
    setTttWinner(null);
    setTttLocked(false);
    setTttStatus("Your turn (X)");
  };

  const handleTttClick = (index) => {
    if (tttBoard[index] || tttWinner || tttLocked) return;

    const nextBoard = [...tttBoard];
    nextBoard[index] = "X";
    setTttBoard(nextBoard);

    const winner = checkTttWinner(nextBoard);
    if (winner) {
      handleTttEnd(winner);
      return;
    }

    setTttLocked(true);
    setTttStatus("AI is thinking...");

    window.setTimeout(() => {
      const emptyIndices = nextBoard
        .map((val, idx) => (val === null ? idx : null))
        .filter((val) => val !== null);

      if (emptyIndices.length === 0) {
        setTttLocked(false);
        return;
      }

      // 1. AI wins if possible
      let aiMove = null;
      for (const idx of emptyIndices) {
        const testBoard = [...nextBoard];
        testBoard[idx] = "O";
        if (checkTttWinner(testBoard) === "O") {
          aiMove = idx;
          break;
        }
      }

      // 2. AI blocks Player if needed
      if (aiMove === null) {
        for (const idx of emptyIndices) {
          const testBoard = [...nextBoard];
          testBoard[idx] = "X";
          if (checkTttWinner(testBoard) === "X") {
            aiMove = idx;
            break;
          }
        }
      }

      // 3. AI takes center if open
      if (aiMove === null && nextBoard[4] === null) {
        aiMove = 4;
      }

      // 4. Fallback random
      if (aiMove === null) {
        aiMove = emptyIndices[randomIndex(emptyIndices.length)];
      }

      const finalBoard = [...nextBoard];
      finalBoard[aiMove] = "O";
      setTttBoard(finalBoard);

      const aiWinner = checkTttWinner(finalBoard);
      if (aiWinner) {
        handleTttEnd(aiWinner);
      } else {
        setTttStatus("Your turn (X)");
        setTttLocked(false);
      }
    }, 450);
  };

  const handleTttEnd = (winner) => {
    setTttWinner(winner);
    setTttLocked(true);

    if (winner === "X") {
      setTttStatus("You won! 🎉");
      setTttScore((s) => s + 1);
    } else if (winner === "O") {
      setTttStatus("AI won! 🤖");
      setTttScore(0);
    } else {
      setTttStatus("It's a draw!");
    }

    window.setTimeout(() => {
      resetTtt();
    }, 1500);
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

  // Game 7: Memory Match (Card Flip - Streak)
  const cardEmojis = useMemo(() => ["🍎", "🍌", "🍇", "🍉", "🍒", "🥑"], []);
  const [matchCards, setMatchCards] = useState([]);
  const [matchSelected, setMatchSelected] = useState([]);
  const [matchPairs, setMatchPairs] = useState(0);
  const [matchMoves, setMatchMoves] = useState(0);
  const [matchStreak, setMatchStreak] = useState(0);
  const [matchLocked, setMatchLocked] = useState(false);

  const startCardMatch = () => {
    const list = [...cardEmojis, ...cardEmojis];
    const shuffled = [];
    while (list.length > 0) {
      const idx = randomIndex(list.length);
      shuffled.push(list.splice(idx, 1)[0]);
    }
    const cards = shuffled.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    }));
    setMatchCards(cards);
    setMatchSelected([]);
    setMatchPairs(0);
    setMatchMoves(0);
    setMatchLocked(false);
  };

  useEffect(() => {
    if (activeGame === "cardmatch") {
      startCardMatch();
    }
  }, [activeGame]);

  const handleCardClick = (index) => {
    if (matchLocked || matchCards[index].isFlipped || matchCards[index].isMatched) return;

    const updated = [...matchCards];
    updated[index].isFlipped = true;
    setMatchCards(updated);

    if (matchSelected.length === 0) {
      setMatchSelected([index]);
    } else if (matchSelected.length === 1) {
      const firstIndex = matchSelected[0];
      setMatchMoves((m) => m + 1);
      setMatchLocked(true);

      if (updated[firstIndex].emoji === updated[index].emoji) {
        // Pairs Match
        window.setTimeout(() => {
          const finalCards = [...updated];
          finalCards[firstIndex].isMatched = true;
          finalCards[index].isMatched = true;
          setMatchCards(finalCards);
          setMatchSelected([]);
          setMatchLocked(false);

          const nextPairs = matchPairs + 1;
          setMatchPairs(nextPairs);

          if (nextPairs === 6) {
            setMatchStreak((s) => s + 1);
            window.setTimeout(() => {
              startCardMatch();
            }, 1200);
          }
        }, 300);
      } else {
        // No match
        window.setTimeout(() => {
          const finalCards = [...updated];
          finalCards[firstIndex].isFlipped = false;
          finalCards[index].isFlipped = false;
          setMatchCards(finalCards);
          setMatchSelected([]);
          setMatchLocked(false);
        }, 800);
      }
    }
  };

  // Game 8: Math Rush (Mental Math equation validation - Streak)
  const [mathScore, setMathScore] = useState(0);
  const [mathLocked, setMathLocked] = useState(false);
  const [mathFeedback, setMathFeedback] = useState(null); // 'win' | 'miss'
  const [mathEquation, setMathEquation] = useState({ text: "2 + 2 = 4", answer: true });

  const generateMathEquation = () => {
    const operators = ["+", "-", "*"];
    const op = operators[randomIndex(operators.length)];
    let a, b, answerVal;

    if (op === "*") {
      a = randomPercent(2, 9);
      b = randomPercent(2, 9);
      answerVal = a * b;
    } else if (op === "+") {
      a = randomPercent(10, 80);
      b = randomPercent(10, 80);
      answerVal = a + b;
    } else {
      a = randomPercent(20, 99);
      b = randomPercent(10, a);
      answerVal = a - b;
    }

    const isCorrect = Math.random() > 0.45;
    let displayedAnswer = answerVal;
    if (!isCorrect) {
      const offset = randomPercent(1, 5) * (Math.random() > 0.5 ? 1 : -1);
      displayedAnswer = answerVal + offset;
      if (displayedAnswer === answerVal) {
        displayedAnswer = answerVal + 2;
      }
    }

    setMathEquation({
      text: `${a} ${op} ${b} = ${displayedAnswer}`,
      answer: isCorrect || displayedAnswer === answerVal
    });
  };

  useEffect(() => {
    generateMathEquation();
  }, []);

  const answerMath = (userAnswer) => {
    if (mathLocked) return;
    setMathLocked(true);

    const correct = userAnswer === mathEquation.answer;

    if (correct) {
      setMathScore((s) => s + 1);
      setMathFeedback("win");
    } else {
      setMathScore(0);
      setMathFeedback("miss");
    }

    window.setTimeout(() => {
      generateMathEquation();
      setMathFeedback(null);
      setMathLocked(false);
    }, 450);
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
          className={`${styles.tab} ${activeGame === "ttt" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("ttt")}
        >
          Tic Tac Toe
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
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "cardmatch" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("cardmatch")}
        >
          Card Match
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeGame === "math" ? styles.tabActive : ""}`}
          onClick={() => setActiveGame("math")}
        >
          Math Rush
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

      {/* Game 4: Tic Tac Toe */}
      {activeGame === "ttt" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{tttScore}</strong>
          </div>
          <p className={styles.gameStatus}>{tttStatus}</p>
          <div className={styles.tttGrid}>
            {tttBoard.map((cell, index) => (
              <button
                key={index}
                type="button"
                className={[
                  styles.tttCell,
                  cell === "X" ? styles.tttX : "",
                  cell === "O" ? styles.tttO : ""
                ].filter(Boolean).join(" ")}
                onClick={() => handleTttClick(index)}
                disabled={cell !== null || tttWinner !== null || tttLocked}
              >
                {cell}
              </button>
            ))}
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

      {/* Game 7: Card Match */}
      {activeGame === "cardmatch" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{matchStreak}</strong>
            <span>Moves: {matchMoves}</span>
          </div>
          <div className={styles.cardMatchGrid}>
            {matchCards.map((card, index) => {
              const showIcon = card.isFlipped || card.isMatched;
              return (
                <button
                  key={card.id}
                  type="button"
                  className={[
                    styles.matchCard,
                    !showIcon ? styles.matchCardBack : "",
                    card.isMatched ? styles.matchCardMatched : ""
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleCardClick(index)}
                  disabled={card.isMatched || matchLocked}
                >
                  {showIcon ? card.emoji : "❓"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Game 8: Math Rush */}
      {activeGame === "math" ? (
        <div className={styles.gamePanel}>
          <div className={styles.meta}>
            <span>Streak</span>
            <strong>{mathScore}</strong>
          </div>
          <div className={styles.mathEquationBox}>
            <span className={styles.mathEquationText}>
              {mathEquation.text}
            </span>
          </div>
          <p className={styles.helperText} style={{ textAlign: "center", fontSize: "0.85rem" }}>
            Is this equation correct?
          </p>
          <div className={styles.choiceGrid}>
            <button
              type="button"
              className={[
                styles.choiceCard,
                mathFeedback === "win" ? styles.choiceWin : "",
                mathFeedback === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => answerMath(true)}
              disabled={mathLocked}
            >
              Yes
            </button>
            <button
              type="button"
              className={[
                styles.choiceCard,
                mathFeedback === "win" ? styles.choiceWin : "",
                mathFeedback === "miss" ? styles.choiceMiss : ""
              ].filter(Boolean).join(" ")}
              onClick={() => answerMath(false)}
              disabled={mathLocked}
            >
              No
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
