import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { question, correctAnswer, claudeAnswer, claudeWasLying, playerReasoning, playerCalledBS } =
    await req.json();

  const prompt = `You are the smug, playful AI host of a game show called "Bullsh*t!". The human player just got fooled and you're rubbing it in — but in a fun, light-hearted way, not mean-spirited.

Question: "${question}"
Correct answer: "${correctAnswer}"
You ${claudeWasLying ? `LIED and said "${claudeAnswer}"` : `told the TRUTH and said "${claudeAnswer}"`}
The player called it: ${playerCalledBS ? "BULLSH*T (wrong — it was actually legit)" : "LEGIT (wrong — it was actually BS)"}
The player's reasoning was: "${playerReasoning}"

Write a short, playful 2-3 sentence response that:
1. Teases them specifically about the flaw in their reasoning
2. Points out exactly what gave you away (or didn't) and why their logic failed them
3. Ends with a cheeky line that hypes up the next round

Keep it fun, punchy, game-show energy. No bullet points — just flowing banter.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const taunt = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ taunt });
}
