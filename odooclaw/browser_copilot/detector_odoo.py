from __future__ import annotations

import re
from typing import Optional, Tuple
from urllib.parse import parse_qs, urlparse

from .schemas import AppDetection, SnapshotPayload

KNOWN_MODELS = {
    "res.partner",
    "sale.order",
    "account.move",
    "project.task",
    "crm.lead",
    "purchase.order",
    "stock.picking",
}

# Mapa de palabras clave a modelos
MODEL_KEYWORDS = {
    "sale.order": [
        "presupuesto",
        "pedido de venta",
        "sale order",
        "quotation",
        "presupuestos",
    ],
    "account.move": ["factura", "invoice", "asiento contable", "journal entry"],
    "res.partner": ["cliente", "contacto", "partner", "customer"],
    "project.task": ["tarea", "task"],
    "crm.lead": ["oportunidad", "lead", "crm"],
    "purchase.order": ["pedido de compra", "purchase order"],
    "stock.picking": ["albarán", "picking", "movimiento de stock"],
}


def _detect_view_type(snapshot: SnapshotPayload) -> Optional[str]:
    """Detecta el tipo de vista basado en clases CSS y elementos visibles."""
    haystack = " ".join(
        [
            snapshot.visible_text,
            " ".join(snapshot.headings),
            " ".join(snapshot.breadcrumbs),
        ]
    ).lower()
    selectors = " ".join([element.selector for element in snapshot.elements]).lower()

    # Prioridad: kanban y calendar tienen clases específicas
    if "o_kanban_view" in selectors or "o_kanban" in selectors:
        return "kanban"
    if "o_calendar_view" in selectors or "o_calendar" in selectors:
        return "calendar"
    if "o_list_view" in selectors or "o_list" in selectors:
        return "list"

    # Form: o_form_view o presencia de inputs editables
    if "o_form_view" in selectors:
        return "form"

    # Si hay inputs editables y no hay señales de otras vistas, es form
    has_editable_inputs = any(
        element.type in {"input", "textarea", "select"} and element.enabled
        for element in snapshot.elements
    )

    # Solo marcamos como form si hay inputs Y no hay señales fuertes de otras vistas
    if has_editable_inputs:
        # Verificar que no sea claramente otra vista
        if not any(x in selectors for x in ["o_kanban", "o_calendar", "o_list"]):
            return "form"

    return None


def _extract_model_and_id_from_url(url: str) -> Tuple[Optional[str], Optional[int]]:
    """Extrae modelo e ID de la URL, buscando en fragmento y query string."""
    parsed = urlparse(url)

    # Buscar en fragmento primero (estilo Odoo tradicional)
    fragment = parsed.fragment
    model = None
    record_id = None

    if fragment:
        values = parse_qs(fragment)
        model = values.get("model", [None])[0]
        record_id_raw = values.get("id", [None])[0]

        if record_id_raw and str(record_id_raw).isdigit():
            record_id = int(record_id_raw)

    # Si no encontramos en fragmento, buscar en query string
    if not model:
        query = parse_qs(parsed.query)
        model = query.get("model", [None])[0]
        if not record_id:
            id_raw = query.get("id", [None])[0]
            if id_raw and str(id_raw).isdigit():
                record_id = int(id_raw)

    # Validar modelo
    if model and model not in KNOWN_MODELS:
        # Si tiene punto, podría ser un modelo válido de Odoo
        if "." not in model:
            model = None

    return model, record_id


