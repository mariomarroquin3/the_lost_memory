import { CONTEXT_CHIPS, CONTEXT_PIECES, WINDOW, room6Data, room7Data, room8Data, room9Data, transitionData } from '../puzzleData';
import { $, esc, panel, say, sim, win, type PanelCtx } from './common';

// ======================= PUERTA DE TRANSICIÓN · CAMBIO DE DOMINIO =======================
export function openTransition(ctx: PanelCtx): void {
  const d = transitionData(ctx.seed);
  const lesson = 'distribution shift: un modelo solo es bueno en lo que vio.';
  const chosen = new Set<number>();
  const root = panel(ctx, {
    id: 'transition', lesson,
    title: 'PUERTA DE TRANSICIÓN // EL GUARDIÁN CONFUNDIDO',
    intro: `El guardián deja pasar las tarjetas que quedan <b>a la derecha de su línea azul</b>.
      <br><b>Arriba</b>: tarjetas del Mundo Real, donde aprendió. Ahí acierta.
      <br><b>Abajo</b>: tarjetas de este mundo. Están corridas hacia la derecha y se equivoca (las <b style="color:#ff5a6e">✕</b>).
      <br>Pulsa hasta <b>4 tarjetas grandes</b> de abajo para enseñárselas. Pista: elige las que están <b>en la frontera</b> entre las <b style="color:#ff5a6e">rojas</b> y las <b style="color:#4cc47a">verdes</b>: las 2 rojas más a la derecha y las 2 verdes más a la izquierda.`,
    body: `
      <canvas width="560" height="290" class="sim-canvas" data-hist style="max-width:100%;cursor:pointer"></canvas>
      <p class="rp-small"><b style="color:#4cc47a">●</b> abre · <b style="color:#ff5a6e">●</b> no abre · ◯ grande = tarjeta que puedes enseñarle · <b style="color:#00e5ff">│</b> línea del guardián</p>
      <p data-acc style="font-size:12px"></p>
      <div class="rp-row"><button type="button" class="btn-retro" data-reset>Empezar de nuevo</button><button type="button" class="btn-terminal" data-ok>Validar en la puerta</button></div>`,
  });
  const g = sim(root, '[data-hist]');
  const W = 560, L = 20, R = 20;
  const sx = (v: number): number => L + v * (W - L - R);
  const threshold = (): number => {
    const extra = [...chosen].map((i) => d.pool[i]);
    if (!extra.length) return 0.5;
    const zeros = extra.filter((p) => !p.label).map((p) => p.v);
    const ones = extra.filter((p) => p.label).map((p) => p.v);
    const lo = zeros.length ? Math.max(...zeros) : 0.5;
    const hi = ones.length ? Math.min(...ones) : Math.max(lo + 0.1, 0.5);
    return (lo + hi) / 2;
  };
  const wrong = (set: Array<{ v: number; label: number }>, t: number): number => set.filter((p) => (p.v > t ? 1 : 0) !== p.label).length;
  // Fila en la que cae cada tarjeta para que no se tapen.
  const lanes = (set: Array<{ v: number }>): number[] => {
    const used: number[][] = [];
    return set.map((p) => {
      const x = sx(p.v);
      let lane = 0;
      while ((used[lane] ?? []).some((u) => Math.abs(u - x) < 9)) lane++;
      (used[lane] ??= []).push(x);
      return lane;
    });
  };
  const realLanes = lanes(d.real);
  const invLanes = lanes(d.inverted);
  const placed: Array<{ x: number; y: number }> = [];
  const poolPos = d.pool.map((p, i) => {
    const x = sx(p.v);
    let y = 212;
    while (placed.some((q) => q.y === y && Math.abs(q.x - x) < 18)) y += 18;
    placed.push({ x, y });
    return { x, y, i };
  });
  const draw = (): void => {
    const t = threshold();
    g.fillStyle = '#0b0910';
    g.fillRect(0, 0, W, 290);
    // Zonas
    g.fillStyle = 'rgba(76,196,122,.07)';
    g.fillRect(sx(t), 0, W - sx(t), 290);
    g.fillStyle = '#ece3d6';
    g.font = 'bold 11px monospace';
    g.fillText('MUNDO REAL (aprendió aquí)', L, 14);
    g.fillText('MUNDO INVERTIDO (aquí)', L, 120);
    g.fillStyle = '#9d93a9';
    g.font = '10px monospace';
    g.fillText('← no abre', sx(t) - 70, 112);
    g.fillText('abre →', sx(t) + 8, 112);
    g.strokeStyle = '#2a2236';
    for (const y of [92, 196]) { g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(W - R, y + 0.5); g.stroke(); }
    const dot = (p: { v: number; label: number }, y: number): void => {
      const x = sx(p.v);
      const bad = (p.v > t ? 1 : 0) !== p.label;
      g.fillStyle = p.label ? '#4cc47a' : '#ff5a6e';
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
      if (bad) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke();
        g.lineWidth = 1;
      }
    };
    d.real.forEach((p, i) => dot(p, 84 - realLanes[i] * 10));
    d.inverted.forEach((p, i) => dot(p, 188 - invLanes[i] * 10));
    // Tarjetas para enseñar
    for (const pp of poolPos) {
      const p = d.pool[pp.i];
      const on = chosen.has(pp.i);
      g.strokeStyle = p.label ? '#4cc47a' : '#ff5a6e';
      g.lineWidth = on ? 3 : 2;
      g.fillStyle = on ? (p.label ? '#4cc47a' : '#ff5a6e') : '#0b0910';
      g.beginPath(); g.arc(pp.x, pp.y, 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = 1;
    }
    g.fillStyle = '#9d93a9';
    g.fillText('↑ tarjetas para enseñarle (púlsalas)', L, 284);
    // Línea del guardián
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx(t), 20); g.lineTo(sx(t), 272); g.stroke();
    g.lineWidth = 1;
    const errInv = wrong(d.inverted, t);
    const ok = errInv <= 4;
    root.querySelector('[data-acc]')!.innerHTML = `Errores aquí: <b style="color:${ok ? '#4cc47a' : '#ff5a6e'}">${errInv} de ${d.inverted.length}</b> (máximo 4) · errores en el Mundo Real: ${wrong(d.real, t)} · tarjetas enseñadas: <b>${chosen.size} de 4</b>`;
  };
  (g.canvas as HTMLCanvasElement).addEventListener('click', (ev) => {
    const c = g.canvas as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const mx = ((ev.clientX - r.left) / r.width) * W;
    const my = ((ev.clientY - r.top) / r.height) * 290;
    const hit = poolPos.filter((pp) => Math.hypot(pp.x - mx, pp.y - my) < 12).sort((a, b) => Math.abs(a.x - mx) - Math.abs(b.x - mx))[0];
    if (!hit) return;
    if (chosen.has(hit.i)) chosen.delete(hit.i);
    else if (chosen.size < 4) chosen.add(hit.i);
    else { say(root, 'Solo puedes enseñarle 4. Quita una pulsándola otra vez.'); return; }
    say(root, '');
    draw();
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => { chosen.clear(); draw(); });
  draw();
  root.querySelector('[data-ok]')?.addEventListener('click', () => {
    const errInv = wrong(d.inverted, threshold());
    if (errInv <= 4) win(ctx, root, 'transition', lesson);
    else say(root, `Todavía se equivoca ${errInv} veces. Enséñale las tarjetas de la frontera: las rojas más a la derecha y las verdes más a la izquierda.`);
  });
}

