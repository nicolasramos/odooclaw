# QA_RUNBOOK.md

# Odoo MCP v1 - Runbook de QA

Este documento define la validación manual e integrada del servidor Odoo MCP contra una instancia real de Odoo 18.

## Objetivo

Validar que:

- el servidor MCP arranca correctamente
- la autenticación y reautenticación funcionan
- las tools de Sprint 1 y Sprint 2 funcionan sobre Odoo real
- los resources dinámicos aportan contexto útil
- la seguridad respeta ACLs, Record Rules y políticas propias
- el aislamiento multiempresa funciona
- la serialización de salida es limpia para LLMs
- los logs y errores son útiles para operación y diagnóstico

---

## Alcance

Incluye validación de:

- conexión y sesión
- resources
- partners
- activities
- chatter
- tasks
- sales summaries
- seguridad
- multiempresa
- errores forzados
- stress ligero

No incluye todavía:

- creación y confirmación de presupuestos
- compras pesadas
- facturas de proveedor
- batch operations
- dry-run transaccional real

---

## Prerrequisitos

### Instancia Odoo
- Odoo 18 accesible desde el entorno donde corre el MCP

### Usuarios
- `usuario_admin_pruebas`
- `usuario_operativo_pruebas`

### Empresas
Idealmente:
- `Empresa A`
- `Empresa B`

### Datos de prueba mínimos
- 5 partners
- 3 tareas
- 3 pedidos de venta
- 3 actividades
- chatter con mensajes previos en algunos registros

### Datos recomendados
#### Partners
- `ACME SL`
- `Construcciones Teide`
- `Bodegas Atlántico`
- `Proveedor Norte`
- `Cliente Demo B`

#### Tareas
- `Migración cliente ACME`
- `Revisión facturación marzo`
- `Preparar propuesta Teide`

#### Ventas
- 1 presupuesto en borrador
- 1 pedido confirmado
- 1 presupuesto en otra empresa

---

## Preparación

### 1. Configurar entorno
Verificar que el MCP dispone de:

- URL de Odoo
- base de datos
- usuario
- credenciales/API key
- límites configurados
- allowlists y denylists cargadas

### 2. Arrancar el servidor
Esperado:
- arranque sin traceback
- tools registradas
- resources registrados
- configuración cargada

### 3. Confirmar catálogo esperado
Tools mínimas esperadas:

- `odoo_get_partner_summary`
- `odoo_create_activity`
- `odoo_list_pending_activities`
- `odoo_mark_activity_done`
- `odoo_post_chatter_message`
- `odoo_find_task`
- `odoo_create_task`
- `odoo_update_task`
- `odoo_find_sale_order`
- `odoo_get_sale_order_summary`
- `odoo_get_record_summary`

Resources esperados:

- `odoo://models`
- `odoo://model/{model}/schema`
- `odoo://session/context`
- `odoo://companies/allowed`
- `odoo://record/{model}/{id}/summary`
- `odoo://record/{model}/{id}/chatter_summary`

---

## Fase 1 - Conexión y sesión

### Caso 1.1 - Login inicial
**Acción**
- ejecutar una tool simple de lectura

**Esperado**
- autenticación correcta
- respuesta válida
- sin errores de sesión

### Caso 1.2 - Reutilización de sesión
**Acción**
- ejecutar 3 llamadas seguidas

**Esperado**
- no hay relogin innecesario
- el contexto se mantiene estable

### Caso 1.3 - Re-login automático
**Acción**
- invalidar sesión o reiniciar Odoo
- repetir una llamada

**Esperado**
- reautenticación automática
- llamada resuelta correctamente

**Fallo**
- 401/403 sin recuperación
- pérdida de contexto
- errores intermitentes de sesión

---

## Fase 2 - Validación de Resources

### Caso 2.1 - `odoo://models`
**Esperado**
- listado legible de modelos accesibles
- sin ruido técnico excesivo

### Caso 2.2 - `odoo://model/res.partner/schema`
**Esperado**
- campos
- tipos
- required
- readonly
- relaciones

### Caso 2.3 - `odoo://session/context`
**Esperado**
- usuario
- idioma
- timezone
- company_id
- allowed_company_ids

### Caso 2.4 - `odoo://companies/allowed`
**Esperado**
- empresas accesibles del contexto

### Caso 2.5 - `odoo://record/res.partner/{id}/summary`
**Esperado**
- resumen limpio y corto
- útil para LLM
- sin campos basura

### Caso 2.6 - `odoo://record/project.task/{id}/summary`
**Esperado**
- nombre
- estado
- proyecto
- responsable
- fechas relevantes

### Caso 2.7 - `odoo://record/sale.order/{id}/summary`
**Esperado**
- cliente
- estado
- importe
- comercial
- fechas
- resumen de líneas

### Caso 2.8 - `odoo://record/{model}/{id}/chatter_summary`
**Esperado**
- resumen temporalmente coherente
- sin ruido innecesario

**Fallo**
- exposición de campos sensibles
- relaciones crudas difíciles de usar
- texto poco útil para modelos

---

## Fase 3 - Sprint 1: Partners, Activities y Chatter

