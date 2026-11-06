# The Lost Memory — Contexto del proyecto

## 1. Identidad

- **Nombre:** The Lost Memory
- **Género:** Escape room narrativo, ciencia ficción, aventura y acción ambiental.
- **Ambientación:** Año 2097, complejo de investigación Genesis.
- **Protagonista:** Kiro.
- **IA central:** Lía.
- **Antagonista:** El Alucinador.
- **Modo actual:** Un jugador.
- **Rama de trabajo indicada:** `feature/the-lost-memory`.

El proyecto se desarrolla en el checkout local de `C:\Users\mario\Downloads\hackathon`. La carpeta `Proyecto-21` se mantiene como referencia de solo lectura para reutilizar ideas de movimiento, colisiones, Canvas, pixel art y UI.

## 2. Premisa narrativa

Genesis alberga a Lía, una inteligencia artificial que coordina la infraestructura global. El Alucinador, una copia incompleta de Lía, activa el Protocolo de Entropía y comienza a sobrescribir sistemas del mundo.

Kiro debe atravesar diez salas y recuperar diez fragmentos de contexto antes de que la humanidad pierda la información que mantiene conectados sus sistemas. La misión empieza como un rescate de Lía, pero termina revelando que el propio equipo de Genesis creó al Alucinador y que Kiro autorizó el procedimiento.

## 3. Fragmentos de contexto

1. Identidad
2. Verdad
3. Aprendizaje
4. Percepción
5. Memoria
6. Intención
7. Prioridad
8. Conexión
9. Responsabilidad
10. Contexto completo

## 4. Arquitectura técnica

### Canvas / TypeScript

- Movimiento de Kiro con WASD y flechas.
- Interacción con `E`.
- Game loop con `requestAnimationFrame`.
- Colisiones rectangulares.
- Cámara desplazable.
- Mundo de 10 salas navegables.
- Renderizado pixel-art dibujado por código.
- Pausa del motor cuando se abre un panel HTML.

Archivos principales:

- `src/engine/canvasGame.ts`
- `src/engine/types.ts`
- `src/protagonist.ts`

### HTML / CSS

La interfaz, los puzzles, el mapa, la PC de control, el HUD y los desenlaces se implementan como HTML/CSS superpuesto al Canvas.

Archivos principales:

- `index.html`
- `src/style.css`
- `src/ui/hud.ts`
- `src/ui/mapPanel.ts`
- `src/ui/controlPanel.ts`
- `src/ui/room1Panel.ts`
- `src/ui/verticalSlice.ts`
- `src/ui/lateRoomPanels.ts`

### Estado global

El progreso se concentra en `src/gameState.ts`:

- `currentRoom`
- `fragments`
- `computePower`
- `globalSyncPercent`
- `unlockedDoors`
- `completedPuzzles`
- `ending`

El estado se guarda en `localStorage` mediante `src/state/storage.ts`.

## 5. Mecánicas implementadas

### Limpieza y lógica

El jugador identifica registros anómalos o datos incorrectos.

- Sala 1: registro falso en la estación de seguridad.
- Sala 2: secuencia cronológica del archivo.

### Conexión de redes

El jugador relaciona componentes o sistemas en el orden correcto.

- Sala 2: conexión de archivos y fechas.
- Sala 3: conexión conceptual del laboratorio.
- Sala 8: conexión de herramientas.

### Selección de prompts

El jugador selecciona términos para construir una respuesta contextual.

- Sala 3: contexto y datos completos.
- Sala 9: evidencias de responsabilidad.
- Sala 10: comando final.

Cada error reduce Compute Power. Resolver un puzzle añade fragmentos y aumenta `globalSyncPercent`.

## 6. Salas y módulos

Cada sala tiene su propio módulo en `src/rooms/`:

