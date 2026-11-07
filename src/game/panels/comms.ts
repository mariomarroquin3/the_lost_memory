import { WALL, sanitizeMessage, type World } from '../../shared/reducer.js';
import { $, esc, panel, say, type PanelCtx } from './common';

const WORLD_LABEL: Record<World, string> = { real: 'REAL', inverted: 'INVERTIDO' };

/** Panel oculto que abre el cuarto de comunicaciones: repetir el patrón de luces. */
export function openHiddenPanel(ctx: PanelCtx, reveal: () => void): void {
  const colors = ['#e05252', '#4cc47a', '#00e5ff', '#e0b23c'];
  const names = ['ROJO', 'VERDE', 'CIAN', 'ÁMBAR'];
  const pattern = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
  const root = panel(ctx, {
    id: 'hidden',
    title: 'MURO FALSO',
    intro: 'Este trozo de pared es un panel suelto y sopla aire. Al lado hay un panel con cuatro luces que parpadean con un patrón distinto al de emergencia. Obsérvalo y repítelo.',
    lesson: '',
    body: `
      <div class="lamps">${colors.map((c, i) => `<button type="button" class="lamp" data-lamp="${i}" style="--c:${c}" aria-label="${names[i]}"></button>`).join('')}</div>
      <div class="rp-row"><button type="button" class="btn-terminal" data-play>Ver patrón</button></div>`,
  });
  const lamps = [...root.querySelectorAll<HTMLButtonElement>('[data-lamp]')];
  let input: number[] = [];
  let playing = false;
  const flash = (i: number, ms = 380): Promise<void> => new Promise((res) => {
    ctx.audio?.('signal-receive');
    lamps[i].classList.add('lamp--on');
    setTimeout(() => { lamps[i].classList.remove('lamp--on'); setTimeout(res, 140); }, ms);
  });
  const play = async (): Promise<void> => {
    if (playing) return;
    playing = true;
    input = [];
    say(root, 'Observa...');
    for (const i of pattern) await flash(i);
    playing = false;
    say(root, 'Repite el patrón pulsando las luces.');
  };
  root.querySelector('[data-play]')?.addEventListener('click', play);
  lamps.forEach((lamp, i) => lamp.addEventListener('click', () => {
    if (playing) return;
    void flash(i, 160);
    input.push(i);
    const k = input.length - 1;
    if (input[k] !== pattern[k]) {
      ctx.audio?.('error');
      say(root, 'El panel chisporrotea y reinicia la secuencia. Vuelve a mirar el patrón.');
      input = [];
      return;
    }
    if (input.length === pattern.length) {
      ctx.audio?.('solve');
      say(root, '✔ Un mecanismo cede: la pared falsa se desliza. Has encontrado el cuarto de comunicaciones (a la izquierda).', true);
      reveal();
    }
  }));
  void play();
}

/** Mensajes ya mostrados en la pared de este navegador. */
const played = new Set<string>();

