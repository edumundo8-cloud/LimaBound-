# Instrucciones para agentes de coding

Estas reglas se aplican a Codex, Muse Code/Spark, Claude Code y cualquier otro
asistente que trabaje en este repositorio.

## Antes de editar

1. Lee `README.md`, `AI_CONTEXT.md`, `TASKS.md` y este archivo.
2. Comprueba que trabajas en una rama propia, nunca directamente en `main`.
3. Revisa el estado de Git y conserva los cambios ajenos.
4. Describe en una frase el alcance exacto de la tarea.

## Durante el trabajo

- Cambia únicamente los archivos necesarios para la tarea.
- Conserva la arquitectura, el package manager y el lockfile existentes.
- No elimines funciones o recursos porque parezcan sin uso sin verificarlo.
- Separa cambios de jugabilidad, interfaz y refactorización en pull requests distintos.
- Evita dependencias nuevas salvo que sean indispensables.
- No modifiques `.openai/hosting.json` ni publiques el Site sin autorización explícita.
- No uses datos sensibles en prompts cuando trabajes con un plan Contributor.

## Antes de entregar

1. Ejecuta `npm test`.
2. Ejecuta `npm run lint`.
3. Revisa el diff completo.
4. Actualiza `CHANGELOG.md` si el cambio será publicado.
5. Entrega un resumen, pruebas realizadas, riesgos y capturas solo si se solicitan.

Compara los resultados con la línea base documentada en `TASKS.md`. No ocultes
fallos preexistentes ni los atribuyas al cambio actual; tampoco amplíes una tarea
para corregirlos sin autorización.

## Convenciones de Git

- Ramas: `<agente>/<tarea-corta>`.
- Commits: imperativo y específico, por ejemplo `Improve wind trajectory feedback`.
- Un pull request debe resolver una tarea coherente.
- No mezcles arreglos no relacionados.
- No fuerces pushes, no reescribas historia compartida y no hagas merge sin revisión.
