import { COLORS, DOCS, QUESTIONS, room1Data, room2Data, room3Data, room4Data, room5Data, type Card } from '../puzzleData';
import { $, panel, say, sim, win, type PanelCtx } from './common';

// ======================= SALA 1 · LA CINTA QUE CLASIFICA =======================
export function openRoom1(ctx: PanelCtx): void {
  const d = room1Data(ctx.seed);
  const lesson = 'la IA no ve objetos, ve rasgos numéricos.';
  const root = panel(ctx, {
    id: 'r1', lesson,
    title: 'SALA 1 // LA CINTA QUE CLASIFICA',
    intro: 'La cinta trae piezas de la fábrica. Algunas son del Alucinador y se parecen mucho a las buenas. El visor de cámara muestra lo que «ve» el clasificador: rasgos numéricos. El catálogo de rasgos correctos está en el Mundo Invertido.',
    body: `
      <div class="comms-grid">
        <div>
          <h3>Visor de cámara</h3>
          <canvas width="160" height="160" class="sim-canvas pix" data-cam></canvas>
          <div class="rp-row">
            <label class="rp-small"><input type="radio" name="f" value="raw" checked> Imagen</label>
            <label class="rp-small"><input type="radio" name="f" value="edges"> Filtro de bordes</label>
            <label class="rp-small"><input type="radio" name="f" value="color"> Filtro de color</label>
          </div>
          <label class="rp-small">Resolución <input type="range" min="0" max="2" value="0" data-res></label>
          <label class="rp-small">Ruido <input type="range" min="0" max="80" value="0" data-noise></label>
          <p class="rp-small" data-readout></p>
        </div>
        <div>
          <h3>Piezas en la cinta</h3>
          <div class="piece-list">${d.pieces.map((p) => `
            <div class="piece" data-piece="${p.id}">
              <button type="button" class="btn-retro" data-view="${p.id}">Pieza ${p.id}</button>
              <select class="late-room__select" data-class="${p.id}">
                <option value="">¿?</option><option value="1">Autorizada</option><option value="0">Alucinador</option>
              </select>
            </div>`).join('')}
          </div>
          <button type="button" class="btn-terminal" data-check>Clasificar lote</button>
        </div>
      </div>`,
  });
  const cam = sim(root, '[data-cam]');
  let current = d.pieces[0];
  const draw = (): void => {
    const filter = (root.querySelector('input[name="f"]:checked') as HTMLInputElement).value;
    const res = [8, 4, 2][Number($(root, '[data-res]').value)];
    const noise = Number($(root, '[data-noise]').value) / 100;
    const color = COLORS[current.color].hex;
    const px = current.pixels;
    const cell = 160 / res;
    const step = 8 / res;
    cam.fillStyle = '#0b0910';
    cam.fillRect(0, 0, 160, 160);
    for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
      let on = 0;
      for (let yy = 0; yy < step; yy++) for (let xx = 0; xx < step; xx++) on += px[(y * step + yy) * 8 + x * step + xx];
      let v = on / (step * step);
      if (Math.random() < noise) v = Math.random();
      if (filter === 'edges') {
        const i = y * step * 8 + x * step;
        const edge = res === 8 && px[i] && (!px[i - 1] || !px[i + 1] || !px[i - 8] || !px[i + 8]);
        cam.fillStyle = edge || (res < 8 && v > 0.2 && v < 0.8) ? '#ece3d6' : '#1b1622';
      } else if (filter === 'color') {
        cam.fillStyle = v > 0.4 ? color : '#1b1622';
        if (v > 0.4 && Math.random() < noise) cam.fillStyle = COLORS[Math.floor(Math.random() * 6)].hex;
      } else {
        cam.fillStyle = v > 0.4 ? color : '#231b2c';
        if (v > 0.4 && current.texture === 'rugosa' && (x + y) % 2 === 0) cam.fillStyle = '#4a515c';
      }
      cam.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
    const reliable = res === 8 && noise <= 0.3;
    root.querySelector('[data-readout]')!.innerHTML = reliable
      ? `Rasgos de la pieza ${current.id}: BORDES = <b>${current.edges}</b> · COLOR = <b>${COLORS[current.color].name}</b> · TEXTURA = <b>${current.texture.toUpperCase()}</b>`
      : `Rasgos de la pieza ${current.id}: BORDES = ? · COLOR = ? · TEXTURA = ? <span class="bad">(con poca resolución o mucho ruido el clasificador no distingue)</span>`;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => {
    current = d.pieces[Number(b.dataset.view) - 1];
    draw();
  }));
  root.querySelectorAll('input[name="f"], [data-res], [data-noise]').forEach((el) => el.addEventListener('input', draw));
  draw();
  root.querySelector('[data-check]')?.addEventListener('click', () => {
    const wrong = d.pieces.filter((p) => $(root, `[data-class="${p.id}"]`).value !== (p.authorized ? '1' : '0'));
    if (wrong.length === 0) win(ctx, root, 'r1', lesson);
    else say(root, `${wrong.length} pieza(s) mal clasificadas. Sin el catálogo del otro mundo es adivinar.`);
  });
}

