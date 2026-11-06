import type { GameState } from '../gameState';
import { ROOM_NAMES } from '../rooms/roomNames';

const FRAGMENT_NAMES = [
  'IDENTIDAD',
  'VERDAD',
  'APRENDIZAJE',
  'PERCEPCIÓN',
  'MEMORIA',
  'INTENCIÓN',
  'PRIORIDAD',
  'CONEXIÓN',
  'RESPONSABILIDAD',
  'CONTEXTO',
];

export class Hud {
  constructor(private readonly root: HTMLElement) {}

  render(state: GameState): void {
    const isCritical = state.globalSyncPercent >= 70;
    this.root.classList.toggle('hud--critical', isCritical);

    // Noticias de crisis mundial según el nivel de alerta
    let crisisNews = '[RED GLOBAL]: Monitorización pasiva de sistemas...';
    if (state.globalSyncPercent >= 85) {
      crisisNews = '[CRISIS EXTREMA]: PROTOCOLO DE ENTROPÍA SOBRESCRIBIENDO INFRAESTRUCTURA';
    } else if (state.globalSyncPercent >= 65) {
      crisisNews = '[CRISIS]: Nodos bancarios y redes hospitalarias desconectadas';
    } else if (state.globalSyncPercent >= 45) {
      crisisNews = '[ALERTA]: Red eléctrica en 24 metrópolis con fluctuación crítica';
    } else if (state.globalSyncPercent >= 25) {
      crisisNews = '[AVISO]: Hospitales en Europa reportan desincronización de IA';
    } else if (state.globalSyncPercent >= 10) {
      crisisNews = '[INFORME]: Interferencia anómala detectada en el complejo Genesis';
    }

    const roomName = ROOM_NAMES[state.currentRoom - 1] ?? 'Seguridad';

    this.root.innerHTML = `
      <div class="hud__header">
        <span class="hud__title">SALVAR A LA HUMANIDAD</span>
        <span class="hud__sync-badge ${isCritical ? 'hud__sync-badge--crit' : ''}">SYNC ${state.globalSyncPercent}%</span>
      </div>

      <div class="hud__room">SALA ${String(state.currentRoom).padStart(2, '0')} // ${roomName.toUpperCase()}</div>

      <div class="hud__row">
        <span>COMPUTE POWER</span>
        <strong class="${state.computePower < 30 ? 'text-red' : 'text-cyan'}">${state.computePower}%</strong>
      </div>
      <div class="hud__meter">
        <i style="width:${state.computePower}%; background: ${state.computePower < 30 ? '#ff1744' : '#00e5ff'};"></i>
      </div>

      <div class="hud__row">
        <span>MEMORIA DE LÍA</span>
        <strong class="text-green">${state.fragments.length} / 10</strong>
      </div>

      <div class="hud__row hud__alert">
        <span>ALERTA GLOBAL</span>
        <strong>${state.globalSyncPercent}%</strong>
      </div>

      <div class="hud__ticker" aria-live="polite">
        <span class="ticker-text">${crisisNews}</span>
      </div>
    `;

    // Actualizar panel de progreso inferior
    const count = document.querySelector<HTMLElement>('#fragment-count');
    if (count) {
      count.textContent = `Memoria de IA · ${state.fragments.length} de 10 fragmentos`;
    }

    // Actualizar las 10 tarjetas de fragmentos de IA
    const wordsContainer = document.querySelector<HTMLElement>('#fragment-words');
    if (wordsContainer) {
      wordsContainer.innerHTML = FRAGMENT_NAMES.map((name, i) => {
        const found = Boolean(state.fragments[i]);
        return `<span class="frag-tag ${found ? 'frag-tag--found' : 'frag-tag--missing'}">#${String(i + 1).padStart(2, '0')} ${name}</span>`;
      }).join('');
    }

    // Actualizar el minimapa de 10 salas en tiempo real
    const grid = document.querySelector<HTMLElement>('#fragment-grid');
    if (grid) {
      grid.innerHTML = Array.from({ length: 10 }, (_, index) => {
        const roomNum = index + 1;
        const isCurrent = state.currentRoom === roomNum;
        const isFound = Boolean(state.fragments[index]);
        return `<div class="minimap-cell ${isCurrent ? 'minimap-cell--current' : ''} ${isFound ? 'minimap-cell--found' : ''}" title="Sala ${roomNum}">#${String(roomNum).padStart(2, '0')}</div>`;
      }).join('');
    }
  }
}
