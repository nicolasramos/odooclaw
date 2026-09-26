package proactive

import "github.com/nicolasramos/odooclaw/pkg/knowledge"

// DefaultPlaybooks is the shipped playbook set.
//
// These are DATA, not documentation. Each one answers "what do I do when this
// happens" for exactly one observable signal in exactly one functional area.
// The copy can be rewritten without touching Go — which is the point, because
// material like VeriFactu has already changed once (RDL 15/2025 moved the
// deadlines to 1-ene-2027 / 1-jul-2027) and must never live in a model prompt.
func DefaultPlaybooks() []Playbook {
	return []Playbook{
		{
			ID:        "contabilidad.unposted_invoices",
			Area:      "contabilidad",
			Title:     "Facturas en borrador sin publicar",
			SignalKey: "unposted_invoices",
			MinCount:  5,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "He visto que estás en Contabilidad y tienes {n} facturas en borrador sin publicar. " +
				"¿Quieres que te explique cómo publicarlas en bloque, o prefieres revisarlas una a una?",
		},
		{
			ID:        "contabilidad.unposted_vendor_bills",
			Area:      "contabilidad",
			Title:     "Facturas de proveedor sin registrar",
			SignalKey: "unposted_vendor_bills",
			MinCount:  3,
			Priority:  15,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} factura(s) de proveedor en borrador sin registrar. " +
				"¿Quieres que te explique cómo registrarlas y dejarlas listas para pago?",
		},
		{
			ID:        "contabilidad.unreconciled_statement",
			Area:      "contabilidad",
			Title:     "Extracto bancario sin conciliar",
			SignalKey: "unreconciled_statement_lines",
			MinCount:  1,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} línea(s) de extracto bancario sin conciliar. " +
				"¿Te enseño a conciliarlas y a dejar el banco cuadrado?",
		},
		{
			ID:        "contabilidad.verifactu_pending",
			Area:      "contabilidad",
			Title:     "VeriFactu pendiente de configurar",
			SignalKey: "verifactu_unconfigured",
			MinCount:  1,
			Priority:  30,
			Risk:      knowledge.RiskHigh,
			Template: "Veo que tu empresa factura en España y el módulo VeriFactu aún no está configurado. " +
				"¿Quieres que te guíe paso a paso? La obligación entra en vigor el 1-ene-2027 " +
				"(sociedades) y el 1-jul-2027 (resto).",
		},
		{
			ID:        "ventas.draft_quotations",
			Area:      "ventas",
			Title:     "Presupuestos en borrador",
			SignalKey: "draft_quotations",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskLow,
			Template: "Estás en Ventas y tienes {n} presupuestos en borrador. " +
				"¿Quieres que te explique cómo enviarlos y hacerles seguimiento automático?",
		},
		{
			ID:        "ventas.stale_opportunities",
			Area:      "ventas",
			Title:     "Oportunidades sin actividad",
			SignalKey: "stale_opportunities",
			MinCount:  5,
			Priority:  20,
			Risk:      knowledge.RiskLow,
			Template: "Hay {n} oportunidades sin actividad reciente en tu embudo. " +
				"¿Te muestro cómo programar actividades para que no se enfríen?",
		},
		{
			ID:        "compras.draft_purchase_orders",
			Area:      "compras",
			Title:     "Pedidos de compra en borrador",
			SignalKey: "draft_purchase_orders",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} pedidos de compra en borrador. " +
				"¿Quieres que te explique cómo confirmarlos a proveedor?",
		},
		{
			ID:        "inventario.negative_stock",
			Area:      "inventario",
			Title:     "Productos con stock negativo",
			SignalKey: "negative_stock_products",
			MinCount:  1,
			Priority:  30,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} producto(s) con stock negativo en tu almacén. " +
				"Suele indicar un ajuste pendiente o una entrega no registrada. ¿Lo revisamos?",
		},
		{
			ID:        "rrhh.pending_leaves",
			Area:      "rrhh",
			Title:     "Solicitudes de ausencia pendientes",
			SignalKey: "pending_leave_requests",
			MinCount:  1,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} solicitud(es) de ausencia esperando aprobación. " +
				"¿Quieres verlas y resolverlas ahora?",
		},
	}
}

// knowledgeAreaKey is the metadata key a knowledge entry uses to declare the
// functional area it belongs to. Playbooks and knowledge entries share it, so
// the engine and the retrieval use the same vocabulary.
const knowledgeAreaKey = "area"
