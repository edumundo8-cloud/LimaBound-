# LimaBound

Juego de artillería 2D por turnos ambientado en el centro de Lima. La versión
actual incluye combate 1v1, viento que afecta la trayectoria, terreno con
relieve, Plaza San Martín como zona bloqueada y personajes inspirados en Lima.

Versión jugable: https://skybound-alpha.carlosvasquez800.chatgpt.site

## Requisitos

- Node.js 22.13 o posterior
- npm

## Desarrollo local

```bash
npm ci
npm run dev
```

## Verificación

Antes de proponer cambios:

```bash
npm test
npm run lint
```

## Trabajo con varias IAs

`main` siempre representa la versión estable. Cada mejora se desarrolla en una
rama independiente y entra mediante un pull request revisado.

Ejemplos de ramas:

- `codex/nombre-de-tarea`
- `spark/nombre-de-tarea`
- `claude/nombre-de-tarea`

Lee `AGENTS.md` y `AI_CONTEXT.md` antes de modificar el juego. Las tareas
pendientes y su estado se mantienen en `TASKS.md`; los cambios publicados se
registran en `CHANGELOG.md`.

## Estructura principal

- `app/page.tsx`: interfaz y lógica principal del juego
- `app/globals.css`: estilos, escenario y animaciones
- `app/api/room/route.ts`: salas 1v1
- `public/game/`: escenarios y recursos gráficos del juego
- `public/characters/`: recursos de personajes
- `.openai/hosting.json`: vínculo con la publicación de ChatGPT Sites

## Regla de seguridad

No incluyas claves, tokens, credenciales ni información personal en el
repositorio. No publiques una nueva versión sin probarla y recibir aprobación.
