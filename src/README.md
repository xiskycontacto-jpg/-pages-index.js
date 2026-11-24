# Nexora IA — runtime 3.7.3

Restauración del runtime recuperado del despliegue de Vercel del 24-11-2026.

## Estructura
- api/agents.js: catálogo de agentes.
- api/health.js: diagnóstico de proveedores y memoria.
- api/run.js: ejecución del orquestador y especialistas.
- api/image.js: generación de imágenes Cloudflare Workers AI.
- lib/memory.js: memoria persistente Neon.

## Variables de entorno
- GROQ_API_KEY o OPENROUTER_API_KEY
- POSTGRES_URL (o DATABASE_URL)
- CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID
- FIRECRAWL_API_KEY (opcional; investigación web futura)

No se incluyen secretos en el repositorio.
