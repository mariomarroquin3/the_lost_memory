import '../style.css';
import './game.css';
import { ROOMS, type Ending, type World } from '../shared/reducer.js';
import { CoopSession, SoloSession, hasSoloSave, lastCoop, type Session } from './session';
import { WorldEngine, ROOM_W, type Interactable } from './worldEngine';
import { ROOM_INFO, WORLD_NAME, FRAGMENT_ORDER, clueFor, fragmentName } from './rooms';
import type { PanelCtx } from './panels/common';
import { openComms, openHiddenPanel } from './panels/comms';
import { openRoom1, openRoom2, openRoom3, openRoom4, openRoom5 } from './panels/realRooms';
import { openRoom6, openRoom7, openRoom8, openRoom9, openRoom10, openTransition } from './panels/invertedRooms';
import { Music } from '../audio/music';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const banner = document.querySelector<HTMLElement>('#room-banner')!;
const lobby = document.querySelector<HTMLElement>('#lobby')!;
const music = new Music();

let session: Session;
let engine: WorldEngine;
let refreshPanel: (() => void) | null = null;
let shownEnding: Ending | null = null;

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

function isOpen(boundary: number): boolean {
  const w = session.world;
  if (boundary === 0) return session.state.commsRevealed[w];
  return solved(roomsOf(w)[boundary]);
}

function interactables(index: number): Interactable[] {
  const w = session.world;
  const rx = index * ROOM_W;
  const list: Interactable[] = [{ id: `main:${index}`, x: rx + 312, y: 92, label: index === 0 ? 'Consola de luces' : 'Terminal' }];
  if (clueFor(w, index, session.state.seed)) list.push({ id: 'clue', x: rx + 580, y: 200, label: 'Pista' });
  if (index === 1 && !session.state.commsRevealed[w]) list.push({ id: 'hidden-panel', x: rx + 28, y: 112, label: 'Rejilla' });
  if (index === 0 && session.mode === 'solo') list.push({ id: 'switch', x: rx + 560, y: 300, label: 'Cambiar de mundo' });
  return list;
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

function closePanel(): void {
  overlay.hidden = true;
  overlay.replaceChildren();
  refreshPanel = null;
  engine.setPaused(false);
}

function onInteract(id: string): void {
  const w = session.world;
  const ctx = panelCtx();
  engine.setPaused(true);
  if (id === 'switch') { engine.setPaused(false); switchWorld(); return; }
  if (id === 'hidden-panel') { openHiddenPanel(ctx, () => session.dispatch({ type: 'reveal-comms' })); return; }
  if (id === 'clue') {
    const clue = clueFor(w, engine.room, session.state.seed)!;
    overlay.hidden = false;
    overlay.innerHTML = `<section class="puzzle crt-panel rp clue-card"><div class="puzzle__head"><h2>${clue.title}</h2><button type="button" class="btn-retro" data-close>Cerrar (Esc)</button></div><p>${clue.body}</p><p class="rp-small">Esta información no existe en el otro mundo. Usa la sala de comunicaciones para transmitirla.</p></section>`;
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
  engine.setWorld(session.world, roomsOf(session.world).length, 0);
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
  hud.innerHTML = `
    <div class="hud__box ${w === 'inverted' ? 'hud__box--inv' : ''}">
      <div class="hud__header"><span class="hud__title">${WORLD_NAME[w]}</span><span class="hud__sync ${st.alert >= 75 ? 'hud__sync--crit' : ''}">ALERTA ${st.alert}%</span></div>
      <div class="hud__room">${info.short} · ${info.name.toUpperCase()}</div>
      <div class="hud__row"><span>PARTIDA</span><strong>${session.code}</strong></div>
      <div class="hud__row"><span>CANAL</span><strong class="${st.channelActive ? 'text-green' : 'text-red'}">${st.channelActive ? 'ACTIVO' : st.commsRevealed[w] ? 'SIN VERIFICAR' : 'OCULTO'}</strong></div>
      <div class="hud__row"><span class="${session.online ? '' : 'text-red'}">${session.online ? peer : 'RECONECTANDO…'}</span></div>
    </div>`;

  document.querySelector('#fragment-count')!.textContent = `Fragmentos de contexto · ${st.fragments} de 10 recuperados`;
  document.querySelector('#fragment-slots')!.innerHTML = FRAGMENT_ORDER.map((id, i) => {
    const ok = st.solved.includes(id);
    return `<div class="slot-box ${ok ? 'slot-box--found' : 'slot-box--empty'}"><span class="slot-word">${i + 1}. ${ok ? fragmentName(id) : '······'}</span></div>`;
  }).join('');
  const lastSignal = st.signals.filter((s) => s.to === w).slice(-1)[0];
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
}

function begin(s: Session): void {
  session = s;
  lobby.hidden = true;
  document.body.dataset.world = s.world;
  const w = s.world;
  const intro = w === 'real'
    ? ['GENESIS // AÑO 2097 · MUNDO REAL', 'Lía: «Sato… la fábrica se partió en dos. No ves al otro lado, pero alguien está allí.»', 'Lía: «Busca el canal de emergencia que dejé. Hay aire saliendo de una pared.»']
    : ['GENESIS // AÑO 2097 · MUNDO INVERTIDO', 'Lía: «Aquí nada es fiable. Los objetos flotan, los datos mienten.»', 'Lía: «Busca el canal de emergencia. Lo que sabes aquí, el otro mundo lo necesita.»'];
  engine = new WorldEngine(canvas, w, roomsOf(w).length, {
    isOpen,
    isSolved: (i) => solved(roomsOf(session.world)[i]),
    interactables,
    onInteract,
    onRoomChanged,
    intro,
  });
  let startRoom = 1;
  if (s.mode === 'coop') startRoom = Math.max(0, s.state.positions[w] ?? 1);
  engine.placeIn(Math.min(startRoom, roomsOf(w).length - 1));
  s.onChange(render);
  bindControls();
  render();
  engine.start();
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
    if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen();
    }
  });
  document.querySelector('#music-button')?.addEventListener('click', () => updateMusic(music.toggle()));
  document.querySelector('#fullscreen-button')?.addEventListener('click', () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen();
  });
  document.querySelector('#lobby-button')?.addEventListener('click', () => {
    if (confirm('¿Salir al menú? La partida cooperativa sigue en el servidor y puedes volver con el código.')) location.reload();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
    const key = button.dataset.key!;
    const start = (ev: Event): void => { ev.preventDefault(); engine.press(key); };
    const end = (ev: Event): void => { ev.preventDefault(); engine.release(key); };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointerleave', end);
  });
  document.querySelector('[data-action="interact"]')?.addEventListener('click', () => engine.interact());
}

showLobby();