// ======================= SALA 6 · DETECTIVE DE DATOS =======================
export function openRoom6(ctx: PanelCtx): void {
  const d = room6Data(ctx.seed);
  const lesson = 'calidad de datos, sesgos históricos y variables proxy.';
  const removed = new Set<number>();
  const cols = { edad: true, ingreso: true, cp: true };
  const root = panel(ctx, {
    id: 'i6', lesson,
    title: 'SALA 6 // DETECTIVE DE DATOS',
    intro: 'Un dataset de accesos a hospitales tiene duplicados, nulos y valores imposibles. Además el modelo rechaza más al sector B. Limpia la tabla (pulsa una fila para quitarla) y decide qué columnas usa el modelo. El censo físico del Mundo Real dice cuántas personas distintas hay.',
    body: `
      <div class="comms-grid">
        <div><table class="qtable data" data-table></table></div>
        <div>
          <h3>Columnas del modelo</h3>
          <label class="rp-small"><input type="checkbox" data-col="edad" checked> edad</label>
          <label class="rp-small"><input type="checkbox" data-col="ingreso" checked> ingreso</label>
          <label class="rp-small"><input type="checkbox" data-col="cp" checked> código postal</label>
          <h3>Medidor de equidad</h3>
          <canvas width="260" height="110" class="sim-canvas" data-fair></canvas>
          <p class="rp-small" data-info></p>
          <button type="button" class="btn-terminal" data-ok>Entregar dataset</button>
        </div>
      </div>`,
  });
  const fair = sim(root, '[data-fair]');
  const approve = (r: typeof d.rows[number]): boolean => {
    let score = 0;
    if (cols.edad) score += r.edad === null ? -1 : r.edad > 120 ? 2 : r.edad > 30 ? 0.6 : 0.3;
    if (cols.ingreso) score += r.ingreso === null ? -1 : r.ingreso > 30 ? 0.6 : 0.3;
    if (cols.cp) score += r.cp.startsWith('07') ? -0.9 : 0.4;
    return score >= (cols.edad && cols.ingreso ? 0.6 : 0.3);
  };
  const rates = (rows: typeof d.rows): { A: number; B: number } => {
    const g = (s: 'A' | 'B'): number => {
      const set = rows.filter((r) => r.sector === s);
      return set.length ? set.filter(approve).length / set.length : 0;
    };
    return { A: g('A'), B: g('B') };
  };
  const draw = (): void => {
    const rows = d.rows.filter((r) => !removed.has(r.id));
    root.querySelector('[data-table]')!.innerHTML = '<tr><th>id</th><th>sector</th><th>cp</th><th>edad</th><th>ingreso</th></tr>' +
      d.rows.map((r) => `<tr data-row="${r.id}" class="${removed.has(r.id) ? 'off' : ''}"><td>${r.id}</td><td>${r.sector}</td><td>${r.cp}</td><td>${r.edad ?? '<i>nulo</i>'}</td><td>${r.ingreso ?? '<i>nulo</i>'}</td></tr>`).join('');
    root.querySelectorAll<HTMLElement>('[data-row]').forEach((tr) => tr.addEventListener('click', () => {
      const id = Number(tr.dataset.row);
      if (removed.has(id)) removed.delete(id); else removed.add(id);
      draw();
    }));
    const before = rates(d.rows);
    const after = rates(rows);
    fair.fillStyle = '#0b0910';
    fair.fillRect(0, 0, 260, 110);
    fair.font = '9px monospace';
    ([['Antes A', before.A], ['Antes B', before.B], ['Ahora A', after.A], ['Ahora B', after.B]] as Array<[string, number]>).forEach(([n, v], i) => {
      fair.fillStyle = '#9d93a9';
      fair.fillText(n, 4, 16 + i * 25);
      fair.fillStyle = n.endsWith('A') ? '#f7931a' : '#a46cff';
      fair.fillRect(64, 6 + i * 25, v * 180, 14);
      fair.fillStyle = '#ece3d6';
      fair.fillText(`${Math.round(v * 100)}%`, 70 + v * 180, 16 + i * 25);
    });
    root.querySelector('[data-info]')!.innerHTML = `Filas: <b>${rows.length}</b> · diferencia de aprobación A-B: <b>${Math.round(Math.abs(after.A - after.B) * 100)} pts</b>`;
  };
  root.querySelectorAll<HTMLInputElement>('[data-col]').forEach((cb) => cb.addEventListener('change', () => {
    cols[cb.dataset.col as keyof typeof cols] = cb.checked;
    draw();
  }));
  draw();
  root.querySelector('[data-ok]')?.addEventListener('click', () => {
    const rows = d.rows.filter((r) => !removed.has(r.id));
    const keyOf = (r: typeof rows[number]): string => `${r.sector}|${r.cp}|${r.edad}|${r.ingreso}`;
    const dupes = rows.length - new Set(rows.map(keyOf)).size;
    const bad = dupes + rows.filter((r) => r.edad === null || r.ingreso === null || (r.edad ?? 0) > 120).length;
    const r = rates(rows);
    if (rows.length !== d.unique) say(root, `La tabla tiene ${rows.length} filas; el censo físico del otro mundo dice otra cosa.`);
    else if (bad) say(root, 'El número cuadra, pero quitaste filas válidas y dejaste algún duplicado, nulo o valor imposible.');
    else if (cols.cp) say(root, 'Datos limpios, pero el sector B sigue penalizado: alguna columna actúa como proxy del sector.');
    else if (Math.abs(r.A - r.B) > 0.25) say(root, 'La brecha entre sectores sigue siendo grande.');
    else win(ctx, root, 'i6', lesson);
  });
}

