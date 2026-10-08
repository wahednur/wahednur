"""Draws one explanatory cover image (SVG) per blog post, from the specs below.

    python3 tools/blog_covers/make_covers.py            # writes frontend/public/blog/<slug>.svg
    node tools/blog_covers/to_png.cjs                   # optional: 1200x630 PNG copies for social previews

Every image is a diagram of what the post explains. No photos, no invented numbers.
"""

from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "blog"
W, H = 1200, 630
BG, SURF, LINE, INK, MUTED, TEAL, AMBER, RED = (
    "#0a1020", "#111a2f", "#2b3a57", "#e2e8f0", "#a3b2c7", "#2dd4bf", "#fbbf24", "#f87171",
)


def t(x, y, s, size=26, fill=INK, weight=400, anchor="start", mono=False):
    fam = "ui-monospace,Menlo,Consolas,monospace" if mono else "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"
    return (
        f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" font-weight="{weight}" '
        f'fill="{fill}" text-anchor="{anchor}">{escape(s)}</text>'
    )


def box(x, y, w, h, stroke=LINE, fill=SURF, r=18, sw=2):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def arrow(x1, y, x2):
    return (
        f'<path d="M{x1} {y}H{x2 - 8}" stroke="{TEAL}" stroke-width="3" fill="none"/>'
        f'<path d="M{x2 - 16} {y - 8}L{x2 - 6} {y}L{x2 - 16} {y + 8}" stroke="{TEAL}" stroke-width="3" fill="none" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )


def check(x, y, color=TEAL):
    return (
        f'<circle cx="{x}" cy="{y}" r="15" fill="none" stroke="{color}" stroke-width="2.5"/>'
        f'<path d="M{x - 7} {y}L{x - 2} {y + 6}L{x + 8} {y - 6}" stroke="{color}" stroke-width="3" fill="none" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )


def cross(x, y):
    return (
        f'<circle cx="{x}" cy="{y}" r="15" fill="none" stroke="{AMBER}" stroke-width="2.5"/>'
        f'<path d="M{x - 6} {y - 6}L{x + 6} {y + 6}M{x + 6} {y - 6}L{x - 6} {y + 6}" stroke="{AMBER}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    )


def frame(title_lines, tag, body):
    head = "".join(t(60, 150 + i * 62, line, 52, INK, 700) for i, line in enumerate(title_lines))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">'
        f'<rect width="{W}" height="{H}" fill="{BG}"/>'
        f'<circle cx="1120" cy="40" r="220" fill="{TEAL}" opacity="0.07"/>'
        f'<rect x="60" y="48" width="8" height="30" rx="4" fill="{TEAL}"/>'
        + t(80, 72, tag.upper(), 20, TEAL, 600, mono=True)
        + head
        + body
        + t(60, 604, "wahednur.tech", 18, MUTED, 400, mono=True)
        + "</svg>"
    )


def checklist(items, cols=3):
    rows = (len(items) + cols - 1) // cols
    cw = (W - 120 - (cols - 1) * 24) // cols
    ch, gap = (96, 20) if rows <= 2 else (78, 14)
    top = 290 if rows <= 2 else 262
    out = []
    for i, it in enumerate(items):
        c, r = i % cols, i // cols
        x, y = 60 + c * (cw + 24), top + r * (ch + gap)
        out += [box(x, y, cw, ch), check(x + 40, y + ch // 2), t(x + 72, y + ch // 2 + 8, it, 25 if len(it) <= 17 else 21)]
    return "".join(out)


def flow(steps, n_label=None):
    n = len(steps)
    gap = 40
    w = (W - 120 - (n - 1) * gap) // n
    y, h = 290, 210
    big, small = (28, 20) if n <= 4 else (23, 17)
    out = []
    for i, (a, b) in enumerate(steps):
        x = 60 + i * (w + gap)
        out.append(box(x, y, w, h))
        out.append(f'<circle cx="{x + 34}" cy="{y + 36}" r="16" fill="{TEAL}"/>')
        out.append(t(x + 34, y + 43, str(i + 1), 20, BG, 700, "middle"))
        for j, line in enumerate(a.split("|")):
            out.append(t(x + 20, y + 98 + j * (big + 6), line, big, INK, 700))
        base = y + 98 + len(a.split("|")) * (big + 6) + 14
        for j, line in enumerate(b.split("|")):
            out.append(t(x + 20, base + j * (small + 8), line, small, MUTED))
        if i < n - 1:
            out.append(arrow(x + w + 4, y + h // 2, x + w + gap - 2))
    if n_label:
        out.append(t(60, 556, n_label, 22, MUTED))
    return "".join(out)


def dot(x, y):
    return f'<circle cx="{x}" cy="{y}" r="6" fill="{MUTED}"/>'


def compare(left, right):
    """Each side: (heading, items, mark) where mark is good, bad or neutral."""
    cw = (W - 120 - 40) // 2
    out = []
    for k, (head, items, mark) in enumerate((left, right)):
        x = 60 + k * (cw + 40)
        stroke = {"good": TEAL, "bad": AMBER}.get(mark, LINE)
        out.append(box(x, 270, cw, 300, stroke=stroke))
        out.append(t(x + 28, 322, head, 30, stroke if mark != "neutral" else INK, 700))
        for j, it in enumerate(items):
            yy = 374 + j * 52
            if mark == "good":
                out.append(check(x + 40, yy - 8))
            elif mark == "bad":
                out.append(cross(x + 40, yy - 8))
            else:
                out.append(dot(x + 40, yy - 8))
            out.append(t(x + 72, yy, it, 24))
    return "".join(out)


def pros_cons(pros, cons):
    cw = (W - 120 - 40) // 2
    out = []
    for k, (head, items, ok) in enumerate((("Strengths", pros, True), ("Costs", cons, False))):
        x = 60 + k * (cw + 40)
        out.append(box(x, 270, cw, 300, stroke=TEAL if ok else AMBER))
        out.append(t(x + 28, 322, head, 30, TEAL if ok else AMBER, 700))
        for j, it in enumerate(items):
            yy = 374 + j * 52
            out.append((check if ok else cross)(x + 40, yy - 8))
            out.append(t(x + 72, yy, it, 24))
    return "".join(out)


def rows(pairs, head=("", "")):
    out = []
    rh = 54
    for i, (a, b) in enumerate(pairs):
        y = 250 + i * (rh + 9)
        out.append(box(60, y, W - 120, rh, r=14))
        out.append(t(90, y + 36, a, 25, TEAL, 700))
        out.append(arrow(480, y + rh // 2, 540))
        out.append(t(570, y + 36, b, 25))
    return "".join(out)


SPECS = {
    "what-a-good-quotation-contains": (["What a good quotation", "contains"], "Quotations",
        checklist(["Number and date", "Itemised work", "Clear total", "One currency", "Payment plan", "Terms in plain words"])),
    "quotation-vs-invoice": (["Quotation vs invoice"], "Billing",
        flow([("Quotation", "an offer"), ("Accepted", "you agree"), ("Invoice", "same lines,|same total"), ("Payments", "recorded|one by one")])),
    "paying-a-project-in-installments": (["Paying a project", "in installments"], "Billing",
        flow([("Start", "project begins"), ("Middle", "working version|to review"), ("Final", "work delivered")],
             "The split is set per project. Parts must add up to the total exactly.")),
    "how-to-read-an-invoice": (["How to read an invoice"], "Billing",
        checklist(["Invoice number", "Issue and due date", "Bill to", "Lines", "Discount", "Total", "Installments", "Paid and balance"], cols=3)),
    "dollars-and-taka-never-mixed": (["One document,", "one currency"], "Billing",
        compare(("USD invoice", ["Pay in US dollars", "No exchange rate inside", "Fees stay outside the price"], "good"),
                ("BDT invoice", ["Pay in taka", "No exchange rate inside", "Fees stay outside the price"], "good"))),
    "how-a-project-runs-with-milestones": (["How a project runs"], "Projects",
        flow([("Milestones", "the project in parts"), ("Progress", "worked out from|finished parts"), ("Updates", "written notes|you can read"), ("Files", "in a private vault")])),
    "private-document-vault-for-clients": (["A private vault", "for your files"], "Security",
        flow([("Upload", "type and size|checked"), ("Private|storage", "no public address"), ("Short link", "expires quickly"), ("Your client|only", "others see nothing")])),
    "security-basics-on-this-site": (["How accounts are", "protected"], "Security",
        checklist(["Email verification", "Two-step sign-in", "Private pages", "Server-side checks", "Request limits", "Audit trail"])),
    "why-money-numbers-are-exact": (["Money must be", "exact"], "Engineering",
        compare(("Approximate", ["0.1 + 0.2", "= 0.30000000000000004", "Totals drift apart"], "bad"),
                ("Exact decimals", ["0.10 + 0.20", "= 0.30", "Totals always match"], "good"))),
    "what-i-do-and-do-not-do-with-ai": (["AI that cannot", "invent facts"], "AI",
        flow([("Your data", "database rows"), ("AI drafts", "from that|data only"), ("Check", "numbers not in the|source rejected"), ("Person|approves", "before it|goes live")])),
    "how-package-orders-work": (["How ordering a", "package works"], "Packages",
        flow([("Choose", "price is recorded"), ("Request", "you can cancel"), ("Accepted", "project is created"), ("Quotation", "then invoice")])),
    "how-to-judge-a-developer-before-you-hire": (["How to judge a developer", "before you hire"], "Hiring",
        checklist(["Real work that runs", "Knows your business", "Says what it will not do", "Written scope", "You can see progress", "Clear handover"])),
    "how-my-experience-helps-your-project": (["How my experience", "helps your project"], "Experience",
        flow([("VFX and|graphics", "2010 to|2019"), ("Client|websites", "2014 to|2016"), ("eCommerce|logic", "2020 to|2021"), ("MERN|training", "2024 to|2025"), ("Django,|Next.js", "now")])),
    "django-rest-framework-pros-and-cons": (["Django REST Framework"], "Backend",
        pros_cons(["Clear structure", "Built-in admin", "Mature permissions", "Tracked migrations"], ["Not the fastest runtime", "Real-time needs extras", "Two languages", "Heavy for tiny tools"])),
    "nextjs-for-business-websites": (["Next.js for business", "websites and stores"], "Frontend",
        pros_cons(["Pages search can read", "Fast cached pages", "One codebase", "Large React ecosystem"], ["Changes quickly", "More parts than a plain site", "Best on matching hosts", "Cache needs care"])),
    "postgresql-redis-celery-explained": (["PostgreSQL, Redis", "and Celery"], "Backend",
        rows([("PostgreSQL", "the records: orders, stock, payments"), ("Redis", "fast short-term memory"), ("Celery", "background work: email, daily jobs")])),
    "react-and-typescript-admin-dashboards": (["React and TypeScript", "admin dashboards"], "Frontend",
        compare(("Built-in admin", ["Rarely used data", "Low cost", "Plain screens"], "neutral"),
                ("React dashboard", ["Screens used all day", "Fast, clear, filtered", "Costs more to build"], "neutral"))),
    "wordpress-or-custom-development": (["WordPress or custom", "development?"], "Choosing",
        compare(("WordPress", ["Standard company site", "Small budget, short time", "Plugin already fits"], "neutral"),
                ("Custom build", ["Your process is the product", "Rules plugins cannot hold", "You own the data model"], "neutral"))),
    "docker-vps-vs-managed-hosting": (["Own VPS or", "managed hosting?"], "Hosting",
        compare(("Managed host", ["Quick to set up", "Little to maintain", "Cost grows with use"], "neutral"),
                ("VPS with Docker", ["Predictable cost, full control", "Setup lives in files", "Someone must maintain it"], "neutral"))),
    "choosing-a-technology-stack": (["Choosing a", "technology stack"], "Choosing",
        rows([("Business rules", "Django REST Framework"), ("Data", "PostgreSQL"), ("Background work", "Celery with Redis"), ("Public site", "Next.js"), ("Staff screens", "React with TypeScript")])),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (title, tag, body) in SPECS.items():
        (OUT / f"{slug}.svg").write_text(frame(title, tag, body), encoding="utf-8")
    print(f"wrote {len(SPECS)} covers to {OUT}")


if __name__ == "__main__":
    main()
