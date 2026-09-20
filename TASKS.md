# Tareas de LimaBound

## Proyectiles por personaje y cráteres +12% — 2026-09-20

- Renderer compartido en `lib/projectile-art.ts`: hueso, wantán, churro, llanta, boleto y pescado. Los dos clientes toman el personaje del autor del disparo, también para Dual y SS; SS conserva su escala mayor. Los objetos compensan el estiramiento del escenario en teléfono.
- `CRATER_GROWTH = 1.12` aumenta todos los radios actuales en 2v2 y duelo; el perfil de cráter aplica el mismo incremento a su profundidad. Las pruebas de terreno comprueban el incremento sobre el tamaño de la versión anterior y el alcance del hueco.
- QA visual local: seis diseños renderizados con el código real, Bala 1/Dual, SS y escala de teléfono. Sin recursos externos nuevos. Compilación y pruebas: 104 aprobadas y los dos fallos heredados (`cloudflare:` y `--tw-enter-opacity`); lint sin errores.
- Publicación autorizada por Carlos; GitHub y Sites recibirán el mismo commit probado.

## Espacio tras seleccionar items, daño gradual y postura — 2026-09-19

- Rama `codex/impact-damage-terrain-controls`, desde `e6d1212`. Publicada después como `5a7b7f9` en GitHub y versión 20 de Sites, por solicitud de Carlos.
- Espacio funciona con foco en los controles de combate (incluidos SS y Dual), conserva la edición de texto y evita activaciones repetidas al mantener la tecla. En 2v2, una carga lista también se dispara con Espacio.
- Práctica y salas comparten daño gradual: 100% a distancia del centro corporal <=27 unidades, descenso lineal hasta cero en el borde de la explosión, redondeado a HP enteros. Cada proyectil Dual se calcula por separado; se conserva el bonus de ángulo y fuego amigo.
- La postura toma la pendiente a ambos lados de los pies, hasta 30 grados; la altura sigue el suelo deformado. El 2v2 aplica la postura al aparecer cada cráter durante la animación.
- `npm test`: 104 pasan, solo fallan los 2 heredados (`cloudflare:` y `--tw-enter-opacity`), reproducidos antes de editar (100 pasaban). Compilación de producción correcta. `npm run lint`: 0 errores y 17 advertencias.
- Navegador, vista de producción local: cargar, seleccionar SS y pulsar Espacio; repetir con Dual. Ambos disparan y consumen el item. Inspección de postura y controles en escritorio y 390×844. Las salas están cubiertas por las pruebas de lógica existentes; falta partida manual entre dos dispositivos.
- El servidor de desarrollo falló al cargar un módulo virtual en el navegador integrado. La verificación visual se completó con `vite preview`, que usa el runtime Cloudflare del proyecto.

## Silueta del monumento, piso limeño y bots menos certeros — 2026-09-18

- Producción: compilación correcta. `npm test`: 100 pasan; siguen fallando solo las 2 pruebas heredadas (`cloudflare:` y `--tw-enter-opacity`), reproducidas antes de editar (96 pasaban).
- `npm run lint`: **0 errores** y 17 advertencias. Se corrigió el error preexistente de `TeamGame.tsx` moviendo las cajas mutables por encima del primer efecto que las lee; es solo orden, no cambia comportamiento. La advertencia nueva es el ternario del dibujo del piso, que repite el estilo que ya usa `page.tsx` dos veces en la misma función.
- Bots: `BOT_MISS` sube de 0.3 a 0.38. Medido sobre 600 situaciones, los bots pasan de acertar 71% a 63% y de 42.0 a 37.4 de daño por disparo (un bot perfecto haría 60.0). Una prueba nueva fija ese margen para que nadie les suba la puntería sin querer.
- Choque contra el monumento: pruebas nuevas comprueban que ningún punto del vuelo entra en la silueta, que el impacto queda pegado a la piedra sin abrir cráter y que por encima del faro y a los lados de la estatua ya pasa aire. Medido sobre una reja de 1044 disparos por escenario: en Plaza San Martín se liberan ~60% de los choques y en el faro ~110 disparos por posición.
- Navegador local: partida con bots en los dos escenarios con monumento. La caja del dibujo coincide unidad por unidad con la caja de choque (medido en el DOM). Comprobado también el piso nuevo en el 2v2 (SVG) y en el duelo 1v1 (canvas), sin errores de consola.
- Pendiente de ojo humano: en teléfono vertical el escenario entero se estira (fondo y terreno ya lo hacían); el monumento ahora se estira con ellos en vez de ser el único objeto sin deformar.

