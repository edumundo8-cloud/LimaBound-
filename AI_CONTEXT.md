# Contexto de LimaBound para asistentes de IA

## Visión

LimaBound es un juego móvil de artillería 2D por turnos, ligero y humorístico,
ambientado en Lima durante la noche. La experiencia debe sentirse accesible,
ágil y con personalidad local sin saturar el diálogo de jerga peruana.

## Estado canónico actual

- Nombre: **LimaBound**. No volver a usar Oddbound ni Skybound como nombre visible.
- El escenario rota en cada turno entre Jirón de la Unión, Miraflores, Gamarra y Costa Verde, siempre de noche.
- Plaza San Martín ocupa el centro y es una zona por la que no se puede caminar.
- Los personajes permanecen apoyados en el terreno y siguen suavemente su relieve.
- Al caminar, las piernas deben mostrar movimiento.
- El viento debe ser visible, variar de forma perceptible y afectar la trayectoria.
- El viento cambia después de cuatro turnos globales: dos jugadas por personaje.
- Cada personaje posee un ataque básico y un ataque especial propio.
- El proyectil básico se llama **Bala 1**.
- El ataque anteriormente llamado Huayco se llama **SS**, causa 20% más daño y se recarga cada cuatro turnos propios.
- Cada turno dura diez segundos; al agotarse, cambia automáticamente después de una pausa de 1.5 segundos entre jugadores.
- Cada jugador puede usar un solo item por ronda: Cura (+40 HP y termina el turno) o Dual Shot (dos disparos). Usar uno bloquea el otro.
- La potencia empieza en cero, se define manteniendo presionada una barra de carga horizontal y vuelve a cero después de cada disparo. No se puede disparar sin cargarla.
- Cada partida es una serie al mejor de tres rondas; el primer jugador en ganar dos recibe el resultado final Victoria o Derrota.
- Los proyectiles de cada personaje usan colores distintos y los impactos emplean detección 2D.
- El viento, el movimiento y los disparos cuentan con efectos de sonido modernos, amistosos y ligeros.
- Los personajes parpadean cada cinco segundos.
- La vida de los personajes se incrementó 60% respecto de la versión inicial.
- Los cráteres deben ser moderados y permitir que la partida continúe.
- El perfil del terreno cambia con el escenario en cada turno para mantener partidas dinámicas.
- El ángulo de disparo debe verse junto al personaje.
- Los comentarios usan español mayormente neutro, pocas jergas y humor sencillo e inteligente.
- Existe un barrista achorado y visualmente simple de Sport Boys del Callao.

## Prioridades del producto

1. Mantener una partida 1v1 estable y divertida.
2. Preservar buen funcionamiento táctil y diseño móvil.
3. Mantener legible la trayectoria, el viento, la vida y el turno activo.
4. Evitar cambios que destruyan demasiado rápido el terreno o desequilibren el combate.
5. Favorecer mejoras pequeñas, comprobables y fáciles de revertir.

## Restricciones

- No cambiar nombre, ambientación o reglas centrales sin aprobación del propietario.
- No reemplazar recursos visuales existentes sin explicar la razón.
- No incorporar servicios externos, seguimiento, anuncios o pagos sin aprobación.
- No introducir secretos en el código ni modificar la configuración de publicación por rutina.
- No hacer refactorizaciones amplias junto con cambios de jugabilidad.

## Definición de terminado

Un cambio está terminado cuando compila, supera las pruebas existentes, funciona
con controles táctiles y teclado cuando corresponda, no rompe el flujo 1v1 y su
pull request explica qué cambió, cómo se probó y qué riesgo conserva.
