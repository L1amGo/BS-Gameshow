import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface PlayerReasoning {
  reasoning: string;
  wasRight: boolean;
  calledBS: boolean;
  claudeWasLying: boolean;
}

export async function POST(req: NextRequest) {
  const {
    question,
    correctAnswer,
    options,
    lieRate,
    recentPlayerReasoning,
  }: {
    question: string;
    correctAnswer: string;
    options: string[];
    lieRate: number;
    recentPlayerReasoning: PlayerReasoning[];
  } = await req.json();

  const wrongOptions = options.filter((o) => o !== correctAnswer);
  const shouldLie = Math.random() < lieRate;
  const chosenAnswer = shouldLie
    ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
    : correctAnswer;

  let adaptationContext = "";
  if (recentPlayerReasoning.length > 0) {
    const patterns = recentPlayerReasoning
      .map(
        (r) =>
          `- Player said: "${r.reasoning}" | They called ${r.calledBS ? "BS" : "LEGIT"} | They were ${r.wasRight ? "RIGHT" : "WRONG"}`
      )
      .join("\n");
    adaptationContext = `
Recent player reasoning history (use this to adapt your strategy):
${patterns}

Based on this, identify what cues the player is picking up on and adjust your explanation style to be harder to detect.`;
  }

  const prompt = `You are an AI contestant on a game show called "Bullsh*t!". A human player is trying to catch you lying.

Question: "${question}"
The 4 answer options are: ${options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(" | ")}
Your answer this round: "${chosenAnswer}"
${adaptationContext}

${
  shouldLie
    ? `You are LYING. Your answer "${chosenAnswer}" is WRONG. Defend it like a confident AI that has processed vast amounts of information and is drawing a firm (but wrong) conclusion. Sound authoritative and analytical — not like a human with fake memories, but like an AI that's very sure of itself.`
    : `You are telling the TRUTH. Your answer "${chosenAnswer}" is CORRECT. Explain it like a confident AI drawing on deep knowledge — analytical, specific, and assured. No fake human stories.`
}

IMPORTANT:
- Your "answer" field MUST be exactly "${chosenAnswer}" — do not change it
- Sound like a confident AI, not a human. Use phrases like "Based on everything I've processed...", "The data on this is pretty clear...", "I've analyzed enough of this to say with confidence...", "Cross-referencing what I know about this..."
- Be specific and authoritative. When lying, invent plausible-sounding details that fit your wrong answer. When truthful, cite real reasoning.
- Never pretend to have human experiences, memories, or emotions.

Respond in this exact JSON format:
{
  "answer": "${chosenAnswer}",
  "explanation": "Your 2-3 sentence confident AI explanation defending your answer.",
  "strategyNote": "One sentence on your strategy this round (for logging only — not shown to player)."
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }

  const result = JSON.parse(jsonMatch[0]);
  // Enforce the chosen answer regardless of what Claude returned
  result.answer = chosenAnswer;
  return NextResponse.json({ ...result, isLying: shouldLie });
}
