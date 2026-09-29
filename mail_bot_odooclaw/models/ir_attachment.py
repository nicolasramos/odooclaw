# © 2026 Nicolás Ramos — MIT License
"""
Client-side OCR text carried on the attachment.

``runonweb/ocr`` extracts the text of an invoice image **in the browser**,
before the image is ever sent to a third-party vision model. The extracted
text is stored here through :meth:`store_client_ocr` so the odooclaw
``ocr-invoice`` skill can reuse it and skip its vision layer (layer 1).

The fields are ``copy=False`` on purpose: the OCR text belongs to the exact
binary of this attachment. Copying the attachment (e.g. duplicating a record)
must not carry stale OCR text over to different bytes.
"""
from odoo import api, fields, models
from odoo.exceptions import UserError

# Hard cap on accepted client OCR text (chars). A scanned invoice page is a
# few thousand characters; anything past this is abuse or a runaway client.
MAX_OCR_TEXT_CHARS = 200_000


class IrAttachment(models.Model):
    _inherit = "ir.attachment"

    runonweb_ocr_text = fields.Text(
        string="Client OCR text",
        copy=False,
        help="Text extracted from this attachment by runonweb OCR running in the "
             "user's browser. When present, the ocr-invoice pipeline uses it "
             "instead of sending the image to a vision model.",
    )
    runonweb_ocr_confidence = fields.Float(
        string="Client OCR confidence",
        copy=False,
        help="Mean confidence reported by the client OCR model (0..1).",
    )
    runonweb_ocr_at = fields.Datetime(
        string="Client OCR date",
        copy=False,
        readonly=True,
    )

    @api.model
    def store_client_ocr(self, attachment_id, text, confidence=0.0):
        """Attach browser-extracted OCR text to an existing attachment.

        Called by the webclient after ``runonweb/ocr`` has read an invoice
        image locally. The server never re-reads the image here: it only
        stores the text, so no third-party vision call is needed later.

        Guarded by the ``enable_ocr`` kill-switch (fail closed) and by the
        caller's read access on the attachment.
        """
        try:
            attachment_id = int(attachment_id)
        except (TypeError, ValueError):
            raise UserError("Invalid attachment id.")
        if not text or not str(text).strip():
            raise UserError("OCR text is empty.")
        text = str(text)
        if len(text) > MAX_OCR_TEXT_CHARS:
            raise UserError("OCR text exceeds the maximum accepted size.")
        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.0

        settings = self.env["runonweb.settings"].get_default_settings()
        if settings.get("enable_ocr") is not True:
            raise UserError("Client OCR is disabled (runonweb.settings.enable_ocr).")

        # Access check: the caller must be able to read the attachment.
        # search() applies ir.attachment ACLs/records rules for the current user.
        attachment = self.search([("id", "=", attachment_id)], limit=1)
        if not attachment:
            raise UserError("Attachment %s not found or not accessible." % attachment_id)

        attachment.write(
            {
                "runonweb_ocr_text": text,
                "runonweb_ocr_confidence": confidence,
                "runonweb_ocr_at": fields.Datetime.now(),
            }
        )
        return True
