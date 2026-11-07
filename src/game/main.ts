import '../style.css';
import './game.css';
import { ROOMS, type Ending, type World } from '../shared/reducer.js';
import { CoopSession, SoloSession, hasSoloSave, lastCoop, type Session } from './session';
import { TileEngine } from './tileEngine';
import type { Door, Thing } from '../p21/tilemap';
import { ROOM_INFO, WORLD_NAME, FRAGMENT_ORDER, NEEDS, clueFor, fragmentName } from './rooms';
import type { PanelCtx } from './panels/common';
import { openComms, openHiddenPanel } from './panels/comms';
import { guideHtml } from './panels/guide';
import { openRoom1, openRoom2, openRoom3, openRoom4, openRoom5 } from './panels/realRooms';
import { openRoom6, openRoom7, openRoom8, openRoom9, openRoom10, openTransition } from './panels/invertedRooms';
import { Music } from '../audio/music';
import { playOpening } from './opening';
import { playChannelOpening } from './channelOpening';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const banner = document.querySelector<HTMLElement>('#room-banner')!;
const lobby = document.querySelector<HTMLElement>('#lobby')!;
const music = new Music();

let session: Session;
let engine: TileEngine;
let refreshPanel: (() => void) | null = null;
let shownEnding: Ending | null = null;
let channelOpeningPlaying = false;

// ============================== LOBBY ==============================
function showLobby(error = ''): void {
  const last = lastCoop();
  lobby.hidden = false;
  lobby.innerHTML = `
    <section class="lobby-card">
      <h1>EL RESCATE<br><span>DEL CONTEXTO</span></h1>
      <p class="lobby-sub">Protocolo de Entropía · Genesis, 2097</p>
      <p class="lobby-text">Dos mundos. Diez salas. Un canal de luces oculto. Ningún jugador tiene toda la información: tendréis que comunicaros.</p>
      <div class="lobby-grid">
        <div class="lobby-box">
          <h2>Crear partida</h2>
          <button type="button" class="btn-terminal" data-create="real">Jugar en el MUNDO REAL</button>
          <button type="button" class="btn-terminal inv" data-create="inverted">Jugar en el MUNDO INVERTIDO</button>
        </div>
        <div class="lobby-box">
          <h2>Unirse</h2>
          <input class="cmd-input" data-code maxlength="4" placeholder="CÓDIGO" value="${last?.code ?? ''}" autocomplete="off" />
          <button type="button" class="btn-terminal" data-join>Entrar</button>
          ${last ? `<p class="rp-small">Última partida: ${last.code} (${WORLD_NAME[last.world]})</p>` : ''}
        </div>
        <div class="lobby-box">
          <h2>Modo individual</h2>
          <button type="button" class="btn-terminal" data-solo="new">Nueva partida</button>
          ${hasSoloSave() ? '<button type="button" class="btn-retro" data-solo="load">Continuar</button>' : ''}
          <p class="rp-small">Alternas entre mundos desde la sala de comunicaciones.</p>
        </div>
      </div>
      <p class="lobby-error" aria-live="polite">${error}</p>
    </section>`;
  const fail = (e: unknown): void => showLobby(e instanceof Error ? e.message : String(e));
  lobby.querySelectorAll<HTMLButtonElement>('[data-create]').forEach((b) => b.addEventListener('click', () => {
    const coop = new CoopSession();
    coop.connect('', b.dataset.create as World).then(() => begin(coop)).catch(fail);
  }));
  lobby.querySelector('[data-join]')?.addEventListener('click', () => {
    const code = (lobby.querySelector('[data-code]') as HTMLInputElement).value.trim().toUpperCase();
    if (code.length !== 4) { showLobby('El código tiene 4 letras.'); return; }
    const coop = new CoopSession();
    coop.connect(code, last?.code === code ? last.world : null).then(() => begin(coop)).catch(fail);
  });
  lobby.querySelectorAll<HTMLButtonElement>('[data-solo]').forEach((b) => b.addEventListener('click', () => begin(new SoloSession(b.dataset.solo === 'new'))));
}

// ============================== JUEGO ==============================
const roomsOf = (w: World): string[] => ROOMS[w];
const solved = (id: string): boolean => session.state.solved.includes(id);

function isOpen(gate: string): boolean {
  if (gate === 'hidden') return session.state.commsRevealed[session.world];
  return solved(gate);
}

