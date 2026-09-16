# Tareas de LimaBound

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
