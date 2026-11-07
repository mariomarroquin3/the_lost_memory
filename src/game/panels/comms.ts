import { CHANNEL_NOISE, encodeSymbol, sanitizeMessage, transmit, type Encoding, type World } from '../../shared/reducer.js';
import { $, esc, panel, say, sim, type PanelCtx } from './common';

const ENC_LABEL: Record<Encoding, string> = { none: 'Sin codificar (4 bits)', rep3: 'Repetición x3 (12 bits)', parity: 'Paridad (5 bits)' };
const WORLD_LABEL: Record<World, string> = { real: 'REAL', inverted: 'INVERTIDO' };

/** Panel oculto que abre el cuarto de comunicaciones: repetir el patrón de luces. */
export function openHiddenPanel(ctx: PanelCtx, reveal: () => void): void {
  const colors = ['#e05252', '#4cc47a', '#00e5ff', '#e0b23c'];
  const names = ['ROJO', 'VERDE', 'CIAN', 'ÁMBAR'];
  const pattern = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
  const root = panel(ctx, {
    id: 'hidden',
    title: 'REJILLA DE MANTENIMIENTO',
    intro: 'Una corriente de aire sale de la pared. Detrás hay un panel con cuatro luces que parpadean con un patrón distinto al de emergencia. Obsérvalo y repítelo.',
    lesson: '',
    body: `
      <div class="lamps">${colors.map((c, i) => `<button type="button" class="lamp" data-lamp="${i}" style="--c:${c}" aria-label="${names[i]}"></button>`).join('')}</div>
      <div class="rp-row"><button type="button" class="btn-terminal" data-play>Ver patrón</button></div>`,
  });
  const lamps = [...root.querySelectorAll<HTMLButtonElement>('[data-lamp]')];
  let input: number[] = [];
  let playing = false;
  const flash = (i: number, ms = 380): Promise<void> => new Promise((res) => {
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
      say(root, 'El panel chisporrotea y reinicia la secuencia. Vuelve a mirar el patrón.');
      input = [];
      return;
    }
    if (input.length === pattern.length) {
      say(root, '✔ Un mecanismo cede: la pared falsa se desliza. Has encontrado el cuarto de comunicaciones (a la izquierda).', true);
      reveal();
    }
  }));
  void play();
}