const roomName = (id: string): string => ROOM_INFO[session.world].find((r) => r.id === id)?.name ?? id;

function toast(title: string, text: string): void {
  overlay.hidden = false;
  overlay.innerHTML = `<section class="puzzle crt-panel rp clue-card"><div class="puzzle__head"><h2>${title}</h2><button type="button" class="btn-retro" data-close>Cerrar (Esc)</button></div><p>${text}</p></section>`;
  overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
}

function onBlocked(door: Door): void {
  if (!door.gate || door.gate === 'hidden') return;
  engine.setPaused(true);
  toast('Puerta cerrada', `Se abrirá al resolver «${roomName(door.gate)}».`);
}

function panelCtx(): PanelCtx {
  return {
    session,
    seed: session.state.seed,
    world: session.world,
    host: overlay,
    isSolved: solved,
    solve: (id) => session.dispatch({ type: 'solve', id }),
    close: closePanel,
  };
}

function openGuide(): void {
  engine.setPaused(true);
  overlay.hidden = false;
  overlay.innerHTML = guideHtml(session.world, session.mode === 'solo');
  overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
}

function closePanel(): void {
  overlay.hidden = true;
  overlay.replaceChildren();
  refreshPanel = null;
  engine.setPaused(false);
}

function onInteract(id: string, thing?: Thing): void {
  const w = session.world;
  const ctx = panelCtx();
  engine.setPaused(true);
  if (id === 'info') {
    if (thing?.info) toast(thing.info.title, thing.info.text); else engine.setPaused(false);
    return;
  }
  if (id === 'switch') { engine.setPaused(false); switchWorld(); return; }
  if (id === 'hidden-panel') { openHiddenPanel(ctx, () => session.dispatch({ type: 'reveal-comms' })); return; }
  if (id === 'clue') {
    const clue = clueFor(w, roomsOf(w)[engine.room], session.state.seed)!;
    overlay.hidden = false;
    overlay.innerHTML = `<section class="puzzle crt-panel rp clue-card"><div class="puzzle__head"><h2>${clue.title}</h2><button type="button" class="btn-retro" data-close>Cerrar (Esc)</button></div><p>${clue.body}</p>${clue.extra ?? ''}${clue.send && session.mode !== 'solo' ? `<p class="clue-send">Mándalo por la pared de luces así: <b>${clue.send}</b></p>` : ''}<p class="rp-small">${session.mode === 'solo' ? 'Recuérdala: la necesitarás al cambiar de mundo.' : 'El otro jugador no puede ver esto. Ve a la sala de comunicaciones y mándaselo.'}</p></section>`;
    overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
    return;
  }
  const index = Number(id.split(':')[1]);
  const roomId = roomsOf(w)[index];
  const openers: Record<string, () => void> = {
    'comms-real': () => { refreshPanel = openComms(ctx); },
    'comms-inverted': () => { refreshPanel = openComms(ctx); },
    r1: () => openRoom1(ctx), r2: () => openRoom2(ctx), r3: () => openRoom3(ctx), r4: () => openRoom4(ctx), r5: () => openRoom5(ctx),
    transition: () => openTransition(ctx),
    i6: () => openRoom6(ctx), i7: () => openRoom7(ctx), i8: () => openRoom8(ctx), i9: () => openRoom9(ctx),
    i10: () => openRoom10(ctx, showDecision),
  };
  openers[roomId]?.();
}

function showDecision(): void {
  const host = overlay.querySelector('.rp') as HTMLElement | null;
  const box = host?.querySelector('[data-final]');
  if (!box) return;
  if (session.state.fragments < 10) {
    box.innerHTML = `<p class="rp-small bad">Lía está alineada, pero faltan ${10 - session.state.fragments} fragmentos. Ninguna dimensión contiene toda la verdad: ayudad al otro mundo.</p>`;
    return;
  }
  box.innerHTML = `
    <h3>Decisión final sobre Genesis</h3>
    <p class="rp-small">Con los diez fragmentos ya sabéis la verdad: Sato autorizó al Alucinador y después intentó detenerlo. ¿Qué hacéis?</p>
    <button type="button" class="btn-terminal" data-end="lia">Restaurar a Lía con supervisión humana</button>
    <button type="button" class="btn-retro" data-end="new-genesis">Borrar a Lía y empezar un nuevo Genesis</button>
    <button type="button" class="btn-retro" data-end="lost">Confiar en el Alucinador</button>`;
  box.querySelectorAll<HTMLButtonElement>('[data-end]').forEach((b) => b.addEventListener('click', () => {
    session.dispatch({ type: 'ending', choice: b.dataset.end as Ending });
  }));
}

