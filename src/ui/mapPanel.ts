import type { GameState } from '../gameState';
import { ROOM_NAMES } from '../rooms/roomNames';

export function openMapPanel(state: GameState, host: HTMLElement, onClose: () => void): void {
  host.hidden = false;

  const roomBoxes = Array.from({ length: 10 }, (_, index) => {
    const room = index + 1;
    const isFound = Boolean(state.fragments[index]);
    const isCurrent = state.currentRoom === room;
    const roomName = ROOM_NAMES[index] ?? 'Sector';
    const num = String(room).padStart(2, '0');

    // Estado del conector entre salas (rojo si puerta cerrada, verde si abierta)
    const doorConnector = index % 5 !== 4 ? `<i class="map-connector ${isFound ? 'map-connector--open' : 'map-connector--locked'}"></i>` : '';

    return `
      <div class="map-cell-wrapper">
        <div class="map-box ${isCurrent ? 'map-box--current' : ''} ${isFound ? 'map-box--found' : ''}">
          <div class="map-box__num">#${num}</div>
          <div class="map-box__name">${isCurrent || isFound ? roomName : '???'}</div>
        </div>
        ${doorConnector}
      </div>
    `;
  }).join('');

  host.innerHTML = `
    <section class="map-modal" role="dialog" aria-modal="true" aria-labelledby="map-title">
      <div class="map-modal__head">
        <h2 id="map-title">Mapa del laboratorio</h2>
        <button type="button" class="btn-orange-outline" data-map-close>Cerrar (Esc)</button>
      </div>

      <div class="map-grid-5">
        ${roomBoxes}
      </div>

      <p class="map-legend-p21">
        El número es el fragmento que esconde cada sala. Naranja: estás aquí · Verde: ya la tienes · Rojo: puerta cerrada.
      </p>
    </section>
  `;

  host.querySelector('[data-map-close]')?.addEventListener('click', () => {
    host.hidden = true;
    host.replaceChildren();
    onClose();
  }, { once: true });
}
