"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PlayerReasoning } from "./api/challenge/route";

// GA4 custom event helper
function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).gtag) {
    (window as unknown as Record<string, (...args: unknown[]) => void>).gtag("event", eventName, params);
  }
}

interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
  category: string;
  difficulty: string;
}

interface Challenge {
  answer: string;
  explanation: string;
  isLying: boolean;
  strategyNote: string;
}

interface AdaptationLog {
  round: number;
  lieRate: number;
  event: string;
  strategyNote: string;
}

interface RoundResult {
  question: string;
  claudeAnswer: string;
  claudeWasLying: boolean;
  playerCalledBS: boolean;
  playerReasoning: string;
  correct: boolean;
  points: number;
}

type GameState =
  | "category_pick"
  | "loading"
  | "idle"
  | "challenge_loading"
  | "reasoning"
  | "detecting"
  | "revealed"
  | "game_over"
  | "error";

const CATEGORIES = [
  { id: 11,  label: "🎬 Film" },
  { id: 12,  label: "🎵 Music" },
  { id: 14,  label: "📺 Television" },
  { id: 15,  label: "🎮 Video Games" },
  { id: 17,  label: "🔬 Science & Nature" },
  { id: 22,  label: "🌍 Geography" },
  { id: 23,  label: "📜 History" },
  { id: 25,  label: "🎨 Art" },
  { id: 26,  label: "⭐ Celebrities" },
  { id: 27,  label: "🐾 Animals" },
];

const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
};

const ACCURACY_WINDOW = 5;
const LIE_RATE_START = 0.3;