const ENDINGS: Record<Ending, { code: string; text: string }> = {
  lia: { code: 'SYSTEM RESTORED: 100%', text: 'Lía recupera el control con puntos de aprobación humana. El Alucinador se apaga y la red vuelve a respirar. La responsabilidad se comparte.' },
  'new-genesis': { code: 'HUMANITY OFFLINE', text: 'Sin la memoria de Lía, el Alucinador se detiene… y la infraestructura global también. Un nuevo Genesis tardará años.' },
  lost: { code: 'GLOBAL CONTEXT: LOST', text: 'El Alucinador completa el Protocolo de Entropía. Habla con total seguridad. Nadie comprueba nada.' },
};

function showEnding(ending: Ending): void {
  if (shownEnding === ending) return;
  shownEnding = ending;
  engine.setPaused(true);
  const e = ENDINGS[ending];
  overlay.hidden = false;
  overlay.innerHTML = `<section class="ending"><h2>${e.code}</h2><p>${e.text}</p>
    <p class="ending-post">«Sato... hay algo que nunca te conté. El archivo que acabas de recuperar no estaba destinado a mí».</p>
    <p class="code">GENESIS PROTOCOL: ACTIVE · ARCHIVE 00: OPEN · NEW SIGNAL DETECTED</p>
    <button type="button" class="btn-retro" data-close>Seguir explorando</button></section>`;
  overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
}

function switchWorld(): void {
  session.switchWorld?.();
  // En solo, entrar directamente en comunicaciones puede dejar al jugador
  // detrás de la puerta oculta del otro mundo. Si esa sala sigue oculta, aparece
  // en la sala 1 (tiene el panel que la revela); si ya está abierta, junto al portal.
  const hiddenThere = session.mode === 'solo' && !session.state.commsRevealed[session.world];
  engine.setWorld(session.world, hiddenThere ? 1 : 0);
  document.body.dataset.world = session.world;
  render();
}

function onRoomChanged(index: number): void {
  if (session.mode === 'coop') session.dispatch({ type: 'pos', room: index });
  const info = ROOM_INFO[session.world][index];
  banner.textContent = `${WORLD_NAME[session.world]} // ${index === 0 ? 'C-00' : info.short} · ${info.name.toUpperCase()}`;
  banner.classList.remove('room-banner--on');
  void banner.offsetWidth;
  banner.classList.add('room-banner--on');
  render();
}

/** Qué hacer ahora, en una frase, según dónde estás y qué falta. */
function objective(): string {
  const st = session.state;
  const w = session.world;
  const other: World = w === 'real' ? 'inverted' : 'real';
  const here = roomsOf(w)[engine.room];
  const entry = w === 'real' ? 'Recepción' : 'la Puerta de transición';
  if (!st.commsRevealed[w]) {
    return here === roomsOf(w)[1]
      ? 'Un panel de la pared izquierda sopla aire: es un muro falso (flecha azul). Acércate y pulsa E.'
      : `Vuelve a ${entry}: hay un muro falso en la pared izquierda.`;
  }
  if (session.mode === 'coop' && !st.channelActive) {
    return here.startsWith('comms') ? 'Usa la pared de luces: manda tu clave y escribe la que te llegue.' : 'Ve a la sala de comunicaciones (a la izquierda de ' + entry + ') y usa la pared de luces.';
  }
  const need = NEEDS[here];
  if (need && !st.solved.includes(here)) {
    const clue = clueFor(need.world, need.room, st.seed);
    const where = ROOM_INFO[need.world].find((r) => r.id === need.room)?.name ?? need.room;
    const how = session.mode === 'solo' ? 'cambia de mundo con el portal' : 'pídela por el canal';
    return `Esta sala necesita «${clue?.title}» de ${where} (${WORLD_NAME[need.world].toLowerCase()}): ${how}.`;
  }
  const mine = clueFor(w, here, st.seed);
  const target = Object.entries(NEEDS).find(([, n]) => n.world === w && n.room === here)?.[0];
  if (mine && target && !st.solved.includes(target)) return `Aquí hay una pista para el ${WORLD_NAME[other].toLowerCase()}: el chip que brilla en el suelo.`;
  if (!here.startsWith('comms') && here !== 'hall' && !st.solved.includes(here)) return 'Resuelve la terminal de esta sala.';
  return 'Sigue por la puerta abierta a la siguiente sala.';
}

