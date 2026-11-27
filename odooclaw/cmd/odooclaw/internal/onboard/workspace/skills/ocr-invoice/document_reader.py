"""Read an Odoo attachment as a document: bytes -> text -> structured block.

Before this module the agent had to do the sequence by hand on every message:
decode the base64 in ``ir.attachment.datas``, write a file somewhere in the
workspace, call the OCR pipeline, remember to delete the file. Every step
leaked: a stale file stayed on disk, a pipeline run was fed a path it could
not open, a scanned PDF was read as an empty string and the invoice came back
with no amounts.

The reader owns that sequence once. It is model-agnostic on purpose: the
numbers in the returned block come from the deterministic fiscal parser inside
``pipeline.py``; the model, when one is configured, only interprets the header.
When a page has neither a text layer nor a configured OCR engine it says so
instead of returning an empty invoice.

Nothing here knows about Odoo or the MCP wire format: the download and the
vision call are injected, which keeps the logic testable without a server.
"""

import os
import shutil
import subprocess
import tempfile
import time

# A single document is capped like any other upload. The ceiling protects the
# gateway's memory (the bytes travel base64 through Odoo) more than the disk.
MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

# What the model gets to see. A four page invoice is well under this; a
# 200-page contract is not, and truncating keeps the tool answer bounded.
MAX_TEXT_CHARS = 20_000

# A real text layer carries words. Below this many non-space characters what
# pdftotext returned is a page number or a stray header, and the page has to be
# rendered and OCR'd like a scan.
PDF_TEXT_MIN_CHARS = 40

# Same default the pipeline uses for its own PDF rendering.
DEFAULT_MAX_PAGES = 4
DEFAULT_DPI = 150

PDF_MAGIC = b"%PDF-"

IMAGE_MIMES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
    "image/bmp",
    "image/gif",
}
TEXT_MIMES = {"text/plain", "text/csv", "text/markdown", "application/json"}
AUDIO_MIMES = {
    "audio/ogg",
    "audio/opus",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "video/webm",
}

_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif")
_TEXT_EXTENSIONS = (".txt", ".csv", ".md", ".json")
_AUDIO_EXTENSIONS = (".ogg", ".oga", ".opus", ".mp3", ".wav", ".m4a", ".webm")


class DocumentReaderError(Exception):
    """The document cannot be read at all.

    Raised for an unsupported type, an oversized payload, a missing poppler
    binary or a scan with no OCR engine configured. An invoice whose fields do
    not validate is NOT an error: it comes back with ``review_required`` true.
    """


def detect_kind(filename, mimetype, raw):
    """Classify the payload as ``pdf``, ``image``, ``text``, ``audio`` or ``other``.

    The bytes win over the declared mimetype: Odoo stores whatever the client
    sent, and a ``.pdf`` uploaded as ``application/octet-stream`` is common.
    """
    name = (filename or "").lower()
    mime = (mimetype or "").split(";")[0].strip().lower()

    if raw[:5] == PDF_MAGIC or mime == "application/pdf" or name.endswith(".pdf"):
        return "pdf"
    if mime in IMAGE_MIMES or name.endswith(_IMAGE_EXTENSIONS):
        return "image"
    if mime in TEXT_MIMES or name.endswith(_TEXT_EXTENSIONS):
        return "text"
    if mime in AUDIO_MIMES or name.endswith(_AUDIO_EXTENSIONS):
        return "audio"
    return "other"


def has_usable_text(text, min_chars=PDF_TEXT_MIN_CHARS):
    """True when *text* is more than punctuation, form feeds and page numbers."""
    if not text:
        return False
    return len("".join(text.split())) >= min_chars


def _binary(name):
    """Locate poppler's tool, preferring the Homebrew path the gateway uses."""
    homebrew = os.path.join("/opt/homebrew/bin", name)
    if os.path.exists(homebrew):
        return homebrew
    return shutil.which(name)


def extract_pdf_text(pdf_path, *, max_pages=DEFAULT_MAX_PAGES, timeout=60, runner=None):
    """Return the text layer of the first *max_pages* pages, layout preserved.

    ``-layout`` matters: the fiscal parser reads label/value pairs and the
    plain mode reflows them into a soup where the total and the untaxed amount
    become indistinguishable.
    """
    binary = _binary("pdftotext")
    if not binary:
        raise DocumentReaderError(
            "pdftotext (poppler-utils) is not installed, so the PDF text layer cannot be read"
        )

    cmd = [
        binary,
        "-layout",
        "-enc",
        "UTF-8",
        "-f",
        "1",
        "-l",
        str(max_pages),
        pdf_path,
        "-",
    ]
    run = runner or subprocess.run
    try:
        proc = run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise DocumentReaderError(f"cannot run {binary}: {exc}") from exc
    except subprocess.TimeoutExpired as exc:
        raise DocumentReaderError(
            f"pdftotext did not finish within {timeout}s"
        ) from exc

    returncode = getattr(proc, "returncode", 0)
    if returncode:
        detail = (getattr(proc, "stderr", "") or "").strip()
        raise DocumentReaderError(f"pdftotext failed (exit {returncode}): {detail}")

    out = getattr(proc, "stdout", "") or ""
    # pdftotext separates pages with a form feed; the pipeline reads one text.
    return out.replace("\f", "\n").strip()


