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
			ID:        "accounting.unposted_invoices",
			Area:      "accounting",
			Title:     "Facturas en borrador sin publicar",
			SignalKey: "unposted_invoices",
			MinCount:  5,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "He visto que estás en Contabilidad y tienes {n} facturas en borrador sin publicar. " +
				"¿Quieres que te explique cómo publicarlas en bloque, o prefieres revisarlas una a una?",
		},
		{
			ID:        "accounting.unposted_vendor_bills",
			Area:      "accounting",
			Title:     "Facturas de proveedor sin registrar",
			SignalKey: "unposted_vendor_bills",
			MinCount:  3,
			Priority:  15,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} factura(s) de proveedor en borrador sin registrar. " +
				"¿Quieres que te explique cómo registrarlas y dejarlas listas para pago?",
		},
		{
			ID:        "accounting.unreconciled_statement",
			Area:      "accounting",
			Title:     "Extracto bancario sin conciliar",
			SignalKey: "unreconciled_statement_lines",
			MinCount:  1,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} línea(s) de extracto bancario sin conciliar. " +
				"¿Te enseño a conciliarlas y a dejar el banco cuadrado?",
		},
		{
			ID:        "accounting.verifactu_pending",
			Area:      "accounting",
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
			ID:        "sales.draft_quotations",
			Area:      "sales",
			Title:     "Presupuestos en borrador",
			SignalKey: "draft_quotations",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskLow,
			Template: "Estás en Ventas y tienes {n} presupuestos en borrador. " +
				"¿Quieres que te explique cómo enviarlos y hacerles seguimiento automático?",
		},
		{
			ID:        "sales.stale_opportunities",
			Area:      "sales",
			Title:     "Oportunidades sin actividad",
			SignalKey: "stale_opportunities",
			MinCount:  5,
			Priority:  20,
			Risk:      knowledge.RiskLow,
			Template: "Hay {n} oportunidades sin actividad reciente en tu embudo. " +
				"¿Te muestro cómo programar actividades para que no se enfríen?",
		},
		{
			ID:        "purchases.draft_purchase_orders",
			Area:      "purchases",
			Title:     "Pedidos de compra en borrador",
			SignalKey: "draft_purchase_orders",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} pedidos de compra en borrador. " +
				"¿Quieres que te explique cómo confirmarlos a proveedor?",
		},
		{
			ID:        "inventory.negative_stock",
			Area:      "inventory",
			Title:     "Productos con stock negativo",
			SignalKey: "negative_stock_products",
			MinCount:  1,
			Priority:  30,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} producto(s) con stock negativo en tu almacén. " +
				"Suele indicar un ajuste pendiente o una entrega no registrada. ¿Lo revisamos?",
		},
		{
			ID:        "hr.pending_leaves",
			Area:      "hr",
			Title:     "Solicitudes de ausencia pendientes",
			SignalKey: "pending_leave_requests",
			MinCount:  1,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} solicitud(es) de ausencia esperando aprobación. " +
				"¿Quieres verlas y resolverlas ahora?",
		},
		{
			// CRM is its own area, not part of "ventas": the engine filters
			// playbooks strictly by area, and the user who lives in the
			// pipeline is not the one who lives in quotations.
			ID:        "crm.stale_opportunities",
			Area:      "crm",
			Title:     "Oportunidades sin actividad programada",
			SignalKey: "stale_opportunities",
			MinCount:  5,
			Priority:  20,
			Risk:      knowledge.RiskLow,
			Template: "Hay {n} oportunidad(es) en tu embudo sin ninguna actividad " +
				"programada. ¿Te muestro cómo programarlas para que no se enfríen?",
		},
		{
			ID:        "crm.open_opportunities",
			Area:      "crm",
			Title:     "Oportunidades abiertas",
			SignalKey: "open_opportunities",
			MinCount:  10,
			Priority:  30,
			Risk:      knowledge.RiskLow,
			Template: "Tienes {n} oportunidades abiertas. ¿Quieres que revisemos " +
				"cuáles llevan más tiempo paradas?",
		},
		{
			ID:        "crm.overdue_opportunities",
			Area:      "crm",
			Title:     "Oportunidades con cierre previsto vencido",
			SignalKey: "overdue_opportunities",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskLow,
			Template: "Hay {n} oportunidad(es) cuya fecha de cierre prevista ya " +
				"pasó y siguen sin ganar. ¿Las repasamos y actualizamos la fecha?",
		},
		{
			ID:        "gastos.draft_expenses",
			Area:      "expenses",
			Title:     "Gastos sin enviar",
			SignalKey: "draft_expenses",
			MinCount:  3,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} gasto(s) sin enviar. ¿Quieres que te explique " +
				"cómo enviarlos juntos en una hoja de gastos?",
		},
		{
			ID:        "gastos.expenses_awaiting_approval",
			Area:      "expenses",
			Title:     "Gastos esperando aprobación",
			SignalKey: "expenses_awaiting_approval",
			MinCount:  3,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} gasto(s) esperando aprobación. ¿Quieres revisarlos " +
				"y aprobarlos desde aquí?",
		},
		{
			ID:        "proyectos.open_projects",
			Area:      "projects",
			Title:     "Proyectos abiertos",
			SignalKey: "open_projects",
			MinCount:  10,
			Priority:  40,
			Risk:      knowledge.RiskLow,
			Template: "Tienes {n} proyectos abiertos. ¿Quieres que veamos cuáles " +
				"no han tenido movimiento en las últimas semanas?",
		},
		{
			ID:        "proyectos.overdue_projects",
			Area:      "projects",
			Title:     "Proyectos con la fecha de fin vencida",
			SignalKey: "overdue_projects",
			MinCount:  1,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} proyecto(s) cuya fecha de fin ya pasó y siguen " +
				"abiertos. ¿Actualizamos la planificación?",
		},
		{
			ID:        "proyectos.overdue_tasks",
			Area:      "projects",
			Title:     "Tareas vencidas sin cerrar",
			SignalKey: "overdue_tasks",
			MinCount:  5,
			Priority:  10,
			Risk:      knowledge.RiskMedium,
			Template: "Tienes {n} tarea(s) con la fecha límite pasada y sin " +
				"cerrar. ¿Quieres que te ayude a repasarlas o reprogramarlas?",
		},
		{
			ID:        "proyectos.waiting_tasks",
			Area:      "projects",
			Title:     "Tareas en espera",
			SignalKey: "waiting_tasks",
			MinCount:  5,
			Priority:  30,
			Risk:      knowledge.RiskLow,
			Template: "Hay {n} tarea(s) en espera. Suele significar que algo se " +
				"quedó bloqueado mucho antes de llegar al cliente. ¿Lo miramos?",
		},
		{
			ID:        "proyectos.urgent_tasks",
			Area:      "projects",
			Title:     "Tareas marcadas como urgentes",
			SignalKey: "urgent_tasks",
			MinCount:  3,
			Priority:  20,
			Risk:      knowledge.RiskLow,
			Template: "Tienes {n} tarea(s) marcadas como urgentes y todavía " +
				"abiertas. ¿Revisamos prioridades?",
		},
		{
			ID:        "flota.unregistered_vehicles",
			Area:      "fleet",
			Title:     "Vehículos sin matricular",
			SignalKey: "unregistered_vehicles",
			MinCount:  1,
			Priority:  20,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} vehículo(s) aún sin matricular. ¿Quieres que te " +
				"muestre cómo completar el alta?",
		},
		{
			ID:        "flota.vehicles_without_driver",
			Area:      "fleet",
			Title:     "Vehículos sin conductor asignado",
			SignalKey: "vehicles_without_driver",
			MinCount:  1,
			Priority:  30,
			Risk:      knowledge.RiskMedium,
			Template: "Hay {n} vehículo(s) matriculado(s) y sin conductor " +
				"asignado. ¿Los repartimos?",
		},
	}
}

// knowledgeAreaKey is the metadata key a knowledge entry uses to declare the
// functional area it belongs to. Playbooks and knowledge entries share it, so
// the engine and the retrieval use the same vocabulary.
const knowledgeAreaKey = "area"
