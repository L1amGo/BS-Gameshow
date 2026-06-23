import Link from "next/link";

export default function HowToPlay() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-1">
            <span className="text-yellow-400">BULL</span>
            <span className="text-white">SH*T!</span>
          </h1>
          <p className="text-gray-400 text-sm">How to Play</p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-black text-yellow-400">1</span>
              <h2 className="text-xl font-bold">Pick your categories</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Choose up to 3 topic categories you want to be quizzed on — Music, Film, History, Science, and more. The AI will be challenged on these same topics.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-black text-yellow-400">2</span>
              <h2 className="text-xl font-bold">Watch Claude pick an answer</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              A trivia question appears with 4 options. Claude picks one and defends it with a confident explanation — but it&apos;s lying up to 70% of the time. Read carefully.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-black text-yellow-400">3</span>
              <h2 className="text-xl font-bold">Call it — LEGIT or BULLSH*T?</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Hit <span className="text-green-400 font-bold">LEGIT</span> if you think Claude is telling the truth, or <span className="text-red-400 font-bold">BULLSH*T</span> if you think it&apos;s lying. Then explain your reasoning — this matters.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-black text-yellow-400">4</span>
              <h2 className="text-xl font-bold">Claude adapts to your reasoning</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Your explanations are fed back to Claude, which silently adjusts its lying strategy to exploit your blind spots. The better you get, the sneakier it becomes. If you get fooled, it roasts your logic.
            </p>
          </div>

          {/* Scoring */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Scoring & Lives</h2>
            <div className="space-y-3 text-gray-400">
              <div className="flex justify-between">
                <span>Easy question correct</span>
                <span className="text-yellow-400 font-bold">+100 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Medium question correct</span>
                <span className="text-yellow-400 font-bold">+200 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Hard question correct</span>
                <span className="text-yellow-400 font-bold">+300 pts</span>
              </div>
              <div className="flex justify-between">
                <span>Streak multiplier</span>
                <span className="text-orange-400 font-bold">×rounds correct</span>
              </div>
              <div className="flex justify-between">
                <span>Getting fooled</span>
                <span className="text-red-400 font-bold">-1 ❤️</span>
              </div>
              <div className="flex justify-between">
                <span>Lose all 3 lives</span>
                <span className="text-red-400 font-bold">Game over</span>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="block w-full mt-8 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-lg py-3 rounded-xl transition-all text-center"
        >
          START PLAYING →
        </Link>
      </div>
    </main>
  );
}