const heard = new Set<string>();
let heardReady = false;
let freshUntil = 0;

function render(): void {
  if (!session || !engine) return;
  const st = session.state;
  const w = session.world;
  const other: World = w === 'real' ? 'inverted' : 'real';
  const info = ROOM_INFO[w][engine.room];
  const peer = session.mode === 'solo'
    ? 'MODO INDIVIDUAL'
    : st.connected[other]
      ? `OTRO JUGADOR: ${ROOM_INFO[other][st.positions[other]]?.short ?? '?'}`
      : 'OTRO JUGADOR: esperando…';
  const lastSignal = st.signals.filter((s) => s.to === w).slice(-1)[0];
  // Mensaje nuevo del otro mundo: se enciende la pared del mapa y se avisa en el HUD.
  for (const sig of st.signals) {
    if (heard.has(sig.id)) continue;
    heard.add(sig.id);
    if (sig.to !== w || !heardReady) continue;
    engine.wallMessage(sig.received);
    freshUntil = Date.now() + 12000;
    setTimeout(render, 12100);
  }
  heardReady = true;
  hud.innerHTML = `
    <div class="hud__box ${w === 'inverted' ? 'hud__box--inv' : ''}">
      <div class="hud__header"><span class="hud__title">${WORLD_NAME[w]}</span><span class="hud__sync ${st.alert >= 75 ? 'hud__sync--crit' : ''}">ALERTA ${st.alert}%</span></div>
      <div class="hud__room">${info.short} · ${info.name.toUpperCase()}</div>
      <div class="hud__row"><span>PARTIDA</span><strong>${session.code}${'server' in session && session.server ? ` · srv ${session.server}` : ''}</strong></div>
      <div class="hud__row"><span>CANAL</span><strong class="${st.channelActive ? 'text-green' : 'text-red'}">${st.channelActive ? 'ACTIVO' : st.commsRevealed[w] ? 'SIN VERIFICAR' : 'OCULTO'}</strong></div>
      <div class="hud__row"><span class="${session.online ? '' : 'text-red'}">${'kicked' in session && session.kicked ? 'Esta partida se abrió en otra pestaña o PC. Usa esa.' : session.online ? peer : 'RECONECTANDO…'}</span></div>
      ${lastSignal && Date.now() < freshUntil ? `<div class="hud__signal">💡 La pared de luces se enciende: <b>${lastSignal.received}</b></div>` : ''}
      <div class="hud__goal">▶ ${objective()}</div>
    </div>`;

  document.querySelector('#fragment-count')!.textContent = `Fragmentos de contexto · ${st.fragments} de 10 recuperados`;
  document.querySelector('#fragment-slots')!.innerHTML = FRAGMENT_ORDER.map((id, i) => {
    const ok = st.solved.includes(id);
    return `<div class="slot-box ${ok ? 'slot-box--found' : 'slot-box--empty'}"><span class="slot-word">${i + 1}. ${ok ? fragmentName(id) : '······'}</span></div>`;
  }).join('');
  document.querySelector('#collectibles-label')!.textContent = lastSignal ? `Última señal recibida: ${lastSignal.received}` : 'Sin señales recibidas';
  document.querySelector('#minimap-grid')!.innerHTML = (['real', 'inverted'] as World[]).map((world) =>
    `<div class="mini-row ${world}">${ROOM_INFO[world].map((r, i) => {
      const here = world === w && i === engine.room;
      const peerHere = session.mode === 'coop' && world === other && st.positions[other] === i && st.connected[other];
      const hidden = i === 0 && !st.commsRevealed[world];
      return `<div class="minimap-cell ${here ? 'minimap-cell--current' : ''} ${st.solved.includes(r.id) ? 'minimap-cell--found' : ''} ${peerHere ? 'minimap-cell--peer' : ''}" title="${r.name}">${hidden ? '?' : r.short}</div>`;
    }).join('')}</div>`).join('');

  if (st.ending) showEnding(st.ending);
  refreshPanel?.();
  maybePlayChannelOpening();
}

