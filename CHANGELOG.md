# Historial de cambios

## Unreleased

- Los personajes se voltean hacia el lado al que caminan y vuelven a mirar al rival al disparar.
- El DUAL SHOT puede armarse en cualquier momento antes de disparar (ya no exige el turno exacto) y se desarma al empezar la ronda.
- El marcador de Miraflores deja de ser un dibujo de CSS: ahora usa una ilustración del faro (`public/game/faro-miraflores.png`), con tono nocturno y sombra de apoyo.
- Se añadió una selección inicial con seis personajes peruanos; el Perro Peruano reemplaza a Chaski y la elección se sincroniza en salas 1v1.
- El escenario avanza solo, sin pulsar nada, 1,6 s despues del golpe final: al terminar la ronda el campo queda limpio sobre el mapa siguiente y el boton solo arranca la ronda.
- La vida del rival ya no baja antes de que el proyectil lo toque: la barra retiene el valor anterior y el golpeado se sacude y suelta un grito al recibir el impacto.
- El lienzo se repinta al cambiar de ronda o de escenario, y solo cuando el fondo esta realmente listo (antes podia quedarse el mapa anterior hasta la siguiente accion).
- El fondo avanza a la siguiente zona de Lima al pasar de ronda y al empezar una partida nueva, y vuelve a la primera al completar la vuelta.
- Plaza San Miguel entra en la rotación con su propio fondo nocturno y el marcador del óvalo de La Marina.
- La lista de escenarios vive en `lib/scenes.ts`; la sala 1v1 calcula el relieve con ese mismo índice en lugar de asumir cuatro mapas.
- Los proyectiles ahora recorren la trayectoria a la mitad de la velocidad visual anterior.
- En computadoras de escritorio, la barra espaciadora dispara Bala 1 o Dual Shot cuando la potencia está lista.
- Se añadieron reglas y documentación para colaboración segura entre varias IAs.
- Se ajustaron las explosiones, los cráteres y la detección 2D de daño sobre los personajes.
- Chaski y El Rosado ahora disparan proyectiles de colores distintos.
- Los personajes parpadean cada cinco segundos.
- Cada turno dura siete segundos y cambia automáticamente al agotarse el contador.
- El viento ahora se mantiene durante dos turnos por jugador antes de cambiar.
- Se añadieron efectos de sonido sintetizados para viento, movimiento y disparos.
- Cada turno permite elegir Cura (+40 HP) o Dual Shot (dos disparos).
- SS ahora se recarga después de cuatro turnos propios en lugar de limitarse a un solo uso.
- El límite del turno aumentó de siete a nueve segundos.
- La potencia ahora se selecciona manteniendo y soltando una barra de carga.
- Cura y Dual Shot comparten un único uso por jugador durante cada ronda.
- Se suavizaron y modernizaron los sonidos del juego.
- Se ajustaron específicamente la explosión, el cráter y la detección de impacto de Chaski.
- La potencia ahora comienza y se reinicia en cero; es obligatorio cargarla antes de disparar.
- La barra de potencia ahora es larga, horizontal y ocupa todo el ancho del panel de controles.
- Se corrigió el redibujado que podía ocultar la explosión de Chaski y se añadió un anillo de choque visible sobre el terreno.
- Las partidas ahora se disputan al mejor de tres rondas y muestran Victoria o Derrota al concluir la serie.
- Cada turno dura diez segundos y existe una pausa bloqueada de 1.5 segundos antes de que juegue el rival.
- Los fondos rotan entre Jirón de la Unión, Miraflores, Gamarra y Costa Verde, con relieve distinto en cada turno.
- La barra de potencia se movió inmediatamente debajo del mapa y los items quedaron más abajo.
- La explosión de Chaski ahora incluye un efecto visible independiente del lienzo y el bot espera la transición antes de atacar.

## v0.1-alpha — 2026-09-03

- Cambio de nombre a LimaBound.
- Escenario nocturno del centro de Lima y Jirón de la Unión.
- Plaza San Martín añadida como obstáculo central.
- Barrista de Sport Boys añadido.
- Vida de personajes incrementada 60%.
- Viento más visible y con mayor efecto sobre la trayectoria.
- Movimiento adaptado suavemente al relieve y animación de piernas al caminar.
- Proyectil básico renombrado a Bala 1.
- Huayco renombrado a SS con 20% más daño.
- Comentarios variados con español más neutro.