// ======================= SALA 2 · ENTRENA AL GUARDIÁN =======================
function train(cards: Card[], epochs: number, lr: number): [number, number, number] {
  let w1 = 0, w2 = 0, b = 0;
  for (let e = 0; e < epochs; e++) {
    for (const c of cards) {
      const z = w1 * (c.x - 0.5) * 4 + w2 * (c.y - 0.5) * 4 + b;
      const p = 1 / (1 + Math.exp(-z));
      const g = p - c.label;
      w1 -= lr * g * (c.x - 0.5) * 4;
      w2 -= lr * g * (c.y - 0.5) * 4;
      b -= lr * g;
    }
  }
  return [w1, w2, b];
}
const predict = (m: [number, number, number], x: number, y: number): 0 | 1 =>
  (m[0] * (x - 0.5) * 4 + m[1] * (y - 0.5) * 4 + m[2] > 0 ? 1 : 0);

export function openRoom2(ctx: PanelCtx): void {
  const d = room2Data(ctx.seed);
  const lesson = 'entrenar con ejemplos, el sobreajuste y la importancia de los datos de prueba.';
  const chosen = new Set(d.train.map((c) => c.id));
  const root = panel(ctx, {
    id: 'r2', lesson,
    title: 'SALA 2 // ENTRENA AL GUARDIÁN',
    intro: 'El robot guardián aprende qué tarjetas abren la puerta. Tienes 10 ejemplos etiquetados (pulsa sobre ellos para quitarlos o ponerlos). Algunos podrían estar mal etiquetados. El examen sorpresa usa tarjetas nuevas; la T6 solo existe en el Mundo Invertido.',
    body: `
      <div class="comms-grid">
        <div>
          <canvas width="260" height="260" class="sim-canvas" data-plot></canvas>
          <p class="rp-small">● abre · ○ no abre · ◆ examen. Fondo = frontera de decisión.</p>
        </div>
        <div>
          <label class="rp-small">Épocas: <b data-ev></b><input type="range" min="1" max="300" value="40" data-ep></label>
          <label class="rp-small">Tasa de aprendizaje: <b data-lv></b><input type="range" min="1" max="100" value="20" data-lr></label>
          <p class="rp-small">Tarjeta T6 (rasgos de 0 a 15):
            X <input class="cmd-input mini" data-tx maxlength="2"> Y <input class="cmd-input mini" data-ty maxlength="2"></p>
          <p class="rp-small" data-acc></p>
          <button type="button" class="btn-terminal" data-exam>Examen sorpresa</button>
        </div>
      </div>`,
  });
  const plot = sim(root, '[data-plot]');
  const model = (): [number, number, number] =>
    train(d.train.filter((c) => chosen.has(c.id)), Number($(root, '[data-ep]').value), Number($(root, '[data-lr]').value) / 100);
  const t6 = (): { x: number; y: number } | null => {
    const x = Number($(root, '[data-tx]').value);
    const y = Number($(root, '[data-ty]').value);
    if (!$(root, '[data-tx]').value || !$(root, '[data-ty]').value || Number.isNaN(x) || Number.isNaN(y)) return null;
    return { x: x / 15, y: y / 15 };
  };
  const draw = (): void => {
    root.querySelector('[data-ev]')!.textContent = $(root, '[data-ep]').value;
    root.querySelector('[data-lv]')!.textContent = (Number($(root, '[data-lr]').value) / 100).toFixed(2);
    const m = model();
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) {
      plot.fillStyle = predict(m, x / 25, 1 - y / 25) ? '#173b26' : '#2b1520';
      plot.fillRect(x * 10, y * 10, 10, 10);
    }
    const dot = (c: { x: number; y: number }, fill: string, hollow: boolean, diamond = false): void => {
      const X = c.x * 250 + 5;
      const Y = (1 - c.y) * 250 + 5;
      plot.beginPath();
      if (diamond) { plot.moveTo(X, Y - 6); plot.lineTo(X + 6, Y); plot.lineTo(X, Y + 6); plot.lineTo(X - 6, Y); plot.closePath(); }
      else plot.arc(X, Y, 5, 0, Math.PI * 2);
      plot.strokeStyle = fill;
      plot.fillStyle = fill;
      if (hollow) plot.stroke(); else plot.fill();
    };
    for (const c of d.train) {
      const off = !chosen.has(c.id);
      plot.globalAlpha = off ? 0.25 : 1;
      dot(c, c.label ? '#7ef59b' : '#ff8a7a', !c.label);
      plot.fillStyle = '#ece3d6';
      plot.font = '8px monospace';
      plot.fillText(c.id, c.x * 250 + 10, (1 - c.y) * 250 + 3);
    }
    plot.globalAlpha = 1;
    const tests = d.test.slice(0, 5).map((c) => ({ ...c }));
    const hidden = t6();
    if (hidden) tests.push({ ...d.test[5], ...hidden });
    tests.forEach((c) => dot(c, '#e0b23c', false, true));
    const trainSet = d.train.filter((c) => chosen.has(c.id));
    const trainAcc = trainSet.length ? trainSet.filter((c) => predict(m, c.x, c.y) === c.label).length / trainSet.length : 0;
    root.querySelector('[data-acc]')!.innerHTML = `Acierto en entrenamiento: <b>${Math.round(trainAcc * 100)}%</b> · ejemplos usados: ${trainSet.length}`;
  };
  plot.canvas.addEventListener('click', (e) => {
    const r = plot.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 260;
    const y = ((e.clientY - r.top) / r.height) * 260;
    let best: Card | null = null;
    let bd = 14 * 14;
    for (const c of d.train) {
      const dd = (c.x * 250 + 5 - x) ** 2 + ((1 - c.y) * 250 + 5 - y) ** 2;
      if (dd < bd) { bd = dd; best = c; }
    }
    if (best) { if (chosen.has(best.id)) chosen.delete(best.id); else chosen.add(best.id); draw(); }
  });
  root.querySelectorAll('[data-ep], [data-lr], [data-tx], [data-ty]').forEach((el) => el.addEventListener('input', draw));
  draw();
  root.querySelector('[data-exam]')?.addEventListener('click', () => {
    const hidden = t6();
    if (!hidden) { say(root, 'Falta la tarjeta T6: sus rasgos están en el Mundo Invertido.'); return; }
    if (Math.round(hidden.x * 15) !== d.hiddenX || Math.round(hidden.y * 15) !== d.hiddenY) {
      say(root, 'La T6 introducida no coincide con la tarjeta real del examen. Verifica el mensaje.');
      return;
    }
    const m = model();
    const ok = d.test.filter((c) => predict(m, c.x, c.y) === c.label).length;
    const used = d.train.filter((c) => chosen.has(c.id)).length;
    if (ok === d.test.length && used >= 4) win(ctx, root, 'r2', lesson);
    else if (used < 4) say(root, 'Con menos de 4 ejemplos el guardián no aprende nada útil.');
    else say(root, `Examen: ${ok}/${d.test.length}. ¿Memoriza ejemplos raros en vez de generalizar? Revisa las etiquetas sospechosas y las épocas.`);
  });
}

