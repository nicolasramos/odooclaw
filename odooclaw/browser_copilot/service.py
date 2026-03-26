from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from .detector_odoo import detect_odoo_context
from .prompts import build_planning_hint
from .schemas import (
    ActionType,
    PlanResponse,
    SnapshotAnalysis,
    SnapshotElement,
    SnapshotPayload,
    SuggestedAction,
    ActionTarget,
)


IMPORTANT_FIELD_HINTS = {
    "res.partner": ["name", "email", "phone", "vat"],
    "sale.order": ["partner", "payment terms", "order lines"],
    "account.move": ["partner", "invoice date", "due date", "journal", "invoice lines"],
    "project.task": ["name", "stage", "assignees"],
    "crm.lead": ["name", "email", "phone", "expected revenue"],
}


@dataclass
class SnapshotMemory:
    latest_by_domain: dict[str, SnapshotPayload] = field(default_factory=dict)

    def store(self, snapshot: SnapshotPayload) -> None:
        self.latest_by_domain[snapshot.page.domain] = snapshot

    def latest(self, domain: str) -> Optional[SnapshotPayload]:
        return self.latest_by_domain.get(domain)


class BrowserCopilotService:
    def __init__(self) -> None:
        self._memory = SnapshotMemory()

    def process_snapshot(self, snapshot: SnapshotPayload) -> SnapshotAnalysis:
        detection = detect_odoo_context(snapshot)
        self._memory.store(snapshot)

        issues = self._detect_obvious_issues(snapshot, detection.model)
        next_actions = self._next_actions(snapshot, detection.detected)
        summary = self._build_summary(snapshot, detection.detected)

        return SnapshotAnalysis(
            status="ok",
            app=detection,
            summary=summary,
            issues=issues,
            suggested_next_actions=next_actions,
        )

    def build_plan(
        self, snapshot: SnapshotPayload, instruction: str, read_only: bool
    ) -> PlanResponse:
        lowered = instruction.lower().strip()
        _ = build_planning_hint(snapshot, instruction)
        intent = self._classify_intent(lowered)
        reasoning_summary = self._reasoning_snapshot(snapshot, intent)

        analysis = self.process_snapshot(snapshot)
        detected_app = analysis.app

        actions: list[SuggestedAction] = []
        if not read_only:
            actions = self._suggest_actions(
                snapshot, lowered, intent, detected_app.model
            )

        confidence = 0.88 if detected_app.detected == "odoo" else 0.72
        high_confidence_intents = {
            "summarize_record",
            "audit_form",
            "list_available_buttons",
            "improve_quote",
            "analyze_pricing",
            "analyze_payment_terms",
        }
        if intent in high_confidence_intents:
            confidence += 0.08
        if actions:
            confidence += 0.03
        confidence = min(confidence, 0.98)

        return PlanResponse(
            intent=intent,
            reasoning_summary=reasoning_summary,
            actions_suggested=actions,
            confidence=confidence,
        )

        confidence = 0.88 if snapshot.app.detected == "odoo" else 0.72
        high_confidence_intents = {
            "summarize_record",
            "audit_form",
            "list_available_buttons",
            "improve_quote",
            "analyze_pricing",
            "analyze_payment_terms",
        }
        if intent in high_confidence_intents:
            confidence += 0.08
        if actions:
            confidence += 0.03
        confidence = min(confidence, 0.98)
        confidence = min(confidence, 0.97)

        return PlanResponse(
            intent=intent,
            reasoning_summary=reasoning_summary,
            actions_suggested=actions,
            confidence=confidence,
        )

    def latest_snapshot(self, domain: str) -> Optional[SnapshotPayload]:
        return self._memory.latest(domain)

    def _build_summary(self, snapshot: SnapshotPayload, detected: str) -> str:
        element_count = len(snapshot.elements)
        form_count = len(snapshot.forms)
        table_count = len(snapshot.tables)
        return (
            f"Captured {element_count} interactive elements, {form_count} forms, and {table_count} tables "
            f"on domain {snapshot.page.domain} (detected app: {detected})."
        )

    def _detect_obvious_issues(
        self, snapshot: SnapshotPayload, model: Optional[str]
    ) -> list[str]:
        issues: list[str] = []
        required_hints = IMPORTANT_FIELD_HINTS.get(model or "", [])
        labels = {(element.label or "").lower() for element in snapshot.elements}
        values = {
            (element.label or element.name or "").lower(): (element.value or "").strip()
            for element in snapshot.elements
            if element.type in {"input", "textarea", "select"}
        }

        for required in required_hints:
            present = any(required in label for label in labels)
            if not present:
                continue
            field_value = ""
            for name, value in values.items():
                if required in name:
                    field_value = value
                    break
            if not field_value:
                issues.append(f"Field related to '{required}' appears empty.")

        if not snapshot.elements:
            issues.append("No interactive elements found on the visible page.")
        return issues

    def _next_actions(self, snapshot: SnapshotPayload, detected: str) -> list[str]:
        suggestions = [
            "Review empty important fields before saving.",
            "Check available primary buttons for the next workflow step.",
        ]
        if detected == "odoo":
            suggestions.insert(0, "Ask for a quick record summary before editing.")
        if snapshot.tables:
            suggestions.append("Inspect visible table rows for inconsistencies.")
        return suggestions[:5]

    def _classify_intent(self, instruction: str) -> str:
        lowered = instruction.lower()

        # Consultas de resumen/información
        if any(
            token in lowered
            for token in {
                "resume",
                "resumen",
                "summary",
                "info",
                "informacion",
                "muestrame",
                "ensename",
            }
        ):
            return "summarize_record"

        # Consultas de auditoría/errores
        if any(
            token in lowered
            for token in {
                "falta",
                "missing",
                "error",
                "errores",
                "audit",
                "auditar",
                "revisar",
                "check",
            }
        ):
            return "audit_form"

        # Consultas sobre botones disponibles
        if any(
            token in lowered
            for token in {
                "boton",
                "botones",
                "buttons",
                "acciones",
                "actions",
                "puedo hacer",
                "que puedo",
            }
        ):
            return "list_available_buttons"

        # Consultas de completar/rellenar
        if any(
            token in lowered
            for token in {
                "rellena",
                "fill",
                "completa",
                "complete",
                "completar",
                "llenar",
                "faltan datos",
            }
        ):
            return "fill_missing_data"

        # Consultas de mejora/optimización para presupuestos
        if any(
            token in lowered
            for token in {
                "mejorar",
                "mejora",
                "optimizar",
                "optimizacion",
                "mejoremos",
                "como mejorar",
                "como mejoramos",
            }
        ):
            return "improve_quote"

        # Consultas sobre descuentos/precios
        if any(
            token in lowered
            for token in {
                "descuento",
                "discount",
                "precio",
                "price",
                "rebaja",
                "oferta",
                "mejor precio",
            }
        ):
            return "analyze_pricing"

        # Consultas sobre términos de pago/plazos
        if any(
            token in lowered
            for token in {
                "plazo",
                "pago",
                "terminos",
                "terms",
                "condiciones",
                "vencimiento",
                "vence",
            }
        ):
            return "analyze_payment_terms"

        return "perform_form_action"

    def _reasoning_snapshot(self, snapshot: SnapshotPayload, intent: str) -> str:
        return (
            f"Intent '{intent}' inferred from user instruction and page context with "
            f"{len(snapshot.elements)} interactive elements on {snapshot.page.domain}."
        )

    def _suggest_actions(
        self,
        snapshot: SnapshotPayload,
        instruction: str,
        intent: str,
        model: Optional[str],
    ) -> list[SuggestedAction]:
        actions: list[SuggestedAction] = []
        lowered = instruction.lower()

        # Acciones específicas para sale.order
        if model == "sale.order":
            actions.extend(self._suggest_sale_order_actions(snapshot, lowered, intent))

        # Acciones genéricas
        if "guardar" in lowered or "save" in lowered:
            save_button = self._find_button(snapshot.elements, {"save", "guardar"})
            if save_button:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=save_button.id, selector=save_button.selector
                        ),
                        reason="Guardar los cambios del pedido.",
                    )
                )

        # Rellenar campos vacíos solo si el intent es de completar datos
        if intent == "fill_missing_data":
            empty_inputs = [
                element
                for element in snapshot.elements
                if element.type in {"input", "textarea"}
                and element.enabled
                and not (element.value or "").strip()
            ]
            if empty_inputs:
                first = empty_inputs[0]
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.SET_VALUE,
                        target=ActionTarget(
                            element_id=first.id, selector=first.selector
                        ),
                        value="Por completar",
                        reason="Campo obligatorio vacío detectado.",
                    )
                )

        return actions[:5]

    def _suggest_sale_order_actions(
        self, snapshot: SnapshotPayload, instruction: str, intent: str
    ) -> list[SuggestedAction]:
        actions: list[SuggestedAction] = []

        # Buscar botones específicos de sale.order
        confirm_btn = self._find_button(
            snapshot.elements, {"confirmar", "confirm", "pedido de venta"}
        )
        invoice_btn = self._find_button(
            snapshot.elements, {"crear factura", "create invoice", "factura"}
        )
        email_btn = self._find_button(
            snapshot.elements, {"enviar", "send", "correo", "email"}
        )
        preview_btn = self._find_button(snapshot.elements, {"vista previa", "preview"})
        cancel_btn = self._find_button(snapshot.elements, {"cancelar", "cancel"})

        if intent == "improve_quote":
            if preview_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=preview_btn.id, selector=preview_btn.selector
                        ),
                        reason="Revisar el presupuesto antes de enviar al cliente.",
                    )
                )
            if email_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=email_btn.id, selector=email_btn.selector
                        ),
                        reason="Enviar presupuesto al cliente para aprobación.",
                    )
                )
            # Buscar campo de notas o términos para añadir valor
            notes_field = self._find_field_by_label(
                snapshot.elements, {"notas", "notes", "terminos", "terms"}
            )
            if notes_field:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.SET_VALUE,
                        target=ActionTarget(
                            element_id=notes_field.id, selector=notes_field.selector
                        ),
                        value="Oferta válida por 30 días. Descuento del 5% por pago anticipado.",
                        reason="Añadir condiciones comerciales para mejorar la propuesta.",
                    )
                )

        elif intent == "analyze_pricing":
            # Buscar campo de descuento
            discount_field = self._find_field_by_label(
                snapshot.elements, {"descuento", "discount", "desc"}
            )
            if discount_field:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.SET_VALUE,
                        target=ActionTarget(
                            element_id=discount_field.id,
                            selector=discount_field.selector,
                        ),
                        value="5",
                        reason="Aplicar descuento del 5% por volumen.",
                    )
                )
            if preview_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=preview_btn.id, selector=preview_btn.selector
                        ),
                        reason="Revisar precios con el descuento aplicado.",
                    )
                )

        elif intent == "analyze_payment_terms":
            # Buscar campo de términos de pago
            payment_field = self._find_field_by_label(
                snapshot.elements, {"plazo", "termino", "payment", "condicion"}
            )
            if payment_field:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.SELECT_OPTION,
                        target=ActionTarget(
                            element_id=payment_field.id, selector=payment_field.selector
                        ),
                        value="15 días",
                        reason="Establecer plazo de pago a 15 días.",
                    )
                )
            if email_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=email_btn.id, selector=email_btn.selector
                        ),
                        reason="Enviar presupuesto con nuevos términos de pago.",
                    )
                )

        elif intent == "list_available_buttons":
            # Listar todos los botones principales disponibles
            if confirm_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=confirm_btn.id, selector=confirm_btn.selector
                        ),
                        reason="Confirmar el pedido de venta.",
                    )
                )
            if invoice_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=invoice_btn.id, selector=invoice_btn.selector
                        ),
                        reason="Crear factura a partir del pedido confirmado.",
                    )
                )
            if email_btn:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=email_btn.id, selector=email_btn.selector
                        ),
                        reason="Enviar presupuesto/pedido por email al cliente.",
                    )
                )

        return actions

    def _find_field_by_label(
        self, elements: list[SnapshotElement], terms: set[str]
    ) -> Optional[SnapshotElement]:
        for element in elements:
            if element.type not in {"input", "textarea", "select"}:
                continue
            label_text = f"{element.label} {element.name}".lower()
            if any(term in label_text for term in terms):
                return element
        return None

    def _find_button(
        self, elements: list[SnapshotElement], terms: set[str]
    ) -> Optional[SnapshotElement]:
        for element in elements:
            if element.tag not in {"button", "a"}:
                continue
            text = f"{element.text} {element.label}".lower()
            if any(term in text for term in terms):
                return element
        return None


def service_metadata() -> dict[str, Any]:
    return {"component": "browser-copilot", "transport": "http", "ws_ready": True}
