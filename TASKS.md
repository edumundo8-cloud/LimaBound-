# Tareas de LimaBound

## Verificación de efectos — 2026-09-18

- Producción: compilación correcta. `npm test`: 96 pasan; siguen fallando las 2 pruebas heredadas (`cloudflare:` y `--tw-enter-opacity`), también reproducidas antes de editar (94 pasaban).
- `npm run lint`: 1 error preexistente en `TeamGame.tsx` (`react-hooks/immutability`, `clockOffset`) y 16 advertencias. El error se confirmó sobre el archivo original de Claude. No hay errores nuevos en los efectos.
- Nuevas regresiones: tamaño y profundidad del cráter, Bala 1/Dual/SS, daño sin cambios y tornado guardado al comenzar/terminar su ciclo. Las pruebas existentes cubren series completas, colisiones, bots y salas.
- API HTTP local: crear sala, segundo jugador, empezar, disparar SS y consultar desde ambos jugadores; trayectoria, cráteres y tornado coinciden.
- Navegador local: partida con bots, caminar, cargar y disparar; escritorio y teléfono vertical 390×844. Inspección visual de fotogramas de proyectil, explosión y tornado. No sustituye una partida en dos teléfonos físicos.

## Próximo ciclo

- [ ] Corregir los 2 tests heredados del starter que fallan por `cloudflare:` y utilidades de animación de Tailwind.
- [x] Corregir el error de lint preexistente por `setState` dentro del efecto de conexión.
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
