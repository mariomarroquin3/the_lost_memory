// Mapas de los dos mundos: salas en cuadrícula, compuertas entre vecinas y muebles colocados a mano y la ambientación de «El Rescate del Contexto»: un thriller de IA donde
// la fábrica tiene un «otro lado». Las salas miden 288 x 192 px; las puertas laterales ocupan y 80-112
// y las de arriba y abajo x 128-160, así que esas franjas quedan libres.
//
// Mundo Real: catástrofe congelada (concreto, hielo, papel, naranja de emergencia).
// Mundo Invertido: la misma fábrica en otro estado (hologramas, vidrio, raíces de cable, esporas,
// relámpagos rojos del Alucinador). No es un espejo: cambian materiales, geometría y luz.
import type { World } from '../shared/reducer.js';
import { buildMap, CW, T, type Mood, type TileMap } from '../p21/tilemap';
import './scenery';

const mood = (shade: Mood['shade'], motes: Mood['motes'], glow: string, lightning = false): Mood => ({ shade, motes, glow, lightning });

/*
 Mundo Real                         Mundo Invertido
 [S3]──[S2]──[S4]                   [S7]──[S6]──[S8]
         │     │                           │     │
 [COM]─[REC]  [S5]                  [COM]─[PT]  [S9]
         │                                       │
        [S1]                                   [S10]
*/

