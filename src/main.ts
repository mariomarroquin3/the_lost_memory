import './style.css';
import { createGameState, type GameState } from './gameState';
import { loadGameState, saveGameState } from './state/storage';
import { CanvasGame } from './engine/canvasGame';
import type { RoomMap } from './engine/types';
import { Hud } from './ui/hud';
import { openRoom1Panel } from './ui/room1Panel';
import { openRoom2Panel, openRoom3Panel } from './ui/verticalSlice';
import { openMapPanel } from './ui/mapPanel';
import { openControlPanel } from './ui/controlPanel';
import { openLateRoomPanel } from './ui/lateRoomPanels';
import { clearGameState } from './state/storage';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const hudRoot = document.querySelector<HTMLElement>('#hud');
const overlay = document.querySelector<HTMLElement>('#overlay');
if (!canvas || !hudRoot || !overlay) throw new Error('Faltan elementos base del juego.');

const state: GameState = loadGameState(createGameState());
const hud = new Hud(hudRoot);
const roomBanner = document.querySelector<HTMLElement>('#room-banner');
const map: RoomMap = {
  width: 1600,
  height: 360,
  solids: [
    { x: 0, y: 0, width: 1600, height: 16 },
    { x: 0, y: 344, width: 1600, height: 16 },
    { x: 0, y: 0, width: 16, height: 360 },
    { x: 1584, y: 0, width: 16, height: 360 },
    { x: 180, y: 80, width: 120, height: 20 },
    { x: 420, y: 210, width: 120, height: 20 },
  ],
};

const engine = new CanvasGame(canvas, map, {
  onRoomChanged: (roomId) => {
    state.currentRoom = roomId;
    state.globalSyncPercent = Math.min(100, state.globalSyncPercent + 5);
    saveGameState(state);
    hud.render(state);
    if (roomBanner) {
      roomBanner.textContent = `GENESIS · SALA ${String(roomId).padStart(2, '0')}`;
      roomBanner.classList.remove('room-banner--on');
      void roomBanner.offsetWidth;
      roomBanner.classList.add('room-banner--on');
    }
  },
  onInteract: () => {
    engine.setPaused(true);
    const refresh = (): void => {
      saveGameState(state);
      hud.render(state);
    };
    const close = state.currentRoom === 2
      ? openRoom2Panel(state, overlay, refresh)
      : state.currentRoom === 3
        ? openRoom3Panel(state, overlay, refresh)
        : state.currentRoom > 3
          ? openLateRoomPanel(state.currentRoom, state, overlay, refresh)
          : openRoom1Panel(state, overlay, refresh);
    overlay.querySelector('[data-close]')?.addEventListener('click', () => {
      close();
      engine.setPaused(false);
    }, { once: true });
  },
});

const openOverlay = (open: () => void): void => {
  engine.setPaused(true);
  open();
};

const closeOverlay = (): void => engine.setPaused(false);
document.querySelector('#map-button')?.addEventListener('click', () => openOverlay(() => openMapPanel(state, overlay, closeOverlay)));
document.querySelector('#control-button')?.addEventListener('click', () => openOverlay(() => openControlPanel(state, overlay, closeOverlay)));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    openOverlay(() => openMapPanel(state, overlay, closeOverlay));
  }
  if (event.key === 'Escape' && !overlay.hidden) {
    overlay.hidden = true;
    overlay.replaceChildren();
    engine.setPaused(false);
  }
});

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
  const key = button.dataset.key!;
  const start = (event: Event): void => { event.preventDefault(); engine.pressKey(key); };
  const end = (event: Event): void => { event.preventDefault(); engine.releaseKey(key); };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointerleave', end);
});
document.querySelector('[data-action="interact"]')?.addEventListener('click', () => engine.interact());

const resetButton = document.createElement('button');
resetButton.type = 'button';
resetButton.className = 'reset-button';
resetButton.textContent = 'Reiniciar memoria';
resetButton.addEventListener('click', () => {
  clearGameState();
  window.location.reload();
});
document.querySelector('.progress-copy')?.append(resetButton);

hud.render(state);
engine.start();
