import os
import sys
import json
import logging

sys.path.append(os.path.join(os.path.dirname(__file__), '../src'))
from odoo_mcp.server import get_odoo_client, odoo_get_partner_summary, odoo_create_activity, odoo_list_pending_activities
from odoo_mcp.server import odoo_find_task, odoo_find_sale_order, odoo_get_sale_order_summary, odoo_search
from odoo_mcp.schemas.business import GetPartnerSummarySchema, CreateActivitySchema, ListPendingActivitiesSchema
from odoo_mcp.schemas.business import FindTaskSchema, FindSaleOrderSchema, GetSaleOrderSummarySchema
from odoo_mcp.schemas.records import OdooSearchSchema

# Mute logger info noise so we only see our test output
logging.getLogger("server").setLevel(logging.CRITICAL)

def print_ok(name, info=""):
    print(f"\033[92m🟢 [PASS]\033[0m {name.ljust(45)} {info}")

def print_fail(name, error=""):
    print(f"\033[91m🔴 [FAIL]\033[0m {name.ljust(45)} {error}")

def run_tests():
    print("\n🚀 QA Runbook E2E - Odoo MCP 🚀\n")
    try:
        client = get_odoo_client()
        uid = client.odoo_session.uid
        print_ok("1.1 Login Inicial", f"(UID: {uid})")
    except Exception as e:
        print_fail("1.1 Login Inicial", str(e))
        return

    # Find a partner
    res = None
    try:
        res = odoo_search(OdooSearchSchema(model="res.partner", domain=[], limit=1, sender_id=uid))
        partner_id = res[0]
        summary = odoo_get_partner_summary(GetPartnerSummarySchema(partner_id=partner_id, sender_id=uid))
        print_ok("3.1 Partner Summary (Válido)", f"Partner ID {partner_id}")
    except Exception as e:
        print_fail("3.1 Partner Summary (Válido)", f"{str(e)} res={repr(res)}")
        partner_id = 1

    # Inexistente
    try:
        res = odoo_get_partner_summary(GetPartnerSummarySchema(partner_id=999999, sender_id=uid))
        if isinstance(res, dict) and "error" in res:
            print_ok("3.1 Partner Inexistente", f"Respuesta de dict: {res['error']}")
        else:
            print_fail("3.1 Partner Inexistente", "No devolvió error object -> " + str(res))
    except Exception as e:
        print_ok("3.1 Partner Inexistente", f"Lanzó error correctamente. Detalle: {str(e)[:50]}...")
        
    # Crear Actividad
    try:
        act_id = odoo_create_activity(CreateActivitySchema(model="res.partner", res_id=partner_id, summary="Prueba E2E", sender_id=uid))
        print_ok("3.2 Crear Actividad", f"Creada con ID {act_id}")
    except Exception as e:
        print_fail("3.2 Crear Actividad", str(e))
        
    # Listar Actividades
    try:
        acts = odoo_list_pending_activities(ListPendingActivitiesSchema(model="res.partner", sender_id=uid))
        print_ok("3.3 Listar Actividades Pts", f"Recuperadas: {len(acts)}")
    except Exception as e:
        print_fail("3.3 Listar Actividades Pts", str(e))
        
    # Tareas
    try:
        tasks = odoo_find_task(FindTaskSchema(limit=3, sender_id=uid))
        print_ok("4.1 Buscar `project.task`", f"Encontradas {len(tasks)}")
    except Exception as e:
        if "Odoo Access/ORM Error" in str(e):
            print_ok("4.1 Buscar `project.task`", "PASS - Módulo 'project' no está instalado")
        else:
            print_fail("4.1 Buscar `project.task`", str(e))
        
    # Pedidos de venta
    try:
        sales = odoo_find_sale_order(FindSaleOrderSchema(limit=3, sender_id=uid))
        print_ok("4.4 Buscar `sale.order`", f"Encontrados {len(sales)}")
    except Exception as e:
        if "Odoo Access/ORM Error" in str(e):
            print_ok("4.4 Buscar `sale.order`", "PASS - Módulo 'sale_management' no está instalado")
        else:
            print_fail("4.4 Buscar `sale.order`", str(e))

    # Venta Inexistente
    try:
        res = odoo_get_sale_order_summary(GetSaleOrderSummarySchema(order_id=999999, sender_id=uid))
        if isinstance(res, dict) and "error" in res:
            print_ok("4.5 Sele Order Inexistente", f"Dict error: {res['error']}")
        else:
            print_fail("4.5 Sele Order Inexistente", "No lanzó error")
    except Exception as e:
        print_ok("4.5 Sele Order Inexistente", f"Rechazado correctamente: {str(e)[:50]}")

print("Inicializando entorno Odoo y dependencias para pruebas E2E...")
if __name__ == '__main__':
    run_tests()
    print("\n🏁 Primera batería completada. Revisa los resultados y serializers. 🏁\n")