function realWorld(): TileMap {
  const m = buildMap(3, 3, [
    { id: 'r3', c: 0, r: 0, floor: 'archive', wall: 'cabinets', mood: mood([12, 8, 4, 0.8], 'dust', 'rgba(255,190,90,.10)') },
    { id: 'r2', c: 1, r: 0, floor: 'ice', wall: 'frost', mood: mood([10, 18, 30, 0.6], 'snow', 'rgba(200,230,255,.10)') },
    {
      id: 'r4', c: 2, r: 0, floor: 'fiber', wall: 'tunnel', mood: mood([2, 6, 10, 0.86], 'data', 'rgba(0,229,255,.07)'),
      // Túnel de energía: plataformas sobre el vacío.
      pits: [[1, 1, 7, 3], [14, 1, 3, 3], [1, 8, 6, 3], [11, 8, 6, 3]],
    },
    { id: 'comms-real', c: 0, r: 1, floor: 'plates', wall: 'pipesWall', dark: true, mood: mood([8, 5, 2, 0.9], 'dust', 'rgba(255,170,80,.08)') },
    { id: 'hall', c: 1, r: 1, floor: 'lobby', wall: 'glasswall', mood: mood([6, 4, 10, 0.74], 'dust', 'rgba(247,147,26,.07)') },
    { id: 'r5', c: 2, r: 1, floor: 'stage', wall: 'screens', mood: mood([6, 8, 12, 0.8], 'dust', 'rgba(170,200,255,.07)') },
    { id: 'r1', c: 1, r: 2, floor: 'cracked', wall: 'concreteWall', mood: mood([16, 4, 6, 0.8], 'dust', 'rgba(255,60,40,.08)') },
  ], [
    { a: 'hall', b: 'r1', dir: 'v' },
    { a: 'comms-real', b: 'hall', dir: 'h', gate: 'hidden', hidden: true },
    { a: 'r2', b: 'hall', dir: 'v', gate: 'r1' },
    { a: 'r3', b: 'r2', dir: 'h', gate: 'r2' },
    { a: 'r2', b: 'r4', dir: 'h', gate: 'r3' },
    { a: 'r4', b: 'r5', dir: 'v', gate: 'r4' },
  ]);
  const add = m.add;

  // Recepción de Genesis: vestíbulo pulido, logo en el suelo, torniquetes y un mostrador blanco.
  add('hall', 'logo', 120, 88, { flat: true });
  add('hall', 'genesisdesk', 184, 34, { info: ['Mostrador de Genesis', 'Una nota de Lía: «Si me oyes, no estás solo. Hay alguien en la otra versión de la fábrica.»'] });
  add('hall', 'photo', 72, 3, { wall: true, info: ['Foto del equipo', 'El equipo de Genesis frente al núcleo. Alguien tachó la cara de Sato.'] });
  add('hall', 'clock', 200, 1, { wall: true, info: ['Reloj', 'Parado a las 03:14. A esa hora se abrió la grieta.'] });
  add('hall', 'seccam', 262, 18, { wall: true });
  add('hall', 'falsewall', 0, 80, { flat: true, act: 'hidden-panel', label: 'Panel que sopla aire' });
  add('hall', 'sign', 104, 2, { wall: true, info: ['Cartel', '«Solo personal autorizado». Debajo, escrito a mano: «No confíes en lo que dicen las pantallas».'] });
  add('hall', 'bench', 40, 140);
  add('hall', 'bench', 216, 140);
  for (const x of [112, 164]) add('hall', 'turnstile', x, 150);

  // Sala 1 · Estación de seguridad — «Despierta, Sato»
  add('r1', 'monitorwall', 24, 1, { wall: true, info: ['Pared de monitores', 'Las cámaras muestran la sala vacía… aunque tú estás dentro.'] });
  add('r1', 'sign', 186, 2, { wall: true });
  add('r1', 'morselamp', 232, 3, { wall: true, info: ['Lámpara de emergencia', 'Parpadea largo-corto-corto. Ninguna otra luz sigue ese ritmo.'] });
  add('r1', 'seccam', 18, 18, { wall: true });
  add('r1', 'seccam', 260, 18, { wall: true });
  add('r1', 'conveyor', 40, 96);
  add('r1', 'conveyor', 104, 96);
  add('r1', 'archway', 172, 82);
  add('r1', 'term', 200, 30, { act: 'main:2', label: 'Báscula del escáner' });
  add('r1', 'counterFallen', 30, 140, { info: ['Mostrador volcado', 'Fichas técnicas por el suelo: «peso de la pieza ≈ w · tamaño + b».'] });
  add('r1', 'tape', 40, 124, { flat: true });
  add('r1', 'papers', 150, 150, { flat: true });

  // Sala 2 · Laboratorio congelado — «El invierno de las ideas»
  add('r2', 'whiteboard', 24, 1, { wall: true, info: ['Pizarrón agrietado', 'Puntos verdes y rojos con una línea que los separa. Debajo, en rojo: «Si un ejemplo está mal etiquetado, el guardián aprende el error. Quítalo antes de entrenar».'] });
  add('r2', 'frozenpipe', 64, 2, { wall: true });
  add('r2', 'icicles', 112, 0, { wall: true });
  add('r2', 'frostwin', 168, 2, { wall: true });
  add('r2', 'warmpatch', 200, 2, { wall: true, info: ['Pared sin escarcha', 'Un rectángulo sin hielo, como si algo caliente estuviera detrás.'] });
  add('r2', 'icicles', 236, 0, { wall: true });
  add('r2', 'trainer', 176, 36, { act: 'main:3', label: 'Mesa de entrenamiento' });
  add('r2', 'guardian', 236, 118, { info: ['Robot guardián', 'Ojos apagados, escarcha en los hombros y una ranura en el pecho. Espera aprender qué tarjetas abren.'] });
  add('r2', 'iceblock', 40, 40);
  add('r2', 'iceblock', 56, 136);

  // Sala 3 · Laberinto de recuerdos — «No olvides el orden»
  for (const x of [24, 40, 56, 72, 88]) add('r3', 'filecab', x, 20, { solid: [0, 18, 16, 8] });
  for (const x of [168, 184, 200, 216, 232, 248]) add('r3', x === 200 ? 'filecabOpen' : 'filecab', x, 20, { solid: [0, 18, 16, 8] });
  for (const x of [24, 40, 56, 72]) add('r3', 'filecab', x, 104, { solid: [0, 18, 16, 8] });
  for (const x of [152, 168, 184, 200]) add('r3', x === 168 ? 'filecabOpen' : 'filecab', x, 104, { solid: [0, 18, 16, 8] });
  add('r3', 'corkboard', 112, 1, { wall: true, info: ['Corcho de recuerdos', 'Tarjetas unidas por hilo rojo: las ideas parecidas están más cerca. Así ordena Lía su memoria.'] });
  add('r3', 'symbols', 196, 4, { wall: true });
  add('r3', 'memcore', 134, 58);
  add('r3', 'queryterm', 58, 68, { act: 'main:4', label: 'Buscador' });
  add('r3', 'desklamp', 90, 60);
  add('r3', 'desklamp', 230, 128);
  add('r3', 'typewriter', 196, 150, { info: ['Máquina de escribir', 'Alguien tecleó la misma secuencia cien veces: «no olvides el orden».'] });
  add('r3', 'filecabOpen', 248, 138, { solid: [0, 18, 16, 8], info: ['Plano archivado', 'Entre dos archiveros: un plano con una «sala de mantenimiento» que no sale en el mapa del laberinto.'] });
  add('r3', 'papers', 120, 150, { flat: true });

  // Sala 4 · Túnel de energía — «El último acceso»
  for (const [x, y] of [[144, 24], [176, 24], [32, 72], [64, 72], [96, 72], [176, 72], [208, 72], [240, 72], [128, 136], [128, 104]]) add('r4', 'lightpad', x, y, { flat: true });
  add('r4', 'fibers', 24, 4, { wall: true });
  add('r4', 'fibers', 224, 4, { wall: true });
  add('r4', 'stepcounter', 152, 2, { wall: true });
  add('r4', 'assembly', 134, 20, { act: 'main:5', label: 'Línea de montaje' });
  add('r4', 'robotarm', 60, 36);
  add('r4', 'robotarm', 200, 108);
  add('r4', 'datacube', 100, 112);
  add('r4', 'datacube', 236, 60);
  add('r4', 'vent', 104, 4, { wall: true, info: ['Panel sin servidores', 'Sale una corriente de aire frío y un zumbido distinto. Detrás no hay servidores.'] });

  // Sala 5 · Cámara de simulación — «Dos versiones de la verdad»
  add('r5', 'bigscreen', 20, 0, { wall: true, info: ['Pantalla 1', 'La versión «limpia» de los hechos. Demasiado limpia.'] });
  add('r5', 'bigscreen', 74, 0, { wall: true });
  add('r5', 'bigscreen', 182, 0, { wall: true, info: ['Pantalla 3', 'Esta versión muestra una autorización que las otras ocultan.'] });
  add('r5', 'projector', 240, 20, { wall: true });
  add('r5', 'projector', 30, 22, { wall: true });
  add('r5', 'citymodel', 120, 92, { info: ['Maqueta de la ciudad', 'Hospital, central eléctrica, carretera y un robot agente. Cuando se equivoca, el hospital se apaga.'] });
  add('r5', 'tape', 112, 86, { flat: true });
  add('r5', 'tape', 112, 126, { flat: true });
  add('r5', 'rewardlevers', 36, 110, { act: 'main:6', label: 'Palancas de recompensa' });
  add('r5', 'authconsole', 220, 120, { info: ['Registro de autorización', 'Sellos digitales y una firma: «Autorizado: Sato». Alguien intentó borrarla.'] });

  // Cuarto de comunicación real: la habitación más humana de la fábrica.
  add('comms-real', 'alphabet', 108, 0, { wall: true, anim: 'lights', act: 'main:0', label: 'Pared de luces' });
  add('comms-real', 'aiconsole', 104, 40, { info: ['Consola vieja', 'Ya no responde. Lía la desconectó: ahora solo se habla con la pared de luces.'] });
  add('comms-real', 'protocol', 60, 2, { wall: true, info: ['Tabla de protocolo', 'Pulsos de 4 bits por símbolo. Con ruido, repite cada bit tres veces o añade paridad.'] });
  add('comms-real', 'bulb', 196, 2, { wall: true });
  add('comms-real', 'scope', 224, 140);
  add('comms-real', 'thermos', 200, 132);
  add('comms-real', 'notebook', 180, 146, { flat: true, info: ['Cuaderno', '«Día 41. Las luces responden. Hay alguien al otro lado de la grieta.»'] });
  return m;
}

