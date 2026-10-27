"""Quotation and invoice PDFs.

Built as HTML and turned into a PDF by WeasyPrint, which shapes Bengali text properly (vowel signs,
conjuncts) and embeds the fonts it uses. Hind Siliguri (English) and Tiro Bangla (Bengali), both SIL Open Font License, ship in
`billing/fonts/`, so a PDF looks the same on any server and opens the same on any device.
"""

from decimal import Decimal
from html import escape
from pathlib import Path

from django.conf import settings

from . import services
from .richtext import clean_html, from_plain, points_from_plain

BASE_DIR = Path(__file__).resolve().parent  # fonts/ and brand/ live next to this file
SYMBOL = {"BDT": "BDT ", "USD": "USD "}

CSS = """
@font-face { font-family: "Hind Latin"; font-weight: 400; src: url("fonts/hind-siliguri-latin-400-normal.woff"); }
@font-face { font-family: "Hind Latin"; font-weight: 700; src: url("fonts/hind-siliguri-latin-700-normal.woff"); }
@font-face { font-family: "Tiro Bangla"; font-weight: 400; src: url("fonts/tiro-bangla-bengali-400-normal.woff"); }
@page {
  size: A4; margin: 30mm 18mm 22mm;
  @top-left { content: element(lh-small); width: 174mm; vertical-align: middle; }
  @bottom-left { content: element(lf); width: 120mm; vertical-align: top; padding-top: 3mm; }
  @bottom-right { font-family: "Hind Latin", sans-serif; content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #4A5568; vertical-align: top; padding-top: 3mm; }
}
@page :first {
  margin-top: 53mm;
  @top-left { content: element(lh); width: 174mm; vertical-align: top; padding-top: 10mm; }
}
.lh { position: running(lh); border-bottom: 1.2pt solid #0D9488; padding-bottom: 3mm; }
.lh table { width: 100%; } .lh td { border: 0; padding: 0; vertical-align: bottom; }
.lh .mark { display: block; height: 15mm; margin-bottom: 2mm; }
.lh .mark.round { width: 15mm; border-radius: 50%; object-fit: cover; }
.lh .name { font-size: 19pt; font-weight: 700; letter-spacing: .01em; line-height: 1.1; }
.lh .side { text-align: right; font-size: 8.5pt; color: #4A5568; line-height: 1.5; }
.lh-small { position: running(lh-small); border-bottom: .5pt solid #D5DCE3; padding-bottom: 2mm; font-size: 8.5pt; color: #4A5568; }
.lh-small b { color: #1F2E3D; }
.lf { position: running(lf); border-top: .5pt solid #D5DCE3; padding-top: 2mm; font-size: 8pt; color: #4A5568; }
.rich { margin-top: 3mm; }
.rich h2 { font-size: 13pt; margin: 5mm 0 2mm; } .rich h3 { font-size: 11pt; margin: 4mm 0 1.5mm; } .rich h4 { font-size: 10pt; margin: 3mm 0 1mm; }
.rich p { margin: 0 0 2.2mm; } .rich ul, .rich ol { margin: 0 0 2.5mm; padding-left: 6mm; } .rich li { margin-bottom: .8mm; }
.rich blockquote { margin: 2mm 0 3mm; padding: 1mm 0 1mm 4mm; border-left: 1.2pt solid #0D9488; color: #4A5568; }
.rich table { margin: 2mm 0 4mm; table-layout: auto; } .rich th, .rich td { border: .4pt solid #B8C4CE; padding: 1.4mm 2mm; }
.rich th { background: #EEF3F6; border-bottom: .4pt solid #B8C4CE; }
.rich hr { border: 0; border-top: .5pt solid #D5DCE3; margin: 4mm 0; } .rich a { color: #0D9488; }
.rich code, .rich pre { font-family: monospace; font-size: 8.5pt; background: #F3F6F8; }
* { box-sizing: border-box; }
body { font-family: "Hind Latin", "Tiro Bangla", sans-serif; font-size: 9.5pt; line-height: 1.4; color: #1F2E3D; }
h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 3mm; letter-spacing: .02em; }
p { margin: 0; }
.small { font-size: 8.5pt; color: #4A5568; }
.b { font-weight: 700; }
.gap { margin-top: 5mm; }
.gap-lg { margin-top: 8mm; }
.pre { white-space: pre-line; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 1.6mm 1.5mm; vertical-align: top; text-align: left; }
th { font-weight: 700; border-bottom: .8pt solid #1F2E3D; }
td { border-bottom: .3pt solid #D5DCE3; }
.r { text-align: right; }
.head td, .sign td { border: 0; padding: 0; width: 50%; }
table.sums { width: 78mm; margin-left: auto; margin-top: 4mm; }
table.sums td { border: 0; padding: 1mm 1.5mm; }
table.sums tr.last td { font-weight: 700; }
table.small-t { font-size: 8.5pt; }
table.small-t th { border-bottom: .3pt solid #D5DCE3; }
tr { break-inside: avoid; }
.sign { margin-top: 14mm; }
.sign .line { height: 10mm; }
"""