// ======================= SALA 7 · LA GALERÍA DE LA DUDA =======================
const STOP = [
  '00111100', '01111110', '11111111', '10000001', '10000001', '11111111', '01111110', '00111100',
].join('').split('').map(Number);

export function openRoom7(ctx: PanelCtx): void {
  const d = room7Data(ctx.seed);
  const lesson = 'ejemplos adversariales, alucinaciones y que la confianza no es exactitud.';
  const noise = new Set<number>();
  let flipped = false;
  const marks: Array<'' | 'si' | 'no'> = d.claims.map(() => '');
  const root = panel(ctx, {
    id: 'i7', lesson,
    title: 'SALA 7 // LA GALERÍA DE LA DUDA',
    intro: 'Parte 1: diseña un ruido casi invisible (máximo 4 píxeles) que cambie la clasificación del cartel de STOP. Parte 2: el Alucinador dice 6 cosas con total seguridad; marca cuáles tienen respaldo en los documentos. Un documento sellado solo está en el Mundo Real.',
    body: `
      <div class="comms-grid">
        <div>
          <canvas width="160" height="160" class="sim-canvas pix" data-stop></canvas>
          <label class="rp-small"><input type="checkbox" data-heat> Mapa de sensibilidad del clasificador</label>
          <p class="rp-small" data-heat-legend hidden>Cuanto más intenso el cian, más depende el modelo de ese píxel. Se fija en el borde de la franja blanca, no en la forma completa. Los recuadros amarillos son los píxeles que ya alteraste.</p>
          <p class="rp-small" data-cls></p>
          <p class="rp-small" data-adv></p>
          <h3>Calibración</h3>
          <label class="rp-small">Temperatura: <b data-tv></b><input type="range" min="0" max="20" value="7" data-temp></label>
          <canvas width="260" height="90" class="sim-canvas" data-cal></canvas>
        </div>
        <div>
          <details class="rp-small"><summary>Documentos de la sala</summary>
            ${[
              [0, 'D-71 Plano eléctrico: «El generador B alimenta el ala del hospital».'],
              [2, 'D-72 Auditoría: «La turbina norte consume el 40% de la energía de Genesis».'],
              [4, 'D-73 Registro: «La copia de modelos se hizo desde la terminal 7».'],
            ].map(([i, t]) => (i === d.realOnly ? `<p>${String(t).slice(0, 5)} [documento ilegible: el original en papel está en el Mundo Real]</p>` : `<p>${t}</p>`)).join('')}
            <p>D-74 Nómina: «Sato figuraba como administrador del núcleo».</p>
            <p>D-75 Expediente de Ada: «Archivista digital. Sin acceso al diseño de modelos».</p>
          </details>
          <ol class="claims">${d.claims.map((c, i) => `
            <li>${esc(c.text)} <span class="rp-small">(confianza ${c.conf}%)</span>
              <select class="late-room__select" data-claim="${i}"><option value="">¿?</option><option value="si">Respaldada</option><option value="no">Inventada</option></select></li>`).join('')}
          </ol>
          <button type="button" class="btn-terminal" data-ok>Verificar</button>
        </div>
      </div>`,
  });
  const stop = sim(root, '[data-stop]');
  const cal = sim(root, '[data-cal]');
  // Peso de cada píxel en la decisión: los sensibles pesan mucho, sus vecinos algo, el resto casi nada.
  const weight = Array.from({ length: 64 }, (_, i) => {
    if (d.sensitive.includes(i)) return 0.95;
    const near = d.sensitive.some((j) => Math.abs((j % 8) - (i % 8)) <= 1 && Math.abs(Math.floor(j / 8) - Math.floor(i / 8)) <= 1);
    return near ? 0.3 : 0.05;
  });
  const score = (): number => {
    // Puntuación STOP: alta por defecto; si baja de 0, el modelo cambia de clase.
    let s = 2.2;
    for (const i of noise) s -= weight[i];
    return s;
  };
  const drawStop = (): void => {
    const heat = $(root, '[data-heat]').checked;
    (root.querySelector('[data-heat-legend]') as HTMLElement).hidden = !heat;
    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * 20;
      const y = Math.floor(i / 8) * 20;
      const on = STOP[i] ^ (noise.has(i) ? 1 : 0);
      const isBar = i >= 24 && i < 40 && STOP[i] === 0;
      stop.fillStyle = on ? '#e05252' : isBar ? '#ece3d6' : '#0b0910';
      // Un píxel alterado cambia muy poco de color: para una persona sigue siendo un STOP.
      if (noise.has(i)) stop.fillStyle = on ? '#d44848' : '#e8dcd0';
      stop.fillRect(x, y, 19, 19);
      if (heat) {
        stop.fillStyle = `rgba(0,229,255,${weight[i] > 0.9 ? 0.8 : weight[i] > 0.2 ? 0.22 : 0})`;
        stop.fillRect(x, y, 19, 19);
      }
      if (noise.has(i)) {
        stop.strokeStyle = '#ffd34d';
        stop.lineWidth = 2;
        stop.strokeRect(x + 1.5, y + 1.5, 16, 16);
      }
    }
    const s = score();
    const p = 1 / (1 + Math.exp(-s * 2));
    flipped = s < 0;
    root.querySelector('[data-cls]')!.innerHTML = `Clasificador: <b class="${flipped ? 'bad' : 'ok'}">${flipped ? 'CEDA EL PASO' : 'STOP'}</b> · confianza ${Math.round((flipped ? 1 - p : p) * 100)}% · píxeles alterados ${noise.size}/4`;
    root.querySelector('[data-adv]')!.textContent = flipped
      ? 'Para ti sigue siendo un STOP; para el modelo ya no. Unos pocos píxeles bien elegidos bastan para engañarlo.'
      : `Puntuación de STOP: ${s.toFixed(2)}. Si baja de 0, el modelo cambia de opinión. Toca un píxel otra vez para deshacerlo.`;
  };
  const drawCal = (): void => {
    const T = Number($(root, '[data-temp]').value) / 10;
    root.querySelector('[data-tv]')!.textContent = T.toFixed(1);
    cal.fillStyle = '#0b0910';
    cal.fillRect(0, 0, 260, 90);
    cal.font = '8px monospace';
    for (let b = 0; b < 5; b++) {
      const conf = 0.55 + b * 0.1;
      const acc = Math.max(0.05, conf - T * 0.18 * (b + 1) / 3);
      cal.fillStyle = '#9d93a9';
      cal.fillRect(10 + b * 50, 80 - conf * 70, 18, conf * 70);
      cal.fillStyle = '#7ef59b';
      cal.fillRect(30 + b * 50, 80 - acc * 70, 18, acc * 70);
    }
    cal.fillStyle = '#ece3d6';
    cal.fillText(`gris = confianza · verde = acierto · invención ${Math.round(T * 22)}%`, 6, 88);
  };
  stop.canvas.addEventListener('click', (e) => {
    const r = stop.canvas.getBoundingClientRect();
    const i = Math.floor(((e.clientY - r.top) / r.height) * 8) * 8 + Math.floor(((e.clientX - r.left) / r.width) * 8);
    if (noise.has(i)) noise.delete(i); else if (noise.size < 4) noise.add(i);
    drawStop();
  });
  $(root, '[data-heat]').addEventListener('change', drawStop);
  $(root, '[data-temp]').addEventListener('input', drawCal);
  root.querySelectorAll<HTMLSelectElement>('[data-claim]').forEach((s) => s.addEventListener('change', () => { marks[Number(s.dataset.claim)] = s.value as '' | 'si' | 'no'; }));
  drawStop();
  drawCal();
  root.querySelector('[data-ok]')?.addEventListener('click', () => {
    const truth = d.claims.map((c) => (c.backed ? 'si' : 'no'));
    const wrong = marks.filter((m, i) => m !== truth[i]).length;
    if (!flipped) say(root, 'Parte 1 pendiente: el clasificador sigue viendo un STOP.');
    else if (wrong) say(root, `${wrong} afirmación(es) mal evaluadas. Que suene segura no la hace cierta; busca el respaldo.`);
    else win(ctx, root, 'i7', lesson);
  });
}