### Caso 3.1 - `odoo_get_partner_summary`
**Probar**
- partner existente
- partner inexistente
- partner sin permisos

**Esperado**
- resumen claro
- documentos/actividades si aplica
- error limpio si no existe o no hay acceso

---

### Caso 3.2 - `odoo_create_activity`
**Probar**
- actividad sobre partner
- actividad sobre task
- actividad con usuario asignado
- actividad con fecha

**Esperado**
- actividad creada
- id devuelto
- vínculo correcto con el registro

**Fallo**
- actividad sin enlace correcto
- empresa incorrecta
- bypass de permisos

---

### Caso 3.3 - `odoo_list_pending_activities`
**Probar**
- por usuario
- por partner
- por task
- sin filtros

**Esperado**
- listado coherente
- orden razonable
- límite aplicado
- sin duplicados inesperados

---

### Caso 3.4 - `odoo_mark_activity_done`
**Probar**
- actividad válida
- actividad ya cerrada
- actividad inexistente

**Esperado**
- se marca correctamente
- feedback opcional si aplica
- error claro cuando corresponda

---

### Caso 3.5 - `odoo_post_chatter_message`
**Probar**
- post en partner
- post en task
- post en sale.order

**Esperado**
- mensaje visible en Odoo
- autor correcto
- registro destino correcto

**Fallo**
- mensaje en registro equivocado
- duplicado
- autor incorrecto

---

### Caso 3.6 - `odoo_get_record_chatter_summary`
**Probar**
- task con historial
- sale.order con historial
- registro sin chatter

**Esperado**
- resumen breve
- orden cronológico coherente
- sin exceso de ruido

---

## Fase 4 - Sprint 2: Tasks y Sales

### Caso 4.1 - `odoo_find_task`
**Probar**
- por nombre
- por proyecto
- por usuario
- por estado

**Esperado**
- coincidencias correctas
- límite respetado
- salida clara

---

### Caso 4.2 - `odoo_create_task`
**Probar**
- creación mínima
- con proyecto
- con usuario
- con partner
- con deadline

**Esperado**
- tarea creada
- visible en Odoo
- empresa correcta
- responsable correcto

**Fallo**
- proyecto incorrecto
- empresa incorrecta
- asignación errónea

---

### Caso 4.3 - `odoo_update_task`
**Probar**
- cambiar nombre
- cambiar responsable
- cambiar deadline
- cambiar descripción
- intentar tocar campo no permitido

**Esperado**
- campos permitidos actualizados
- campos prohibidos rechazados

---

### Caso 4.4 - `odoo_find_sale_order`
**Probar**
- por número
- por partner
- por estado
- por comercial

**Esperado**
- resultados correctos
- orden razonable
- límite aplicado
- no mezcla empresas

---

### Caso 4.5 - `odoo_get_sale_order_summary`
**Probar**
- presupuesto borrador
- pedido confirmado
- pedido inexistente

**Esperado**
- cliente
- estado
- importes
- fechas
- líneas resumidas
- error limpio si no existe o no hay acceso

---

### Caso 4.6 - `odoo_get_record_summary`
**Probar**
- `res.partner`
- `project.task`
- `sale.order`
- modelo no allowlisted

**Esperado**
- resumen coherente por modelo
- rechazo claro en modelo no permitido

---

## Fase 5 - Seguridad

### Caso 5.1 - Usuario con permisos limitados
Usar `usuario_operativo_pruebas`.

**Probar**
- leer partner permitido
- crear tarea permitida
- escribir donde no debe
- leer pedido de otra empresa
- post chatter sin permiso, si aplica

**Esperado**
- Odoo bloquea donde corresponde
- MCP devuelve errores claros
- no hay escalada de privilegios

---

### Caso 5.2 - Denylist de campos
**Probar escritura sobre**
- `company_id`
- `state` si está restringido
- campos sensibles definidos

**Esperado**
- rechazo inmediato
- traza de intento bloqueado

---

### Caso 5.3 - Modelo no allowlisted
**Probar**
- summary de modelo no permitido
- write en modelo no permitido

**Esperado**
- rechazo claro y consistente

---

## Fase 6 - Multiempresa

### Caso 6.1 - Usuario Empresa A
**Probar**
- leer partner de Empresa A
- leer partner de Empresa B
- crear actividad sobre registro de Empresa B
- leer sale.order de Empresa B

**Esperado**
- acceso correcto solo a Empresa A
- rechazo en accesos cruzados

### Caso 6.2 - Usuario multiempresa
**Probar**
- lectura con `allowed_company_ids`
- cambios de contexto si están soportados
- consultas separadas por empresa

**Esperado**
- sin mezcla de datos
- contexto respetado en cada llamada

**Fallo crítico**
- lecturas cruzadas inesperadas
- escrituras en empresa equivocada

---

## Fase 7 - Serialización

### Revisión manual obligatoria
Revisar outputs reales de:

- partner summary
- task summary
- sale order summary
- chatter summary

**Deben cumplir**
- nombres claros
- relaciones legibles
- sin arrays crudos innecesarios
- sin campos técnicos irrelevantes
- sin datos sensibles

**Buena señal**
```json
{
  "partner": {
    "id": 34,
    "name": "ACME SL"
  }
}
```
