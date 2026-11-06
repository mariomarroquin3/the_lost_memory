import type { CanvasGameEvents, Facing, Player, Rect, RoomMap } from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/**
 * Motor Canvas base inspirado en el loop y la colisión de Proyecto-21.
 * La interacción se delega a HTML: al pausar no se actualiza la física.
 */
export class CanvasGame {
  readonly player: Player;
  paused = false;

  private readonly context: CanvasRenderingContext2D;
  private readonly pressed = new Set<string>();
  private lastTimestamp = 0;
  private animationFrame = 0;
  private cameraX = 0;
  private cameraY = 0;
  private currentRoom = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: RoomMap,
    private readonly events: CanvasGameEvents = {},
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el contexto 2D del Canvas.');
    this.context = context;
    this.context.imageSmoothingEnabled = false;
    this.player = {
      x: 48,
      y: 48,
      width: 12,
      height: 12,
      speed: 72,
      facing: 'down',
      moving: false,
    };
    this.bindInput();
  }

  start(): void {
    this.animationFrame = requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrame);
    this.pressed.clear();
  }

  /** Pausa física y movimiento mientras un panel HTML está abierto. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.player.moving = false;
  }

  pressKey(key: string): void {
    this.pressed.add(key.toLowerCase());
  }

  releaseKey(key: string): void {
    this.pressed.delete(key.toLowerCase());
  }

  interact(): void {
    if (!this.paused) this.events.onInteract?.();
  }

  private bindInput(): void {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        event.preventDefault();
        this.pressed.add(event.key.toLowerCase());
      }
      if (event.key.toLowerCase() === 'e' && !event.repeat && !this.paused) this.events.onInteract?.();
    });
    window.addEventListener('keyup', (event) => this.pressed.delete(event.key.toLowerCase()));
  }

  private frame(timestamp: number): void {
    const delta = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0);
    this.lastTimestamp = timestamp;
    if (!this.paused) this.update(delta);
    this.draw();
    this.animationFrame = requestAnimationFrame((next) => this.frame(next));
  }

  private update(delta: number): void {
    let dx = 0;
    let dy = 0;
    if (this.pressed.has('arrowleft') || this.pressed.has('a')) dx -= 1;
    if (this.pressed.has('arrowright') || this.pressed.has('d')) dx += 1;
    if (this.pressed.has('arrowup') || this.pressed.has('w')) dy -= 1;
    if (this.pressed.has('arrowdown') || this.pressed.has('s')) dy += 1;

    this.player.moving = dx !== 0 || dy !== 0;
    if (!this.player.moving) return;
    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    this.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const distance = this.player.speed * delta;
    this.tryMove(dx * distance, 0);
    this.tryMove(0, dy * distance);

    const nextRoom = Math.min(10, Math.floor((this.player.x / this.map.width) * 10) + 1);
    if (nextRoom !== this.currentRoom) {
      this.currentRoom = nextRoom;
      this.events.onRoomChanged?.(nextRoom);
    }
  }

  private tryMove(dx: number, dy: number): void {
    const candidate: Rect = {
      x: this.player.x + dx,
      y: this.player.y + dy,
      width: this.player.width,
      height: this.player.height,
    };
    if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.width > this.map.width || candidate.y + candidate.height > this.map.height) return;
    if (this.map.solids.some((solid) => this.overlaps(candidate, solid))) return;
    this.player.x = candidate.x;
    this.player.y = candidate.y;
  }

  private overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private draw(): void {
    const { width, height } = this.canvas;
    const viewWidth = Math.min(width, this.map.width);
    const viewHeight = Math.min(height, this.map.height);
    this.cameraX = clamp(this.player.x - viewWidth / 2, 0, Math.max(0, this.map.width - viewWidth));
    this.cameraY = clamp(this.player.y - viewHeight / 2, 0, Math.max(0, this.map.height - viewHeight));
    this.context.fillStyle = '#0b0910';
    this.context.fillRect(0, 0, width, height);
    this.context.save();
    this.context.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));
    this.context.fillStyle = '#24222b';
    this.context.fillRect(0, 0, this.map.width, this.map.height);
    const roomWidth = this.map.width / 10;
    for (let room = 0; room < 10; room += 1) {
      this.context.fillStyle = room % 3 === 0 ? '#1b1622' : room % 3 === 1 ? '#202733' : '#16121d';
      this.context.fillRect(room * roomWidth + 16, 16, roomWidth - 16, this.map.height - 32);
    }
    this.context.strokeStyle = 'rgba(14, 11, 19, .55)';
    this.context.lineWidth = 2;
    for (let x = 16; x < this.map.width - 16; x += 32) {
      this.context.beginPath();
      this.context.moveTo(x, 16);
      this.context.lineTo(x, this.map.height - 16);
      this.context.stroke();
    }
    for (let y = 16; y < this.map.height - 16; y += 32) {
      this.context.beginPath();
      this.context.moveTo(16, y);
      this.context.lineTo(this.map.width - 16, y);
      this.context.stroke();
    }
    this.context.strokeStyle = '#f7931a';
    this.context.globalAlpha = 0.45;
    this.context.setLineDash([6, 6]);
    this.context.beginPath();
    for (let room = 1; room < 10; room += 1) {
      this.context.moveTo(room * roomWidth, 16);
      this.context.lineTo(room * roomWidth, this.map.height - 16);
    }
    this.context.stroke();
    this.context.setLineDash([]);
    this.context.globalAlpha = 1;
    this.context.fillStyle = '#9d93a9';
    this.context.font = '12px monospace';
    for (let room = 0; room < 10; room += 1) this.context.fillText(`SALA ${room + 1}`, room * roomWidth + 24, 34);
    this.context.fillStyle = '#4a515c';
    for (const solid of this.map.solids) this.context.fillRect(solid.x, solid.y, solid.width, solid.height);
    this.drawKiro();
    this.context.restore();
  }

  private drawKiro(): void {
    const g = this.context;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    g.fillStyle = '#1a1420';
    g.fillRect(x + 2, y, 8, 3);
    g.fillStyle = '#2b2233';
    g.fillRect(x + 3, y + 2, 6, 3);
    g.fillStyle = '#f2c9a0';
    g.fillRect(x + 3, y + 5, 6, 3);
    g.fillStyle = '#f7931a';
    g.fillRect(x + 1, y + 8, 10, 5);
    g.fillStyle = '#3b5a9a';
    g.fillRect(x + 3, y + 13, 6, 3);
  }
}