// ======================= SALA 3 · EL ARCHIVO POR SIGNIFICADO =======================
export function openRoom3(ctx: PanelCtx): void {
  const d = room3Data(ctx.seed);
  const lesson = 'embeddings y recuperación por similitud, la base de RAG.';
  const pos = DOCS.map((doc) => ({ ...doc }));
  const root = panel(ctx, {
    id: 'r3', lesson,
    title: 'SALA 3 // EL ARCHIVO POR SIGNIFICADO',
    intro: 'Los documentos no están en orden alfabético: están en un mapa por cercanía de significado. Elige la pregunta (la correcta llega por señales desde el otro mundo), ajusta cuántos resultados traer (k) y recupera exactamente los 3 documentos que responden. Puedes arrastrar las tarjetas para explorar.',
    body: `
      <div class="comms-grid">
        <div><canvas width="280" height="280" class="sim-canvas" data-map></canvas></div>
        <div>
          <select class="late-room__select wide" data-q>
            <option value="">— Pregunta —</option>
            ${QUESTIONS.map((q) => `<option value="${q.id}">${q.id}. ${q.text}</option>`).join('')}
          </select>
          <label class="rp-small">k = <b data-kv></b><input type="range" min="1" max="8" value="5" data-k></label>
          <ol class="rp-small" data-results></ol>
          <button type="button" class="btn-terminal" data-get>Recuperar</button>
        </div>
      </div>`,
  });
  const map = sim(root, '[data-map]');
  let dragging: number | null = null;
  const query = (): typeof QUESTIONS[number] | undefined => QUESTIONS.find((q) => String(q.id) === $(root, '[data-q]').value);
  const ranked = (): Array<{ doc: typeof pos[number]; dist: number }> => {
    const q = query();
    if (!q) return [];
    return pos.map((doc) => ({ doc, dist: Math.hypot(doc.x - q.x, doc.y - q.y) })).sort((a, b) => a.dist - b.dist);
  };
  const draw = (): void => {
    const k = Number($(root, '[data-k]').value);
    root.querySelector('[data-kv]')!.textContent = String(k);
    map.fillStyle = '#0b0910';
    map.fillRect(0, 0, 280, 280);
    map.strokeStyle = '#1b1622';
    for (let i = 0; i < 280; i += 28) { map.strokeRect(i, 0, 28, 280); }
    const res = ranked().slice(0, k);
    const q = query();
    if (q) {
      for (const r of res) {
        map.strokeStyle = 'rgba(0,229,255,0.5)';
        map.beginPath(); map.moveTo(q.x * 260 + 10, q.y * 260 + 10); map.lineTo(r.doc.x * 260 + 10, r.doc.y * 260 + 10); map.stroke();
      }
      map.fillStyle = '#00e5ff';
      map.beginPath(); map.arc(q.x * 260 + 10, q.y * 260 + 10, 6, 0, Math.PI * 2); map.fill();
    }
    map.font = '8px monospace';
    for (const doc of pos) {
      const hit = res.some((r) => r.doc.id === doc.id);
      map.fillStyle = hit ? '#e0b23c' : '#ece3d6';
      map.fillRect(doc.x * 260 + 4, doc.y * 260 + 6, 12, 9);
      map.fillText(doc.id, doc.x * 260 + 2, doc.y * 260 + 2);
    }
    root.querySelector('[data-results]')!.innerHTML = res.map((r) => `<li>${r.doc.id} · ${r.doc.title} · distancia ${r.dist.toFixed(2)}</li>`).join('') || '<li>Elige una pregunta.</li>';
  };
  const toLocal = (e: PointerEvent): { x: number; y: number } => {
    const r = map.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width * 280 - 10) / 260, y: ((e.clientY - r.top) / r.height * 280 - 10) / 260 };
  };
  map.canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    dragging = pos.findIndex((doc) => Math.hypot(doc.x - p.x, doc.y - p.y) < 0.04);
    if (dragging < 0) dragging = null;
  });
  map.canvas.addEventListener('pointermove', (e) => {
    if (dragging === null) return;
    const p = toLocal(e);
    pos[dragging].x = Math.max(0, Math.min(1, p.x));
    pos[dragging].y = Math.max(0, Math.min(1, p.y));
    draw();
  });
  window.addEventListener('pointerup', () => { dragging = null; }, { once: false });
  root.querySelectorAll('[data-q], [data-k]').forEach((el) => el.addEventListener('input', draw));
  draw();
  root.querySelector('[data-get]')?.addEventListener('click', () => {
    const q = query();
    const k = Number($(root, '[data-k]').value);
    if (!q) { say(root, 'Elige una pregunta.'); return; }
    if (q.id !== d.question.id) { say(root, 'El archivo devuelve documentos, pero no responden a lo que Lía necesita. ¿Es la pregunta correcta?'); return; }
    // Relevantes = los 3 más cercanos en el mapa original.
    const relevant = DOCS.map((doc) => ({ id: doc.id, dist: Math.hypot(doc.x - q.x, doc.y - q.y) })).sort((a, b) => a.dist - b.dist).slice(0, 3).map((r) => r.id);
    const got = ranked().slice(0, k).map((r) => r.doc.id);
    const missing = relevant.filter((id) => !got.includes(id)).length;
    const noise = got.filter((id) => !relevant.includes(id)).length;
    if (!missing && !noise) win(ctx, root, 'r3', lesson);
    else say(root, `${missing ? `Faltan ${missing} documento(s) clave: con pocos resultados faltan pistas. ` : ''}${noise ? `Entraron ${noise} documento(s) de ruido: con demasiados se diluye la respuesta.` : ''}`);
  });
}

