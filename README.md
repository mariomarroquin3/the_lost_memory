# El Rescate del Contexto

Escape room cooperativo de ciencia ficción para dos jugadores (uno por mundo) o en modo individual.
TypeScript + Canvas 2D con el pixel art de Proyecto 21, interfaz HTML/CSS y partidas en tiempo real por WebSocket.

## Ejecutar

```powershell
npm install
npm run dev
```

`npm run dev` levanta el juego **y** el servidor de partidas (ruta `/ws`) en el mismo puerto.
Vite escucha también en la red local, así que el segundo jugador puede entrar desde otra PC con la URL «Network» que muestra la consola.

Producción (un solo proceso, sirve `dist/` y las partidas; puerto en `PORT`, 8787 por defecto):

```powershell
npm run build
npm start
```

## Cómo se juega

1. Un jugador crea la partida eligiendo mundo (Real o Invertido) y comparte el código de 4 letras. El otro se une con el código.
2. Cada jugador ve solo su mundo. El cuarto de comunicaciones está oculto: en la primera sala hay una rejilla que suelta aire; repite el patrón de luces para abrir la pared falsa.
3. En la sala de comunicaciones se envían símbolos 0-9 / A-F como luces por un canal con 8% de ruido por bit. Se puede añadir redundancia (repetición x3 o paridad). El canal queda establecido cuando cada jugador confirma el código de verificación del otro.
4. Cada sala tiene una **pista** física (la hoja que brilla) que sirve a la sala del mismo número del otro mundo. Hay que describirla por el canal.
5. Al resolver las 10 salas se desbloquea la decisión final sobre Genesis en la Sala 10.

Controles: WASD o flechas, `E` usar, `Esc` cerrar, `M` música, `F` pantalla completa. En modo individual se cambia de mundo desde la sala de comunicaciones.

## Salas

| Mundo Real | Mundo Invertido |
|---|---|
| Sala de comunicaciones (oculta) | Sala de comunicaciones (oculta) |
| S1 La cinta que clasifica | Puerta de transición (cambio de dominio) |
| S2 Entrena al guardián | S6 Detective de datos |
| S3 El archivo por significado | S7 La galería de la duda |
| S4 La línea de montaje | S8 Las palabras que faltan |
| S5 El agente y su recompensa | S9 La puerta que escucha |
| | S10 El presupuesto de contexto + decisión final |

## Código

- `src/shared/reducer.js` — estado compartido y reglas (lo usan el servidor y el modo individual).
- `server/lobby.js` — partidas por WebSocket (códigos, un jugador por mundo, reconexión). `server/server.js` lo sirve en producción; `vite.config.js` lo engancha en desarrollo.
- `src/game/main.ts` — lobby, HUD y orquestación.
- `src/game/worldEngine.ts` — motor Canvas de cada mundo (reutiliza `src/engine/sprites.ts`).
- `src/game/puzzleData.ts` — datos de cada acertijo generados con la semilla de la partida, para que las pistas cuadren entre mundos.
- `src/game/rooms.ts` — nombres de salas, fragmentos y pistas cruzadas.
- `src/game/panels/` — paneles y simuladores de cada sala.

El prototipo anterior de un jugador (`src/main.ts` y compañía) sigue en el repo pero ya no lo carga `index.html`.