def render_pdf_pages(
    pdf_path,
    out_dir,
    *,
    max_pages=DEFAULT_MAX_PAGES,
    dpi=DEFAULT_DPI,
    timeout=120,
    runner=None,
):
    """Render the first *max_pages* pages to PNG bytes, in page order."""
    binary = _binary("pdftoppm")
    if not binary:
        raise DocumentReaderError(
            "pdftoppm (poppler-utils) is not installed, so scanned pages cannot be rendered"
        )

    prefix = os.path.join(out_dir, "page")
    cmd = [
        binary,
        "-png",
        "-r",
        str(dpi),
        "-f",
        "1",
        "-l",
        str(max_pages),
        pdf_path,
        prefix,
    ]
    run = runner or subprocess.run
    try:
        proc = run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise DocumentReaderError(
            f"pdftoppm did not finish within {timeout}s"
        ) from exc

    returncode = getattr(proc, "returncode", 0)
    if returncode:
        detail = (getattr(proc, "stderr", "") or "").strip()
        raise DocumentReaderError(f"pdftoppm failed (exit {returncode}): {detail}")

    names = sorted(
        name
        for name in os.listdir(out_dir)
        if name.startswith("page") and name.lower().endswith(".png")
    )
    pages = []
    for name in names[:max_pages]:
        with open(os.path.join(out_dir, name), "rb") as handle:
            pages.append(handle.read())
    if not pages:
        raise DocumentReaderError("pdftoppm produced no pages")
    return pages


def _clean_lines(lines):
    """Keep the pipeline's line shape, dropping anything that is not a row."""
    cleaned = []
    for line in lines or []:
        if not isinstance(line, dict):
            continue
        cleaned.append(
            {
                "name": str(line.get("name") or line.get("description") or "Item").strip()
                or "Item",
                "quantity": line.get("quantity", 1),
                "price_unit": line.get("price_unit", line.get("unit_price")),
                "price_subtotal": line.get("price_subtotal", line.get("subtotal")),
                "tax_percentage": line.get("tax_percentage", line.get("tax_rate")),
            }
        )
    return cleaned


def build_invoice_block(pipeline_output):
    """Map the pipeline's output onto the block the MCP clients consume.

    The pipeline speaks Odoo-ish (``ref``, ``invoice_line_ids``, ``_ok``); the
    contract callers rely on is ``partner_name``, ``invoice_number``,
    ``amount_total`` and ``lines``. The deterministic values the pipeline put
    in ``invoice_number`` win over the model's ``ref`` guess.
    """
    data = pipeline_output or {}

    invoice_number = data.get("invoice_number") or data.get("ref") or ""
    amount_total = data.get("amount_total")
    issues = [str(issue) for issue in (data.get("_issues") or [])]
    validation_ok = bool(data.get("_ok"))

    invoice_number = str(invoice_number).strip()
    partner_name = str(data.get("partner_name") or "").strip()

    return {
        "partner_name": partner_name,
        "vat": str(data.get("vat") or "").strip(),
        "invoice_number": invoice_number,
        "invoice_date": str(data.get("invoice_date") or data.get("date") or "").strip(),
        "currency": str(data.get("currency") or "").strip(),
        "amount_total": amount_total,
        "amount_tax": data.get("amount_tax"),
        "amount_untaxed": data.get("amount_untaxed", data.get("amount_subtotal")),
        "lines": _clean_lines(data.get("invoice_line_ids") or data.get("lines")),
        "is_invoice": bool(partner_name or invoice_number or amount_total is not None),
        "validation_ok": validation_ok,
        "issues": issues,
        "review_required": not validation_ok,
        "fiscal_found": bool(data.get("fiscal_found")),
        "is_reverse_charge": bool(data.get("is_reverse_charge")),
    }


def _ocr_page(ocr_image, image_bytes, mimetype):
    """Run the injected OCR engine, turning its failures into reader errors."""
    try:
        return ocr_image(image_bytes, mimetype) or ""
    except DocumentReaderError:
        raise
    except Exception as exc:  # noqa: BLE001 - the engine is foreign code
        raise DocumentReaderError(f"the OCR engine failed: {exc}") from exc