## Verificación de efectos — 2026-09-18

- Producción: compilación correcta. `npm test`: 96 pasan; siguen fallando las 2 pruebas heredadas (`cloudflare:` y `--tw-enter-opacity`), también reproducidas antes de editar (94 pasaban).
- `npm run lint`: 1 error preexistente en `TeamGame.tsx` (`react-hooks/immutability`, `clockOffset`) y 16 advertencias. El error se confirmó sobre el archivo original de Claude. No hay errores nuevos en los efectos.
- Nuevas regresiones: tamaño y profundidad del cráter, Bala 1/Dual/SS, daño sin cambios y tornado guardado al comenzar/terminar su ciclo. Las pruebas existentes cubren series completas, colisiones, bots y salas.
- API HTTP local: crear sala, segundo jugador, empezar, disparar SS y consultar desde ambos jugadores; trayectoria, cráteres y tornado coinciden.
- Navegador local: partida con bots, caminar, cargar y disparar; escritorio y teléfono vertical 390×844. Inspección visual de fotogramas de proyectil, explosión y tornado. No sustituye una partida en dos teléfonos físicos.

## Próximo ciclo

- [ ] Corregir los 2 tests heredados del starter que fallan por `cloudflare:` y utilidades de animación de Tailwind.
- [x] Corregir el error de lint preexistente por `setState` dentro del efecto de conexión.
- [x] Corregir el error de lint preexistente de `react-hooks/immutability` (`clockOffset` en `TeamGame.tsx`). El proyecto queda sin errores de lint.
- [ ] Probar una partida completa 1v1 en dos teléfonos.
- [ ] Confirmar en el navegador que el fondo cambia al empezar cada juego sin tocar nada mas (el repintado se endureció sin poder ver un navegador desde el entorno de trabajo).
- [x] Sustituir el marcador central de Plaza San Miguel por un hueco infranqueable.
- [ ] Verificar que el viento visible coincida con su efecto real sobre los disparos.
- [ ] Revisar a ojo el hueco de San Miguel y el tornado en el teléfono: el hueco es CSS estilizado (no una ilustración como los fondos) y puede pedir un recurso pintado.
- [ ] Revisar balance entre Bala 1 y los ataques especiales.
- [ ] Revisar que SS mantenga exactamente 20% más daño que su valor anterior.
- [ ] Probar desplazamiento y animación de piernas en todas las pendientes.
- [ ] Confirmar que Plaza San Martín sea inaccesible desde ambos lados.
- [ ] Ampliar comentarios sin aumentar excesivamente la jerga peruana.

## Ideas futuras — requieren aprobación

- [ ] Sistema de cosméticos para personajes, vehículos y explosiones.
- [x] Más mapas inspirados en distritos de Lima. *(Plaza San Miguel añadido; quedan más zonas por aprobar)*
- [ ] Sistema de cuentas, progresión o monetización.

## Plantilla para asignar trabajo a una IA

```markdown
Objetivo:
Archivos permitidos:
Comportamiento esperado:
No cambiar:
Pruebas necesarias:
```

## Línea base técnica — 2026-09-03

- La compilación de producción termina correctamente.
- `npm test`: 3 pruebas pasan y 2 pruebas heredadas del starter fallan.
- `npm run lint`: 2 errores preexistentes y 14 advertencias.
- Los cambios de documentación para colaboración no modifican el juego ni añaden fallos de compilación.

## Línea base técnica — 2026-09-15

- La compilación de producción termina correctamente.
- `npm test`: 21 pruebas pasan y siguen fallando solo las 2 heredadas del starter.
- `npm run lint`: 2 errores preexistentes y 15 advertencias (los mismos de antes de la rotación de mapas).
- `lib/scenes.ts` concentra la lista de escenarios; la rotación y la reacción al golpe tienen pruebas propias (14 en total).
