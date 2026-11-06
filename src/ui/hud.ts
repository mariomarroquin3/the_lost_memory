import type { GameState } from '../gameState';

export class Hud {
  constructor(private readonly root: HTMLElement) {}

  render(state: GameState): void {
    this.root.innerHTML = `
      <div class="hud__title">SALVAR A LA HUMANIDAD</div>
      <div class="hud__room">SALA ${state.currentRoom}</div>
      <div class="hud__row"><span>COMPUTE POWER</span><strong>${state.computePower}%</strong></div>
      <div class="hud__meter"><i style="width:${state.computePower}%"></i></div>
      <div class="hud__row"><span>FRAGMENTOS</span><strong>${state.fragments.length} / 10</strong></div>
      <div class="hud__row hud__alert"><span>ALERTA GLOBAL</span><strong>${state.globalSyncPercent}%</strong></div>
    `;
    const count = document.querySelector<HTMLElement>('#fragment-count');
    if (count) count.textContent = `Fragmentos · ${state.fragments.length} de 10`;
    const grid = document.querySelector<HTMLElement>('#fragment-grid');
    if (grid) {
      grid.replaceChildren(...Array.from({ length: 10 }, (_, index) => {
        const item = document.createElement('span');
        item.textContent = String(index + 1).padStart(2, '0');
        item.className = index < state.fragments.length ? 'fragment fragment--found' : 'fragment';
        return item;
      }));
    }
  }
}
