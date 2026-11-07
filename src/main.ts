import './style.css';
import { createGameState, type GameState } from './gameState';
import { loadGameState, saveGameState, clearGameState } from './state/storage';
import { CanvasGame, ROOM_WIDTH, ROOM_HEIGHT } from './engine/canvasGame';
import { MAP_HEIGHT, MAP_WIDTH, ROOM_LAYOUT, isRoomAt, roomOrigin } from './engine/roomLayout';
import type { Rect, RoomMap } from './engine/types';
import { Hud } from './ui/hud';
import { openRoom1Panel } from './ui/room1Panel';
import { openRoom2Panel, openRoom3Panel } from './ui/verticalSlice';
import { openMapPanel } from './ui/mapPanel';
import { openControlPanel } from './ui/controlPanel';
import { openLateRoomPanel } from './ui/lateRoomPanels';
import { Music } from './audio/music';
import { ROOM_NAMES } from './rooms/roomNames';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const hudRoot = document.querySelector<HTMLElement>('#hud');
const overlay = document.querySelector<HTMLElement>('#overlay');
if (!canvas || !hudRoot || !overlay) throw new Error('Faltan elementos base del juego.');

const state: GameState = loadGameState(createGameState());
const hud = new Hud(hudRoot);
const music = new Music();
const roomBanner = document.querySelector<HTMLElement>('#room-banner');

const TOTAL_ROOMS = 10;
const mapWidth = MAP_WIDTH;
const mapHeight = MAP_HEIGHT;

// Generar muros y colisiones de las 10 salas del complejo
const solids: Rect[] = [
  // Muro superior
  { x: 0, y: 0, width: mapWidth, height: 44 },
  // Muro inferior (estanterías de archivo continuas)
  { x: 0, y: mapHeight - 16, width: mapWidth, height: 16 },
  // Extremos del complejo
  { x: 0, y: 0, width: 16, height: ROOM_HEIGHT },
  { x: mapWidth - 16, y: 0, width: 16, height: mapHeight },
];

const addSegments = (axis: 'horizontal' | 'vertical', x: number, y: number, length: number, openingStart: number, openingSize: number): void => {
  const first = openingStart;
  const second = openingStart + openingSize;
  if (axis === 'horizontal') {
    if (first > 0) solids.push({ x, y, width: first, height: 16 });
    if (length > second) solids.push({ x: x + second, y, width: length - second, height: 16 });
  } else {
    if (first > 0) solids.push({ x, y, width: 16, height: first });
    if (length > second) solids.push({ x, y: y + second, width: 16, height: length - second });
  }
};

for (let room = 1; room <= TOTAL_ROOMS; room += 1) {
  const { x: rx, y: ry } = roomOrigin(room);
  const { col, row } = ROOM_LAYOUT[room];
  solids.push({ x: rx + 296, y: ry + 52, width: 32, height: 26 });
  solids.push({ x: rx + 44, y: ry + 44, width: 60, height: 42 });
  solids.push({ x: rx + 450, y: ry + 180, width: 24, height: 24 });

  // Paredes exteriores de cada celda; si hay vecino se deja una puerta.
  if (!isRoomAt(col - 1, row)) solids.push({ x: rx, y: ry, width: 16, height: ROOM_HEIGHT });
  if (!isRoomAt(col + 1, row)) solids.push({ x: rx + ROOM_WIDTH - 16, y: ry, width: 16, height: ROOM_HEIGHT });
  else addSegments('vertical', rx + ROOM_WIDTH - 8, ry, ROOM_HEIGHT, 134, 116);
  if (!isRoomAt(col, row - 1)) solids.push({ x: rx, y: ry, width: ROOM_WIDTH, height: 16 });
  if (!isRoomAt(col, row + 1)) solids.push({ x: rx, y: ry + ROOM_HEIGHT - 16, width: ROOM_WIDTH, height: 16 });
  else addSegments('horizontal', rx, ry + ROOM_HEIGHT - 8, ROOM_WIDTH, 248, 144);
}

const map: RoomMap = {
  width: mapWidth,
  height: mapHeight,
  solids,
};

const engine = new CanvasGame(canvas, map, {
  onRoomChanged: (roomId) => {
    state.currentRoom = roomId;
    state.globalSyncPercent = Math.min(100, state.globalSyncPercent + 5);
    saveGameState(state);
    hud.render(state);
    if (roomBanner) {
      roomBanner.textContent = `GENESIS // SALA ${String(roomId).padStart(2, '0')} · ${ROOM_NAMES[roomId - 1]}`;
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

    // Si el jugador interactúa con la terminal principal de la sala
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
  isRoomSolved: (roomId) => Boolean(state.fragments[roomId - 1]),
});

// Posicionar a Kiro en la sala activa
const startOrigin = roomOrigin(state.currentRoom);
engine.player.x = startOrigin.x + 312;
engine.player.y = startOrigin.y + 200;

const openOverlay = (open: () => void): void => {
  engine.setPaused(true);
  open();
};

const closeOverlay = (): void => engine.setPaused(false);

document.querySelector('#map-button')?.addEventListener('click', () => openOverlay(() => openMapPanel(state, overlay, closeOverlay)));

const updateMusicButton = (enabled: boolean): void => {
  const button = document.querySelector('#music-button');
  if (button) button.innerHTML = `Música: ${enabled ? 'sí' : 'no'}<br>(M)`;
};

document.querySelector('#music-button')?.addEventListener('click', () => {
  const enabled = music.toggle();
  updateMusicButton(enabled);
});

document.querySelector('#fullscreen-button')?.addEventListener('click', () => {
  if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
  else void document.exitFullscreen();
});

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
  if (event.key.toLowerCase() === 'm') {
    const enabled = music.toggle();
    updateMusicButton(enabled);
  }
  if (event.key.toLowerCase() === 'f') {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
    else void document.exitFullscreen();
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

document.querySelector('#reset-button')?.addEventListener('click', () => {
  clearGameState();
  window.location.reload();
});

hud.render(state);
engine.start();
