import html
import re
from urllib.parse import urlparse


def markdown_to_safe_html(text):
    content = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not content:
        return ""

    blocks = []
    paragraph = []
    bullet_items = []
    ordered_items = []
    code_lines = []
    in_code_block = False

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            blocks.append("<p>%s</p>" % _render_inline(" ".join(paragraph)))
            paragraph = []

    def flush_bullets():
        nonlocal bullet_items
        if bullet_items:
            items = "".join(
                "<li>%s</li>" % _render_inline(item) for item in bullet_items
            )
            blocks.append("<ul>%s</ul>" % items)
            bullet_items = []

    def flush_ordered():
        nonlocal ordered_items
        if ordered_items:
            items = "".join(
                "<li>%s</li>" % _render_inline(item) for item in ordered_items
            )
            blocks.append("<ol>%s</ol>" % items)
            ordered_items = []

    def flush_code_block():
        nonlocal code_lines
        if code_lines:
            escaped = html.escape("\n".join(code_lines), quote=False)
            blocks.append("<pre><code>%s</code></pre>" % escaped)
            code_lines = []

    for raw_line in content.split("\n"):
        stripped = raw_line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            if in_code_block:
                flush_code_block()
            else:
                code_lines = []
            in_code_block = not in_code_block
            continue

        if in_code_block:
            code_lines.append(raw_line)
            continue

        bullet_match = re.match(r"^[-*+]\s+(.*)$", stripped)
        if bullet_match:
            flush_paragraph()
            flush_ordered()
            bullet_items.append(bullet_match.group(1))
            continue

        ordered_match = re.match(r"^\d+\.\s+(.*)$", stripped)
        if ordered_match:
            flush_paragraph()
            flush_bullets()
            ordered_items.append(ordered_match.group(1))
            continue

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            level = min(len(heading_match.group(1)), 6)
            blocks.append(
                "<h%d>%s</h%d>" % (level, _render_inline(heading_match.group(2)), level)
            )
            continue

        if not stripped:
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            continue

        paragraph.append(stripped)

    if in_code_block:
        flush_code_block()
    flush_paragraph()
    flush_bullets()
    flush_ordered()
    return "\n".join(blocks)


def _render_inline(text):
    rendered = html.escape(text or "", quote=False)
    rendered = re.sub(r"`([^`]+)`", lambda m: "<code>%s</code>" % m.group(1), rendered)
    rendered = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", rendered)
    rendered = re.sub(r"__(.+?)__", r"<strong>\1</strong>", rendered)
    rendered = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", rendered)
    rendered = re.sub(r"(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)", r"<em>\1</em>", rendered)
    rendered = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", _render_link, rendered)
    return rendered


def _render_link(match):
    label = match.group(1)
    href = html.unescape(match.group(2)).strip()
    parsed = urlparse(href)
    if parsed.scheme and parsed.scheme not in ("http", "https", "mailto"):
        return label
    safe_href = html.escape(href, quote=True)
    return '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (
        safe_href,
        label,
    )
