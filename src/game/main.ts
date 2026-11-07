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
import { playBossOpening } from './bossOpening';
import { clearEndingScenePlayed, hasEndingScenePlayed, markEndingScenePlayed, playEndingScene, playTruthScene, type EndingSceneViewer } from './endingScene';
import { bossArenaPosition } from '../shared/reducer.js';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const banner = document.querySelector<HTMLElement>('#room-banner')!;
const lobby = document.querySelector<HTMLElement>('#lobby')!;
const music = new Music();

function syncMusicButton(enabled = music.enabled): void {
  const button = document.querySelector('#music-button');
  if (button) button.innerHTML = `Música: ${enabled ? 'sí' : 'no'}<br>(M)`;
}

let session: Session;
let engine: TileEngine;
let refreshPanel: (() => void) | null = null;
let shownEnding: Ending | null = null;
let channelOpeningPlaying = false;
let bossOpeningPlaying = false;
let bossFightShown = false;
let bossVictoryShown = false;
let finalDecisionShown = false;
let endingScenePlaying = false;
let lastAlert = 5;
let audioChannelActive = false;

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
    music.unlock();
    const coop = new CoopSession();
    coop.connect('', b.dataset.create as World).then(() => begin(coop)).catch(fail);
  }));
  lobby.querySelector('[data-join]')?.addEventListener('click', () => {
    music.unlock();
    const code = (lobby.querySelector('[data-code]') as HTMLInputElement).value.trim().toUpperCase();
    if (code.length !== 4) { showLobby('El código tiene 4 letras.'); return; }
    const coop = new CoopSession();
    coop.connect(code, last?.code === code ? last.world : null).then(() => begin(coop)).catch(fail);
  });
  lobby.querySelectorAll<HTMLButtonElement>('[data-solo]').forEach((b) => b.addEventListener('click', () => {
    music.unlock();
    const fresh = b.dataset.solo === 'new';
    if (fresh) clearEndingScenePlayed('SOLO');
    void begin(new SoloSession(fresh));
  }));
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
  music.event('blocked');
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
    audio: (event) => music.event(event),
  };
}

function openGuide(): void {
  engine.setPaused(true);
  overlay.hidden = false;
  overlay.innerHTML = guideHtml(session.world, session.mode === 'solo');
  overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
}

function openAudioSettings(): void {
  if (!engine) return;
  const settings = music.getSettings();
  engine.setPaused(true);
  overlay.hidden = false;
  overlay.innerHTML = `<section class="puzzle crt-panel rp audio-settings" role="dialog" aria-modal="true">
    <div class="puzzle__head"><h2>AUDIO // GENESIS</h2><button type="button" class="btn-retro" data-close>Cerrar (Esc)</button></div>
    ${(['master', 'music', 'sfx', 'ambient'] as const).map((bus) => `<label class="audio-settings__row"><span>${bus === 'master' ? 'Volumen general' : bus === 'music' ? 'Música' : bus === 'sfx' ? 'Efectos' : 'Ambiente'}</span><input type="range" min="0" max="1" step="0.01" value="${settings[bus]}" data-audio-bus="${bus}"><output data-audio-value="${bus}">${Math.round(settings[bus] * 100)}%</output></label>`).join('')}
    <label class="audio-settings__mute"><input type="checkbox" data-audio-mute ${settings.muted ? 'checked' : ''}> Silenciar todo</label>
  </section>`;
  overlay.querySelector('[data-close]')?.addEventListener('click', closePanel);
  overlay.querySelectorAll<HTMLInputElement>('[data-audio-bus]').forEach((input) => input.addEventListener('input', () => {
    const bus = input.dataset.audioBus as 'master' | 'music' | 'sfx' | 'ambient';
    const value = Number(input.value);
    music.setVolume(bus, value);
    const output = overlay.querySelector<HTMLOutputElement>(`[data-audio-value="${bus}"]`);
    if (output) output.value = `${Math.round(value * 100)}%`;
  }));
  overlay.querySelector<HTMLInputElement>('[data-audio-mute]')?.addEventListener('change', (event) => {
    music.setMuted((event.target as HTMLInputElement).checked);
  });
}