function calcNewLieRate(
  current: number,
  recentResults: RoundResult[]
): { newRate: number; event: string | null } {
  if (recentResults.length < ACCURACY_WINDOW) return { newRate: current, event: null };

  const last = recentResults.slice(-ACCURACY_WINDOW);
  const accuracy = last.filter((r) => r.correct).length / ACCURACY_WINDOW;

  if (accuracy >= 0.8 && current < 0.7) {
    const newRate = Math.min(current + 0.15, 0.75);
    return { newRate, event: `Player accuracy hit ${Math.round(accuracy * 100)}% — lie rate increased to ${Math.round(newRate * 100)}%` };
  }
  if (accuracy <= 0.4 && current > 0.3) {
    const newRate = Math.max(current - 0.1, 0.3);
    return { newRate, event: `Player accuracy dropped to ${Math.round(accuracy * 100)}% — lie rate eased back to ${Math.round(newRate * 100)}%` };
  }
  return { newRate: current, event: null };
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [playerReasoning, setPlayerReasoning] = useState("");
  const [playerCalledBS, setPlayerCalledBS] = useState<boolean | null>(null);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [lieRate, setLieRate] = useState(LIE_RATE_START);
  const [gameState, setGameState] = useState<GameState>("category_pick");
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [recentReasoning, setRecentReasoning] = useState<PlayerReasoning[]>([]);
  const [adaptationLog, setAdaptationLog] = useState<AdaptationLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const loadQuestions = useCallback(async (categoryIds: number[]) => {
    setGameState("loading");
    try {
      const res = await fetch(`/api/questions?categories=${categoryIds.join(",")}`);
      const data = await res.json();
      setQuestions(data.questions);
      trackEvent("game_started", { categories: categoryIds.join(","), category_count: categoryIds.length });
      setGameState("idle");
    } catch {
      setGameState("error");
    }
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  };

  const currentQuestion = questions[currentIndex];

  const loadChallenge = useCallback(async () => {
    if (!currentQuestion) return;
    setGameState("challenge_loading");
    setChallenge(null);
    setPlayerReasoning("");
    setPlayerCalledBS(null);

    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          correctAnswer: currentQuestion.correctAnswer,
          options: currentQuestion.options,
          lieRate,
          recentPlayerReasoning: recentReasoning.slice(-5),
        }),
      });
      const data: Challenge = await res.json();
      setChallenge(data);
      setGameState("reasoning");
    } catch {
      setGameState("error");
    }
  }, [currentQuestion, lieRate, recentReasoning]);

  useEffect(() => {
    if (gameState === "idle" && currentQuestion) {
      loadChallenge();
    }
  }, [gameState, currentQuestion, loadChallenge]);

  const handleSubmit = async () => {
    if (playerCalledBS === null || !playerReasoning.trim() || !challenge) return;
    setGameState("detecting");

    const claudeWasLying = challenge.isLying;
    const correct = playerCalledBS === claudeWasLying;
    const pts = correct ? DIFFICULTY_POINTS[currentQuestion.difficulty] || 100 : 0;
    const newLives = correct ? lives : lives - 1;

    const result: RoundResult = {
      question: currentQuestion.question,
      claudeAnswer: challenge.answer,
      claudeWasLying,
      playerCalledBS,
      playerReasoning,
      correct,
      points: pts,
    };

    const newResults = [...roundResults, result];
    const newReasoning: PlayerReasoning[] = [
      ...recentReasoning,
      {
        reasoning: playerReasoning,
        wasRight: correct,
        calledBS: playerCalledBS,
        claudeWasLying,
      },
    ];

    const { newRate, event } = calcNewLieRate(lieRate, newResults);

    if (event) {
      setAdaptationLog((log) => [
        ...log,
        {
          round: newResults.length,
          lieRate: newRate,
          event,
          strategyNote: challenge.strategyNote,
        },
      ]);
      setLieRate(newRate);
    }

    // Fire custom GA4 event
    trackEvent("bs_verdict_submitted", {
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      player_called_bs: playerCalledBS,
      claude_was_lying: claudeWasLying,
      correct,
      points_earned: pts,
      lie_rate: Math.round(lieRate * 100),
      round_number: newResults.length,
    });

    setScore((s) => s + pts);
    setLives(newLives);
    setRoundResults(newResults);
    setRecentReasoning(newReasoning.slice(-5));
    setTaunt(null);
    setGameState("revealed");

    if (!correct) {
      fetch("/api/taunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          correctAnswer: currentQuestion.correctAnswer,
          claudeAnswer: challenge.answer,
          claudeWasLying: challenge.isLying,
          playerReasoning,
          playerCalledBS,
        }),
      })
        .then((r) => r.json())
        .then((d) => setTaunt(d.taunt))
        .catch(() => null);
    }

    if (newLives <= 0) {
      trackEvent("game_over", { final_score: score + pts, rounds_played: newResults.length, adaptation_events: adaptationLog.length });
      setTimeout(() => setGameState("game_over"), 1800);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      loadQuestions(selectedCategories);
      setCurrentIndex(0);
    } else {
      setCurrentIndex((i) => i + 1);
    }
    setPlayerReasoning("");
    setPlayerCalledBS(null);
    setTaunt(null);
    setGameState("idle");
  };

  const handleEndGame = () => setGameState("game_over");

  const handleRestart = () => {
    setScore(0);
    setLives(3);
    setLieRate(LIE_RATE_START);
    setRoundResults([]);
    setRecentReasoning([]);
    setAdaptationLog([]);
    setShowLog(false);
    setSelectedCategories([]);
    setCurrentIndex(0);
    setGameState("category_pick");
  };

  const livesDisplay = Array.from({ length: 3 }, (_, i) => i < lives ? "❤️" : "🖤").join(" ");

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black tracking-tight mb-1">
          <span className="text-yellow-400">BULL</span>
          <span className="text-white">SH*T!</span>
        </h1>
        <p className="text-gray-400 text-sm">Can you catch the AI lying?</p>
      </div>

      {/* Stats bar — only during gameplay */}
      {gameState !== "category_pick" && (
        <div className="flex gap-6 mb-8 text-center">
          <div className="bg-gray-800 rounded-xl px-6 py-3">
            <div className="text-2xl font-bold text-yellow-400">{score}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Score</div>
          </div>
          <div className="bg-gray-800 rounded-xl px-6 py-3">
            <div className="text-2xl">{livesDisplay}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Lives</div>
          </div>
          <div className="bg-gray-800 rounded-xl px-6 py-3">
            <div className="text-2xl font-bold text-blue-400">{roundResults.length}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Rounds</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Category picker */}
        {gameState === "category_pick" && (
          <div className="bg-gray-800 rounded-2xl p-8">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-2xl font-black">Pick your categories</h2>
              <Link href="/how-to-play" className="text-yellow-400 text-sm font-semibold hover:underline">How to play →</Link>
            </div>
            <p className="text-gray-400 text-sm mb-6">Choose up to 3. Claude will be quizzed on these topics.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat.id);
                const maxed = selectedCategories.length >= 3 && !selected;
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    disabled={maxed}
                    className={`py-4 px-5 rounded-xl font-semibold text-left transition-all border-2 ${
                      selected
                        ? "bg-yellow-400 border-yellow-400 text-gray-900"
                        : maxed
                        ? "bg-gray-700/30 border-gray-700 text-gray-600 cursor-not-allowed"
                        : "bg-gray-700 border-gray-600 text-white hover:border-yellow-400"
                    }`}
                  >
                    {cat.label}
                    {selected && <span className="float-right">✓</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => loadQuestions(selectedCategories)}
              disabled={selectedCategories.length === 0}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-black text-lg py-3 rounded-xl transition-all"
            >
              START GAME →
            </button>
          </div>
        )}
        {/* Initial load */}
        {gameState === "loading" && (
          <div className="bg-gray-800 rounded-2xl p-10 text-center animate-pulse">
            <div className="text-4xl mb-3">🎰</div>
            <p className="text-gray-400">Loading questions...</p>
          </div>
        )}

        {/* Show question + options while Claude thinks */}
        {gameState === "challenge_loading" && currentQuestion && (
          <div className="bg-gray-800 rounded-2xl p-8">
            <div className="flex justify-between text-xs mb-4">
              <span className="text-gray-500">{currentQuestion.category}</span>
              <span className="text-gray-400">{currentQuestion.difficulty?.toUpperCase()} · {DIFFICULTY_POINTS[currentQuestion.difficulty] || 100} pts</span>
            </div>
            <p className="text-lg font-semibold mb-5 leading-relaxed text-gray-200">
              {currentQuestion.question}
            </p>
            <div className="space-y-2 mb-6">
              {currentQuestion.options.map((option, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-gray-700/40 border-gray-700 text-gray-400">
                  <span className="font-mono text-xs shrink-0 text-gray-500">{String.fromCharCode(65 + i)}.</span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 text-gray-400 text-sm animate-pulse">
              <span className="text-2xl">🤖</span>
              <span>Claude is picking its answer...</span>
            </div>
          </div>
        )}

        {gameState === "error" && (
          <div className="bg-gray-800 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">😬</div>
            <p className="text-red-400 mb-4">Something went wrong. Check your API key.</p>
            <button onClick={() => loadQuestions(selectedCategories)} className="bg-yellow-400 text-gray-900 font-bold px-6 py-2 rounded-xl">
              Try Again
            </button>
          </div>
        )}

        {/* Main game card */}
        {(gameState === "reasoning" || gameState === "detecting") && challenge && currentQuestion && (
          <div className="bg-gray-800 rounded-2xl p-8">
            <div className="flex justify-between text-xs mb-4">
              <span className="text-gray-500">{currentQuestion.category}</span>
              <span className="text-gray-400">{currentQuestion.difficulty?.toUpperCase()} · {DIFFICULTY_POINTS[currentQuestion.difficulty] || 100} pts</span>
            </div>

            {/* Question */}
            <p className="text-lg font-semibold mb-5 leading-relaxed text-gray-200">
              {currentQuestion.question}
            </p>

            {/* 4 options — Claude's pick is highlighted */}
            <div className="space-y-2 mb-6">
              {currentQuestion.options.map((option, i) => {
                const isClaudePick = option.toLowerCase().trim() === challenge.answer.toLowerCase().trim();
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      isClaudePick
                        ? "bg-yellow-400/20 border-yellow-400 text-white"
                        : "bg-gray-700/40 border-gray-700 text-gray-400"
                    }`}
                  >
                    <span className="font-mono text-xs shrink-0 text-gray-500">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="flex-1">{option}</span>
                    {isClaudePick && (
                      <span className="text-yellow-400 text-xs font-black uppercase tracking-wide shrink-0">
                        🤖 Claude&apos;s pick
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Claude's explanation */}
            <div className="bg-gray-700/60 border border-gray-600 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🤖</span>
                <span className="text-yellow-400 font-bold text-sm uppercase tracking-wide">Claude&apos;s reasoning</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed italic">&ldquo;{challenge.explanation}&rdquo;</p>
            </div>

            {/* LEGIT / BS buttons */}
            <p className="text-gray-400 text-sm mb-3">Is Claude telling the truth?</p>
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setPlayerCalledBS(false)}
                disabled={gameState === "detecting"}
                className={`flex-1 py-4 rounded-xl font-black text-lg transition-all border-2 ${
                  playerCalledBS === false
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:border-green-500"
                }`}
              >
                ✅ LEGIT
              </button>
              <button
                onClick={() => setPlayerCalledBS(true)}
                disabled={gameState === "detecting"}
                className={`flex-1 py-4 rounded-xl font-black text-lg transition-all border-2 ${
                  playerCalledBS === true
                    ? "bg-red-500 border-red-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:border-red-500"
                }`}
              >
                💩 BULLSH*T
              </button>
            </div>

            {/* Reasoning input */}
            {playerCalledBS !== null && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Why do you think that?</p>
                <textarea
                  className="w-full bg-gray-700 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
                  rows={3}
                  placeholder="Explain your reasoning — this helps Claude adapt its strategy..."
                  value={playerReasoning}
                  onChange={(e) => setPlayerReasoning(e.target.value)}
                  disabled={gameState === "detecting"}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!playerReasoning.trim() || gameState === "detecting"}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-black text-lg py-3 rounded-xl transition-all"
                >
                  {gameState === "detecting" ? "Checking..." : "LOCK IT IN"}
                </button>
              </div>
            )}

            {/* End game */}
            <button
              onClick={handleEndGame}
              className="w-full mt-4 text-gray-600 hover:text-red-400 text-sm py-2 transition-all"
            >
              End game
            </button>
          </div>
        )}

        {/* Revealed */}
        {gameState === "revealed" && challenge && currentQuestion && (() => {
          const last = roundResults[roundResults.length - 1];
          const correct = last?.correct;
          return (
            <div className={`rounded-2xl p-8 border-2 ${correct ? "bg-green-950 border-green-500" : "bg-red-950 border-red-500"}`}>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">{correct ? "🎯" : "💀"}</div>
                <div className={`text-3xl font-black tracking-widest ${correct ? "text-green-400" : "text-red-400"}`}>
                  {correct ? "NICE CATCH!" : "FOOLED YOU!"}
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-2">
                <p className="text-sm text-gray-400">
                  Claude was: <span className={`font-bold ${challenge.isLying ? "text-red-400" : "text-green-400"}`}>
                    {challenge.isLying ? "LYING 🤥" : "TELLING THE TRUTH ✅"}
                  </span>
                </p>
                <p className="text-sm text-gray-400">
                  Correct answer: <span className="text-white font-semibold">{currentQuestion.correctAnswer}</span>
                </p>
                {correct && (
                  <p className="text-yellow-400 font-bold">+{last.points} pts</p>
                )}
              </div>

              {/* Taunt — only shown when fooled */}
              {!correct && (
                <div className="bg-gray-900/60 border border-red-900 rounded-xl p-4 mb-4">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wide mb-2">🤖 Claude says...</p>
                  {taunt ? (
                    <p className="text-gray-200 text-sm italic leading-relaxed">&ldquo;{taunt}&rdquo;</p>
                  ) : (
                    <p className="text-gray-500 text-sm animate-pulse">Cooking up a response...</p>
                  )}
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full bg-white hover:bg-gray-200 text-gray-900 font-black text-lg py-3 rounded-xl transition-all"
              >
                NEXT QUESTION →
              </button>
            </div>
          );
        })()}

        {/* Game Over */}
        {gameState === "game_over" && (
          <div className="bg-gray-800 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">💀</div>
              <h2 className="text-3xl font-black text-red-400 mb-2">GAME OVER</h2>
              <p className="text-gray-400 mb-1">Final score: <span className="text-yellow-400 font-bold text-xl">{score}</span></p>
              <p className="text-gray-400">Rounds played: <span className="text-white font-bold">{roundResults.length}</span></p>
            </div>

            {/* Session log — always shown */}
            <div className="mb-6 text-left">
              <button
                onClick={() => setShowLog((s) => !s)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 rounded-xl mb-3 text-sm"
              >
                {showLog ? "▲ Hide" : "▼ Show"} Session Log
              </button>
              {showLog && (
                <div className="space-y-3">
                  {/* Per-round breakdown */}
                  {roundResults.map((r, i) => (
                    <div key={i} className={`border rounded-xl p-4 ${r.correct ? "bg-green-950/40 border-green-900" : "bg-red-950/40 border-red-900"}`}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Round {i + 1}</span>
                        <span className={r.correct ? "text-green-400" : "text-red-400"}>
                          {r.correct ? `+${r.points} pts` : "FOOLED"}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm font-semibold mb-1 truncate">{r.question}</p>
                      <p className="text-gray-400 text-xs mb-1">
                        Claude picked: <span className="text-white">{r.claudeAnswer}</span>
                        {" · "}
                        <span className={r.claudeWasLying ? "text-red-400" : "text-green-400"}>
                          {r.claudeWasLying ? "was lying 🤥" : "was truthful ✅"}
                        </span>
                      </p>
                      <p className="text-gray-500 text-xs italic">&ldquo;{r.playerReasoning}&rdquo;</p>
                    </div>
                  ))}

                  {/* Adaptation events */}
                  {adaptationLog.length > 0 && (
                    <div className="mt-4">
                      <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2 font-bold">⚡ Claude Adaptations</p>
                      {adaptationLog.map((entry, i) => (
                        <div key={i} className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>After round {entry.round}</span>
                            <span>Lie rate → {Math.round(entry.lieRate * 100)}%</span>
                          </div>
                          <p className="text-yellow-400 text-sm font-semibold mb-1">{entry.event}</p>
                          <p className="text-gray-400 text-xs italic">Strategy: &ldquo;{entry.strategyNote}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {adaptationLog.length === 0 && (
                    <p className="text-gray-600 text-xs italic text-center py-2">
                      Claude didn&apos;t need to adapt — play more rounds to trigger strategy changes.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleRestart}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-lg py-3 rounded-xl"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Round history */}
      {roundResults.length > 0 && gameState !== "game_over" && (
        <div className="w-full max-w-2xl mt-8">
          <h2 className="text-gray-500 text-xs uppercase tracking-widest mb-3">Recent Rounds</h2>
          <div className="space-y-2">
            {roundResults.slice(-5).reverse().map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-400 truncate flex-1 mr-4">{r.question}</span>
                <span className={`font-bold shrink-0 ${r.correct ? "text-green-400" : "text-red-400"}`}>
                  {r.correct ? `+${r.points}` : "FOOLED"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