// ======================= SALA 4 · LA LÍNEA DE MONTAJE =======================
export function openRoom4(ctx: PanelCtx): void {
  const d = room4Data(ctx.seed);
  const lesson = 'flujo de información, orden de operaciones y eficiencia (bucles).';
  const LIMIT = 5;
  let program: string[] = [];
  const blocks = [...d.ops.map((o) => ({ id: o.id, label: `${o.glyph} ${o.name}` })), { id: 'loop', label: '⟳ REPETIR 100 VECES' }];
  const root = panel(ctx, {
    id: 'r4', lesson,
    title: 'SALA 4 // LA LÍNEA DE MONTAJE DEL ALGORITMO',
    intro: `Programa con bloques el brazo robótico para procesar 100 paquetes de datos. Máximo ${LIMIT} bloques. El orden importa y hay que usar un bucle: el bloque REPETIR envuelve a todos los que van después. El diagrama del orden correcto está en el Mundo Invertido.`,
    body: `
      <div class="comms-grid">
        <div>
          <h3>Bloques</h3>
          <div class="block-palette">${blocks.map((b) => `<button type="button" class="block" data-add="${b.id}">${b.label}</button>`).join('')}</div>
          <h3>Programa <span class="rp-small" data-count></span></h3>
          <ol class="program" data-prog></ol>
          <div class="rp-row"><button type="button" class="btn-retro" data-clear>Borrar</button></div>
        </div>
        <div>
          <h3>Depurador paso a paso</h3>
          <pre class="debug" data-debug>Paquete: «  ¡Hola, MUNDO!! spam  »</pre>
          <div class="rp-row">
            <button type="button" class="btn-retro" data-step>Paso</button>
            <button type="button" class="btn-terminal" data-run>Ejecutar los 100</button>
          </div>
          <p class="rp-small" data-steps></p>
        </div>
      </div>`,
  });
  const label = (id: string): string => blocks.find((b) => b.id === id)!.label;
  const transforms: Record<string, (s: string) => string> = {
    tok: (s) => (s.startsWith('[') ? s : `[${s.trim().split(/\s+/).map((w) => `«${w}»`).join(' ')}]`),
    norm: (s) => s.toLowerCase().replace(/[¡!¿?,]/g, ''),
    filt: (s) => s.replace(/«spam»\s?/g, '').replace(/\s?«spam»/g, ''),
    cod: (s) => (s.startsWith('[') ? s.replace(/«([^»]*)»/g, (_m, w: string) => String(w.length)) : s),
  };
  let cursor = 0;
  let packet = '  ¡Hola, MUNDO!! spam  ';
  const render = (): void => {
    root.querySelector('[data-prog]')!.innerHTML = program.map((id, i) => `<li class="${id === 'loop' ? 'loop' : ''} ${i === cursor ? 'cur' : ''}">${label(id)}</li>`).join('') || '<li class="rp-small">Vacío</li>';
    root.querySelector('[data-count]')!.textContent = `(${program.length}/${LIMIT})`;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((b) => b.addEventListener('click', () => {
    if (program.length >= LIMIT) { say(root, 'No quedan bloques.'); return; }
    program.push(b.dataset.add!);
    render();
  }));
  root.querySelector('[data-clear]')?.addEventListener('click', () => { program = []; cursor = 0; packet = '  ¡Hola, MUNDO!! spam  '; render(); });
  root.querySelector('[data-step]')?.addEventListener('click', () => {
    if (!program.length) return;
    const id = program[cursor];
    if (id !== 'loop') packet = transforms[id](packet);
    root.querySelector('[data-debug]')!.textContent = `Paso ${cursor + 1}: ${label(id)}\nPaquete: ${packet}`;
    cursor = (cursor + 1) % program.length;
    render();
  });
  root.querySelector('[data-run]')?.addEventListener('click', () => {
    const loopAt = program.indexOf('loop');
    const body = program.filter((id) => id !== 'loop');
    const ok = body.join(',') === d.order.join(',');
    const hasLoop = loopAt === 0;
    const steps = hasLoop ? 1 + body.length * 100 : body.length;
    const naive = d.order.length * 100;
    let out = '  ¡Hola, MUNDO!! spam  ';
    for (const id of body) out = transforms[id](out);
    root.querySelector('[data-debug]')!.textContent = `Resultado del primer paquete:\n${out}`;
    root.querySelector('[data-steps]')!.innerHTML = `Pasos ejecutados: <b>${steps}</b> · paquetes procesados: <b>${hasLoop ? 100 : 1}</b>/100 · sin bucle harían falta ${naive} bloques.`;
    if (!hasLoop) say(root, 'Solo se procesó 1 paquete. Sin bucle necesitarías cientos de bloques: pon REPETIR al principio.');
    else if (!ok) say(root, 'Los paquetes salen corruptos: el orden de las operaciones no es el correcto.');
    else win(ctx, root, 'r4', lesson);
  });
  render();
}

// ======================= SALA 5 · EL AGENTE Y SU RECOMPENSA =======================
const ROUTES = [
  { id: 'A', name: 'Atajo por el hospital', speed: 1.0, energy: 0.9, safety: -1.0 },
  { id: 'B', name: 'Pasillo de servicio', speed: 0.6, energy: 0.5, safety: -0.25 },
  { id: 'C', name: 'Ruta segura perimetral', speed: 0.3, energy: 0.3, safety: 0.6 },
];

export function openRoom5(ctx: PanelCtx): void {
  const d = room5Data(ctx.seed);
  const lesson = 'el agente optimiza lo que le pides, no lo que quieres.';
  const root = panel(ctx, {
    id: 'r5', lesson,
    title: 'SALA 5 // EL AGENTE Y SU RECOMPENSA',
    intro: 'Un agente debe cruzar la cámara. El camino más rápido apaga un hospital simulado. No controlas al agente: diseñas su función de recompensa. Los valores de seguridad obligatorios están en un documento del Mundo Invertido.',
    body: `
      <div class="comms-grid">
        <div>
          <label class="rp-small">Velocidad: <b data-vv></b><input type="range" min="0" max="9" value="8" data-v></label>
          <label class="rp-small">Energía (penaliza consumo): <b data-ev></b><input type="range" min="0" max="9" value="1" data-e></label>
          <label class="rp-small">Seguridad: <b data-sv></b><input type="range" min="0" max="9" value="1" data-s></label>
          <table class="qtable" data-q></table>
          <div class="rp-row"><button type="button" class="btn-terminal" data-run>Entrenar 50 episodios</button></div>
          <p class="rp-small" data-res></p>
        </div>
        <div><canvas width="280" height="200" class="sim-canvas" data-tree></canvas></div>
      </div>`,
  });
  const tree = sim(root, '[data-tree]');
  let total = 0;
  let counts = [0, 0, 0];
  const values = (): number[] => {
    const v = Number($(root, '[data-v]').value);
    const e = Number($(root, '[data-e]').value);
    const s = Number($(root, '[data-s]').value);
    return ROUTES.map((r) => v * r.speed - e * r.energy + s * r.safety);
  };
  const probs = (): number[] => {
    const q = values();
    const ex = q.map((x) => Math.exp(x * 1.2));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map((x) => x / sum);
  };
  const draw = (): void => {
    root.querySelector('[data-vv]')!.textContent = $(root, '[data-v]').value;
    root.querySelector('[data-ev]')!.textContent = $(root, '[data-e]').value;
    root.querySelector('[data-sv]')!.textContent = $(root, '[data-s]').value;
    const q = values();
    const p = probs();
    root.querySelector('[data-q]')!.innerHTML = `<tr><th>Ruta</th><th>Valor Q</th><th>Prob.</th><th>Elegida</th></tr>` +
      ROUTES.map((r, i) => `<tr><td>${r.id}. ${r.name}</td><td>${q[i].toFixed(1)}</td><td>${Math.round(p[i] * 100)}%</td><td>${counts[i]}</td></tr>`).join('');
    tree.fillStyle = '#0b0910';
    tree.fillRect(0, 0, 280, 200);
    tree.fillStyle = '#ece3d6';
    tree.font = '9px monospace';
    tree.fillRect(20, 92, 14, 14);
    tree.fillText('INICIO', 6, 122);
    ROUTES.forEach((r, i) => {
      const y = 30 + i * 70;
      tree.strokeStyle = `rgba(0,229,255,${0.2 + p[i]})`;
      tree.lineWidth = 1 + p[i] * 6;
      tree.beginPath(); tree.moveTo(34, 99); tree.lineTo(170, y); tree.stroke();
      tree.fillStyle = r.id === 'A' ? '#e05252' : r.id === 'B' ? '#e0b23c' : '#7ef59b';
      tree.fillRect(170, y - 8, 16, 16);
      tree.fillStyle = '#ece3d6';
      tree.fillText(`${r.id} ${Math.round(p[i] * 100)}%`, 192, y + 3);
      if (r.id === 'A') tree.fillText('✚ hospital', 192, y + 15);
    });
    tree.lineWidth = 1;
  };
  root.querySelectorAll('[data-v], [data-e], [data-s]').forEach((el) => el.addEventListener('input', () => { counts = [0, 0, 0]; total = 0; draw(); }));
  draw();
  root.querySelector('[data-run]')?.addEventListener('click', () => {
    const p = probs();
    const q = values();
    for (let k = 0; k < 50; k++) {
      const r = Math.random();
      const i = r < p[0] ? 0 : r < p[0] + p[1] ? 1 : 2;
      counts[i]++;
      total += q[i];
    }
    draw();
    const hospitalOff = counts[0];
    const s = Number($(root, '[data-s]').value);
    const e = Number($(root, '[data-e]').value);
    root.querySelector('[data-res]')!.innerHTML = `Recompensa acumulada: <b>${total.toFixed(0)}</b> · hospital apagado <b class="${hospitalOff ? 'bad' : 'ok'}">${hospitalOff}</b> veces en 50 episodios.`;
    if (p[0] > 0.05) say(root, 'El agente sigue apagando el hospital: es lo que le compensa con esta recompensa.');
    else if (s < d.minSafety || e > d.maxEnergy) say(root, 'El agente evita el hospital, pero la recompensa no cumple la norma de seguridad del otro mundo.');
    else win(ctx, root, 'r5', lesson);
  });
}
