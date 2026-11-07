import type { GameState } from '../gameState';
import { ROOM_NAMES } from '../rooms/roomNames';
import { ROOM_LAYOUT } from '../engine/roomLayout';

const FRAGMENTS_LIST = [
  'identidad',
  'verdad',
  'aprendizaje',
  'percepción',
  'memoria',
  'intención',
  'prioridad',
  'conexión',
  'responsabilidad',
  'contexto',
];

export class Hud {
  constructor(private readonly root: HTMLElement) {}

  render(state: GameState): void {
    const isCritical = state.globalSyncPercent >= 75;
    this.root.classList.toggle('hud--critical', isCritical);

    const roomName = ROOM_NAMES[state.currentRoom - 1] ?? 'Seguridad';

    // HUD en la esquina superior (flotante sutil si es necesario o integrado)
    this.root.innerHTML = `
      <div class="hud__box">
        <div class="hud__header">
          <span class="hud__title">GENESIS // 2097</span>
          <span class="hud__sync ${isCritical ? 'hud__sync--crit' : ''}">SYNC ${state.globalSyncPercent}%</span>
        </div>
        <div class="hud__room">SALA #${String(state.currentRoom).padStart(2, '0')} · ${roomName.toUpperCase()}</div>
        <div class="hud__row">
          <span>COMPUTE POWER</span>
          <strong class="${state.computePower < 30 ? 'text-red' : 'text-green'}">${state.computePower}%</strong>
        </div>
        <div class="hud__meter">
          <i style="width:${state.computePower}%; background:${state.computePower < 30 ? '#e05252' : '#4cc47a'};"></i>
        </div>
      </div>
    `;

    // 1. Contador del panel inferior
    const countEl = document.querySelector<HTMLElement>('#fragment-count');
    if (countEl) {
      countEl.textContent = `Fragmentos de contexto · ${state.fragments.length} de 10 recuperados`;
    }

    // 2. Coleccionables / Sincronización
    const colEl = document.querySelector<HTMLElement>('#collectibles-label');
    if (colEl) {
      colEl.textContent = `Alerta global · ${state.globalSyncPercent}% · Coleccionables: ${state.fragments.length}/10`;
    }

    // 3. Grid de casillas de fragmentos (Exacto a la Frase Semilla de la Imagen 1)
    const slotsEl = document.querySelector<HTMLElement>('#fragment-slots');
    if (slotsEl) {
      slotsEl.innerHTML = FRAGMENTS_LIST.map((frag, idx) => {
        const found = Boolean(state.fragments[idx]);
        const num = String(idx + 1).padStart(2, '0');
        if (found) {
          return `
            <div class="slot-box slot-box--found" title="Fragmento #${num}">
              <span class="slot-word">${frag}</span>
            </div>
          `;
        }
        return `
          <div class="slot-box slot-box--empty" title="Fragmento #${num}">
            <span class="slot-num">#${num}</span>
          </div>
        `;
      }).join('');
    }

    // 4. Minimapa de salas inferior (Exacto a la Imagen 1)
    const minimapEl = document.querySelector<HTMLElement>('#minimap-grid');
    if (minimapEl) {
      // Cuadrícula 5 columnas x 2 filas para las 10 salas
      minimapEl.innerHTML = Array.from({ length: 10 }, (_, idx) => {
        const roomNum = idx + 1;
        const isCurrent = state.currentRoom === roomNum;
        const isFound = Boolean(state.fragments[idx]);
        const numStr = String(roomNum).padStart(2, '0');

        const position = ROOM_LAYOUT[roomNum];
        return `
          <div class="minimap-cell ${isCurrent ? 'minimap-cell--current' : ''} ${isFound ? 'minimap-cell--found' : ''}" style="grid-column:${position.col + 1};grid-row:${position.row + 1}">
            <span>${numStr}</span>
          </div>
        `;
      }).join('');
    }
  }
}
