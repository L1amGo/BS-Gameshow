# BULLSH*T! — AI-Powered Game Show

A web-based game inspired by the Netflix show *Bullsh*t!*. Players answer trivia questions — truthfully or with a confident bluff — and an AI detector decides if they're full of it.

**Live URL:** https://bs-gameshow.vercel.app

---

## How to Run

```bash
git clone https://github.com/L1amGo/BS-Gameshow.git
cd BS-Gameshow
npm install
```

Create a `.env.local` file in the root:

```
ANTHROPIC_API_KEY=your_key_here
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

**Game loop:** A trivia question is shown. The player types any answer — a real answer or a confident-sounding bluff. Claude then evaluates the answer and delivers a LEGIT or BS verdict with a dramatic reaction. Correct answers score points scaled by difficulty; streaks multiply your score.

**AI integration (Claude claude-sonnet-4-6):** Claude plays the role of the BS Detector — the core mechanic of the game. It evaluates player answers against the correct answer, reasons about plausibility, and responds with a verdict, confidence score, and game-show-style reaction. This is not a superficial add-on: without the LLM, you can't have a "bluff your way through" mechanic that feels dynamic and responsive to natural language.

**Data at scale:** Questions are sourced from the Open Trivia Database (opentdb.com), a community-maintained corpus of thousands of verified trivia questions across pop culture and general knowledge. The app fetches 30 random questions per session (15 per category), shuffled on every load.

**Dynamic behavior:** Every session pulls a fresh batch of questions from the live API, ensuring no two sessions are the same. Claude's responses are generated at runtime, so the reaction to each answer is unique and contextually aware — it doesn't just say "wrong," it reacts to what the player actually typed.

**Key design decisions:**
- Single-player, endless format — no arbitrary round limits; the player decides when to stop
- Streak multiplier rewards consistent knowledge over lucky guesses
- Difficulty-tiered scoring (easy=100, medium=200, hard=300) creates meaningful risk/reward
- Dark, punchy UI inspired by the show's aesthetic — but kept casual and fast

**Tools used:** Next.js, Tailwind CSS, Anthropic SDK, Open Trivia DB API, Vercel