function maybePlayChannelOpening(): void {
  if (channelOpeningPlaying || session.state.channelOpeningSeen) return;
  const ready = session.mode === 'coop'
    ? session.state.channelActive
    : session.state.commsRevealed.real || session.state.commsRevealed.inverted;
  if (!ready) return;

  channelOpeningPlaying = true;
  refreshPanel = null;
  engine.setPaused(true);
  session.dispatch({ type: 'mark-channel-opening-seen' });
  void playChannelOpening(overlay).then(() => {
    channelOpeningPlaying = false;
    engine.setPaused(false);
    render();
  });
}

async function begin(s: Session): Promise<void> {
  session = s;
  lobby.hidden = true;
  document.body.dataset.world = s.world;
  const w = s.world;
  const INTRO = {
    real: ['GENESIS // AÑO 2097 · MUNDO REAL', 'Lía: «Sato… la fábrica se partió en dos. No ves al otro lado, pero alguien está allí.»', 'Lía: «Busca el canal de emergencia que dejé. Hay aire saliendo de una pared.»'],
    inverted: ['GENESIS // AÑO 2097 · MUNDO INVERTIDO', 'Lía: «Aquí nada es fiable. Los objetos flotan, los datos mienten.»', 'Lía: «Busca el canal de emergencia. Lo que sabes aquí, el otro mundo lo necesita.»'],
  };
  engine = new TileEngine(canvas, w, {
    isOpen,
    isSolved: solved,
    hasClue: (world, roomId) => clueFor(world, roomId, session.state.seed) !== null,
    onInteract,
    onRoomChanged,
    onBlocked,
    fragments: () => session.state.fragments,
    intro: () => (session.world === 'real' ? INTRO.real : INTRO.inverted),
    solo: s.mode === 'solo',
  });
  let startRoom = 1;
  if (s.mode === 'coop') startRoom = Math.max(0, s.state.positions[w] ?? 1);
  engine.placeIn(Math.min(startRoom, roomsOf(w).length - 1));
  s.onChange(render);
  render();
  // El opening ocupa el overlay antes de habilitar las entradas del juego.
  // El motor no inicia su RAF hasta que la promesa de la cinemática termina.
  engine.setPaused(true);
  await playOpening(overlay);
  engine.skipIntro();
  engine.setPaused(false);
  bindControls();
  engine.start();
  let seenGuide = false;
  try { seenGuide = localStorage.getItem('rescate-guia') === '1'; } catch { /* sin almacenamiento */ }
  if (!seenGuide) {
    const wait = setInterval(() => {
      if (engine.inIntro || !overlay.hidden) return;
      clearInterval(wait);
      openGuide();
      try { localStorage.setItem('rescate-guia', '1'); } catch { /* sin almacenamiento */ }
    }, 300);
  }
  if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = { session, engine };
}

let controlsBound = false;
function bindControls(): void {
  if (controlsBound) return;
  controlsBound = true;
  const updateMusic = (on: boolean): void => {
    const b = document.querySelector('#music-button');
    if (b) b.innerHTML = `Música: ${on ? 'sí' : 'no'}<br>(M)`;
  };
  window.addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === 'Escape' && !overlay.hidden) closePanel();
    if (typing) return;
    if (e.key.toLowerCase() === 'm') updateMusic(music.toggle());
    if (e.key.toLowerCase() === 'g' && overlay.hidden && !engine.inIntro) openGuide();
    if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen();
    }
  });
  document.querySelector('#music-button')?.addEventListener('click', () => updateMusic(music.toggle()));
  document.querySelector('#guide-button')?.addEventListener('click', () => { if (overlay.hidden) openGuide(); });
  document.querySelector('#fullscreen-button')?.addEventListener('click', () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen();
  });
  document.querySelector('#lobby-button')?.addEventListener('click', () => {
    if (confirm('¿Salir al menú? La partida cooperativa sigue en el servidor y puedes volver con el código.')) location.reload();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
    const KEY: Record<string, string> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
    const key = KEY[button.dataset.key!] ?? button.dataset.key!;
    const start = (ev: Event): void => { ev.preventDefault(); engine.press(key); };
    const end = (ev: Event): void => { ev.preventDefault(); engine.release(key); };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointerleave', end);
  });
  document.querySelector('[data-action="interact"]')?.addEventListener('click', () => engine.interact());
}

showLobby();