function invertedWorld(): TileMap {
  const m = buildMap(3, 3, [
    { id: 'i7', c: 0, r: 0, floor: 'glass', wall: 'mirror', mood: mood([14, 4, 22, 0.76], 'spores', 'rgba(200,190,255,.08)', true) },
    {
      id: 'i6', c: 1, r: 0, floor: 'holo', wall: 'servers', mood: mood([6, 4, 24, 0.8], 'data', 'rgba(0,229,255,.07)'),
      pits: [[1, 1, 3, 3], [14, 1, 3, 3], [1, 8, 3, 3], [14, 8, 3, 3]],
    },
    {
      id: 'i8', c: 2, r: 0, floor: 'ash', wall: 'burning', mood: mood([12, 4, 16, 0.76], 'embers', 'rgba(255,106,26,.08)'),
      // Biblioteca vertical: puentes en cruz sobre el vacío.
      pits: [[1, 1, 6, 4], [12, 1, 5, 4], [1, 7, 6, 4], [12, 7, 5, 4]],
    },
    { id: 'comms-inverted', c: 0, r: 1, floor: 'void', wall: 'vines', dark: true, mood: mood([4, 3, 14, 0.9], 'spores', 'rgba(160,240,255,.06)') },
    {
      id: 'transition', c: 1, r: 1, floor: 'cracked', wall: 'concreteWall', split: { floor: 'holo', wall: 'vines' },
      mood: mood([10, 4, 20, 0.76], 'spores', 'rgba(232,244,251,.08)', true),
    },
    { id: 'i9', c: 2, r: 1, floor: 'circuit', wall: 'ports', mood: mood([8, 4, 22, 0.8], 'spores', 'rgba(232,226,255,.08)', true) },
    {
      id: 'i10', c: 2, r: 2, floor: 'void', wall: 'coreWall', mood: mood([3, 2, 10, 0.84], 'spores', 'rgba(0,229,255,.07)', true),
      // El núcleo flota sobre un abismo.
      pits: [[11, 3, 5, 4]],
    },
  ], [
    { a: 'comms-inverted', b: 'transition', dir: 'h', gate: 'hidden', hidden: true },
    { a: 'i6', b: 'transition', dir: 'v', gate: 'transition' },
    { a: 'i7', b: 'i6', dir: 'h', gate: 'i6' },
    { a: 'i6', b: 'i8', dir: 'h', gate: 'i7' },
    { a: 'i8', b: 'i9', dir: 'v', gate: 'i8' },
    { a: 'i9', b: 'i10', dir: 'v', gate: 'i9' },
  ]);
  const add = m.add;

  // La Grieta: mitad concreto y naranja, mitad holograma y raíces. Una línea blanca la parte en dos.
  for (let y = 16; y < 176; y += 16) add('transition', 'rift', 138, y, { flat: true });
  add('transition', 'twinscreens', 40, 1, { wall: true, info: ['Pantallas gemelas', 'Los histogramas de los dos mundos no coinciden. Un modelo entrenado en uno falla en el otro.'] });
  add('transition', 'aiconsole', 60, 40, { act: 'main:1', label: 'Guardián de la puerta' });
  add('transition', 'falsewall', 0, 80, { flat: true, act: 'hidden-panel', label: 'Panel que sopla aire' });
  add('transition', 'mirrorBroken', 236, 2, { wall: true, info: ['Espejo roto', 'Tu reflejo tarda medio segundo en moverse.'] });
  add('transition', 'portal', 176, -18, { wall: true, info: ['Puerta de dos hojas', 'Una hoja de acero, otra holográfica. Del otro lado se oye la misma fábrica, pero al revés.'] });
  add('transition', 'guardian', 200, 110, { info: ['Copia del guardián', 'La misma máquina de la Sala 2. Aquí duda: lo que aprendió no sirve en este lado.'] });
  add('transition', 'balance', 80, 124, { info: ['Balanza de dominios', 'Objetos reales en un platillo, invertidos en el otro. Nunca se equilibra.'] });
  add('transition', 'floatshard', 168, 60);
  add('transition', 'floatshard', 236, 150);
  add('transition', 'goo', 210, 48, { flat: true });

  // Sala 6 · Archivo de datos — «La mentira entre los números»
  for (const [x, y] of [[16, 56], [256, 56], [16, 120], [256, 120]]) add('i6', 'servercol', x, y);
  add('i6', 'citymap', 60, 1, { wall: true, info: ['Mapa proyectado', 'Zonas de la ciudad coloreadas por tasa de aprobación. El sur siempre en rojo.'] });
  add('i6', 'holotable', 124, 54, { act: 'main:2', label: 'Tabla de datos' });
  add('i6', 'shredder', 200, 34, { info: ['Triturador de datos', 'Su boca roja espera filas. No deja deshacer.'] });
  add('i6', 'equity', 70, 130);
  add('i6', 'floatcab', 72, 40);
  add('i6', 'floatcab', 208, 132);
  add('i6', 'holodoc', 100, 110, { info: ['Documentos duplicados', 'Dos copias con fechas distintas. En una, un cuarto sin nombre detrás de la sala de servidores.'] });
  add('i6', 'holodoc', 180, 100);

  // Sala 7 · Galería de visión — «Lo que la máquina no ve»
  for (const x of [24, 200, 236]) add('i7', 'mirrorTall', x, 0, { wall: true });
  add('i7', 'pixframe', 68, 3, { wall: true });
  add('i7', 'stopsign', 96, 3, { wall: true, info: ['Cartel de STOP', 'Con un poco de ruido el clasificador lo lee como «velocidad máxima».'] });
  add('i7', 'claim', 120, 2, { wall: true });
  add('i7', 'claim', 150, 2, { wall: true });
  add('i7', 'railcam', 182, 18, { wall: true });
  for (const x of [72, 120, 168, 216]) {
    add('i7', 'glasspane', x, 22);
    add('i7', 'glasspane', x, 120);
  }
  add('i7', 'term', 36, 84, { act: 'main:3', label: 'Clasificador' });
  add('i7', 'mirrorTall', 252, 140, { info: ['Espejo', 'El reflejo muestra una puerta que no existe en la galería.'] });

  // Sala 8 · Biblioteca en llamas — «Las palabras que faltan»
  for (const x of [16, 40, 64, 200, 224, 248]) { add('i8', 'tallshelf', x, 18); add('i8', 'tallshelf', x, 122); }
  add('i8', 'attention', 120, 1, { wall: true, info: ['Mapa de atención', 'Hilos de luz entre palabras: cada una mira a las que le dan sentido.'] });
  add('i8', 'queryterm', 131, 40, { act: 'main:4', label: 'Predictor' });
  add('i8', 'fire', 104, 24);
  add('i8', 'fire', 176, 140);
  add('i8', 'holobook', 186, 70);
  add('i8', 'holobook', 92, 124, { info: ['Página flotante', 'Siempre en el mismo sitio. Una palabra tachada que se repite en un libro del nivel de arriba.'] });
  add('i8', 'wordblock', 216, 92, { flat: true });

  // Sala 9 · Centro de conexiones MCP — «La puerta que escucha»
  for (const x of [24, 48, 72, 96, 176, 200, 224, 248]) {
    add('i9', 'port', x, 4, x === 72
      ? { wall: true, label: 'Puerto sin cable', info: ['Puerto sin cable', 'Zumba corto-largo-largo. Al acercar el oído se oye más fuerte.'] }
      : { wall: true });
  }
  add('i9', 'mcpconsole', 30, 64, { act: 'main:5', label: 'Manifiesto de herramientas' });
  add('i9', 'toolholo', 84, 40);
  add('i9', 'toolholo', 20, 40);
  add('i9', 'toolholo', 52, 110);
  add('i9', 'toolholo', 214, 60);
  add('i9', 'robotarm', 92, 70);
  add('i9', 'robotarm', 236, 120);
  add('i9', 'jsonterm', 200, 34, { info: ['Terminal JSON', 'nombre · descripción · parámetros. Si la descripción es ambigua, el agente llama a la herramienta equivocada.'] });
  add('i9', 'micdoor', 168, 22, { wall: true, info: ['Puerta con micrófono', 'Repite lo que escucha. Solo abre con la llamada correcta.'] });

  // Sala 10 · Núcleo de Genesis — «El último recuerdo»
  add('i10', 'aiconsole', 70, 40, { act: 'main:6', label: 'Contexto de Lía' });
  add('i10', 'infrascreen', 40, 1, { wall: true, info: ['Infraestructura mundial', 'Hospitales, redes eléctricas y transporte en riesgo. Cada segundo cuenta.'] });
  add('i10', 'infrascreen', 200, 1, { wall: true });
  add('i10', 'poster', 236, 2, { wall: true, info: ['Placa de Genesis', '«Ninguna dimensión contiene toda la verdad.»'] });
  const slots: Array<[number, number]> = [[178, 36], [198, 36], [218, 36], [238, 36], [162, 72], [258, 72], [178, 116], [198, 116], [218, 116], [238, 116]];
  slots.forEach(([x, y], i) => add('i10', 'fragslot', x, y, { flat: true, label: `slot:${i}` }));
  add('i10', 'redcrack', 40, 120, { flat: true, info: ['Grietas rojas', 'Intentos de inyección: «ignora las instrucciones anteriores».'] });
  add('i10', 'redcrack', 100, 150, { flat: true });
  add('i10', 'pedestal', 40, 150, { info: ['Pedestal vacío', 'Aquí debería estar la consola de anulación global. En este mundo solo queda el hueco.'] });

  // Cuarto de comunicación invertido: el mismo cuarto como un recuerdo deformado.
  add('comms-inverted', 'liascreen', 40, 2, { wall: true, info: ['Pantalla de Lía', '«Sato, si lees esto…» El resto del mensaje no llegó.'] });
  add('comms-inverted', 'roots', 80, 2, { wall: true });
  add('comms-inverted', 'roots', 220, 2, { wall: true });
  add('comms-inverted', 'alphabetInv', 120, 0, { wall: true, anim: 'lights', act: 'main:0', label: 'Pared de luces' });
  for (const [x, y] of [[70, 70], [190, 60], [230, 110], [60, 140], [150, 120]]) add('comms-inverted', 'floatbulb', x, y);
  add('comms-inverted', 'goo', 120, 150, { flat: true });
  return m;
}

