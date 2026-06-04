import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paramCats = searchParams.get("categories");
  const allCategories = [11, 12, 14, 15, 17, 22, 23, 25, 26, 27];
  const categories = paramCats
    ? paramCats.split(",").map(Number).filter((n) => allCategories.includes(n))
    : allCategories.sort(() => Math.random() - 0.5).slice(0, 4);

  try {
    const responses = await Promise.all(
      categories.map((cat) =>
        fetch(`https://opentdb.com/api.php?amount=10&category=${cat}&type=multiple`)
      )
    );
    const datasets = await Promise.all(responses.map((r) => r.json()));

    const questions = datasets.flatMap((d) => d.results || [])
      .map((q: {
        question: string;
        correct_answer: string;
        incorrect_answers: string[];
        category: string;
        difficulty: string;
      }) => {
        const allOptions = [
          decodeHtmlEntities(q.correct_answer),
          ...q.incorrect_answers.map(decodeHtmlEntities),
        ].sort(() => Math.random() - 0.5);
        return {
          question: decodeHtmlEntities(q.question),
          correctAnswer: decodeHtmlEntities(q.correct_answer),
          options: allOptions,
          category: q.category,
          difficulty: q.difficulty,
        };
      })
      .sort(() => Math.random() - 0.5);

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’");
}