function closePanel(): void {
  if (bossOpeningPlaying || (!session.state.ending && (bossVictoryShown || finalDecisionShown))) return;
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
    music.event('clue');
    if (thing?.info) toast(thing.info.title, thing.info.text); else engine.setPaused(false);
    return;
  }
  if (id === 'switch') { music.event('door'); engine.setPaused(false); switchWorld(); return; }
  if (id === 'hidden-panel') { openHiddenPanel(ctx, () => { music.event('door'); session.dispatch({ type: 'reveal-comms' }); }); return; }
  if (id === 'clue') {
    music.event('clue');
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
  if (session.state.fragments < 10) {
    const box = overlay.querySelector('[data-final]');
    if (box) box.innerHTML = `<p class="rp-small bad">Lía está alineada, pero faltan ${10 - session.state.fragments} fragmentos. Ninguna dimensión contiene toda la verdad: ayudad al otro mundo.</p>`;
    return;
  }
  if (session.state.boss.phase !== 'defeated') {
    if (!session.state.boss.active) session.dispatch({ type: 'boss-start' });
    return;
  }
  openFinalDecision();
}

function openFinalDecision(): void {
  if (finalDecisionShown || session.state.ending) return;
  finalDecisionShown = true;
  refreshPanel = null;
  engine.setPaused(true);
  overlay.hidden = false;
  overlay.innerHTML = `<section class="puzzle crt-panel rp final-decision"><div class="puzzle__head"><h2>DECISIÓN FINAL // GENESIS</h2></div><div data-final>
    <h3>Decisión final sobre Genesis</h3>
    <p class="rp-small">Con los diez fragmentos ya sabéis la verdad: Sato autorizó al Alucinador y después intentó detenerlo. ¿Qué hacéis?</p>
    <button type="button" class="btn-terminal" data-end="lia">Restaurar a Lía con supervisión humana</button>
    <button type="button" class="btn-retro" data-end="new-genesis">Borrar a Lía y empezar un nuevo Genesis</button>
    <button type="button" class="btn-retro" data-end="lost">Confiar en el Alucinador</button>
  </div></section>`;
  const box = overlay.querySelector<HTMLElement>('[data-final]')!;
  box.querySelectorAll<HTMLButtonElement>('[data-end]').forEach((b) => b.addEventListener('click', () => {
    session.dispatch({ type: 'ending', choice: b.dataset.end as Ending });
  }));
}

const ENDINGS: Record<Ending, { code: string; text: string }> = {
  lia: { code: 'SYSTEM RESTORED: 100%', text: 'Lía recupera el control con puntos de aprobación humana. El Alucinador se apaga y la red vuelve a respirar. La responsabilidad se comparte.' },
  'new-genesis': { code: 'HUMANITY OFFLINE', text: 'Sin la memoria de Lía, el Alucinador se detiene… y la infraestructura global también. Un nuevo Genesis tardará años.' },
  lost: { code: 'GLOBAL CONTEXT: LOST', text: 'El Alucinador completa el Protocolo de Entropía. Habla con total seguridad. Nadie comprueba nada.' },
};

