# Diseño sonoro procedural

El audio se genera con Web Audio API. No usa `.mp3`, `.wav`, `.ogg` ni
dependencias externas.

## Matriz narrativa

| Situación | Mundo Real | Mundo Invertido | Respuesta sonora |
|---|---|---|---|
| Exploración | Drone grave, viento y ruido industrial filtrado | Drone desafinado, ruido digital y modulación lenta | Ambiente continuo con volumen bajo |
| Cambio de mundo | Corte metálico breve | Eco sintético y tono descendente | Transición de música y clic de puerta |
| Lía | Tonos limpios y cristalinos | Mismo motivo con ligera inestabilidad | Activación suave al hablar |
| Alucinador | Interferencia corta | Glitch, ruido filtrado y grave disonante | Distorsión sin voz monstruosa |
| Pista o fragmento | Clic de descubrimiento | Clic con segundo eco | `clue`, `fragment` |
| Acertijo resuelto | Acorde corto ascendente | Acorde con color más oscuro | `solve` |
| Comunicación | Relé físico y pulso cálido | Pulso con eco y tono frío | Un pulso por símbolo, con límite de repetición |
| Telaraña del jefe | Ruido seco y grave | Igual, con textura digital | `web-hit`, alerta +2 |
| Disparo del jefe | Rayo corto | Rayo con timbre cuadrado | `boss-fire` |
| Decisión final | Música contenida y silencio | Tensión reducida para dejar espacio al texto | Se conserva el foco narrativo |

## Capas y controles

`src/audio/music.ts` mantiene cuatro buses: general, música, efectos y
ambiente. La música usa drones sintéticos distintos por mundo; la tensión
crece con `ALERTA` sin añadir percusión constante. Los efectos tienen
envolventes cortas para evitar clipping y acumulación de nodos.

El botón `M` activa o desactiva la música. `Audio / ajustes` permite regular
volumen general, música, efectos y ambiente, además de silenciar todo. La
preferencia se guarda en `localStorage`. El contexto se crea o reanuda después
de la interacción del usuario para respetar las políticas de autoplay.

## Eventos conectados

- Cinemáticas: activación de Lía y glitch del Alucinador por línea.
- Salas: cambio de mundo, entrada a sala, puerta bloqueada y pistas.
- Puzzles: confirmación de resolución y recuperación de fragmentos.
- Canal: pulsos al enviar y recibir símbolos, más confirmación del canal.
- Jefe: aparición, disparo, impacto de telaraña y evolución de alerta.

El silencio se conserva al cerrar paneles y durante los mensajes importantes:
los efectos son breves y la música mantiene una ganancia baja para no tapar
diálogos ni pistas.
