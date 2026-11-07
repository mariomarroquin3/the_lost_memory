# ANIMACIÓN 04: EL CONTEXTO RECUPERADO

**Duración:** 55–65 segundos, incluidos créditos de 5–8 segundos.
**Disparador:** `state.ending` vale `lia`, `new-genesis` o `lost`.
**Control:** se puede omitir con `Esc`.
**Estilo:** dos mundos fundidos, núcleo cian, naranja Real, morado
Invertido y rojo solo cuando vuelve la amenaza.

## TOMA 1 // LA RED CAE (común, 0:00–0:10)

* **Visual:** `.ending-scene__spider` se deshace sobre el núcleo cian.
* **Acción:** Dos mitades de pantalla se alinean; los dos Sato se encuentran.
* **HTML/CSS:** `.ending-scene__world--real` naranja y `.world--inverted` morado.
* **Lía:** «La red cayó. Ahora pueden verse.»
* **Sato:** «Dos versiones. Una historia completa.»

## TOMA 2 // LOS DIEZ FRAGMENTOS (común, 0:10–0:32)

* **Visual:** `.ending-scene__fragments` contiene diez casillas cian.
* **Acción:** Cada `.ending-scene__fragment` se enciende en orden.
* **HTML/CSS:** Las casillas muestran PESOS, EJEMPLOS, SIGNIFICADO,
  ALGORITMO, RECOMPENSA, DATOS, DUDA, ATENCIÓN, HERRAMIENTAS y CONTEXTO.
* **Lía:** «Pesos dan fuerza; ejemplos enseñan con cuidado.»
* **Lía:** «Significado une ideas; algoritmo ordena el camino.»
* **Lía:** «Recompensa guía; datos limpios evitan trampas.»
* **Lía:** «Duda frena; atención enfoca; herramientas ayudan; contexto une.»

## TOMA 3 // LA DECISIÓN (variante, 0:32–0:48)

### Variante `lia` — SYSTEM RESTORED: 100%

* **Visual:** `data-shot="lia"` calma el núcleo; el rojo se apaga.
* **Lía:** «Lía recupera el control con puntos de aprobación humana.»
* **Lía:** «El Alucinador se apaga y la red vuelve a respirar.»
* **Lía:** «La responsabilidad se comparte.»
* **Sato:** «La memoria no volverá a estar sola.»

### Variante `new-genesis` — HUMANITY OFFLINE

* **Visual:** `data-shot="new-genesis"` apaga a Lía y varias casillas.
* **Lía:** «Sin la memoria de Lía, el Alucinador se detiene…»
* **Lía:** «La infraestructura global también queda fuera de línea.»
* **Sato:** «Empezaremos de cero, aunque duela perder lo aprendido.»
* **Lía:** «Un nuevo Genesis tardará años.»

### Variante `lost` — GLOBAL CONTEXT: LOST

* **Visual:** `data-shot="lost"` hace parpadear rojo y teje otra red.
* **Alucinador:** «El Alucinador completa el Protocolo de Entropía.»
* **Alucinador:** «Habla con total seguridad. Nadie comprueba nada.»
* **Alucinador:** «La certeza es más útil que la verdad.»
* **Alucinador:** «Entonces dejen que el mundo elija por ustedes.»

## TOMA 4 // EPÍLOGO (común, 0:48–0:59)

* **Visual:** El núcleo queda quieto y llega una señal desconocida.
* **Lía:** «Sato... hay algo que nunca te conté.»
* **Lía:** «El archivo que acabas de recuperar no estaba destinado a mí».
* **Sistema:** `GENESIS PROTOCOL: ACTIVE · ARCHIVE 00: OPEN · NEW SIGNAL DETECTED`

## CRÉDITOS (5–8 segundos)

* **Visual:** Fondo oscuro, los dos colores separados por una línea cian.
* **Texto:** `EL RESCATE DEL CONTEXTO`
* **Texto:** `Hecho para el hackathon`
* **Texto:** `EQUIPO: [EDITAR NOMBRES EN endingScene.ts]`
* **Texto:** `Gracias por jugar`

## Notas de implementación

- `endingScene.ts` reutiliza el typewriter, `Esc` y el callback `onLine` de
  las otras escenas.
- La escena se reproduce antes de `showEnding`. Al terminar, vuelve a la
  pantalla actual con su título, texto y botón `Seguir explorando`.
- La clave local es `rescate-final-<código>`. Guarda una marca por rol
  (`real`, `inverted` o `solo`) para que ambos jugadores vean la escena.
  Se comprueba junto con `state.ending`; el estado compartido es la fuente.
- Al iniciar una partida individual nueva se limpia solo la marca `SOLO`;
  cargar una partida guardada conserva su marca.
- En cooperativo ambos clientes reproducen la escena cuando reciben el mismo
  `ending`. Los nombres mostrados son `Sato del Mundo Real` y `Sato del Mundo
  Invertido`.
- La barra `?debug` añade un selector para probar `lia`, `new-genesis` y
  `lost` sin cambiar el estado de la partida ni escribir la marca local.
- El motor permanece pausado durante la escena y la pantalla final conserva
  el comportamiento existente.