/** Consola del cuarto de comunicaciones: señales luminosas por un canal con ruido. */
export function openComms(ctx: PanelCtx): () => void {
  const s = ctx.session;
  const me = ctx.world;
  const other: World = me === 'real' ? 'inverted' : 'real';
  const solo = s.mode === 'solo';
  const root = panel(ctx, {
    id: me === 'real' ? 'comms-real' : 'comms-inverted',
    title: `SALA DE COMUNICACIONES // ${WORLD_LABEL[me]}`,
    intro: 'Dos agentes, uno por mundo, solo pueden hablar con luces y el canal mete ruido. Acordad un protocolo: saludo, formato del mensaje, confirmación de recibido y corrección de errores. Los mensajes son símbolos 0-9 y A-F (4 bits cada uno).',
    lesson: 'codificación, protocolos entre agentes y verificación de mensajes.',
    body: `
      <div class="comms-grid">
        <div>
          <h3>Enviar señal</h3>
          <div class="rp-row">
            <input class="cmd-input" data-msg maxlength="8" placeholder="Ej: 1A05" autocomplete="off" />
            <select class="late-room__select" data-enc>
              ${(Object.keys(ENC_LABEL) as Encoding[]).map((e) => `<option value="${e}">${ENC_LABEL[e]}</option>`).join('')}
            </select>
            <button type="button" class="btn-terminal" data-send>Enviar</button>
          </div>
          <div class="bulbs" data-bulbs></div>
          <h3>Verificación del canal</h3>
          <p class="rp-small">Tu código de verificación: <strong class="code">${s.state.verifyCodes[me]}</strong> · transmítelo al otro mundo.</p>
          <div class="rp-row">
            <input class="cmd-input" data-verify maxlength="4" placeholder="Código recibido" autocomplete="off" />
            <button type="button" class="btn-terminal" data-verify-btn>Confirmar recibido</button>
          </div>
          <p class="rp-small" data-status></p>
          ${solo ? '<div class="rp-row"><button type="button" class="btn-terminal btn-switch" data-switch>⇄ Cambiar de dimensión</button></div>' : ''}
          <details class="rp-small"><summary>Protocolo sugerido</summary>
            <p>Primer símbolo = tipo: 1 tengo una pista · 2 necesito información · 3 completé mi parte · A dato de Lía · F advertencia. Segundo = sala. Resto = dato. Repite o usa paridad si llega un «?».</p>
          </details>
        </div>
        <div>
          <h3>Registro de comunicaciones</h3>
          <ol class="signal-log" data-log></ol>
          <h3>Simulador de canal</h3>
          <label class="rp-small">Ruido por bit: <span data-noise-v></span>
            <input type="range" min="0" max="40" value="${Math.round(CHANNEL_NOISE * 100)}" data-noise /></label>
          <canvas width="300" height="110" data-chart class="sim-canvas"></canvas>
          <p class="rp-small">Error por símbolo con 400 envíos simulados. El canal real entre mundos tiene ${Math.round(CHANNEL_NOISE * 100)}% de ruido.</p>
        </div>
      </div>`,
  });

  const bulbs = root.querySelector<HTMLElement>('[data-bulbs]')!;
  const showBits = (bits: number[]): void => {
    bulbs.innerHTML = bits.map((b) => `<i class="bulb ${b ? 'bulb--on' : ''}"></i>`).join('');
  };
  showBits(encodeSymbol('0', 'none'));

  const renderLog = (): void => {
    const log = root.querySelector<HTMLElement>('[data-log]')!;
    const items = s.state.signals.slice(-14).reverse();
    log.innerHTML = items.length ? items.map((sig) => {
      const mine = sig.from === me;
      const showSent = mine || solo;
      return `<li class="${mine ? 'out' : 'in'}">
        <span>${mine ? '↑ ENVIADA' : '↓ RECIBIDA'} · ${WORLD_LABEL[sig.from]}→${WORLD_LABEL[sig.to]} · ${new Date(sig.at).toLocaleTimeString()}</span>
        ${showSent ? `<span>Enviado: <b>${esc(sig.sent)}</b></span>` : ''}
        <span>Llegó: <b class="${sig.received === sig.sent ? 'ok' : 'bad'}">${esc(sig.received)}</b></span>
        <span class="rp-small">${ENC_LABEL[sig.encoding]} · ${sig.flipped}/${sig.bits} bits alterados</span>
      </li>`;
    }).join('') : '<li class="rp-small">Sin señales todavía.</li>';
    const status = root.querySelector<HTMLElement>('[data-status]')!;
    const st = s.state;
    status.innerHTML = [
      `Cuarto ${WORLD_LABEL[other]}: ${st.commsRevealed[other] ? 'encontrado' : 'sin encontrar'}`,
      `Tu código llegó al otro lado: ${st.verified[me] ? 'SÍ' : 'NO'}`,
      `Código del otro lado confirmado: ${st.verified[other] ? 'SÍ' : 'NO'}`,
      st.channelActive ? '<b class="ok">CANAL ESTABLECIDO</b>' : '<b class="bad">Canal sin establecer</b>',
    ].join(' · ');
  };
  renderLog();

  const chart = sim(root, '[data-chart]');
  const drawChart = (): void => {
    const noise = Number($(root, '[data-noise]').value) / 100;
    root.querySelector('[data-noise-v]')!.textContent = `${Math.round(noise * 100)}%`;
    chart.fillStyle = '#0b0910';
    chart.fillRect(0, 0, 300, 110);
    (['none', 'rep3', 'parity'] as Encoding[]).forEach((enc, i) => {
      let wrong = 0;
      let unknown = 0;
      for (let k = 0; k < 400; k++) {
        const sym = '0123456789ABCDEF'[k % 16];
        const r = transmit(sym, enc, noise).received;
        if (r === '?') unknown++; else if (r !== sym) wrong++;
      }
      const y = 14 + i * 32;
      chart.fillStyle = '#9d93a9';
      chart.font = '9px monospace';
      chart.fillText(enc === 'none' ? 'sin cod.' : enc === 'rep3' ? 'rep x3' : 'paridad', 4, y + 10);
      chart.fillStyle = '#e05252';
      chart.fillRect(70, y, (wrong / 400) * 220, 12);
      chart.fillStyle = '#e0b23c';
      chart.fillRect(70 + (wrong / 400) * 220, y, (unknown / 400) * 220, 12);
      chart.fillStyle = '#ece3d6';
      chart.fillText(`${Math.round((wrong / 400) * 100)}% error${unknown ? ` · ${Math.round((unknown / 400) * 100)}% «?»` : ''}`, 74, y + 24);
    });
  };
  drawChart();
  $(root, '[data-noise]').addEventListener('input', drawChart);

  root.querySelector('[data-send]')?.addEventListener('click', () => {
    const message = sanitizeMessage($(root, '[data-msg]').value);
    if (!message) { say(root, 'Escribe símbolos 0-9 o A-F.'); return; }
    const encoding = $(root, '[data-enc]').value as Encoding;
    s.dispatch({ type: 'signal', message, encoding });
    // Animación de luces: un símbolo tras otro
    let i = 0;
    const tick = (): void => {
      if (i >= message.length) return;
      showBits(encodeSymbol(message[i], encoding));
      i++;
      setTimeout(tick, 420);
    };
    tick();
    say(root, solo ? 'Señal guardada en el registro. Cambia de dimensión para leerla.' : 'Señal enviada. El otro mundo la verá en su registro.');
  });

  root.querySelector('[data-verify-btn]')?.addEventListener('click', () => {
    const code = sanitizeMessage($(root, '[data-verify]').value);
    if (code === s.state.verifyCodes[other]) {
      s.dispatch({ type: 'verify', code });
      say(root, '✔ Confirmación de recibido aceptada.', true);
    } else {
      say(root, 'Ese código no coincide. Pide que lo repitan con redundancia.');
    }
  });

  root.querySelector('[data-switch]')?.addEventListener('click', () => {
    ctx.close();
    s.switchWorld?.();
  });

  return renderLog;
}
