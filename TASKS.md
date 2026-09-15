# Tareas de LimaBound

## Próximo ciclo

- [x] Corregir los 2 errores de lint preexistentes por `setState` dentro de efectos. *(rama `hermes/refactor-rules-modules-tests`; los avisos del turno se aplazan un microtask)*
- [ ] Corregir los 2 tests heredados del starter que fallan por `cloudflare:` y utilidades de animación de Tailwind.
- [ ] Extraer de `app/page.tsx` el lienzo (`draw`), las animaciones (`animate`) y el dibujo de los combatientes, que siguen siendo el bloque más difícil de editar.
- [ ] Endurecer `makeCode`: con un `Math.random()` exacto como 0.5 el código de sala queda en un solo carácter (`(0.5).toString(36) === "0.i"`). No ocurre con azar real, pero conviene forzar seis caracteres.
- [ ] Probar una partida completa 1v1 en dos teléfonos.
- [ ] Verificar que el viento visible coincida con su efecto real sobre los disparos.
- [ ] Revisar balance entre Bala 1 y los ataques especiales.
- [ ] Revisar que SS mantenga exactamente 20% más daño que su valor anterior.
- [ ] Probar desplazamiento y animación de piernas en todas las pendientes.
- [ ] Confirmar que Plaza San Martín sea inaccesible desde ambos lados.
- [ ] Ampliar comentarios sin aumentar excesivamente la jerga peruana.

## Ideas futuras — requieren aprobación

- [ ] Sistema de cosméticos para personajes, vehículos y explosiones.
- [ ] Más mapas inspirados en distritos de Lima.
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
- `npm test`: 38 pruebas pasan y siguen fallando solo las 2 heredadas del starter.
- `npm run test:units`: 35 pruebas de reglas, salas y sonido pasan.
- `npm run lint`: 0 errores y 14 advertencias preexistentes.
- `lib/game/rules.ts` y `lib/game/sfx.ts` se verificaron equivalentes al código anterior comparando su salida completa (arnés de equivalencia descrito en el PR).
