# ANIMACIÓN 02: CANAL ABIERTO
**Duración estimada:** 45 segundos
**Ubicación en el juego:** Sala de comunicaciones, justo después de verificar el canal.
**Estilo Visual:** Pixel Art de terminal en penumbra, luces cian y ámbar, con
interferencias rojas breves cuando interviene El Alucinador.
**Control:** La escena puede omitirse con `Esc`.

---

## TOMA 1: La pared que recuerda (0:00 - 0:12)
*   **Visual:** La sala de comunicaciones aparece casi a oscuras. Las
    bombillas de la pared se encienden en una secuencia tranquila. Un halo
    cian dibuja dos mitades de la misma red en la pared.
*   **Acción:** Las dos claves de cuatro letras quedan marcadas como
    verificadas. Sobre la rejilla aparece el texto HTML/CSS `CANAL ABIERTO`.
    No se muestran los personajes; solo sus señales llegan desde el otro
    mundo.
*   **Audio:** Tres pulsos suaves, un zumbido de servidores y estática leve.
*   **Lía:** «Este es el canal de emergencia que dejé antes del colapso.»
*   **Lía:** «Lo oculté para que el Alucinador no pudiera cortarlo.»
*   **Sato:** «¿La pared conecta nuestras dos salas?»
*   **Lía:** «Conecta lo que todavía podemos recordar.»

## TOMA 2: Ninguna mitad basta (0:12 - 0:25)
*   **Visual:** La rejilla se divide en dos grupos de luces: uno azul para
    el Mundo Real y otro violeta para el Mundo Invertido. Entre ambos aparece
    una línea incompleta que solo se cierra cuando se encienden los dos lados.
*   **Acción:** Una silueta incompleta de Lía aparece como reflejo en las
    bombillas. Algunos puntos de la red quedan apagados, como fragmentos que
    faltan.
*   **Audio:** El zumbido gana una segunda capa, como una señal remota.
*   **Lía:** «Partí mis recuerdos entre los dos mundos.»
*   **Lía:** «Ninguna mitad contiene contexto suficiente para salvarme.»
*   **Lía:** «La verdad solo puede reconstruirse entre los dos.»
*   **Sato:** «Entonces cada señal será una pieza del recuerdo.»

## TOMA 3: La pista al otro lado (0:25 - 0:37)
*   **Visual:** Un chip brillante aparece en el suelo de cada sala, visto
    como un pequeño destello en el mapa de luces. Sobre la pared se forma
    `S1 4 5 10`, que se enciende letra por letra.
*   **Acción:** La línea `▶` del panel superior derecho parpadea una vez y
    muestra una ruta breve. Después vuelve a quedar visible como guía.
*   **Audio:** Las bombillas repiten el mensaje tres veces, con una pausa
    entre cada intento.
*   **Lía:** «Cada sala necesita un dato del otro lado.»
*   **Lía:** «Buscad el chip brillante en el suelo y leedlo con E.»
*   **Lía:** «Mandad mensajes cortos; repetidlos si llegan con errores.»
*   **Sato:** «Si nos perdemos, seguiremos la línea del panel.»

## TOMA 4: Interferencia (0:37 - 0:45)
*   **Visual:** Una bombilla vecina se enciende en rojo y desplaza una letra.
    La red tiembla, aparecen dos sombras de cada símbolo y luego el cian
    recupera el patrón correcto.
*   **Acción:** El texto `SEÑAL INESTABLE` aparece un instante. Las luces
    vuelven a su estado normal y la escena entrega el control al jugador.
*   **Audio:** Chispa digital, ruido corto y regreso del zumbido estable.
*   **El Alucinador:** «Una letra basta para cambiar lo que creéis saber.»
*   **El Alucinador:** «Repetid vuestra verdad. Yo escucharé cada intento.»
*   **Lía:** «No le deis una mitad aislada. Reconstruid el contexto.»
*   **Lía:** «Canal abierto. Ahora, encontrad el primer fragmento.»

---

## Disparador

La escena se reproduce una sola vez por partida:

- **Modo cooperativo:** cuando el estado compartido pasa a
  `channelActive === true`, después de que ambos jugadores intercambian y
  confirman sus claves de cuatro letras.
- **Modo individual:** la primera vez que se revela la Sala de
  comunicaciones, cuando `commsRevealed` queda activo para la partida.
- Si la partida se carga después de haber visto la escena, no se vuelve a
  reproducir. `Esc` la omite y marca igualmente la escena como vista.

## Notas de implementación

- Reutilizar la estructura de `src/game/opening.ts`: crear una segunda lista
  de tomas y una función `playOpening` específica para esta escena, o
  parametrizar la función existente sin cambiar sus cinco tomas.
- El host debe ser la misma capa HTML/CSS `overlay`, con una clase propia
  como `.channel-opening`, para mantener el canvas reservado al mundo.
- Dibujar las bombillas, la línea entre mundos, el chip y la interferencia
  con `div`, `span`, gradientes y animaciones CSS por pasos. No usar imágenes
  externas ni añadir una mecánica nueva.
- Mientras la escena se reproduce, llamar a `engine.setPaused(true)` y
  bloquear la interacción del panel. Al terminar o al pulsar `Esc`, cerrar el
  overlay y reanudar el motor con `engine.setPaused(false)`.
- La pista mostrada (`S1 4 5 10`) es solo una demostración visual del formato
  corto ya usado por la pared de luces. La escena no debe resolver salas,
  mover fragmentos ni modificar el ruido del canal.
- En modo individual, el estado de escena vista debe persistir junto con la
  partida para que el diálogo no se repita al cambiar de mundo o recargar.
