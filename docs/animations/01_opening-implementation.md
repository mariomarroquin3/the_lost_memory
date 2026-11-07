# Implementación del opening de Genesis

Este documento acompaña a `01_opening.md`. La cinemática se implementa como una
capa HTML/CSS sobre el canvas: el canvas no dibuja diálogos ni efectos de interfaz.

## Storyboard conceptual

| Toma | Imagen dominante | Tratamiento | Texto clave |
|---|---|---|---|
| 1. El Ojo de Genesis | Cubo azul flotante y lluvia de datos | Cian estable, brillo suave, terminal limpia | `CONEXIÓN ESTABLECIDA` |
| 2. La inyección del error | Consola física y copia roja de Lía | Corte de música, rojo/violeta, glitch breve | `ANOMALÍA DETECTADA` |
| 3. El colapso | Cubo fragmentado y fábrica invertida | `shake`, ruido, separación RGB y flashes rojos | `PROTOCOLO DE ENTROPÍA` |
| 4. El despertar | Sato entre chispas y terminal rota | Blur naranja que enfoca lentamente | `PERDÍ EL 98% DE MI MEMORIA` |
| 5. El héroe | Sato frente a la puerta blindada | HUD narrativo, rojo de alerta y golpe final | `GAMEPLAY READY` |

## Guía frontend

### Typewriter

`src/game/opening.ts` contiene `typeLine()`. La función añade cada carácter a
`data-opening-line` con una pausa corta y acepta un `AbortSignal`; al omitir la
cinemática se aborta el bucle sin dejar timers narrativos activos. Las líneas
son datos de `SHOTS`, por lo que el texto se puede editar sin tocar el render.

### Glitch sin motor 3D

Cada toma cambia `data-shot` en `.opening__stage`. CSS usa pseudo-elementos,
`clip-path`, desplazamientos por pasos y `filter` para duplicar el texto rojo,
separar canales de color y romper la imagen durante la inyección y el colapso.
El efecto es barato: no crea geometría 3D ni depende de imágenes externas.

### Pausar y reanudar el juego

`begin()` pausa `TileEngine` antes de mostrar el opening. La escena devuelve una
`Promise`; cuando termina (o se omite), `main.ts` llama a `engine.skipIntro()`,
quita la pausa y recién entonces inicia el `requestAnimationFrame`. Así no se
aceptan movimientos durante la cinemática y no se reanuda el control a mitad de
una toma.

### Accesibilidad y control

La escena es un diálogo modal, anuncia la línea actual con `aria-live` y ofrece
un botón visible para omitirla. `Escape`, `Enter` y la barra espaciadora también
la omiten; el listener usa captura para que el manejador global del juego no
cierre el panel equivocado.
