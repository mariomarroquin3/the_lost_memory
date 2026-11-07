# ANIMACIÓN 03: LA ARAÑA DEL CONTEXTO

**Escena previa:** 30 segundos, saltable con `Esc`.
**Combate:** motor Canvas en tiempo real.
**Arena:** Sala 10 (`i10`) reciclada para los dos mundos.

## Escena previa

### TOMA 1: La red sobre Lía (0:00–0:10)

* **Visual:** El núcleo cian queda rodeado por una red roja.
* **Acción:** La araña abre ocho patas sobre el núcleo.
* **Lía:** «Los diez fragmentos despertaron al Alucinador.»
* **Lía:** «Su red falsa cubre mi núcleo de memoria.»
* **Sato:** «¿Cómo rompemos esa red?»
* **Lía:** «Conservad la dirección correcta.»

### TOMA 2: Dirección, no tamaño (0:10–0:20)

* **Visual:** La araña camina entre cuatro puntos luminosos.
* **Acción:** Se detiene y una flecha apunta al núcleo.
* **Lía:** «Un vector grande puede apuntar igual que uno pequeño.»
* **Lía:** «Divide cada número entre la longitud del vector.»
* **Sato:** «La longitud es raíz de x² más y².»
* **Lía:** «Esperad su parada y apuntad con dirección.»

### TOMA 3: La última defensa (0:20–0:30)

* **Visual:** La araña lanza un hilo rojo hacia los dos ecos.
* **Acción:** Las patas brillan; el HUD marca la alerta.
* **Alucinador:** «También puedo torcer una dirección correcta.»
* **Lía:** «Si te toca la red, avanzarás más despacio.»
* **Sato:** «La araña está dentro de la sala.»
* **Lía:** «Romped sus ocho patas y recuperaré mi memoria.»

## Disparador

Se reproduce una sola vez por partida cuando `i10` está resuelta y hay diez
fragmentos. `boss-start` cambia el estado a:

```text
active: true
phase: "fight"
startedAt: Date.now()
legs: [true, true, true, true, true, true, true, true]
```

El movimiento se pausa solo durante esta escena. Cuando termina, el motor
se reanuda. `showEnding` sigue bloqueado hasta `phase: "defeated"`.

## Arena y sincronización

Durante `active`, ambos clientes cargan visualmente la composición de `i10`.
El cliente del Mundo Real usa el mapa de la Sala 10 solo durante el combate;
al terminar restaura su mundo y su posición anterior. No cambian las puertas
ni los acertijos del mapa normal.

La ruta fija, en coordenadas locales de una sala de 288x192, es:

```text
(64,64) → (224,64) → (224,128) → (64,128) → (64,64)
```

Todos los clientes calculan la misma posición con `startedAt`:

- camina durante 4 segundos hacia el siguiente punto;
- se detiene durante 6 segundos en el siguiente punto;
- repite la ruta.

La posición nunca se envía por WebSocket. Solo se sincronizan las posiciones
de los jugadores con `boss-pos`, como máximo diez veces por segundo. El otro
jugador se dibuja como un eco semitransparente: naranja para Real y morado
para Invertido. Si se desconecta, conserva la última posición y baja a 15% de
opacidad; el jugador restante puede seguir solo.

## Araña y telarañas

La araña mide 48x32 píxeles y tiene ocho patas: cuatro asociadas al Real y
cuatro al Invertido. `drawBossSpider` dibuja cuerpo, núcleo, segmentos y
extremos con rectángulos y líneas pixeladas.

- Mientras camina, crea telarañas lentas hacia el jugador más cercano.
- Una telaraña que toca a Sato lo frena durante 2 segundos.
- El impacto aumenta `ALERTA` en 2 puntos, máximo 95.
- No hay muerte, game over ni partículas adicionales.
- Las patas heridas parpadean durante la parada y se curan al cambiar de
  parada si el otro jugador no confirma el golpe.

## Disparo y opciones

Durante una parada aparece sobre Sato el vector en baldosas:
`v = (dx, dy)`, redondeado a enteros desde la última posición aceptada por
`boss-pos` hasta la araña.

Pulsa `ESPACIO` para mostrar cuatro opciones en el Canvas y elige con `1`–`4`:

1. `v / |v|`, la dirección correcta.
2. `v`, sin normalizar.
3. La dirección unitaria con un signo invertido.
4. `v / (2|v|)`, demasiado corta.

La opción dispara un rayo de 1–2 píxeles desde Sato. Su longitud depende de
la magnitud elegida: la correcta llega a la araña, la cruda se pasa, la corta
no llega y la invertida se desvía.

El cliente envía:

```ts
{
  type: 'boss-fire',
  stop: number,
  raw: { x: number, y: number },
  unit: { x: number, y: number },
}
```

El reducer valida que:

- la parada siga activa y sea vulnerable;
- `stop` coincida con la parada calculada desde `startedAt`;
- `raw` sea entero y coincida con la diferencia en baldosas, con tolerancia
  de ±1 por componente;
