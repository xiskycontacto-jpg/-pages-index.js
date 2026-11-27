# NEXORA Automation — tres automatizaciones iniciales

Documento de diseño para construir en el runtime actual. Ninguno de estos flujos está activado todavía.

## Flujo 1 — Captura y clasificación de oportunidades
**Objetivo:** convertir una consulta entrante en un registro ordenado para seguimiento.

1. Entrada: formulario web propio o carga manual.
2. Validación: comprobar campos mínimos y consentimiento cuando corresponda.
3. Registro: guardar consulta, fecha, fuente y estado en Neon.
4. Clasificación: SUPREMA asigna categoría, urgencia y siguiente paso sugerido.
5. Resultado: tarjeta en el panel para revisión humana.

**Estados:** nuevo → clasificado → pendiente de revisión → contactado (solo cuando el usuario confirme) → cerrado.

**Criterio de aceptación:** una entrada de prueba se guarda una sola vez, se clasifica y aparece en el panel sin enviar mensajes externos.

## Flujo 2 — Borradores de respuesta comercial
**Objetivo:** preparar respuestas consistentes sin enviar nada automáticamente.

1. Leer una oportunidad aprobada.
2. Sales Copilot prepara un borrador según el servicio y el contexto.
3. Money & Growth revisa alcance, precio y margen; si faltan datos, marca “pendiente”.
4. SUPREMA devuelve el borrador y una lista de datos por confirmar.
5. Una persona revisa, edita y decide si lo envía.

**Criterio de aceptación:** el sistema produce un borrador y registra que está pendiente de aprobación; no existe envío automático.

## Flujo 3 — Informe semanal de actividad
**Objetivo:** resumir el trabajo de NEXORA y detectar bloqueos.

1. Consultar tareas y ejecuciones del periodo.
2. Separar completadas, fallidas, bloqueadas y pendientes.
3. Calcular métricas solo a partir de registros existentes.
4. Identificar costes conocidos y costes no medidos.
5. Generar informe para revisión.

**Criterio de aceptación:** cada cifra del informe se puede rastrear a un registro; los datos ausentes aparecen como “no disponibles”.

## Componentes técnicos previstos
- API del proyecto Vercel.
- Neon/Postgres para tareas, eventos y oportunidades.
- Runtime LLM ya presente en `src/api/run.js`.
- SUPREMA y especialistas registrados en el catálogo actual.
- Panel de administración existente.

## Tablas propuestas (pendientes de implementación)
### nexora_tasks
- id
- title
- objective
- status
- priority
- owner_agent
- requires_approval
- created_at
- updated_at
- completed_at

### nexora_task_events
- id
- task_id
- event_type
- actor
- detail
- created_at

### nexora_leads
- id
- source
- name_or_company
- contact_details (solo con base y permisos adecuados)
- need
- status
- classification
- created_at
- updated_at

## Seguridad y coste
- No guardar claves ni datos sensibles en el contenido de tareas.
- Restringir acceso a datos de clientes.
- Definir retención y borrado antes de captar datos reales.
- No conectar mensajería, email ni CRM hasta tener permisos.
- No contratar servicios de pago: cualquier coste futuro requiere aprobación.
- Empezar con datos sintéticos y pruebas internas.
