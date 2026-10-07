"""Quotation and invoice PDFs (reportlab, pure Python, no system packages)."""

import io
from decimal import Decimal
from xml.sax.saxutils import escape

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from . import services

INK = colors.HexColor("#1F2E3D")
LINE = colors.HexColor("#D5DCE3")
SYMBOL = {"BDT": "BDT ", "USD": "USD "}  # the built-in PDF fonts have no taka sign


def _m(doc, value: Decimal) -> str:
    return f"{SYMBOL[doc.currency]}{value:,.2f}"


def _p(text, style):
    return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)


def render(doc, kind: str) -> bytes:
    """kind: 'Quotation' or 'Invoice'."""
    styles = getSampleStyleSheet()
    body = ParagraphStyle("b", parent=styles["Normal"], fontSize=9.5, leading=13, textColor=INK)
    small = ParagraphStyle("s", parent=body, fontSize=8.5, textColor=colors.HexColor("#4A5568"))
    h1 = ParagraphStyle("h", parent=body, fontSize=20, leading=24, fontName="Helvetica-Bold")
    buf = io.BytesIO()
    out = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"{kind} {doc.number}",
        author=settings.BUSINESS_NAME,
    )
    client = doc.project.client
    profile = getattr(client, "client_profile", None)
    bill_to = [profile.company or profile.full_name if profile else "", client.email]
    story = [
        _p(kind.upper(), h1),
        Spacer(1, 3 * mm),
        Table(
            [
                [
                    [
                        _p(settings.BUSINESS_NAME, body),
                        _p(settings.BUSINESS_ADDRESS, small),
                        _p(settings.BUSINESS_EMAIL, small),
                    ],
                    [
                        _p(f"{kind} no. {doc.number}", body),
                        _p(f"Date: {doc.created_at:%d %b %Y}", small),
                        _p(f"Status: {doc.status}", small),
                    ],
                ]
            ],
            colWidths=[90 * mm, 84 * mm],
        ),
        Spacer(1, 5 * mm),
        _p("Bill to", small),
        _p("\n".join(x for x in bill_to if x), body),
        Spacer(1, 2 * mm),
        _p(f"Project: {doc.project.title}", body),
        _p(doc.title, body),
        Spacer(1, 5 * mm),
    ]
    rows = [["Description", "Qty", "Unit price", "Amount"]]
    for item in doc.items.all():
        label = item.description + (f" ({item.cycle})" if item.cycle != "one_time" else "")
        rows.append(
            [_p(label, body), f"{item.quantity:g}", _m(doc, item.unit_price), _m(doc, item.amount)]
        )
    table = Table(rows, colWidths=[86 * mm, 18 * mm, 34 * mm, 36 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK),
                ("LINEBELOW", (0, 1), (-1, -1), 0.3, LINE),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story += [table, Spacer(1, 4 * mm)]

    sums = [["Subtotal", _m(doc, services.subtotal(doc))]]
    if doc.discount:
        sums.append(["Discount", "- " + _m(doc, doc.discount)])
    sums.append(["Total", _m(doc, services.total(doc))])
    if kind == "Invoice":
        sums += [
            ["Paid", _m(doc, services.paid_total(doc))],
            ["Amount due", _m(doc, services.outstanding(doc))],
        ]
    summary = Table(sums, colWidths=[40 * mm, 38 * mm], hAlign="RIGHT")
    summary.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    story.append(summary)

    if kind == "Invoice":
        story += [Spacer(1, 6 * mm), _p("Payment schedule", body)]
        sched = [["Installment", "Due", "Amount", "Paid", "Status"]]
        for r in services.schedule(doc):
            i = r["inst"]
            sched.append(
                [
                    i.label,
                    f"{i.due_date:%d %b %Y}" if i.due_date else "-",
                    _m(doc, i.amount),
                    _m(doc, r["paid"]),
                    r["state"],
                ]
            )
        t = Table(sched, colWidths=[56 * mm, 28 * mm, 34 * mm, 34 * mm, 22 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE),
                    ("ALIGN", (2, 0), (3, -1), "RIGHT"),
                ]
            )
        )
        story.append(t)
        if settings.INVOICE_PAYMENT_NOTE:
            story += [
                Spacer(1, 5 * mm),
                _p("How to pay", small),
                _p(settings.INVOICE_PAYMENT_NOTE, body),
            ]
    elif getattr(doc, "valid_until", None):
        story += [Spacer(1, 5 * mm), _p(f"Valid until {doc.valid_until:%d %b %Y}", body)]
    if doc.notes:
        story += [Spacer(1, 5 * mm), _p("Notes", small), _p(doc.notes, body)]
    out.build(story)
    return buf.getvalue()
