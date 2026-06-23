from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors

doc = SimpleDocTemplate(
    "/Users/liamguinto/AXL/bs-gameshow/game_description.pdf",
    pagesize=letter,
    rightMargin=inch,
    leftMargin=inch,
    topMargin=inch,
    bottomMargin=inch,
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title",
    parent=styles["Heading1"],
    fontSize=24,
    fontName="Helvetica-Bold",
    textColor=colors.HexColor("#F59E0B"),
    spaceAfter=16,
)

body_style = ParagraphStyle(
    "Body",
    parent=styles["Normal"],
    fontSize=12,
    fontName="Helvetica",
    leading=20,
    textColor=colors.HexColor("#1F2937"),
)

story = [
    Paragraph("BULLSH*T! — AI-Powered Game Show", title_style),
    Spacer(1, 12),
    Paragraph(
        "BULLSH*T! is a web-based trivia game where you try to catch an AI in a lie. "
        "Each round, Claude picks one of four multiple-choice answers and defends it with a confident explanation — "
        "but it's lying roughly 30-70% of the time. Your job is to call LEGIT or BULLSH*T, "
        "then explain your reasoning. The twist: your explanations are fed back to Claude, "
        "which silently adapts its lying strategy to exploit your blind spots. "
        "Get fooled and Claude roasts your logic. Catch it three times in a row and the lie rate climbs. "
        "Lose all three lives and the session ends with a full log of every round and every adaptation Claude made.",
        body_style,
    ),
]

doc.build(story)
print("PDF created: game_description.pdf")
