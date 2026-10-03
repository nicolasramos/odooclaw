# Odoo MCP Server

Un Servidor MCP modular, tipado y seguro para interactuar con el ORM de Odoo 18, diseñado bajo los principios de Desarrollo Guiado por Pruebas (TDD) y Delegación de Permisos Nativos.

## Overview
Reemplaza el antiguo enfoque monolítico con tools granulares (búsqueda, lectura, escritura con denylist estricta, acciones seguras).
Las operaciones Odoo se ejecutan bajo el contexto de seguridad nativo del identificador de usuario invocante, previniendo cualquier escalada de privilegios accidental.

## Enlaces clicables a registros (NRA-425)

`odoo_read` y `odoo_search_read` devuelven, además de los campos solicitados, un campo sintético `__url` por registro que apunta a la vista form del registro en el cliente web (`{ODOO_URL}/web#id={id}&model={model}&view_type=form`). El prefijo `__` evita colisionar con campos reales del modelo. El bot responde con enlaces markdown `[Nombre](url)` que `mail_bot_odooclaw` renderiza clicables (target=_blank) en el chat.

## Architecture
- **Core Layer**: Administra la sesión RPC, cookies y cliente Odoo (`call_kw`, `call_kw_as_user`).
- **MCP Resources Layer**: Expone metadatos persistentes al LLM (`schema`, `context`, `models`).
- **Tools Layer**: Funciones modulares puras estrictamente segmentadas (Introspección, Genéricas de CRUD y Negocio).
- **Security Layer**: Obliga el uso de Allowlists (para modelos), Denylists (protección estructural de registros) y validación de borrado.

## Configuration
Requires environment variables:
`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`
