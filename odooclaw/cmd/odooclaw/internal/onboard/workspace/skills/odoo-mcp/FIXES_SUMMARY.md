### 1. Refactorización Inicial de Odoo-Manager a Odoo-MCP
**Problem/Requirement**: El skill monolítico "odoo-manager" era demasiado genérico y representaba un riesgo de seguridad al exponer acceso completo CRUD al modelo.
**Solution**: 
- Se definió un nuevo `implementation_plan.md` modular para separar responsabilidades.
- [Backend]: Se implementaron los endpoints `session.py` y `client.py` con inyección de autenticación de usuario (`call_kw_as_user`).
- [Backend]: Se añadió `security.py` conteniendo Allowlists y Denylists.

### 2. Refactorización a Arquitectura Definitiva v1 (10/10)
**Problem/Requirement**: Aislar por completo capas teóricas como seguridad, esquemas y lógica de negocio para maximizar la mantenibilidad del MCP.
**Solution**:
- [Backend]: Implementada capa `services/` para aislar la lógica de dominio (partners, facturas, POs) de las `tools/` del MCP.
- [Backend]: Separación de Pydantic models en múltiples archivos dentro de la carpeta `schemas/`.
- [Backend]: Implementado sistema maduro de observabilidad (`observability/` con logging, auditoría de métricas de Odoo y métricas de desempeño).
- [Backend]: Desacoplada la validación de seguridad en `security/policy.py`, `guards.py` y `redaction.py`. Introducido `core/domains.py` para parseo sintáctico seguro.
- [Files]: Todos los archivos en `src/odoo_mcp/*` han sido estandarizados con esta visión de separación de responsabilidades.
