import type { World } from '../../shared/reducer.js';
import type { Session } from '../session';

export interface PanelCtx {
  session: Session;
  seed: number;
  world: World;
  host: HTMLElement;
  isSolved(id: string): boolean;
  solve(id: string): void;
  close(): void;
}

export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Marco común de los paneles de sala (estilo terminal de Proyecto 21). */
export function panel(ctx: PanelCtx, opts: { title: string; intro: string; body: string; lesson: string; id: string }): HTMLElement {
  const solved = ctx.isSolved(opts.id);
  ctx.host.hidden = false;
  ctx.host.innerHTML = `
    <section class="puzzle crt-panel rp" role="dialog" aria-modal="true">
      <div class="puzzle__head">
        <h2>${opts.title}</h2>
        <button type="button" class="btn-retro" data-close>Cerrar (Esc)</button>
      </div>
      <p class="rp-intro">${opts.intro}</p>
      ${solved ? `<p class="rp-solved">✔ SALA RESUELTA · ${opts.lesson}</p>` : ''}
      <div class="rp-body">${opts.body}</div>
      <p class="rp-msg" aria-live="polite"></p>
    </section>`;
  const root = ctx.host.querySelector<HTMLElement>('.rp')!;
  root.querySelector('[data-close]')?.addEventListener('click', () => ctx.close());
  return root;
}

export function say(root: HTMLElement, text: string, ok = false): void {
  const msg = root.querySelector<HTMLElement>('.rp-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.classList.toggle('rp-msg--ok', ok);
}

export function win(ctx: PanelCtx, root: HTMLElement, id: string, lesson: string): void {
  if (!ctx.isSolved(id)) ctx.solve(id);
  say(root, `✔ ${id.startsWith('r') || /^i\d/.test(id) ? 'Fragmento recuperado' : 'Sala resuelta'}. Se aprende: ${lesson}`, true);
}

/** Lienzo pequeño para simuladores dentro de un panel. */
export function sim(root: HTMLElement, selector: string): CanvasRenderingContext2D {
  const canvas = root.querySelector<HTMLCanvasElement>(selector)!;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function $(root: HTMLElement, sel: string): HTMLInputElement {
  return root.querySelector(sel) as HTMLInputElement;
}