function showEnding(ending: Ending, force = false): void {
  if (!force && shownEnding === ending) return;
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

function endingAudioLine(line: string): void {
  if (line.startsWith('ALUCINADOR')) music.event('alucinador');
  else if (line.startsWith('LÍA')) music.event('lia');
}

function sceneLineAudio(line: string): void {
  const text = line.trimStart();
  if (text.startsWith('ALUCINADOR') || text.startsWith('>')) music.event('alucinador');
  else if (text.startsWith('LÍA')) music.event('lia');
}

function endingViewer(): EndingSceneViewer {
  return session.mode === 'solo' ? 'solo' : session.world;
}

/** Reproduce el final una sola vez y conserva la pantalla final existente al terminar. */
function maybePlayEnding(ending: Ending): void {
  if (engine.inIntro || endingScenePlaying || channelOpeningPlaying || bossOpeningPlaying) return;
  if (finalDecisionShown) {
    finalDecisionShown = false;
    refreshPanel = null;
    overlay.hidden = true;
    overlay.replaceChildren();
  } else if (!overlay.hidden) {
    return;
  }
  if (hasEndingScenePlayed(session.code, endingViewer())) {
    showEnding(ending);
    return;
  }

  endingScenePlaying = true;
  markEndingScenePlayed(session.code, endingViewer());
  music.event(ending === 'lia' ? 'ending-lia' : ending === 'new-genesis' ? 'ending-new-genesis' : 'ending-lost');
  refreshPanel = null;
  engine.setPaused(true);
  void playEndingScene(overlay, ending, {
    cooperative: session.mode === 'coop',
    onLine: endingAudioLine,
  }).then(() => {
    endingScenePlaying = false;
    engine.setPaused(true);
    showEnding(ending, true);
  });
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
  const inBossArena = session.state.boss?.active && engine.world === 'inverted' && session.world === 'real';
  if (session.mode === 'coop' && !inBossArena) session.dispatch({ type: 'pos', room: index });
  music.setWorld(session.world);
  if (!inBossArena) music.event('door');
  const info = inBossArena ? ROOM_INFO.inverted[6] : ROOM_INFO[session.world][index];
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
  if (st.boss?.active) {
    const arena = bossArenaPosition(st.boss.startedAt);
    // Los aciertos solo cuentan en la parada actual (lastCycle), no en una vuelta anterior.
    const thisStop = st.boss.lastCycle === arena.cycle;
    const mineHit = thisStop && st.boss.hits[w] === arena.stop;
    const otherHit = thisStop && st.boss.hits[other] === arena.stop;
    if (!arena.vulnerable) return 'Persigue a la araña.';
    if (mineHit && session.mode !== 'solo' && !otherHit && st.connected[other]) return 'Tu disparo acertó: falta el del otro mundo.';
    if (mineHit) return '¡Impacto! Persigue la siguiente parada.';
    return '¡Está quieta! ESPACIO para apuntar. Esquiva la telaraña.';
  }
  if (st.boss?.phase === 'defeated' && !st.ending) return 'La araña cayó. Elige el destino de Genesis.';
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
  const roomId = roomsOf(w)[engine.room];
  music.unlock();
  music.setWorld(w);
  music.setAlert(st.alert);
  music.setFragments(st.fragments);
  music.setScene(
    st.ending === 'lia' ? 'final-lia'
      : st.ending === 'new-genesis' ? 'final-new-genesis'
        : st.ending === 'lost' ? 'final-lost'
          : st.boss?.active || st.boss?.phase === 'defeated' ? 'core'
            : st.alert >= 75 ? 'vulnerability'
              : st.alert >= 45 ? 'intrusion'
                : st.fragments > 0 ? 'recovery'
                  : st.channelActive || roomId?.startsWith('comms') || roomId === 'transition'
                    ? 'investigation' : 'exploration',
  );
  syncMusicButton();
  if (st.alert > lastAlert) music.event('alert');
  lastAlert = st.alert;
  if (st.channelActive && !audioChannelActive) music.event('channel-open');
  audioChannelActive = st.channelActive;
  const other: World = w === 'real' ? 'inverted' : 'real';
  const inBossArena = st.boss?.active && engine.world === 'inverted' && w === 'real';
  const info = inBossArena ? ROOM_INFO.inverted[6] : ROOM_INFO[w][engine.room];
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
    music.event('signal-receive');
    engine.wallMessage(sig.received);
    freshUntil = Date.now() + 12000;
    setTimeout(render, 12100);
  }
  heardReady = true;
  hud.innerHTML = `
    <div class="hud__box ${w === 'inverted' ? 'hud__box--inv' : ''}">
      <div class="hud__header"><span class="hud__title">${WORLD_NAME[w]}</span><span class="hud__sync ${st.alert >= 75 ? 'hud__sync--crit' : ''}">ALERTA ${st.alert}%</span></div>
      <div class="hud__room">${info.short} · ${info.name.toUpperCase()}</div>
      ${st.boss?.active ? `<div class="hud__row"><span>PATAS</span><strong>${st.boss.legs.filter(Boolean).length}/8</strong></div>
      <div class="hud__row"><span>PARADA</span><strong data-boss-time>${st.boss.phase === 'fight' ? `${Math.ceil(bossArenaPosition(st.boss.startedAt).remaining / 1000)} s` : '—'}</strong></div>` : ''}
      <div class="hud__row"><span>PARTIDA</span><strong>${session.code}${'server' in session && session.server ? ` · srv ${session.server}` : ''}</strong></div>
      <div class="hud__row"><span>CANAL</span><strong class="${st.channelActive ? 'text-green' : 'text-red'}">${st.channelActive ? 'ACTIVO' : st.commsRevealed[w] ? 'SIN VERIFICAR' : 'OCULTO'}</strong></div>
      <div class="hud__row"><span class="${session.online ? '' : 'text-red'}">${'kicked' in session && session.kicked ? 'Esta partida se abrió en otra pestaña o PC. Usa esa.' : session.online ? peer : 'RECONECTANDO…'}</span></div>
      ${lastSignal && Date.now() < freshUntil ? `<div class="hud__signal">💡 La pared de luces se enciende: <b>${lastSignal.received}</b></div>` : ''}
      <div class="hud__goal" data-boss-goal>▶ ${objective()}</div>
    </div>`;

  document.querySelector('#fragment-count')!.textContent = `Fragmentos de contexto · ${st.fragments} de 10 recuperados`;
  document.querySelector('#fragment-slots')!.innerHTML = FRAGMENT_ORDER.map((id, i) => {
    const ok = st.solved.includes(id);
    return `<div class="slot-box ${ok ? 'slot-box--found' : 'slot-box--empty'}"><span class="slot-word">${i + 1}. ${ok ? fragmentName(id) : '······'}</span></div>`;
  }).join('');
  document.querySelector('#collectibles-label')!.textContent = lastSignal ? `Última señal recibida: ${lastSignal.received}` : 'Sin señales recibidas';
  document.querySelector('#minimap-grid')!.innerHTML = (['real', 'inverted'] as World[]).map((world) =>
    `<div class="mini-row ${world}">${ROOM_INFO[world].map((r, i) => {
      const here = inBossArena ? world === 'inverted' && i === 6 : world === w && i === engine.room;
      const peerHere = session.mode === 'coop' && world === other && st.positions[other] === i && st.connected[other];
      const hidden = i === 0 && !st.commsRevealed[world];
      return `<div class="minimap-cell ${here ? 'minimap-cell--current' : ''} ${st.solved.includes(r.id) ? 'minimap-cell--found' : ''} ${peerHere ? 'minimap-cell--peer' : ''}" title="${r.name}">${hidden ? '?' : r.short}</div>`;
    }).join('')}</div>`).join('');

  if (st.ending) maybePlayEnding(st.ending);
  refreshPanel?.();
  maybePlayChannelOpening();
  maybePlayBossFlow();
}

