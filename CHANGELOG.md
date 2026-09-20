# Historial de cambios

## Unreleased

- Espacio ahora carga y dispara aunque el foco esté en los controles de SS o Dual Shot; el daño de cada proyectil cae gradualmente según la distancia al impacto y los personajes siguen la inclinación del terreno y de los cráteres.

- Los bots apuntan algo peor: fallan a propósito cerca de cuatro de cada diez tiros en vez de tres, así que aciertan el 63% de las veces en lugar del 71% y pegan un 11% menos por disparo. La búsqueda de ángulo y el resto del comportamiento no cambian.
- `app/TeamGame.tsx` declara sus cajas mutables antes del primer efecto que las lee. Solo cambia el orden, pero con eso desaparece el último error de lint del proyecto (`react-hooks/immutability`).
- El monumento del centro ya no frena disparos en el aire vacío. Plaza San Martín y el Faro de Miraflores llevan ahora su silueta, sacada del alfa de sus ilustraciones, y la pantalla dibuja la imagen dentro de esa misma caja: el proyectil revienta solo donde se ve piedra. El paseo por el centro se mantiene igual que antes.
- El suelo por donde caminan los personajes deja de ser gris plano. Lleva un dibujo limeño de tres colores —tierra de noche, arena y terracota— con el tejido de rombos de una manta al fondo y, pegada a la superficie, una greca escalonada que sigue el relieve. El 2v2 y el duelo 1v1 comparten los motivos.
- Proyectiles con cuerpo iluminado orientado al vuelo, estela caliente que se disipa en humo y explosiones con fuego, polvo, chispas y fragmentos. 2v2 y duelo comparten el renderer, sin modificar trayectorias ni daño.
- Cráteres de Bala 1 y Dual Shot un 10% más anchos y profundos; SS un 20%, tanto en práctica como en salas.
- Tornado con vapor sombreado, embudo visual 15% más estrecho y polvo apoyado en el terreno. La fuerza y duración permanecen iguales; el 2v2 conserva el tornado del disparo hasta finalizar su animación.

- El chat deja de flotar sobre los controles y pasa al flujo de la página en todas las pantallas; en celular horizontal, la selección de personaje y el HUD también se compactan para evitar cruces.
- El jugador 2 puede entrar directamente desde el enlace compartido o usar un código de sala visible y fácil de copiar.
- El chat ocupa menos espacio, conserva solo tres reacciones rápidas y limita el historial visible a los mensajes recientes.
- Las salas 1v1 incluyen voz opcional entre navegadores, con permiso explícito de micrófono, estado de conexión, silencio y salida de voz.
- Las reglas de impacto (radio de explosion, crater, radio del objetivo y dano del SS) viven una sola vez en `lib/battle.ts`; cliente y sala las importan, asi que ya no pueden quedar desincronizadas.
- El hueco de Plaza San Miguel sigue la rasante real del terreno y muestra el canto del asfalto, la pared del fondo iluminada y sombra de contacto.
- El aviso de la sala en la URL se agenda fuera del efecto de conexion: se acaba el error de lint por `setState` sincronico dentro del efecto.
- Plaza San Miguel sustituye el objeto central por un hueco sin suelo que no se puede cruzar.
- El campo y el recorrido de cada lado crecen un 10%; el movimiento por turno pasa de 104 a 114,4.
- SS se selecciona antes de cargar y se lanza con el botón de disparo o la barra espaciadora; no se combina con Dual Shot.
- Después de cada seis turnos aparece un tornado vertical en una posición aleatoria durante dos turnos (uno por jugador). Su giro desvía los proyectiles; práctica, salas y animación comparten la misma física.
- Los mapas se eligen al azar al comenzar y al cambiar de ronda, sin repetir inmediatamente el anterior; la sala 1v1 guarda la elección para que ambos jugadores vean el mismo terreno.
- El fondo vuelve a dibujarse al cargar o decodificar la imagen, evitando que el segundo juego espere una interacción para mostrarse.
- Se quitaron los comentarios centrales entre turnos; permanecen el reloj, el estado del turno, el mapa y el viento. Miraflores conserva el faro ilustrado sin mostrar su rótulo.
- La interfaz móvil ajusta selector, HUD, escenario y controles para pantallas de 390 px y menores.
- El volteo de los personajes tiene en cuenta hacia donde mira cada ilustracion y el lado del campo, y se aplica sin la transicion del contenedor para que no se aplasten al girar.
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