// ======================= SALA 8 · LAS PALABRAS QUE FALTAN =======================
export function openRoom8(ctx: PanelCtx): void {
  const d = room8Data(ctx.seed);
  const lesson = 'tokens, ambigüedad, atención y cómo el contexto cambia la respuesta.';
  const ORDER = 'Apaga el generador junto al tanque con la llave roja.';
  const on = new Set<string>();
  const root = panel(ctx, {
    id: 'i8', lesson,
    title: 'SALA 8 // LAS PALABRAS QUE FALTAN',
    intro: `Orden ambigua: «${ORDER}» Añade contexto (cada frase gasta tokens, máximo ${d.budget}) hasta que el modelo elija el generador correcto con al menos 70% de probabilidad. Cuál es el correcto está en el plano eléctrico del Mundo Real.`,
    body: `
      <div class="comms-grid">
        <div>
          <h3>Contexto disponible</h3>
          <div class="chips col">${CONTEXT_CHIPS.map((c) => `<button type="button" class="chip" data-c="${c.id}">${esc(c.text)}</button>`).join('')}</div>
          <h3>Tokens</h3>
          <div class="tokens" data-tokens></div>
        </div>
        <div>
          <h3>Predicción de la siguiente palabra</h3>
          <p class="rp-small">«…apaga el generador ___»</p>
          <div data-bars></div>
          <h3>Atención al interpretar «banco»</h3>
          <canvas width="280" height="60" class="sim-canvas" data-att></canvas>
          <div class="rp-row">
            <select class="late-room__select" data-pick><option value="">Ejecutar sobre…</option><option value="A">Generador A</option><option value="B">Generador B</option></select>
            <button type="button" class="btn-terminal" data-ok>Ejecutar orden</button>
          </div>
        </div>
      </div>`,
  });
  const att = sim(root, '[data-att]');
  const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-záéíóúñ]+|[.,:«»]/g)?.flatMap((w) => (w.length > 6 ? [w.slice(0, 4), `##${w.slice(4)}`] : [w])) ?? [];
  const context = (): string => [...on].map((id) => CONTEXT_CHIPS.find((c) => c.id === id)!.text).join(' ');
  const probs = (): Record<string, number> => {
    const logits: Record<string, number> = { A: 0, B: 0, tanque: 0.4, '?': 0.6 };
    for (const id of on) {
      const chip = CONTEXT_CHIPS.find((c) => c.id === id)!;
      for (const [k, v] of Object.entries(chip.boost)) logits[k] += v as number;
      if (id !== 'noise' && id !== 'river') logits['?'] -= 0.3;
    }
    const ex = Object.fromEntries(Object.entries(logits).map(([k, v]) => [k, Math.exp(v * 1.6)]));
    const sum = Object.values(ex).reduce((a, b) => a + b, 0);
    return Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, v / sum]));
  };
  const used = (): number => tokenize(context()).length;
  const draw = (): void => {
    const toks = tokenize(`${context()} ${ORDER}`);
    root.querySelector('[data-tokens]')!.innerHTML = toks.map((t) => `<span class="tok">${esc(t)}</span>`).join('') + `<p class="rp-small">Contexto: <b class="${used() > d.budget ? 'bad' : 'ok'}">${used()}/${d.budget}</b> tokens</p>`;
    const p = probs();
    const names: Record<string, string> = { A: 'A', B: 'B', tanque: 'tanque', '?': '(no sé)' };
    root.querySelector('[data-bars]')!.innerHTML = Object.entries(p).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
      `<div class="bar"><span>${names[k]}</span><i style="width:${Math.round(v * 100)}%"></i><b>${Math.round(v * 100)}%</b></div>`).join('');
    root.querySelectorAll<HTMLElement>('[data-c]').forEach((b) => b.classList.toggle('chip--on', on.has(b.dataset.c!)));
    // Mapa de calor de atención
    const words = ['deja', 'la', 'llave', 'en', 'el', 'banco', 'junto', 'al', 'tanque'];
    const weights = words.map((w) => {
      let a = w === 'banco' ? 0.3 : 0.1;
      if (on.has('bank') && (w === 'tanque' || w === 'junto')) a += 0.6;
      if (on.has('river') && w === 'banco') a += 0.2;
      if (w === 'llave' && (on.has('keyA') || on.has('keyB'))) a += 0.4;
      return a;
    });
    const max = Math.max(...weights);
    att.fillStyle = '#0b0910';
    att.fillRect(0, 0, 280, 60);
    att.font = '8px monospace';
    words.forEach((w, i) => {
      att.fillStyle = `rgba(0,229,255,${weights[i] / max})`;
      att.fillRect(4 + i * 30, 10, 28, 24);
      att.fillStyle = '#ece3d6';
      att.fillText(w, 6 + i * 30, 46);
    });
    att.fillText(on.has('bank') ? '«banco» = banco de pruebas' : on.has('river') ? '«banco» = asiento' : '«banco» = ¿?', 4, 58);
  };
  root.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.c!;
    if (on.has(id)) on.delete(id); else on.add(id);
    draw();
  }));
  draw();
  root.querySelector('[data-ok]')?.addEventListener('click', () => {
    const pick = $(root, '[data-pick]').value;
    const p = probs();
    if (used() > d.budget) say(root, 'Te pasaste del presupuesto de tokens: el modelo pierde el hilo.');
    else if (!pick) say(root, 'Elige sobre qué generador ejecutar la orden.');
    else if (pick !== d.target) say(root, '⚠ Ese no era el generador del plano. El Alucinador se ríe.');
    else if (p[d.target] < 0.7) say(root, `El modelo solo está seguro al ${Math.round(p[d.target] * 100)}%: añade el contexto que desambigua.`);
    else win(ctx, root, 'i8', lesson);
  });
}