- `room1Security.ts` — Identidad.
- `room2Archives.ts` — Verdad.
- `room3FrozenLab.ts` — Aprendizaje.
- `room4Vision.ts` — Percepción.
- `room5Memory.ts` — Memoria.
- `room6Intention.ts` — Intención.
- `room7Priority.ts` — Prioridad.
- `room8Connection.ts` — Conexión.
- `room9Responsibility.ts` — Responsabilidad.
- `room10Core.ts` — Contexto completo y desenlaces.

`src/rooms/roomHelpers.ts` contiene lógica común para validar puzzles, aplicar penalizaciones, registrar fragmentos y aumentar la sincronización.

## 7. Desenlaces

La Sala 10 permite construir el comando con:

- `contexto`
- `empatía`
- `conexión`

Después se puede elegir:

1. **Restaurar a Lía** — `SYSTEM RESTORED: 100%`.
2. **Crear un nuevo Genesis** — `NEW GENESIS: ONLINE`.
3. **Permitir la sobrescritura** — `GLOBAL CONTEXT: LOST`.

## 8. Dirección visual

La dirección visual está basada en las ideas de `SKILL_designs.md` y las referencias visuales compartidas:

- Vista cenital 3/4 de laboratorio abandonado.
- Fondo violeta-negro.
- Pixel art dibujado por código.
- Cuadrícula de suelo y paredes técnicas.
- Naranja Bitcoin como color de interacción.
- Verde fósforo para terminales y sistemas activos.
- Rojo para peligro y alertas.
- Paneles rectangulares sin exceso de esquinas redondeadas.
- Tipografía `Press Start 2P`.
- HUD superior derecho.
- Panel inferior de fragmentos.
- Mapa de Genesis como overlay.
- PC de control con estilo terminal verde.
- Glitch cuando la alerta global alcanza niveles críticos.

No se incorporaron las imágenes de referencia como assets; solo se retomaron sus ideas de composición, color y UI.

## 9. Interfaz y controles

- `W`, `A`, `S`, `D`: mover.
- Flechas: mover.
- `E`: interactuar.
- `Tab`: abrir mapa.
- `Esc`: cerrar overlays.
- `M`: activar o desactivar música.
- `F`: pantalla completa.
- Controles táctiles básicos disponibles en pantallas pequeñas.
- Botón de reinicio: borra el estado guardado y recarga el juego.

## 10. Audio

`src/audio/music.ts` genera un dron ambiental sencillo con Web Audio. El audio se activa por interacción del usuario para respetar las políticas de autoplay del navegador.

## 11. Ejecución local

Desde `C:\Users\mario\Downloads\hackathon`:

```powershell
npm install
npm run dev
```

Abrir la URL mostrada por Vite, normalmente `http://localhost:5173`.

Validar el build:

```powershell
npm run build
```

El build actual pasa correctamente con TypeScript y Vite.

## 12. Archivos de configuración

- `package.json` — scripts de desarrollo y build.
- `tsconfig.json` — TypeScript estricto, módulos ES2020 y DOM.
- `.gitignore` — dependencias, builds, logs, entornos y archivos temporales.
- `README.md` — instrucciones breves de ejecución.

## 13. Reglas de colaboración

- No hacer `git commit` ni `git push`.
- El humano revisa y confirma los cambios.
- No modificar `Proyecto-21`; usarlo como referencia.
- Mantener cada sala en su propio módulo.
- Centralizar el estado en `gameState.ts`.
- Mantener puzzles y UI en HTML/CSS, no dibujar puzzles complejos en Canvas.
- Usar `Kiro` como nombre del protagonista en todo texto nuevo.

## 14. Estado actual

El vertical slice técnico está completo: movimiento, 10 zonas navegables, puzzles, HUD, estado persistente, mapa, PC de control, audio, controles táctiles, tres desenlaces y build de producción.

La próxima fase requiere revisión visual y narrativa para decidir:

1. Layout definitivo de cada sala.
2. Sprites finales de Kiro, Lía y El Alucinador.
3. Assets ambientales y efectos de sonido.
4. Diálogos finales y ritmo de las alertas.
5. Diseño final de puertas, obstáculos y peligros ambientales.
