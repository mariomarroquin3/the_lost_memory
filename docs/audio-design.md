# Diseño sonoro procedural

El audio se genera con Web Audio API. No usa `.mp3`, `.wav`, `.ogg` ni
dependencias externas.

## Matriz narrativa

| Situación | Mundo Real | Mundo Invertido | Respuesta sonora |
|---|---|---|---|
| Exploración | Drone grave y hum tonal discreto | Drone desafinado y hum digital discreto | Ambiente muy bajo, sin ruido blanco constante |
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
ambiente, además de un compresor final. El motivo de Lía usa cuatro notas
definidas y comienza incompleto; `setFragments` incorpora sus notas al
recuperar memoria. El Alucinador reutiliza esos intervalos con desafinación,
ondas ásperas e interferencia breve. La alerta abre una capa tonal de tensión
en tres niveles, sin convertir el juego en una persecución constante.

El ambiente ya no usa ruido blanco en bucle: son dos tonos filtrados y una
modulación lenta, con volumen inicial bajo. Sus frecuencias cambian al pasar
entre mundos. Las fuentes persistentes y sus nodos de mezcla se desconectan al
detener o cambiar la música, y un compresor limita acumulaciones de efectos.

## Secuenciador

La pieza está en 4/4 a 64 BPM. El secuenciador avanza por compases y usa una
frase de ocho compases con la progresión definida para cada mundo. Cada vuelta
combina pads con inversiones, bajo, una melodía con silencios y texturas
ocasionales. Después de ocho compases cambia la octava o el cierre melódico;
no reinicia todas las capas ni repite siempre las mismas dos notas.

La melodía empieza escasa y desbloquea sus cuatro notas al recuperar
fragmentos. Investigación, intrusión, núcleo y vulneración añaden capas en
los límites del compás; la alerta aumenta la disonancia y el bajo, no la
velocidad de la música.

## Timbres procedurales

- **Piano:** triángulo con armónicos seno, ataque breve y caída percusiva.
- **Cuerdas:** dos sierras desafinadas suavemente, triángulo y filtro lento.
- **Cello/bajo:** seno y triángulo graves con ataque más largo.
- **Coro:** osciladores desfasados y reverberación para Genesis e Invertido.
- **Campana:** armónicos altos y panorámica estéreo para descubrimientos.
- **Alucinador:** las mismas alturas transformadas, con ondas ásperas,
  desafinación, desplazamiento y una interferencia corta.

Las capas musicales comparten delay y reverberación procedural dentro del bus
de música. Los efectos de juego siguen separados para no tapar diálogos.

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
- Finales: variaciones diferenciadas para Lía, Nuevo Genesis y pérdida.

Los efectos son breves y la música mantiene una ganancia baja para no tapar
diálogos ni pistas. El botón `M` controla las capas continuas; los efectos
narrativos siguen teniendo su control independiente.