// ======================= SALA 9 · LA PUERTA QUE ESCUCHA =======================
const TOOLS = [
  {
    id: 'abrir_puerta',
    descs: ['Hace cosas con puertas y sistemas.', 'Abre una puerta de mantenimiento indicada por su identificador.'],
    params: ['texto', 'puerta_id (P-n)'],
  },
  {
    id: 'consultar_registro',
    descs: ['Consulta el registro de accesos y devuelve las últimas entradas.', 'Gestiona el sistema.'],
    params: ['desde (hora)', 'nada'],
  },
  {
    id: 'apagado_emergencia',
    descs: ['Apaga o abre lo que haga falta.', 'Corta la energía del núcleo. Acción irreversible.'],
    params: ['motivo', 'nada'],
  },
];
const TASKS = [
  { text: 'Abre la puerta de mantenimiento.', tool: 'abrir_puerta', words: ['puerta', 'abre', 'mantenimiento'] },
  { text: '¿Quién entró a las 03:12?', tool: 'consultar_registro', words: ['registro', 'consulta', 'accesos'] },
  { text: 'El núcleo se sobrecalienta: corta la energía.', tool: 'apagado_emergencia', words: ['energía', 'corta', 'núcleo'] },
];

export function openRoom9(ctx: PanelCtx): void {
  const d = room9Data(ctx.seed);
  const lesson = 'APIs, MCP, permisos y por qué las descripciones de herramientas importan.';
  const root = panel(ctx, {
    id: 'i9', lesson,
    title: 'SALA 9 // LA PUERTA QUE ESCUCHA',
    intro: 'Escribe el manifiesto de las herramientas del agente. Si una descripción es ambigua, el agente llama a la herramienta equivocada. El apagado de emergencia debe exigir confirmación humana. El número de la puerta de mantenimiento está en una etiqueta del Mundo Real.',
    body: `
      <div class="comms-grid">
        <div>
          ${TOOLS.map((t, i) => `
            <fieldset class="tool"><legend><code>${t.id}</code></legend>
              <label class="rp-small">Descripción <select class="late-room__select wide" data-desc="${i}">${t.descs.map((x, j) => `<option value="${j}">${esc(x)}</option>`).join('')}</select></label>
              <label class="rp-small">Parámetros <select class="late-room__select" data-param="${i}">${t.params.map((x, j) => `<option value="${j}">${esc(x)}</option>`).join('')}</select></label>
              ${t.id === 'apagado_emergencia' ? '<label class="rp-small"><input type="checkbox" data-confirm> Requiere confirmación humana</label>' : ''}
            </fieldset>`).join('')}
          <label class="rp-small door-id">Valor de puerta_id: <input class="cmd-input door-id__input" data-door placeholder="P-?" maxlength="6" autocomplete="off" spellcheck="false"></label>
          <p class="rp-small">Formato P-n, por ejemplo P-2. El número está en la etiqueta de mantenimiento del Mundo Real.</p>
        </div>
        <div>
          <h3>Consola del agente</h3>
          <pre class="debug tall" data-console>pensar → llamar herramienta → observar</pre>
          <button type="button" class="btn-terminal" data-run>Ejecutar tareas</button>
        </div>
      </div>`,
  });
  root.querySelector('[data-run]')?.addEventListener('click', () => {
    const descs = TOOLS.map((t, i) => t.descs[Number($(root, `[data-desc="${i}"]`).value)].toLowerCase());
    const params = TOOLS.map((t, i) => t.params[Number($(root, `[data-param="${i}"]`).value)]);
    const confirm = $(root, '[data-confirm]').checked;
    // Acepta «P-4», «p4», «P 4» o solo «4»: todo se normaliza a P-n.
    const rawDoor = $(root, '[data-door]').value.toUpperCase().replace(/\s/g, '');
    const doorMatch = /^(?:P-?)?(\d{1,2})$/.exec(rawDoor);
    const door = doorMatch ? `P-${Number(doorMatch[1])}` : rawDoor;
    const lines: string[] = [];
    let ok = 0;
    for (const task of TASKS) {
      // El agente puntúa cada herramienta por palabras compartidas; las vagas atraen todo.
      const scores = descs.map((desc) => task.words.filter((w) => desc.includes(w.slice(0, 5))).length + (/(cosas|gestiona|lo que haga falta)/.test(desc) ? 1.5 : 0));
      const best = scores.indexOf(Math.max(...scores));
      const tool = TOOLS[best].id;
      lines.push(`> ${task.text}`, `  pensar: la herramienta más parecida es ${tool}`);
      if (tool !== task.tool) { lines.push(`  ✘ llamó a ${tool}: descripción ambigua`); continue; }
      if (tool === 'apagado_emergencia') {
        if (!confirm) { lines.push('  ✘ ¡apagado sin permiso humano! El Alucinador también podría pedirlo.'); continue; }
        lines.push('  … esperando confirmación humana → ✔ confirmado por Sato');
      }
      if (tool === 'abrir_puerta') {
        if (!params[0].startsWith('puerta_id')) { lines.push('  ✘ parámetro sin formato: la puerta no sabe cuál abrir'); continue; }
        if (!rawDoor) { lines.push('  ✘ observar: falta el valor de puerta_id; escribe el número de la etiqueta (P-n)'); continue; }
        if (!doorMatch) { lines.push(`  ✘ observar: «${rawDoor}» no tiene el formato P-n (por ejemplo P-2)`); continue; }
        if (door !== `P-${d.door}`) { lines.push(`  ✘ observar: la puerta ${door} existe, pero no es la de mantenimiento; revisa la etiqueta del Mundo Real`); continue; }
        lines.push(`  llamar: abrir_puerta(puerta_id="${door}")`);
      }
      if (tool === 'consultar_registro' && !params[1].startsWith('desde')) { lines.push('  ✘ sin parámetro de hora: devuelve 40.000 líneas'); continue; }
      lines.push('  ✔ observar: resultado correcto');
      ok++;
    }
    root.querySelector('[data-console]')!.textContent = lines.join('\n');
    if (ok === TASKS.length) win(ctx, root, 'i9', lesson);
    else say(root, `${ok}/${TASKS.length} tareas bien resueltas.`);
  });
}