def _decode_text(raw):
    for encoding in ("utf-8", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def read_document_bytes(
    raw,
    *,
    filename,
    mimetype,
    attachment_id=None,
    max_pages=DEFAULT_MAX_PAGES,
    dpi=DEFAULT_DPI,
    ocr_image=None,
    pipeline_runner=None,
    timeout=120,
    workdir=None,
    clock=time.monotonic,
):
    """Read *raw* attachment bytes into a text + invoice block.

    Args:
        raw: the decoded bytes of ``ir.attachment.datas``.
        filename: original name, used when the mimetype lies.
        mimetype: declared mimetype, a hint only.
        attachment_id: echoed back so the caller can trace the block.
        max_pages: PDF pages to read before giving up on the rest.
        ocr_image: ``callable(image_bytes, mimetype) -> str`` used for scans and
            images. ``None`` means no OCR engine is available.
        pipeline_runner: ``callable(text) -> dict`` running the 4-layer
            pipeline. ``None`` skips the structured block and returns text.
        timeout: wall-clock budget for the whole read, in seconds.
        workdir: parent for the scratch directory. Defaults to the system temp
            dir; the gateway passes its workspace so nothing is written outside.

    Returns:
        A JSON-serialisable dict. ``text_source`` says where the text came
        from, ``is_invoice`` whether the pipeline recognised an invoice, and
        ``review_required`` whether a human has to look at the numbers.

    Raises:
        DocumentReaderError: when there is no way to read the document.
    """
    if not raw:
        raise DocumentReaderError("attachment has no bytes to read")

    size = len(raw)
    if size > MAX_DOCUMENT_BYTES:
        raise DocumentReaderError(
            f"attachment is {size} bytes, over the {MAX_DOCUMENT_BYTES}-byte limit"
        )

    kind = detect_kind(filename, mimetype, raw)
    mime = (mimetype or "").split(";")[0].strip().lower()

    if kind == "audio":
        raise DocumentReaderError(
            "audio attachments are transcribed with the whisper-stt tools, not read as documents"
        )
    if kind == "other":
        raise DocumentReaderError(
            f"cannot read '{filename or attachment_id}' ({mimetype or 'unknown type'}): "
            "only PDF, images and plain text are supported"
        )

    started = clock()
    work = tempfile.mkdtemp(prefix="read_document_", dir=workdir)
    try:
        text = ""
        text_source = ""

        if kind == "pdf":
            pdf_path = os.path.join(work, "document.pdf")
            with open(pdf_path, "wb") as handle:
                handle.write(raw)

            text = extract_pdf_text(pdf_path, max_pages=max_pages, runner=None)
            if has_usable_text(text):
                text_source = "pdf_text_layer"
            else:
                if ocr_image is None:
                    raise DocumentReaderError(
                        "the PDF has no text layer and no OCR engine is configured; "
                        "set OCR_PIPELINE_VISION_URL or attach a digital PDF"
                    )
                pages = render_pdf_pages(pdf_path, work, max_pages=max_pages, dpi=dpi)
                chunks = []
                for page in pages:
                    if clock() - started > timeout:
                        raise DocumentReaderError(
                            f"reading the document exceeded the {timeout}s budget"
                        )
                    chunks.append(_ocr_page(ocr_image, page, "image/png").strip())
                text = "\n".join(chunk for chunk in chunks if chunk).strip()
                text_source = "vision_ocr"

        elif kind == "image":
            if ocr_image is None:
                raise DocumentReaderError(
                    "no OCR engine is configured for images; "
                    "set OCR_PIPELINE_VISION_URL or send a PDF with a text layer"
                )
            text = _ocr_page(ocr_image, raw, mime or "image/png").strip()
            text_source = "vision_ocr"

        else:  # plain text: no OCR, no layout
            text = _decode_text(raw).strip()
            text_source = "plain_text"

        if not text:
            raise DocumentReaderError(
                "no text could be extracted from the document"
                f" (source: {text_source or kind})"
            )

        payload = {
            "success": True,
            "attachment_id": attachment_id,
            "filename": filename,
            "mimetype": mimetype,
            "bytes": size,
            "kind": kind,
            "text_source": text_source,
            "text_chars": len(text),
            "text_truncated": len(text) > MAX_TEXT_CHARS,
            "text": text[:MAX_TEXT_CHARS],
        }

        if pipeline_runner is not None:
            try:
                block = build_invoice_block(pipeline_runner(text))
            except Exception as exc:  # noqa: BLE001 - the text is still worth returning
                payload.update(
                    {
                        "is_invoice": False,
                        "review_required": True,
                        "pipeline_error": f"{type(exc).__name__}: {exc}",
                    }
                )
            else:
                payload.update(block)
        else:
            payload.update({"is_invoice": False, "review_required": False})

        return payload
    finally:
        # The scratch file holds a client document: it never outlives the call.
        shutil.rmtree(work, ignore_errors=True)