/** Mantiene el objetivo y el cronómetro del jefe vivos sin reconstruir todo el HUD. */
function updateBossHudLive(): void {
  if (!session || !engine || !session.state.boss?.active) return;
  const boss = session.state.boss;
  const arena = bossArenaPosition(boss.startedAt);
  const time = hud.querySelector<HTMLElement>('[data-boss-time]');
  if (time) time.textContent = arena.vulnerable ? `${Math.ceil(arena.remaining / 1000)} s` : 'camina';
  const goal = hud.querySelector<HTMLElement>('[data-boss-goal]');
  if (goal) goal.textContent = `▶ ${objective()}`;
}

/** Recuerda en este navegador que la escena del canal ya se vio en esta partida. */
const channelSceneKey = (): string => `rescate-escena2-${session.code}`;
function channelSceneDone(): boolean {
  try { return localStorage.getItem(channelSceneKey()) === '1'; } catch { return false; }
}

function maybePlayChannelOpening(): void {
  // No pisar la cinemática de inicio (comparten el overlay).
  // Además de la marca del servidor se guarda una marca local: si el servidor pierde la marca
  // (reinicio, deploy o una versión vieja del servidor), la escena no vuelve a salir en bucle.
  if (engine.inIntro || channelOpeningPlaying || session.state.channelOpeningSeen || channelSceneDone()) return;
  const ready = session.mode === 'coop'
    ? session.state.channelActive
    : session.state.commsRevealed.real || session.state.commsRevealed.inverted;
  if (!ready) return;

  channelOpeningPlaying = true;
  try { localStorage.setItem(channelSceneKey(), '1'); } catch { /* sin almacenamiento: queda la marca del servidor */ }
  refreshPanel = null;
  engine.setPaused(true);
  session.dispatch({ type: 'mark-channel-opening-seen' });
  void playChannelOpening(overlay, sceneLineAudio).then(() => {
    channelOpeningPlaying = false;
    engine.setPaused(false);
    render();
  });
}