def _m(doc, value: Decimal) -> str:
    return f"{SYMBOL[doc.currency]}{value:,.2f}"


def services_status(doc) -> str:
    return doc.get_status_display() if hasattr(doc, "get_status_display") else str(doc.status)


def _e(text) -> str:
    return escape(str(text))


def _p(text, cls="") -> str:
    """A paragraph of user text: escaped, with line breaks kept."""
    return f'<p class="pre {cls}">{_e(text)}</p>'


def _quotation_blocks(doc) -> str:
    """Payment plan, risks and extra sections of a written proposal."""
    out = []
    if doc.payment_plan:
        total = services.total(doc)
        rows = ""
        for step in doc.payment_plan:
            pct = Decimal(step["percent"])
            rows += (
                f"<tr><td>{_e(step['label'])}</td><td class='r'>{pct:g}%</td>"
                f"<td class='r'>{_e(_m(doc, services.money(total * pct / 100)))}</td>"
                f"<td>{_e(step.get('note', ''))}</td></tr>"
            )
        out.append(
            '<p class="gap-lg">Payment plan</p><table class="small-t"><tr><th>Step</th>'
            f'<th class="r">Share</th><th class="r">Amount</th><th>Note</th></tr>{rows}</table>'
        )
    if doc.risks:
        rows = "".join(
            f"<tr><td>{_p(r['risk'], 'small')}</td><td>{_p(r.get('impact', ''), 'small')}</td></tr>"
            for r in doc.risks
        )
        out.append(
            '<p class="gap-lg">Risks</p><table class="small-t"><tr><th>Risk</th><th>Impact</th></tr>'
            f"{rows}</table>"
        )
    for block in doc.sections:
        body = clean_html(block.get("body_html", "")) if block.get("body_html", "").strip() else from_plain(block.get("body", ""))
        out.append(f'<div class="gap">{_p(block["heading"])}<div class="rich small">{body}</div></div>')
    return "".join(out)


def _mark() -> str:
    """The picture above the name on the letterhead: my photo, the WS logo, or nothing (LETTERHEAD_MARK)."""
    mark = settings.LETTERHEAD_MARK
    if mark == "photo":
        return '<img class="mark round" src="brand/wahednur.jpg" alt="">'
    if mark == "logo":
        return '<img class="mark" src="brand/ws-logo.svg" alt="">'
    return ""