- `unit` tenga longitud entre 0.98 y 1.02;
- cada componente de `unit` esté a ±0.02 de `raw / |raw|`;
- el jugador no haya disparado antes en ese ciclo.

## Golpes y victoria

Cada parada representa dos patas, una por mundo.

- En cooperativo, los dos aciertos en la misma parada apagan las dos patas.
- Un solo acierto deja su pata herida y parpadeando.
- Si termina la parada sin segundo acierto, la pata se cura.
- Si el otro mundo está desconectado, un acierto basta para apagar las dos.
- En modo individual, un acierto basta para apagar las dos patas.
- Un fallo consume el disparo de esa parada y sube `ALERTA` en 5 puntos.
- Tras dos fallos se muestran progresivamente:
  `Solo importa la dirección.`
  `Divide cada número entre la longitud.`
  `|v| = raíz(x² + y²).`

Al apagar las ocho patas, el reducer pone `active: false` y
`phase: "defeated"`. El flujo existente muestra la frase de Lía, después la
decisión final y finalmente los tres desenlaces ya existentes.

## Estado del reducer

El bloque `boss` usa estos campos:

```ts
interface BossState {
  active: boolean;
  phase: 'idle' | 'fight' | 'defeated';
  startedAt: number;
  legs: boolean[]; // ocho elementos
  hits: { real: number | null; inverted: number | null };
  wounded: { real: boolean; inverted: boolean };
  failures: number;
  hintLevel: number;
  positions: Record<World, { x: number; y: number; at: number }>;
}
```

El estado también conserva internamente el ciclo ya disparado y el último
impacto de telaraña para impedir dobles disparos y alertas repetidas. Las
acciones son:

- `boss-start`: requiere diez fragmentos e `i10` resuelta.
- `boss-pos`: posición local, limitada a diez envíos por segundo.
- `boss-fire`: valida parada, vector crudo y vector unitario.
- `boss-web-hit`: suma 2 a la alerta con enfriamiento de 2 segundos.

`server/lobby.js` restaura `startedAt`, patas, golpes, heridas, fallos y
posiciones. `migrateState` reemplaza partidas antiguas que todavía contienen
`sides`, `round` o cuatro patas.

## HUD y motor

La línea `▶` del HUD muestra:

- `Persigue a la araña.` mientras camina;
- `¡Está quieta! ESPACIO para apuntar.` durante una parada;
- `Tu disparo acertó: falta el del otro mundo.` tras un acierto parcial;
- `Esquiva la telaraña.` mientras se mueve la araña.

El HUD muestra `PATAS n/8`, `ALERTA` y el tiempo restante de la parada. El
combate usa el `requestAnimationFrame` de `TileEngine`; no abre un panel HTML
ni pausa el motor. `bossFinal.ts` queda solo como adaptador de compatibilidad
para imports antiguos y no se monta durante la partida.

## Archivos tocados

- `src/shared/reducer.js`: ruta determinista, estado y acciones del combate.
- `src/shared/reducer.d.ts`: tipos y declaraciones nuevas.
- `src/game/tileEngine.ts`: movimiento, teclas, opciones, rayos, araña,
  ecos, telarañas y colisiones.
- `src/game/main.ts`: carga temporal de `i10`, HUD y flujo de victoria.
- `src/game/scenery.ts`: sprite pixelado de ocho patas.
- `src/game/session.ts`: migración de partidas guardadas.
- `server/lobby.js`: restauración segura del estado del jefe.
- `src/game/game.css`: estilos conservados para la escena y la interfaz.
- `src/game/panels/bossFinal.ts`: adaptador sin panel HTML.
- `docs/animations/03_jefe-final.md`: reglas actuales del combate.

No se modifican las funciones que resuelven las salas existentes.

## Cómo probarlo

### Dos jugadores

1. Ejecuta el servidor y la aplicación.
2. Abre una partida cooperativa en una pestaña.
3. Usa `Ctrl+T` para abrir otra pestaña nueva; no uses «Duplicar pestaña».
4. Une la segunda pestaña con el código de cuatro letras.
5. Completa las diez salas y llega a `i10`.
6. Comprueba que ambos ven la escena, el mismo recorrido y el mismo tiempo.
7. Muévete con WASD o flechas; pulsa `Espacio` durante una parada y elige
   una opción con `1`–`4`.
8. Verifica el golpe parcial, el golpe doble, la alerta y las pistas.
9. Deja una pestaña desconectada y confirma que la otra puede terminar.

### Modo individual

1. Inicia una partida nueva en modo individual.
2. Completa las diez salas.
3. En `i10`, corre hasta la araña, espera su parada y usa `Espacio`.
4. Elige la dirección correcta cuatro veces durante las paradas.
5. Comprueba el rayo, las telarañas, `PATAS 0/8` y la decisión final.

### Verificación técnica

- `npm run build`
- `git diff --check`
- Probar un `boss-fire` sin normalizar y comprobar que falla.
- Confirmar que un jugador solo no puede disparar dos veces en la misma
  parada.
- Confirmar que una acción después de `defeated` no cambia el estado.
