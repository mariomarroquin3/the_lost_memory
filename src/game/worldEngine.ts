import type { Facing, Player, Rect } from '../engine/types';
import type { World } from '../shared/reducer.js';
import {
  drawKiroSprite,
  drawKiroWakingUpSprite,
  drawAIDroneCompanion,
  drawFallenRack,
  drawRubblePile,
  drawPuddle,
  drawBrokenGlass,
  drawEmergencyLight,
  drawScatteredPapers,
  drawBookshelf,
  drawSupplyCrate,
  drawHazardTape,
  drawServerRack,
  drawComputerTerminal,
  drawInteractionPrompt,
  drawFloorCable,
  drawWallCracks,
} from '../engine/sprites';

export const ROOM_W = 640;
export const ROOM_H = 384;
const TOP = 44;
const DOOR_TOP = 134;
const DOOR_BOTTOM = 250;

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export interface Interactable {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface WorldHooks {
  /** ¿Se puede pasar de la sala `index` a la `index + 1`? */
  isOpen(boundary: number): boolean;
  isSolved(roomIndex: number): boolean;
  interactables(roomIndex: number): Interactable[];
  onInteract(id: string): void;
  onRoomChanged(roomIndex: number): void;
  intro: string[];
}

interface Theme {
  floor: string; grid: string; rivet: string; wall: string; wallJoint: string; cap: string; dark: string; accent: string; glow: string;
}

const THEMES: Record<World, Theme> = {
  real: {
    floor: '#1e1c25', grid: '#14121a', rivet: '#2d2737', wall: '#2c3340', wallJoint: '#1b222c', cap: '#1b1622',
    dark: 'rgba(6, 4, 10, 0.92)', accent: '#f7931a', glow: '247, 147, 26',
  },
  inverted: {
    floor: '#16112b', grid: '#0d0a1f', rivet: '#2e2152', wall: '#2a2150', wallJoint: '#18123a', cap: '#120d24',
    dark: 'rgba(8, 3, 22, 0.9)', accent: '#a46cff', glow: '0, 229, 255',
  },
};

/** Motor de un mundo: pasillo de salas en vista 3/4, mismo estilo pixel art que Proyecto 21. */
export class WorldEngine {
  readonly player: Player = { x: ROOM_W + 312, y: 200, width: 16, height: 18, speed: 82, facing: 'down', moving: false };
  paused = false;
  world: World;
  roomCount: number;
  room = 1;
  peerRoom: number | null = null;
  glitch = 0;

  private ctx: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private pressed = new Set<string>();
  private camX = ROOM_W;
  private t = 0;
  private walk = 0;
  private last = 0;
  private introT = 0;
  private introOn = true;
  private nearest: Interactable | null = null;

  constructor(private canvas: HTMLCanvasElement, world: World, roomCount: number, private hooks: WorldHooks) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas');
    this.light.width = canvas.width;
    this.light.height = canvas.height;
    this.lctx = this.light.getContext('2d')!;
    this.world = world;
    this.roomCount = roomCount;
    this.bind();
  }

  setWorld(world: World, roomCount: number, roomIndex: number): void {
    this.world = world;
    this.roomCount = roomCount;
    this.placeIn(roomIndex);
    this.glitch = 0.8;
  }

  placeIn(roomIndex: number): void {
    this.room = roomIndex;
    this.player.x = roomIndex * ROOM_W + 312;
    this.player.y = 200;
    this.camX = roomIndex * ROOM_W;
    this.hooks.onRoomChanged(roomIndex);
  }

  start(): void {
    requestAnimationFrame((ts) => this.frame(ts));
  }

  skipIntro(): void {
    if (this.introOn) { this.introOn = false; this.hooks.onRoomChanged(this.room); }
  }

  press(key: string): void { this.pressed.add(key); }
  release(key: string): void { this.pressed.delete(key); }

  interact(): void {
    if (this.introOn) { this.skipIntro(); return; }
    if (!this.paused && this.nearest) this.hooks.onInteract(this.nearest.id);
  }

  setPaused(p: boolean): void {
    this.paused = p;
    if (p) { this.player.moving = false; this.pressed.clear(); }
  }

  private bind(): void {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.introOn && (k === ' ' || k === 'enter' || k === 'escape')) { e.preventDefault(); this.skipIntro(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        e.preventDefault();
        this.pressed.add(k);
      }
      if (k === 'e' && !e.repeat && (e.target as HTMLElement)?.tagName !== 'INPUT') this.interact();
    });
    window.addEventListener('keyup', (e) => this.pressed.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.pressed.clear());
    this.canvas.addEventListener('pointerdown', () => this.skipIntro());
  }

  // ---------- Colisiones ----------
  private solids(): Rect[] {
    const width = this.roomCount * ROOM_W;
    const list: Rect[] = [
      { x: 0, y: 0, width, height: TOP },
      { x: 0, y: ROOM_H - 44, width, height: 44 },
      { x: 0, y: 0, width: 16, height: ROOM_H },
      { x: width - 16, y: 0, width: 16, height: ROOM_H },
    ];
    for (let r = 0; r < this.roomCount; r++) {
      const rx = r * ROOM_W;
      list.push({ x: rx + 296, y: 52, width: 32, height: 26 });
      list.push({ x: rx + 44, y: 44, width: 60, height: 42 });
      if (r < this.roomCount - 1) {
        list.push({ x: rx + ROOM_W - 8, y: TOP, width: 16, height: DOOR_TOP - TOP });
        list.push({ x: rx + ROOM_W - 8, y: DOOR_BOTTOM, width: 16, height: ROOM_H - DOOR_BOTTOM });
        if (!this.hooks.isOpen(r)) list.push({ x: rx + ROOM_W - 8, y: DOOR_TOP, width: 16, height: DOOR_BOTTOM - DOOR_TOP });
      }
    }
    return list;
  }

  private frame(ts: number): void {
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.t += dt;
    this.glitch = Math.max(0, this.glitch - dt);
    if (this.introOn) {
      this.introT += dt;
      if (this.introT > 7.5) this.skipIntro();
    } else if (!this.paused) {
      this.update(dt);
    }
    this.draw();
    requestAnimationFrame((n) => this.frame(n));
  }

  private update(dt: number): void {
    let dx = 0;
    let dy = 0;
    const p = this.pressed;
    if (p.has('arrowleft') || p.has('a')) dx -= 1;
    if (p.has('arrowright') || p.has('d')) dx += 1;
    if (p.has('arrowup') || p.has('w')) dy -= 1;
    if (p.has('arrowdown') || p.has('s')) dy += 1;
    this.player.moving = dx !== 0 || dy !== 0;
    if (this.player.moving) {
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      this.player.facing = (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) as Facing;
      const dist = this.player.speed * dt;
      this.walk += dist;
      const solids = this.solids();
      this.tryMove(dx * dist, 0, solids);
      this.tryMove(0, dy * dist, solids);
    }
    const next = clamp(Math.floor((this.player.x + 8) / ROOM_W), 0, this.roomCount - 1);
    if (next !== this.room) { this.room = next; this.hooks.onRoomChanged(next); }
    // Interactuable más cercano
    const px = this.player.x + 8;
    const py = this.player.y + 9;
    let best: Interactable | null = null;
    let bestD = 64 * 64;
    for (const it of this.hooks.interactables(this.room)) {
      const d = (it.x - px) ** 2 + (it.y - py) ** 2;
      if (d < bestD) { bestD = d; best = it; }
    }
    this.nearest = best;
  }

  private tryMove(dx: number, dy: number, solids: Rect[]): void {
    const c = { x: this.player.x + dx, y: this.player.y + dy, width: 16, height: 18 };
    if (solids.some((s) => c.x < s.x + s.width && c.x + c.width > s.x && c.y < s.y + s.height && c.y + c.height > s.y)) return;
    this.player.x = c.x;
    this.player.y = c.y;
  }

  // ---------- Dibujo ----------
  private draw(): void {
    const { width: w, height: h } = this.canvas;
    const ctx = this.ctx;
    const roomX = this.room * ROOM_W;
    const target = clamp(this.player.x - w / 2, roomX, roomX + ROOM_W - w);
    this.camX += (target - this.camX) * 0.18;
    const cx = Math.floor(this.camX);

    ctx.fillStyle = '#0b0910';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(-cx, 0);
    const first = Math.max(0, Math.floor(cx / ROOM_W));
    const lastRoom = Math.min(this.roomCount - 1, Math.floor((cx + w) / ROOM_W));
    for (let r = first; r <= lastRoom; r++) this.drawRoom(r);

    if (this.introOn && this.introT < 3.6) {
      drawKiroWakingUpSprite(ctx, this.player.x, this.player.y, clamp((this.introT - 1.2) / 2.2, 0, 1));
    } else {
      const step = Math.floor(this.walk / 14) % 2;
      if (this.world === 'inverted') {
        // Eco desfasado de Sato en el Mundo Invertido
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(this.t * 3) * 0.1;
        drawKiroSprite(ctx, this.player.x + Math.sin(this.t * 2) * 3, this.player.y - 2, this.player.facing, step, this.player.moving);
        ctx.restore();
      }
      drawKiroSprite(ctx, this.player.x, this.player.y, this.player.facing, step, this.player.moving);
    }
    if (this.nearest && !this.paused && !this.introOn) {
      drawInteractionPrompt(ctx, this.nearest.x - 6, this.nearest.y - 34, this.t);
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ece3d6';
      ctx.fillText(this.nearest.label, this.nearest.x, this.nearest.y - 38);
    }
    ctx.restore();

    this.drawLighting(cx);
    this.drawOverlayFx();
    if (this.introOn) this.drawIntro();
  }

  private drawRoom(r: number): void {
    const ctx = this.ctx;
    const th = THEMES[this.world];
    const rx = r * ROOM_W;
    const t = this.t;
    const inv = this.world === 'inverted';
    const bob = (phase: number): number => (inv ? Math.sin(t * 1.4 + phase) * 4 - 6 : 0);

    // Suelo técnico
    ctx.fillStyle = th.floor;
    ctx.fillRect(rx, TOP, ROOM_W, ROOM_H - 88);
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    for (let x = rx; x < rx + ROOM_W; x += 32) { ctx.beginPath(); ctx.moveTo(x + 0.5, TOP); ctx.lineTo(x + 0.5, ROOM_H - 44); ctx.stroke(); }
    for (let y = TOP; y < ROOM_H - 44; y += 32) { ctx.beginPath(); ctx.moveTo(rx, y + 0.5); ctx.lineTo(rx + ROOM_W, y + 0.5); ctx.stroke(); }
    ctx.fillStyle = th.rivet;
    for (let x = rx; x < rx + ROOM_W; x += 32) for (let y = TOP; y < ROOM_H - 44; y += 32) ctx.fillRect(x - 1, y - 1, 2, 2);

    // Muro superior
    ctx.fillStyle = th.wall;
    ctx.fillRect(rx, 0, ROOM_W, TOP);
    ctx.fillStyle = th.wallJoint;
    ctx.fillRect(rx, 22, ROOM_W, 1);
    ctx.fillStyle = th.cap;
    ctx.fillRect(rx, 0, ROOM_W, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(rx, TOP, ROOM_W, 3);

    // Rótulo de sala pintado en la pared
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = inv ? 'rgba(164,108,255,0.7)' : 'rgba(247,147,26,0.65)';
    ctx.fillText(r === 0 ? 'C-00' : `${inv ? 'I' : 'R'}-${String(r).padStart(2, '0')}`, rx + 22, 36);

    drawHazardTape(ctx, rx + 150, 8, 96, 14);
    drawEmergencyLight(ctx, rx + 232, 14, true, t);
    drawWallCracks(ctx, rx + 340, 10);
    drawWallCracks(ctx, rx + 440, 130);

    // Muro inferior: estanterías
    for (let sx = rx + 32; sx < rx + ROOM_W - 32; sx += 64) drawBookshelf(ctx, sx, ROOM_H - 42 + (inv ? Math.round(bob(sx) / 2) : 0), 56, 38);

    // Muros laterales y compuertas
    ctx.fillStyle = th.cap;
    ctx.fillRect(rx, 0, 16, DOOR_TOP);
    ctx.fillRect(rx, DOOR_BOTTOM, 16, ROOM_H - DOOR_BOTTOM);
    ctx.fillRect(rx + ROOM_W - 16, 0, 16, DOOR_TOP);
    ctx.fillRect(rx + ROOM_W - 16, DOOR_BOTTOM, 16, ROOM_H - DOOR_BOTTOM);
    ctx.fillStyle = '#4a515c';
    ctx.fillRect(rx + ROOM_W - 16, DOOR_TOP - 4, 16, 6);
    ctx.fillRect(rx + ROOM_W - 16, DOOR_BOTTOM - 2, 16, 6);
    if (r < this.roomCount - 1 && !this.hooks.isOpen(r)) this.drawBarrier(rx + ROOM_W - 8, r === 0);

    // Terminal principal y racks
    drawComputerTerminal(ctx, rx + 296, 52, true, t);
    drawServerRack(ctx, rx + 44, 48, 26, 40, t, r * 7 + (inv ? 3 : 0));
    drawServerRack(ctx, rx + 74, 48, 26, 40, t, r * 11 + (inv ? 5 : 0));
    if (this.hooks.isSolved(r)) {
      ctx.fillStyle = '#7ef59b';
      ctx.fillRect(rx + 300, 46, 24, 3);
    }

    // Decoración por mundo
    if (inv) {
      drawFallenRack(ctx, rx + 110, 150 + bob(r));
      drawSupplyCrate(ctx, rx + 450, 170 + bob(r + 1), 24);
      drawSupplyCrate(ctx, rx + 520, 110 + bob(r + 2), 16);
      drawScatteredPapers(ctx, rx + 200, 120 + bob(r + 3), 0.3);
      // Cables que crecen por la pared
      ctx.strokeStyle = 'rgba(164,108,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(rx + 500, 0);
      for (let y = 0; y < 44; y += 4) ctx.lineTo(rx + 500 + Math.sin(y * 0.4 + t) * 6, y);
      ctx.stroke();
    } else {
      drawFallenRack(ctx, rx + 110, 160);
      drawRubblePile(ctx, rx + 490, 120);
      drawPuddle(ctx, rx + 370, 220, 34, 12);
      drawBrokenGlass(ctx, rx + 150, 240);
      drawScatteredPapers(ctx, rx + 190, 120, -0.1);
      drawScatteredPapers(ctx, rx + 460, 195, 0.1);
      drawSupplyCrate(ctx, rx + 450, 180, 24);
      drawFloorCable(ctx, rx + 100, 88, rx + 170, 140, Math.sin(t * 8 + r) > 0.94);
    }
    drawAIDroneCompanion(ctx, rx + 288, 76 + (inv ? bob(r) : 0), t);

    this.drawCenterpiece(r, rx);

    // Interactuables secundarios (pistas, paneles ocultos)
    for (const it of this.hooks.interactables(r)) {
      if (it.id.startsWith('main')) continue;
      this.drawInteractableProp(it);
    }
  }

  private drawBarrier(x: number, hidden: boolean): void {
    const ctx = this.ctx;
    if (hidden) {
      // Pared falsa de mantenimiento: parece muro normal, con rejilla de ventilación.
      const th = THEMES[this.world];
      ctx.fillStyle = th.cap;
      ctx.fillRect(x - 8, DOOR_TOP - 4, 16, DOOR_BOTTOM - DOOR_TOP + 8);
      ctx.fillStyle = '#2b2533';
      for (let y = DOOR_TOP + 30; y < DOOR_TOP + 70; y += 6) ctx.fillRect(x - 5, y, 10, 2);
      if (Math.sin(this.t * 5) > 0.7) {
        ctx.fillStyle = 'rgba(236,227,214,0.25)';
        ctx.fillRect(x + 8, DOOR_TOP + 30 + ((this.t * 40) % 40), 6, 1);
      }
      return;
    }
    // Barrera láser roja
    for (let i = 0; i < 6; i++) {
      const y = DOOR_TOP + 8 + i * 18;
      const on = Math.sin(this.t * 6 + i) > -0.6;
      ctx.fillStyle = on ? 'rgba(255,23,68,0.85)' : 'rgba(255,23,68,0.3)';
      ctx.fillRect(x - 6, y, 12, 2);
    }
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(x - 7, DOOR_TOP, 3, DOOR_BOTTOM - DOOR_TOP);
    ctx.fillRect(x + 4, DOOR_TOP, 3, DOOR_BOTTOM - DOOR_TOP);
  }

  private drawInteractableProp(it: Interactable): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(this.t * 3) * 0.5;
    if (it.id === 'hidden-panel') {
      ctx.fillStyle = '#2b2533';
      ctx.fillRect(it.x - 6, it.y - 10, 12, 18);
      const colors = ['#e05252', '#4cc47a', '#00e5ff', '#e0b23c'];
      const idx = Math.floor(this.t * 2) % 4;
      ctx.fillStyle = Math.sin(this.t * 9) > 0.2 ? colors[idx] : '#111';
      ctx.fillRect(it.x - 2, it.y - 6, 4, 4);
      return;
    }
    if (it.id === 'clue') {
      ctx.save();
      ctx.translate(it.x, it.y + (this.world === 'inverted' ? Math.sin(this.t * 2) * 3 : 0));
      ctx.fillStyle = `rgba(${THEMES[this.world].glow}, ${0.15 + pulse * 0.25})`;
      ctx.fillRect(-10, -12, 20, 20);
      ctx.fillStyle = '#ece3d6';
      ctx.fillRect(-6, -8, 12, 14);
      ctx.fillStyle = '#6d5a80';
      ctx.fillRect(-4, -5, 8, 1);
      ctx.fillRect(-4, -2, 8, 1);
      ctx.fillRect(-4, 1, 6, 1);
      ctx.restore();
      return;
    }
    if (it.id === 'switch') {
      ctx.fillStyle = `rgba(0,229,255,${0.2 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(it.x, it.y, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a46cff';
      ctx.stroke();
    }
  }

  /** Pieza central reconocible de cada sala. */
  private drawCenterpiece(r: number, rx: number): void {
    const ctx = this.ctx;
    const t = this.t;
    const key = `${this.world}:${r}`;
    ctx.save();
    switch (key) {
      case 'real:0':
      case 'inverted:0': {
        // Panel de bombillas del cuarto de comunicaciones
        ctx.fillStyle = '#231b2c';
        ctx.fillRect(rx + 380, 60, 120, 40);
        for (let i = 0; i < 8; i++) {
          const on = Math.sin(t * 4 + i * 1.7) > 0.3;
          ctx.fillStyle = on ? (this.world === 'real' ? '#ffd978' : '#00e5ff') : '#3a3046';
          ctx.beginPath();
          ctx.arc(rx + 394 + i * 13, 80 + (this.world === 'inverted' ? Math.sin(t + i) * 3 : 0), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'real:1': {
        // Cinta transportadora con piezas
        ctx.fillStyle = '#2b2533';
        ctx.fillRect(rx + 160, 280, 320, 22);
        ctx.fillStyle = '#4a515c';
        for (let x = 0; x < 320; x += 16) ctx.fillRect(rx + 160 + ((x + t * 30) % 320), 282, 2, 18);
        const colors = ['#e05252', '#e0b23c', '#00e5ff', '#4cc47a'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = colors[i];
          ctx.fillRect(rx + 170 + ((i * 80 + t * 30) % 300), 286, 8, 8);
        }
        break;
      }
      case 'real:2': {
        // Robot guardián
        ctx.fillStyle = '#4a515c';
        ctx.fillRect(rx + 520, 200, 26, 34);
        ctx.fillStyle = '#2c3340';
        ctx.fillRect(rx + 524, 186, 18, 14);
        ctx.fillStyle = Math.sin(t * 2) > 0 ? '#00e5ff' : '#e05252';
        ctx.fillRect(rx + 528, 190, 10, 4);
        break;
      }
      case 'real:3': {
        // Tarjetas en un mapa de significado
        ctx.fillStyle = 'rgba(0,229,255,0.12)';
        ctx.fillRect(rx + 380, 230, 140, 90);
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = '#ece3d6';
          ctx.fillRect(rx + 390 + ((i * 47) % 120), 240 + ((i * 31) % 70), 8, 6);
        }
        break;
      }
      case 'real:4': {
        // Brazo robótico
        const a = Math.sin(t * 1.5) * 0.6;
        ctx.translate(rx + 500, 260);
        ctx.fillStyle = '#4a515c';
        ctx.fillRect(-10, 0, 20, 12);
        ctx.rotate(-1.2 + a);
        ctx.fillStyle = '#f7931a';
        ctx.fillRect(0, -3, 40, 6);
        ctx.translate(40, 0);
        ctx.rotate(0.9 - a);
        ctx.fillRect(0, -2, 26, 4);
        break;
      }
      case 'real:5': {
        // Cámara del agente: rejilla y hospital
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#262030' : '#1b1622';
          ctx.fillRect(rx + 380 + i * 18, 250 + j * 18, 18, 18);
        }
        ctx.fillStyle = '#e05252';
        ctx.fillRect(rx + 452, 268, 18, 18);
        ctx.fillStyle = '#fff';
        ctx.fillRect(rx + 459, 271, 4, 12);
        ctx.fillRect(rx + 455, 275, 12, 4);
        ctx.fillStyle = '#7ef59b';
        ctx.fillRect(rx + 385 + ((t * 20) % 90), 255, 8, 8);
        break;
      }
      case 'inverted:1': {
        // Portal de la puerta de transición
        ctx.strokeStyle = `rgba(0,229,255,${0.5 + Math.sin(t * 3) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx + 500, 250, 26 + Math.sin(t * 2) * 3, 44, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(164,108,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(rx + 500, 250, 16, 34 + Math.cos(t * 2) * 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'inverted:2': {
        // Tablas flotantes de datos
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = 'rgba(236,227,214,0.8)';
          const y = 230 + i * 18 + Math.sin(t + i) * 4;
          ctx.fillRect(rx + 400, y, 90, 10);
          ctx.fillStyle = i === 2 ? '#e05252' : '#6d5a80';
          ctx.fillRect(rx + 404, y + 3, 30, 4);
        }
        break;
      }
      case 'inverted:3': {
        // Señal de STOP flotante
        ctx.translate(rx + 480, 250 + Math.sin(t) * 6);
        ctx.fillStyle = Math.sin(t * 7) > 0.85 ? '#00e5ff' : '#e05252';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i + Math.PI / 8;
          ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        }
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -2, 20, 4);
        break;
      }
      case 'inverted:4': {
        // Palabras flotantes
        ctx.font = '8px monospace';
        ['apaga', 'el', 'generador', 'banco', 'llave', 'roja'].forEach((word, i) => {
          ctx.fillStyle = `rgba(0,229,255,${0.4 + Math.sin(t + i) * 0.3})`;
          ctx.fillText(word, rx + 380 + (i % 3) * 50, 240 + Math.floor(i / 3) * 30 + Math.sin(t * 1.3 + i) * 5);
        });
        break;
      }
      case 'inverted:5': {
        // Puerta que escucha
        ctx.fillStyle = '#2a2150';
        ctx.fillRect(rx + 470, 210, 50, 80);
        ctx.fillStyle = '#00e5ff';
        for (let i = 0; i < 5; i++) ctx.fillRect(rx + 480 + i * 7, 250 - Math.abs(Math.sin(t * 4 + i)) * 14, 4, Math.abs(Math.sin(t * 4 + i)) * 28 + 2);
        break;
      }
      case 'inverted:6': {
        // Núcleo de Genesis dividido
        const g = ctx.createRadialGradient(rx + 480, 250, 4, rx + 480, 250, 46);
        g.addColorStop(0, 'rgba(0,229,255,0.9)');
        g.addColorStop(1, 'rgba(164,108,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(rx + 480, 250, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ece3d6';
        ctx.fillRect(rx + 476 + Math.sin(t * 3) * 3, 240, 4, 20);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  private drawLighting(cx: number): void {
    const l = this.lctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const th = THEMES[this.world];
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    l.fillStyle = th.dark;
    l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-out';

    let radius = 92;
    let alpha = 1;
    if (this.introOn) {
      if (this.introT < 1.2) { radius = 0; alpha = 0; }
      else if (this.introT < 1.6) { radius = 40; alpha = 0.4; }
      else if (this.introT < 2.0) { radius = Math.sin(this.introT * 30) > 0 ? 60 : 0; alpha = 0.7; }
    }
    const px = Math.round(this.player.x - cx + 8);
    const py = Math.round(this.player.y + 9);
    const hole = (x: number, y: number, r: number, a: number): void => {
      if (r <= 0) return;
      const g = l.createRadialGradient(x, y, 6, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.beginPath();
      l.arc(x, y, r, 0, Math.PI * 2);
      l.fill();
    };
    hole(px, py, radius, alpha);
    const tx = this.room * ROOM_W + 310 - cx;
    hole(tx, 64, 70, 0.95);
    for (const it of this.hooks.interactables(this.room)) if (!it.id.startsWith('main')) hole(it.x - cx, it.y, 40, 0.7);
    // Pieza central de la sala siempre un poco visible
    hole(this.room * ROOM_W + 480 - cx, 255, 90, 0.55);
    const alarmOn = Math.sin(this.t * Math.PI * 4) > 0;
    const ax = this.room * ROOM_W + 236 - cx;
    if (alarmOn) hole(ax, 20, 54, 0.85);
    this.ctx.drawImage(this.light, 0, 0);

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, r: number, rgb: string, a: number): void => {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    glow(tx, 64, 58, this.world === 'real' ? '76,196,122' : '0,229,255', 0.25);
    if (alpha > 0) glow(px, py, 40, th.glow, 0.14 * alpha);
    if (alarmOn) glow(ax, 20, 48, '255,23,68', 0.25);
    ctx.restore();
  }

  private drawOverlayFx(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    // Viñeta
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.44, w / 2, h / 2, w * 0.64);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Interferencias del Alucinador
    const strength = this.world === 'inverted' ? 0.03 : 0.008;
    if (this.glitch > 0 || Math.random() < strength) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,23,68,0.16)' : 'rgba(0,229,255,0.14)';
        ctx.fillRect(0, Math.floor(Math.random() * h), w, 2 + Math.floor(Math.random() * 6));
      }
    }
    if (this.world === 'inverted') {
      ctx.fillStyle = 'rgba(164,108,255,0.05)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawIntro(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const bar = this.introT > 6.5 ? Math.round(36 * (1 - clamp((this.introT - 6.5), 0, 1))) : 36;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, bar);
    ctx.fillRect(0, h - bar, w, bar);
    const lines = this.hooks.intro;
    const idx = Math.min(lines.length - 1, Math.floor(this.introT / 2.4));
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = idx === 0 ? '#f7931a' : '#00e5ff';
    ctx.fillText(lines[idx], w / 2, h - bar / 2 + 3);
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6d5a80';
    ctx.fillText('[ESPACIO / CLICK para saltar]', w - 16, bar - 12);
    if (this.introT < 1.2) {
      ctx.fillStyle = `rgba(0,0,0,${1 - this.introT / 1.2})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