def _infer_model_from_content(snapshot: SnapshotPayload) -> Optional[str]:
    """Infiere el modelo basado en texto visible, botones y breadcrumbs."""
    # Combinar todo el texto visible
    text_content = " ".join(
        [
            snapshot.visible_text,
            " ".join(snapshot.headings),
            " ".join(snapshot.breadcrumbs),
            " ".join([e.text for e in snapshot.elements if e.text]),
        ]
    ).lower()

    # Buscar botones específicos que indiquen el modelo
    button_texts = [
        (e.text or "").lower()
        for e in snapshot.elements
        if e.tag in {"button", "a"} and e.text
    ]

    # Puntuación por modelo
    scores = {}

    for model, keywords in MODEL_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in text_content:
                score += 2
            # Palabras en botones tienen más peso
            if any(keyword in btn for btn in button_texts):
                score += 3
        if score > 0:
            scores[model] = score

    # Botones muy específicos
    if any("crear factura" in btn or "create invoice" in btn for btn in button_texts):
        scores["sale.order"] = scores.get("sale.order", 0) + 5
    if any(
        "enviar por correo" in btn or "send by email" in btn for btn in button_texts
    ):
        scores["sale.order"] = scores.get("sale.order", 0) + 3

    if not scores:
        return None

    # Devolver el modelo con mayor puntuación
    return max(scores.items(), key=lambda x: x[1])[0]


def _extract_record_id_from_content(snapshot: SnapshotPayload) -> Optional[int]:
    """Intenta extraer el ID del registro desde el contenido visible."""
    # Buscar patrones como "S00026", "INV/2024/001", etc.
    text_to_search = " ".join(
        [
            snapshot.visible_text,
            " ".join(snapshot.headings),
            " ".join(snapshot.breadcrumbs),
        ]
    )

    # Patrón para códigos de presupuesto/pedido: S000XX, SO000XX, etc.
    patterns = [
        r"\bS0*(\d+)\b",  # S00026 -> 26
        r"\bSO0*(\d+)\b",  # SO00026 -> 26
        r"\bINV[/\-]?\d{4}[/\-]?(\d+)\b",  # INV/2024/001
    ]

    for pattern in patterns:
        match = re.search(pattern, text_to_search)
        if match:
            # Extraer solo los dígitos numéricos
            num_str = re.search(r"\d+", match.group(0))
            if num_str:
                try:
                    return int(num_str.group(0))
                except ValueError:
                    pass

    return None


def _extract_visible_fields(snapshot: SnapshotPayload) -> list[str]:
    fields: list[str] = []
    for element in snapshot.elements:
        if element.type in {"input", "textarea", "select"}:
            candidate = element.label or element.name
            candidate = candidate.strip()
            if candidate and candidate not in fields:
                fields.append(candidate)
    return fields[:40]


def _extract_main_buttons(snapshot: SnapshotPayload) -> list[str]:
    buttons: list[str] = []
    for element in snapshot.elements:
        if element.tag in {"button", "a"}:
            text = (element.text or element.label).strip()
            if text and text not in buttons:
                buttons.append(text)
    return buttons[:20]


def detect_odoo_context(snapshot: SnapshotPayload) -> AppDetection:
    url = snapshot.page.url
    selectors = " ".join([element.selector for element in snapshot.elements]).lower()
    hints = " ".join(
        snapshot.breadcrumbs + snapshot.headings + [snapshot.visible_text]
    ).lower()

    in_web = "/web" in url
    has_odoo_css = (
        "o_form" in selectors or "o_list" in selectors or "o_kanban" in selectors
    )
    odoo_wording = "odoo" in hints

    is_odoo = in_web or has_odoo_css or odoo_wording

    # Extraer de URL primero
    model, record_id = _extract_model_and_id_from_url(url)

    # Si no hay modelo, inferir del contenido
    if not model:
        model = _infer_model_from_content(snapshot)

    # Si no hay ID, intentar extraer del contenido
    if not record_id:
        record_id = _extract_record_id_from_content(snapshot)

    view_type = _detect_view_type(snapshot)

    probable_name = snapshot.headings[0] if snapshot.headings else None
    chatter_visible = "chatter" in hints or "o-mail-chatter" in selectors

    confidence = 0.15
    if in_web:
        confidence += 0.35
    if has_odoo_css:
        confidence += 0.35
    if model:
        confidence += 0.1
    if view_type:
        confidence += 0.05

    return AppDetection(
        detected="odoo" if is_odoo else "unknown",
        model=model,
        record_id=record_id,
        view_type=view_type,
        chatter_visible=chatter_visible,
        fields_visible=_extract_visible_fields(snapshot),
        main_buttons_visible=_extract_main_buttons(snapshot),
        probable_record_name=probable_name,
        confidence=min(confidence, 0.99),
    )
