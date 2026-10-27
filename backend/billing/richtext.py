"""Rich text for the proposal. The editor produces HTML; this keeps only a safe, small set of it,
so a pasted script, event handler or odd link can never reach a customer's browser or a PDF."""

import nh3

TAGS = {
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "blockquote",
    "ul", "ol", "li", "a", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col", "code", "pre",
}
ATTRS = {
    "a": {"href"},
    "p": {"style"}, "h2": {"style"}, "h3": {"style"}, "h4": {"style"}, "th": {"style", "colspan", "rowspan"},
    "td": {"style", "colspan", "rowspan"}, "li": {"style"},
}
STYLES = {"text-align"}  # alignment is the only inline style allowed
SCHEMES = {"http", "https", "mailto", "tel"}


def clean_html(html: str) -> str:
    return nh3.clean(
        html or "",
        tags=TAGS,
        attributes=ATTRS,
        filter_style_properties=STYLES,
        url_schemes=SCHEMES,
        link_rel="noopener noreferrer nofollow",
    ).strip()


def from_plain(text: str) -> str:
    """Old proposals were plain text. Show them as paragraphs."""
    from html import escape

    return "".join(f"<p>{escape(line)}</p>" for line in (text or "").splitlines() if line.strip())


def points_from_plain(text: str) -> str:
    """Old item details were one point per line. Show them as a bullet list."""
    from html import escape

    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    return "<ul>" + "".join(f"<li>{escape(line)}</li>" for line in lines) + "</ul>" if lines else ""