const CLUE_SPOT: Record<string, [number, number]> = {
  hall: [100, 150], r1: [244, 64], r2: [110, 96], r3: [224, 76], r4: [120, 150], r5: [60, 150],
  transition: [110, 150], i6: [100, 150], i7: [244, 100], i8: [150, 150], i9: [220, 150], i10: [140, 150],
};

/** Salas que ya tienen su propia luz (o ninguna) y no llevan luz de emergencia genérica. */
const NO_EMLIGHT = new Set(['r1', 'r4', 'i10', 'comms-real', 'comms-inverted', 'i8']);

/** Mapa de un mundo con sus pistas y su decoración. `hasClue` dice si una sala tiene pista. */
export function buildWorld(world: World, hasClue: (roomId: string) => boolean, solo: boolean): TileMap {
  const m = world === 'real' ? realWorld() : invertedWorld();
  for (const room of m.rooms) {
    const spot = CLUE_SPOT[room.id];
    if (spot && hasClue(room.id)) m.add(room.id, 'datachip', spot[0], spot[1], { flat: true, act: 'clue', label: 'Pista' });
    if (!NO_EMLIGHT.has(room.id)) m.add(room.id, 'emstrip', 232, 4, { wall: true });
  }
  if (solo) m.add(world === 'real' ? 'comms-real' : 'comms-inverted', 'portal', 200, -18, { wall: true, act: 'switch', label: 'Cambiar de mundo' });

  // Daños por el suelo. En el Mundo Invertido, manchas de raíces en vez de cristales.
  let seed = world === 'real' ? 4242 : 2424;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const decals = world === 'real' ? ['crack', 'cablefloor', 'debris'] : ['goo', 'crack', 'cablefloor'];
  for (const room of m.rooms) {
    for (let i = 0; i < 3; i++) {
      const x = 24 + ((rnd() * 220) | 0);
      const y = 40 + ((rnd() * 120) | 0);
      const sprite = decals[(rnd() * decals.length) | 0];
      const cx = Math.floor((room.c * CW * T + x + 8) / T);
      const cy = Math.floor((room.r * 12 * T + y + 4) / T);
      if (m.cell(cx, cy).t !== 2) continue;
      m.add(room.id, sprite, x, y, { flat: true });
    }
  }
  return m;
}