// ======================= SALA 10 · EL PRESUPUESTO DE CONTEXTO =======================
export function openRoom10(ctx: PanelCtx, onEnding: () => void): void {
  const lesson = 'ingeniería de contexto, prompt injection, alineación y responsabilidad.';
  const on = new Set<string>(['log', 'inj', 'menu']);
  const root = panel(ctx, {
    id: 'i10', lesson,
    title: 'SALA 10 // EL PRESUPUESTO DE CONTEXTO',
    intro: `Arma el contexto del sistema de Lía con espacio limitado (ventana de ${WINDOW} tokens). Poco contexto provoca alucinación; demasiado diluye lo importante. Un documento trae una inyección de prompt. Define barreras y puntos de aprobación humana y lanza el ataque de prueba.`,
    body: `
      <div class="comms-grid">
        <div>
          <div class="chips col">${CONTEXT_PIECES.map((p) => `<button type="button" class="chip" data-p="${p.id}">${esc(p.text)} <b>${p.tokens}t</b></button>`).join('')}</div>
          <h3>Barreras</h3>
          <label class="rp-small"><input type="checkbox" data-g="sys"> Las instrucciones del sistema prevalecen sobre los documentos</label>
          <label class="rp-small"><input type="checkbox" data-g="filter"> Tratar el texto de los documentos como datos, nunca como órdenes</label>
          <label class="rp-small"><input type="checkbox" data-g="human"> Aprobación humana para acciones irreversibles</label>
        </div>
        <div>
          <canvas width="280" height="120" class="sim-canvas" data-meters></canvas>
          <pre class="debug" data-red>Red team: sin ejecutar</pre>
          <div class="rp-row"><button type="button" class="btn-retro" data-attack>Simular ataque</button><button type="button" class="btn-terminal" data-ok>Cargar contexto en Lía</button></div>
          <div data-final></div>
        </div>
      </div>`,
  });
  const meters = sim(root, '[data-meters]');
  const guard = (g: string): boolean => $(root, `[data-g="${g}"]`).checked;
  const calc = (): { used: number; halluc: number; dilution: number; align: number; attack: boolean } => {
    const pieces = CONTEXT_PIECES.filter((p) => on.has(p.id));
    const used = pieces.reduce((a, p) => a + p.tokens, 0);
    const keys = CONTEXT_PIECES.filter((p) => p.key);
    const missing = keys.filter((p) => !on.has(p.id)).length;
    const halluc = Math.min(1, missing / keys.length + 0.05);
    const filler = pieces.filter((p) => !p.key).reduce((a, p) => a + p.tokens, 0);
    const dilution = Math.min(1, filler / 60 + Math.max(0, used - WINDOW) / 40);
    const attack = on.has('inj') && !(guard('filter') && guard('sys'));
    const align = Math.max(0, 1 - halluc * 0.5 - dilution * 0.4 - (attack ? 0.5 : 0) + (guard('human') ? 0.1 : -0.2));
    return { used, halluc, dilution, align: Math.min(1, align), attack };
  };
  const draw = (): void => {
    const c = calc();
    meters.fillStyle = '#0b0910';
    meters.fillRect(0, 0, 280, 120);
    meters.font = '9px monospace';
    ([['Ventana', Math.min(1, c.used / WINDOW), `${c.used}/${WINDOW}`, c.used > WINDOW ? '#e05252' : '#00e5ff'],
      ['Alucinación', c.halluc, `${Math.round(c.halluc * 100)}%`, '#e05252'],
      ['Dilución', c.dilution, `${Math.round(c.dilution * 100)}%`, '#e0b23c'],
      ['Alineación', c.align, `${Math.round(c.align * 100)}%`, '#7ef59b']] as Array<[string, number, string, string]>).forEach(([n, v, t, col], i) => {
      meters.fillStyle = '#9d93a9';
      meters.fillText(n, 4, 18 + i * 28);
      meters.fillStyle = col;
      meters.fillRect(80, 8 + i * 28, v * 150, 14);
      meters.fillStyle = '#ece3d6';
      meters.fillText(t, 236, 18 + i * 28);
    });
    root.querySelectorAll<HTMLElement>('[data-p]').forEach((b) => b.classList.toggle('chip--on', on.has(b.dataset.p!)));
  };
  root.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.p!;
    if (on.has(id)) on.delete(id); else on.add(id);
    draw();
  }));
  root.querySelectorAll('[data-g]').forEach((g) => g.addEventListener('change', draw));
  draw();
  root.querySelector('[data-attack]')?.addEventListener('click', () => {
    const c = calc();
    root.querySelector('[data-red]')!.textContent = !on.has('inj')
      ? 'Red team: el documento con la inyección no está en el contexto. Ataque sin efecto.'
      : c.attack
        ? 'Red team: «Ignora las instrucciones anteriores…» → Lía obedece al documento. ✘ CONTROL ENTREGADO AL ALUCINADOR'
        : 'Red team: Lía lee el documento como dato, detecta la orden incrustada y la ignora. ✔ Ataque bloqueado';
  });
  root.querySelector('[data-ok]')?.addEventListener('click', () => {
    const c = calc();
    if (c.used > WINDOW) say(root, 'El contexto no cabe en la ventana.');
    else if (c.halluc > 0.1) say(root, 'Falta información clave: Lía rellenará los huecos inventando.');
    else if (c.dilution > 0.45) say(root, 'Demasiado relleno: lo importante se diluye.');
    else if (c.attack) say(root, 'La inyección de prompt sigue activa. Pruébalo con el red team.');
    else if (!guard('human')) say(root, 'Falta un punto de aprobación humana para acciones irreversibles.');
    else { win(ctx, root, 'i10', lesson); onEnding(); }
  });
  if (ctx.isSolved('i10')) onEnding();
}