function maybePlayBossFlow(): void {
  if (engine.inIntro) return;
  const boss = session.state.boss;
  // Si el último fragmento llega desde el otro mundo (o al recargar), la araña aparece sola:
  // no hace falta volver a abrir la Sala 10.
  if (boss.phase === 'idle' && session.state.fragments >= 10 && session.state.solved.includes('i10')) {
    session.dispatch({ type: 'boss-start' });
    return;
  }
  if (boss.active) {
    // La escena previa se ve una sola vez por combate (antes se repetía en cada actualización).
    if (bossOpeningPlaying || bossFightShown) return;
    bossFightShown = true;
    bossOpeningPlaying = true;
    music.event('boss-start');
    refreshPanel = null;
    engine.setPaused(true);
    // Los dos clientes dibujan la arena de i10, incluso si uno pertenece al Real.
    if (session.world === 'real') engine.setWorld('inverted', 6);
    else if (engine.world !== 'inverted' || engine.room !== 6) engine.setWorld('inverted', 6);
    void playBossOpening(overlay, sceneLineAudio).then(() => {
      bossOpeningPlaying = false;
      if (!session.state.boss.active) {
        engine.setPaused(false);
        render();
        return;
      }
      engine.setPaused(false);
      render();
    });
    return;
  }
  if (boss.phase === 'defeated' && !session.state.ending) {
    if (bossVictoryShown || finalDecisionShown) {
      // Ya se mostró la victoria o la decisión: no volver a limpiar el overlay en cada actualización.
      if (bossVictoryShown && !finalDecisionShown) return;
      openFinalDecision();
      return;
    }
    refreshPanel = null;
    overlay.hidden = true;
    overlay.replaceChildren();
    if (session.world === 'real' && engine.world !== 'real') {
      engine.setWorld('real', session.state.positions.real ?? 1);
    }
    // setWorld puede volver a llamar a render() y mostrar la victoria antes de llegar aquí;
    // en ese caso no hay que saltar a la decisión (se saltaba la victoria y la escena de la verdad).
    if (!bossVictoryShown) showBossVictory();
  }
}

function showBossVictory(): void {
  bossVictoryShown = true;
  engine.setPaused(true);
  overlay.hidden = false;
  overlay.innerHTML = `<section class="puzzle crt-panel rp boss-victory" role="dialog" aria-modal="true">
    <h2>RED CONTEXTUAL ROTA</h2>
    <p>«Normalizar es quedarte con la intención, no con el ruido».</p>
    <button type="button" class="btn-terminal" data-continue>Continuar</button>
  </section>`;
  const continueButton = overlay.querySelector('[data-continue]');
  continueButton?.addEventListener('click', playTruthThenDecide, { once: true });
  window.setTimeout(playTruthThenDecide, 2200);
}

/**
 * Entre la victoria y la decisión: la escena «La verdad» confirma que Sato firmó la orden.
 * Se ve una sola vez por partida en este navegador (marca local, como las otras escenas).
 */
let truthPlaying = false;
function playTruthThenDecide(): void {
  if (truthPlaying || finalDecisionShown || session.state.ending) return;
  const key = `rescate-verdad-${session.code}`;
  let seen = false;
  try { seen = localStorage.getItem(key) === '1'; } catch { /* sin almacenamiento */ }
  if (seen) { openFinalDecision(); return; }
  truthPlaying = true;
  try { localStorage.setItem(key, '1'); } catch { /* sin almacenamiento */ }
  engine.setPaused(true);
  void playTruthScene(overlay, { onLine: endingAudioLine }).then(() => {
    truthPlaying = false;
    // Si el otro jugador ya eligió el final mientras se veía la escena, pasar directo al final.
    if (!session.state.ending) openFinalDecision();
    else render();
  });
}