def build_html(doc, kind: str) -> str:
    """kind: 'Quotation' or 'Invoice'."""
    client = doc.project.client
    profile = getattr(client, "client_profile", None)
    if doc.bill_to_address:
        bill_to = [*doc.bill_to_address.splitlines(), client.email]
    else:
        bill_to = [profile.company or profile.full_name if profile else "", client.email]

    contact = " · ".join(x for x in (settings.BUSINESS_WEBSITE, settings.BUSINESS_EMAIL, settings.BUSINESS_PHONE) if x)
    parts = [
        '<div class="lh"><table><tr><td>' + _mark() + '<div class="name">' + _e(settings.BUSINESS_NAME) + '</div></td>'
        '<td class="side">' + _e(settings.BUSINESS_ADDRESS) + "<br>" + _e(contact) + "</td></tr></table></div>",
        '<div class="lh-small"><b>' + _e(settings.BUSINESS_NAME) + "</b> · " + _e(f"{kind} {doc.number}") + "</div>",
        '<div class="lf">' + _e(settings.BUSINESS_NAME) + " · " + _e(settings.BUSINESS_ADDRESS) + " · " + _e(contact) + "</div>",
        f"<h1>{_e(kind.upper())}</h1>",
        '<table class="head"><tr><td>'
        f"{_p('From', 'small')}{_p(settings.BUSINESS_NAME)}"
        "</td><td>"
        f"{_p(f'{kind} no. {doc.number}')}{_p(f'Date: {doc.issue_date:%d/%m/%Y}', 'small')}"
        f"{_p(f'Status: {services_status(doc)}', 'small')}</td></tr></table>",
        '<p class="small gap">Bill to</p>',
        _p("\n".join(x for x in bill_to if x)),
        f'<p class="gap" style="margin-top:2mm">{_e("Project: " + doc.project.title)}</p>',
        _p(doc.title),
    ]
    proposal = clean_html(doc.proposal_html) if getattr(doc, "proposal_html", "").strip() else from_plain(getattr(doc, "proposal_text", ""))
    if proposal:
        parts += ['<p class="small gap">Proposal</p>', f'<div class="rich">{proposal}</div>']

    rows = ""
    for item in doc.items.all():
        label = item.description + (f" ({item.cycle})" if item.cycle != "one_time" else "")
        cell = _p(label)
        points = clean_html(item.details_html) if item.details_html.strip() else points_from_plain(item.details)
        if points:
            cell += f'<div class="rich small">{points}</div>'
        facts = [
            f"Time: {item.time_estimate}" if item.time_estimate else "",
            f"Risk: {item.get_risk_display()}" if item.risk else "",
            item.get_work_state_display() if item.work_state else "",
        ]
        if any(facts):
            cell += _p(" | ".join(f for f in facts if f), "small")
        if item.note:
            cell += _p(item.note, "small")
        price = _m(doc, item.unit_price)
        if item.unit_price_max:
            price = f"{_m(doc, item.unit_price)} - {_m(doc, item.unit_price_max)}"
        amount = _m(doc, item.amount) if item.counted else "Included"
        rows += (
            f"<tr><td style='width:86mm'>{cell}</td><td class='r'>{item.quantity.normalize():f}</td>"
            f"<td class='r small'>{_e(price)}</td><td class='r'>{_e(amount)}</td></tr>"
        )
    parts.append(
        '<table class="gap"><thead><tr><th>Description</th><th class="r">Qty</th>'
        f'<th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>{rows}</tbody></table>'
    )

    sums = [("Subtotal", _m(doc, services.subtotal(doc)))]
    top = services.subtotal_max(doc)
    if top is not None:
        sums.append(("Estimate up to", _m(doc, top)))
    if doc.discount:
        sums.append(("Discount", "- " + _m(doc, doc.discount)))
    if doc.tax_rate:
        sums.append((f"{doc.tax_name} ({doc.tax_rate:g}%)", _m(doc, services.tax_amount(doc))))
    sums.append(("Total", _m(doc, services.total(doc))))
    last = len(sums) - 1
    if kind == "Invoice":
        sums += [("Paid", _m(doc, services.paid_total(doc))), ("Amount due", _m(doc, services.outstanding(doc)))]
        last = len(sums) - 1
    body = "".join(
        f"<tr class='{'last' if i == last else ''}'><td>{_e(k)}</td><td class='r'>{_e(v)}</td></tr>"
        for i, (k, v) in enumerate(sums)
    )
    parts.append(f'<table class="sums">{body}</table>')

    if kind == "Invoice":
        sched = ""
        for r in services.schedule(doc):
            i = r["inst"]
            sched += (
                f"<tr><td>{_e(i.label)}</td><td>{_e(f'{i.due_date:%d/%m/%Y}' if i.due_date else '-')}</td>"
                f"<td class='r'>{_e(_m(doc, i.amount))}</td><td class='r'>{_e(_m(doc, r['paid']))}</td>"
                f"<td>{_e(r['state'])}</td></tr>"
            )
        parts.append(
            '<p class="gap-lg">Payment schedule</p><table class="small-t"><tr><th>Installment</th><th>Due</th>'
            f'<th class="r">Amount</th><th class="r">Paid</th><th>Status</th></tr>{sched}</table>'
        )
        if settings.INVOICE_PAYMENT_NOTE:
            parts += ['<p class="small gap">How to pay</p>', _p(settings.INVOICE_PAYMENT_NOTE)]
    else:
        parts.append(_quotation_blocks(doc))
    if kind != "Invoice" and getattr(doc, "valid_until", None):
        parts.append(f'<p class="gap">{_e(f"Valid until {doc.valid_until:%d/%m/%Y}")}</p>')
    if doc.notes:
        parts += ['<p class="small gap">Notes</p>', _p(doc.notes)]
    parts.append(
        '<table class="sign"><tr><td><p class="small">Prepared by</p><div class="line"></div>'
        + _p(settings.BUSINESS_NAME)
        + '</td><td><p class="small">Client approval</p><div class="line"></div>'
        + "<p>Date and signature</p></td></tr></table>"
    )
    return (
        f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{_e(kind)} {_e(doc.number)}</title>'
        f"<style>{CSS}</style></head><body>{''.join(parts)}</body></html>"
    )


def render(doc, kind: str, *, compress: bool = True) -> bytes:
    """The finished PDF. Fonts are embedded (subset), so Bengali shows correctly everywhere."""
    from weasyprint import HTML

    return HTML(string=build_html(doc, kind), base_url=str(BASE_DIR) + "/").write_pdf(uncompressed_pdf=not compress)