/** Pared de luces: se escribe pulsando bombillas y el otro mundo ve cómo se encienden. */
export function openComms(ctx: PanelCtx): () => void {
  const s = ctx.session;
  const me = ctx.world;
  const other: World = me === 'real' ? 'inverted' : 'real';
  const solo = s.mode === 'solo';
  const COLORS = ['#e05252', '#4cc47a', '#00b8ff', '#e0b23c', '#c45ad8', '#ff8a3d'];
  const root = panel(ctx, {
    id: me === 'real' ? 'comms-real' : 'comms-inverted',
    title: `PARED DE LUCES // ${WORLD_LABEL[me]}`,
    intro: solo
      ? 'Con esta pared se habla con el otro mundo. Jugando solo no la necesitas: usa <b>⇄ Cambiar de mundo</b> para ir a leer las pistas tú mismo.'
      : 'Habla con el otro mundo encendiendo letras. Pulsa las bombillas (o escribe) y luego <b>Encender</b>. En el otro mundo, su pared se enciende letra a letra. Hay interferencias: a veces se enciende la bombilla de al lado. Con <b>Repetir cada letra 3 veces</b> casi siempre llega bien.',
    lesson: 'cómo dos agentes se entienden por un canal con ruido: repetir y confirmar.',
    body: `
      <div class="wall" data-wall>${[...WALL].map((ch, i) => `<button type="button" class="wbulb" data-ch="${ch}" style="--c:${COLORS[i % COLORS.length]}"><i></i><span>${ch}</span></button>`).join('')}</div>
      <div class="rp-row">
        <input class="cmd-input" data-msg maxlength="20" placeholder="Mensaje (ej: S1 4 5 10)" autocomplete="off" />
        <button type="button" class="btn-retro" data-space>Espacio</button>
        <button type="button" class="btn-retro" data-clear>Borrar</button>
        <button type="button" class="btn-terminal" data-send>Encender</button>
      </div>
      <label class="rp-small"><input type="checkbox" data-rep checked /> Repetir cada letra 3 veces (más lento, pero llega bien)</label>
      <div class="comms-grid">
        <div>
          <p class="comms-open" data-open hidden>✔ Canal abierto. Ya podéis pasaros pistas: escribe arriba (o pulsa bombillas) y pulsa <b>Encender</b> o Enter.</p>
          <div data-steps>
          <h3>Paso 1 · Saludar</h3>
          <p class="rp-small">Tu clave es <strong class="code">${s.state.verifyCodes[me]}</strong>. ${solo ? '' : 'Pulsa el botón para mandarla.'}</p>
          ${solo ? '' : '<div class="rp-row"><button type="button" class="btn-terminal" data-hello>Mandar mi clave</button></div>'}
          <h3>Paso 2 · Confirmar</h3>
          <p class="rp-small">Escribe la clave que te llegó del otro mundo.</p>
          <div class="rp-row">
            <input class="cmd-input" data-verify maxlength="4" placeholder="Clave recibida" autocomplete="off" />
            <button type="button" class="btn-terminal" data-verify-btn>Confirmar</button>
          </div>
          </div>
          <p class="rp-small" data-status></p>
          ${solo ? '<div class="rp-row"><button type="button" class="btn-terminal btn-switch" data-switch>⇄ Cambiar de mundo</button></div>' : ''}
          <details class="rp-small"><summary>Cómo pasar una pista</summary>
            <p>Escribe la sala y el dato, cortito. Ejemplos: <b>S1 4 5 10</b> (Sala 1: puntos 4, 5 y 10) · <b>S2 7 4</b> · <b>S8 B</b> · <b>S9 P5</b>. Si llega con «?», pide que lo repita.</p>
          </details>
        </div>
        <div>
          <h3>Mensajes</h3>
          <ol class="signal-log" data-log></ol>
        </div>
      </div>`,
  });

  const wall = root.querySelector<HTMLElement>('[data-wall]')!;
  const msgIn = $(root, '[data-msg]');
  const bulb = (ch: string): HTMLElement | null => wall.querySelector(`[data-ch="${ch}"]`);
  let queue: Promise<void> = Promise.resolve();
  const play = (text: string, audioEvent: 'signal-send' | 'signal-receive' = 'signal-receive'): void => {
    queue = queue.then(async () => {
      for (const ch of text) {
        if (!root.isConnected) return;
        ctx.audio?.(audioEvent);
        const b = ch === ' ' || ch === '?' ? null : bulb(ch);
        if (ch === '?') wall.classList.add('wall--glitch');
        b?.classList.add('wbulb--on');
        await new Promise((r) => setTimeout(r, 520));
        b?.classList.remove('wbulb--on');
        wall.classList.remove('wall--glitch');
        await new Promise((r) => setTimeout(r, 120));
      }
    });
  };
  wall.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-ch]');
    if (!b) return;
    msgIn.value = sanitizeMessage(msgIn.value + b.dataset.ch).slice(0, 20);
    b.classList.add('wbulb--on');
    setTimeout(() => b.classList.remove('wbulb--on'), 220);
  });
  root.querySelector('[data-space]')?.addEventListener('click', () => { msgIn.value = msgIn.value.replace(/ ?$/, ' ').slice(0, 20); });
  root.querySelector('[data-clear]')?.addEventListener('click', () => { msgIn.value = ''; });

  // Al abrir, se reproducen los mensajes que llegaron y aún no se vieron (los 3 últimos).
  const pending = s.state.signals.filter((sig) => sig.to === me && !played.has(sig.id));
  pending.slice(0, -3).forEach((sig) => played.add(sig.id));
  const renderLog = (): void => {
    const log = root.querySelector<HTMLElement>('[data-log]')!;
    const items = s.state.signals.slice(-12).reverse();
    log.innerHTML = items.length ? items.map((sig) => {
      const mine = sig.from === me;
      const showSent = mine || solo;
      return `<li class="${mine ? 'out' : 'in'}">
        <span>${mine ? '↑ Mandaste' : '↓ Te llegó'} · ${new Date(sig.at).toLocaleTimeString()}${sig.encoding === 'rep3' ? ' · x3' : ''}</span>
        <span class="sig-text ${sig.received === sig.sent ? 'ok' : 'bad'}">${esc(sig.received)}</span>
        ${showSent && sig.received !== sig.sent ? `<span class="rp-small">Se quería mandar: ${esc(sig.sent)}</span>` : ''}
      </li>`;
    }).join('') : '<li class="rp-small">Todavía no hay mensajes.</li>';
    for (const sig of s.state.signals) {
      if (sig.to !== me || played.has(sig.id)) continue;
      played.add(sig.id);
      play(sig.received, 'signal-receive');
    }
    const st = s.state;
    const open = st.channelActive && !solo;
    root.querySelector<HTMLElement>('[data-open]')!.hidden = !open;
    root.querySelector<HTMLElement>('[data-steps]')!.hidden = open;
    root.querySelector<HTMLElement>('[data-status]')!.innerHTML = solo ? '' : [
      `Tu clave llegó: ${st.verified[me] ? '<b class="ok">SÍ</b>' : 'todavía no'}`,
      `Confirmaste la suya: ${st.verified[other] ? '<b class="ok">SÍ</b>' : 'todavía no'}`,
      st.channelActive ? '<b class="ok">CANAL ABIERTO</b>' : '',
    ].filter(Boolean).join(' · ');
  };
  renderLog();

  const send = (text: string, rep: boolean): void => {
    const message = sanitizeMessage(text);
    if (!message) { say(root, 'Pulsa algunas bombillas o escribe un mensaje.'); return; }
    s.dispatch({ type: 'signal', message, encoding: rep ? 'rep3' : 'none' });
    play(message, 'signal-send');
    say(root, solo ? 'Mensaje guardado. Cambia de mundo para leerlo.' : 'Mensaje enviado. En el otro mundo se encienden sus luces.');
  };
  const sendTyped = (): void => { send(msgIn.value, $(root, '[data-rep]').checked); msgIn.value = ''; };
  root.querySelector('[data-send]')?.addEventListener('click', sendTyped);
  msgIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendTyped(); } });
  $(root, '[data-verify]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); root.querySelector<HTMLButtonElement>('[data-verify-btn]')?.click(); } });
  root.querySelector('[data-hello]')?.addEventListener('click', () => send(s.state.verifyCodes[me], true));

  root.querySelector('[data-verify-btn]')?.addEventListener('click', () => {
    const code = sanitizeMessage($(root, '[data-verify]').value).replace(/ /g, '');
    if (code === s.state.verifyCodes[other]) {
      s.dispatch({ type: 'verify', code });
      say(root, '✔ Clave correcta. Cuando el otro también confirme la tuya, el canal queda abierto.', true);
    } else {
      say(root, 'Esa clave no coincide. Pide al otro que la mande otra vez.');
    }
  });

  root.querySelector('[data-switch]')?.addEventListener('click', () => {
    ctx.close();
    s.switchWorld?.();
  });

  return renderLog;
}