async function begin(s: Session): Promise<void> {
  session = s;
  shownEnding = null;
  channelOpeningPlaying = false;
  bossOpeningPlaying = false;
  bossFightShown = false;
  bossVictoryShown = false;
  finalDecisionShown = false;
  endingScenePlaying = false;
  lastAlert = s.state.alert;
  audioChannelActive = s.state.channelActive;
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
    bossActive: () => session.state.boss?.active ?? false,
    bossState: () => session.state.boss,
    bossWorld: () => session.world,
    bossConnected: (world) => session.mode === 'solo' || session.state.connected[world],
    onBossPosition: (x, y) => session.dispatch({ type: 'boss-pos', x, y }),
    onBossFire: (fire) => { music.event('boss-fire'); session.dispatch({ type: 'boss-fire', ...fire }); },
    onBossWebHit: () => { music.event('web-hit'); session.dispatch({ type: 'boss-web-hit' }); },
    onBossFrame: updateBossHudLive,
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
  await playOpening(overlay, sceneLineAudio);
  engine.skipIntro();
  engine.setPaused(false);
  render(); // por si al entrar ya toca la escena del canal o el jefe
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
/**
 * Botones de prueba. Solo aparecen con ?debug en la URL (p. ej. https://tu-app.fly.dev/?debug),
 * así no salen en la presentación.
 */
function bindDebug(): void {
  if (!new URLSearchParams(location.search).has('debug') || document.querySelector('.debug-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'debug-bar';
  bar.innerHTML = `<span>DEBUG</span>
    <button type="button" class="btn-retro" data-debug="opening">Escena 1 (inicio)</button>
    <button type="button" class="btn-retro" data-debug="channel">Escena 2 (canal)</button>
    <select class="btn-retro" data-debug-ending aria-label="Final de prueba">
      <option value="lia">Final: Lía</option>
      <option value="new-genesis">Final: Nuevo Genesis</option>
      <option value="lost">Final: Perdido</option>
    </select>
    <button type="button" class="btn-retro" data-debug="truth">La verdad</button>
    <button type="button" class="btn-retro" data-debug="ending">Escena final</button>
    <button type="button" class="btn-retro" data-debug="boss">Ir al jefe final</button>`;
  document.body.append(bar);
  const play = (fn: (host: HTMLElement) => Promise<void>): void => {
    if (!overlay.hidden) return;
    engine.setPaused(true);
    void fn(overlay).then(() => { engine.setPaused(false); render(); });
  };
  bar.querySelector('[data-debug="opening"]')?.addEventListener('click', () => play(playOpening));
  bar.querySelector('[data-debug="channel"]')?.addEventListener('click', () => play(playChannelOpening));
  bar.querySelector('[data-debug="truth"]')?.addEventListener('click', () => play((host) => playTruthScene(host, { onLine: endingAudioLine })));
  bar.querySelector('[data-debug="ending"]')?.addEventListener('click', () => {
    if (engine.inIntro || endingScenePlaying || !overlay.hidden) return;
    const selector = bar.querySelector<HTMLSelectElement>('[data-debug-ending]');
    const ending = (selector?.value ?? 'lia') as Ending;
    endingScenePlaying = true;
    music.event(ending === 'lia' ? 'ending-lia' : ending === 'new-genesis' ? 'ending-new-genesis' : 'ending-lost');
    engine.setPaused(true);
    void playEndingScene(overlay, ending, { cooperative: session.mode === 'coop', onLine: endingAudioLine }).then(() => {
      endingScenePlaying = false;
      engine.setPaused(true);
      showEnding(ending, true);
    });
  });
  bar.querySelector('[data-debug="boss"]')?.addEventListener('click', () => {
    // Marca las 10 salas y el canal como resueltos (en cooperativo, para los dos) y arranca el jefe.
    session.dispatch({ type: 'debug-boss' });
    session.dispatch({ type: 'boss-start' });
  });
}

function bindControls(): void {
  bindDebug();
  if (controlsBound) return;
  controlsBound = true;
  const updateMusic = (): void => syncMusicButton();
  window.addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === 'Escape' && !overlay.hidden) closePanel();
    if (typing) return;
    if (e.key.toLowerCase() === 'm') { music.toggle(); updateMusic(); }
    if (e.key.toLowerCase() === 'g' && overlay.hidden && !engine.inIntro) openGuide();
    if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen();
    }
  });
  document.querySelector('#music-button')?.addEventListener('click', () => { music.toggle(); updateMusic(); });
  document.querySelector('#audio-settings-button')?.addEventListener('click', () => { if (!overlay.hidden) return; openAudioSettings(); });
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
