import type { CanvasGameEvents, Facing, Player, Rect, RoomMap } from './types';
import {
  drawKiroSprite,
  drawServerRack,
  drawComputerTerminal,
  drawInteractionPrompt,
  drawHazardTape,
  drawSupplyCrate,
  drawFloorCable,
  drawHologramEntity,
} from './sprites';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

interface Mote {
  x: number;
  y: number;
  speed: number;
  radius: number;
  alpha: number;
  phase: number;
}

export const ROOM_WIDTH = 640;
export const ROOM_HEIGHT = 360;

/**
 * Motor Canvas mejorado con iluminación dinámica, partículas,
 * escenografía temática de IA y sprites procedimentales.
 */
export class CanvasGame {
  readonly player: Player;
  paused = false;

  private readonly context: CanvasRenderingContext2D;
  private readonly lightCanvas: HTMLCanvasElement;
  private readonly lightContext: CanvasRenderingContext2D;
  private readonly pressed = new Set<string>();
  private readonly motes: Mote[] = [];

  private lastTimestamp = 0;
  private animationFrame = 0;
  private cameraX = 0;
  private cameraY = 0;
  private currentRoom = 1;
  private walkDistance = 0;
  private timeSeconds = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: RoomMap,
    private readonly events: CanvasGameEvents = {},
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el contexto 2D del Canvas.');
    this.context = context;
    this.context.imageSmoothingEnabled = false;

    // Canvas auxiliar para la máscara de iluminación
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = canvas.width;
    this.lightCanvas.height = canvas.height;
    const lctx = this.lightCanvas.getContext('2d');
    if (!lctx) throw new Error('No se pudo crear el buffer de iluminación.');
    this.lightContext = lctx;

    this.player = {
      x: 120,
      y: 180,
      width: 14,
      height: 18,
      speed: 84,
      facing: 'down',
      moving: false,
    };

    this.initMotes(36);
    this.bindInput();
  }

  private initMotes(count: number): void {
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 8 + Math.random() * 14,
        radius: 1 + Math.random() * 1.5,
        alpha: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  start(): void {
    this.animationFrame = requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrame);
    this.pressed.clear();
  }

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

  /** Devuelve las coordenadas de la terminal principal de una sala. */
  getTerminalPosition(roomId: number): { x: number; y: number } {
    const startX = (roomId - 1) * ROOM_WIDTH;
    return { x: startX + 304, y: 52 };
  }

  /** Comprueba si el jugador está en rango de interacción con la terminal. */
  isNearTerminal(): boolean {
    const term = this.getTerminalPosition(this.currentRoom);
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const distSq = (px - (term.x + 14)) ** 2 + (py - (term.y + 16)) ** 2;
    return distSq < 72 * 72;
  }

  private bindInput(): void {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        event.preventDefault();
        this.pressed.add(event.key.toLowerCase());
      }
      if (event.key.toLowerCase() === 'e' && !event.repeat && !this.paused) {
        this.events.onInteract?.();
      }
    });
    window.addEventListener('keyup', (event) => this.pressed.delete(event.key.toLowerCase()));
  }

  private frame(timestamp: number): void {
    const delta = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0);
    this.lastTimestamp = timestamp;
    this.timeSeconds += delta;

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

    const newFacing: Facing = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    this.player.facing = newFacing;

    const distance = this.player.speed * delta;
    this.walkDistance += distance;

    this.tryMove(dx * distance, 0);
    this.tryMove(0, dy * distance);

    const nextRoom = Math.min(10, Math.floor(this.player.x / ROOM_WIDTH) + 1);
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
    if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.width > this.map.width || candidate.y + candidate.height > this.map.height) {
      return;
    }
    if (this.map.solids.some((solid) => this.overlaps(candidate, solid))) return;
    this.player.x = candidate.x;
    this.player.y = candidate.y;
  }

  private overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private draw(): void {
    const { width, height } = this.canvas;
    const targetRoomX = (this.currentRoom - 1) * ROOM_WIDTH;

    // Suave seguimiento de cámara centrada en la sala actual y personaje
    const targetCamX = clamp(this.player.x - width / 2, targetRoomX, targetRoomX + ROOM_WIDTH - width);
    const targetCamY = clamp(this.player.y - height / 2, 0, Math.max(0, this.map.height - height));

    this.cameraX += (targetCamX - this.cameraX) * 0.15;
    this.cameraY += (targetCamY - this.cameraY) * 0.15;

    const cx = Math.floor(this.cameraX);
    const cy = Math.floor(this.cameraY);

    // 1. Limpieza base del mundo
    this.context.fillStyle = '#09070d';
    this.context.fillRect(0, 0, width, height);

    this.context.save();
    this.context.translate(-cx, -cy);

    // 2. Renderizado de las salas visibles
    const startRoom = Math.max(1, Math.floor(cx / ROOM_WIDTH) + 1);
    const endRoom = Math.min(10, Math.floor((cx + width) / ROOM_WIDTH) + 1);

    for (let r = startRoom; r <= endRoom; r++) {
      this.drawRoomScenery(r);
    }

    // 3. Renderizado del jugador
    const step = Math.floor(this.walkDistance / 14) % 2;
    drawKiroSprite(this.context, this.player.x, this.player.y, this.player.facing, step, this.player.moving);

    // 4. Indicador interactivo flotante [ E ] si está cerca de la terminal
    if (this.isNearTerminal()) {
      const term = this.getTerminalPosition(this.currentRoom);
      drawInteractionPrompt(this.context, term.x + 8, term.y - 18, this.timeSeconds);
    }

    this.context.restore();

    // 5. Capa de Iluminación Dinámica
    this.drawDynamicLighting(cx, cy);

    // 6. Partículas atmosféricas de polvo / datos
    this.drawAtmosphericMotes();

    // 7. Viñeta perimetral de lente
    this.drawVignette();
  }

  /** Dibuja la escenografía completa y tematizada de una sala. */
  private drawRoomScenery(room: number): void {
    const ctx = this.context;
    const rx = (room - 1) * ROOM_WIDTH;
    const ry = 0;

    // Suelo temático según la especialidad de IA de la sala
    this.drawRoomFloor(ctx, rx, ry, room);

    // Muro superior
    ctx.fillStyle = '#1b1626';
    ctx.fillRect(rx, 0, ROOM_WIDTH, 42);
    ctx.fillStyle = '#2b233a';
    ctx.fillRect(rx, 41, ROOM_WIDTH, 2);

    // Muro inferior
    ctx.fillStyle = '#1b1626';
    ctx.fillRect(rx, ROOM_HEIGHT - 32, ROOM_WIDTH, 32);
    ctx.fillStyle = '#2b233a';
    ctx.fillRect(rx, ROOM_HEIGHT - 32, ROOM_WIDTH, 2);

    // Muros divisorios laterales y compuertas
    if (room > 1) {
      // Muro izquierdo
      ctx.fillStyle = '#241e33';
      ctx.fillRect(rx, 0, 16, 120);
      ctx.fillRect(rx, 240, 16, 120);
      // Marco de compuerta
      ctx.fillStyle = '#403754';
      ctx.fillRect(rx, 118, 16, 4);
      ctx.fillRect(rx, 238, 16, 4);
    }

    if (room < 10) {
      // Muro derecho
      ctx.fillStyle = '#241e33';
      ctx.fillRect(rx + ROOM_WIDTH - 16, 0, 16, 120);
      ctx.fillRect(rx + ROOM_WIDTH - 16, 240, 16, 120);
      // Marco de compuerta
      ctx.fillStyle = '#403754';
      ctx.fillRect(rx + ROOM_WIDTH - 16, 118, 16, 4);
      ctx.fillRect(rx + ROOM_WIDTH - 16, 238, 16, 4);

      // Cinta de advertencia sobre la puerta de salida
      drawHazardTape(ctx, rx + ROOM_WIDTH - 24, 112, 24, 6);
    }

    // Identificador de sala en la pared superior
    ctx.fillStyle = '#65577a';
    ctx.font = '10px monospace';
    ctx.fillText(`GENESIS // SECTOR ${String(room).padStart(2, '0')}`, rx + 24, 26);

    // Props temáticos de la sala
    this.drawRoomProps(ctx, rx, room);
  }

  /** Dibuja el suelo estilizado de cada sala según su tipo de IA. */
  private drawRoomFloor(ctx: CanvasRenderingContext2D, rx: number, ry: number, room: number): void {
    // Base de suelo según sector
    if (room === 3) {
      // Sala 3: Laboratorio Congelado (azulado con escarcha)
      ctx.fillStyle = '#182430';
      ctx.fillRect(rx, 42, ROOM_WIDTH, ROOM_HEIGHT - 74);
      // Placas de hielo reflectantes
      ctx.fillStyle = 'rgba(76, 196, 222, 0.18)';
      ctx.fillRect(rx + 80, 100, 160, 90);
      ctx.fillRect(rx + 360, 170, 180, 80);
    } else if (room === 2) {
      // Sala 2: Archivo de datos (madera técnica)
      ctx.fillStyle = '#211822';
      ctx.fillRect(rx, 42, ROOM_WIDTH, ROOM_HEIGHT - 74);
      // Parquet técnico
      ctx.strokeStyle = '#2f2330';
      ctx.lineWidth = 1;
      for (let tx = rx; tx < rx + ROOM_WIDTH; tx += 28) {
        ctx.beginPath();
        ctx.moveTo(tx, 42);
        ctx.lineTo(tx, ROOM_HEIGHT - 32);
        ctx.stroke();
      }
    } else if (room === 10) {
      // Sala 10: Núcleo de Genesis (pistas de circuitos doradas/cian)
      ctx.fillStyle = '#100c19';
      ctx.fillRect(rx, 42, ROOM_WIDTH, ROOM_HEIGHT - 74);
      // Anillos de circuito concéntricos hacia el núcleo
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx + 320, 180, 80, 0, Math.PI * 2);
      ctx.arc(rx + 320, 180, 140, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Suelo técnico de Centro de Datos (Data Center Grid con remaches)
      ctx.fillStyle = '#15111c';
      ctx.fillRect(rx, 42, ROOM_WIDTH, ROOM_HEIGHT - 74);

      ctx.strokeStyle = '#231d2e';
      ctx.lineWidth = 1;
      for (let x = rx + 16; x < rx + ROOM_WIDTH - 16; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 42);
        ctx.lineTo(x, ROOM_HEIGHT - 32);
        ctx.stroke();
      }
      for (let y = 48; y < ROOM_HEIGHT - 32; y += 32) {
        ctx.beginPath();
        ctx.moveTo(rx + 16, y);
        ctx.lineTo(rx + ROOM_WIDTH - 16, y);
        ctx.stroke();
      }

      // Remaches en esquinas
      ctx.fillStyle = '#2f273d';
      for (let x = rx + 16; x < rx + ROOM_WIDTH - 16; x += 32) {
        for (let y = 48; y < ROOM_HEIGHT - 32; y += 32) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }

    // Grietas y desgaste del suelo
    ctx.strokeStyle = 'rgba(10, 8, 14, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + 160, 260);
    ctx.lineTo(rx + 175, 270);
    ctx.lineTo(rx + 195, 266);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx + 440, 120);
    ctx.lineTo(rx + 455, 132);
    ctx.lineTo(rx + 470, 128);
    ctx.stroke();
  }

  /** Dibuja los objetos y maquinaria de cada sala según su narrativa. */
  private drawRoomProps(ctx: CanvasRenderingContext2D, rx: number, room: number): void {
    const t = this.timeSeconds;

    // Racks de servidores superiores (izquierda y derecha)
    drawServerRack(ctx, rx + 40, 44, 28, 44, t, room * 11);
    drawServerRack(ctx, rx + 72, 44, 28, 44, t, room * 13);
    drawServerRack(ctx, rx + 104, 44, 28, 44, t, room * 17);

    drawServerRack(ctx, rx + 480, 44, 28, 44, t, room * 19);
    drawServerRack(ctx, rx + 512, 44, 28, 44, t, room * 23);
    drawServerRack(ctx, rx + 544, 44, 28, 44, t, room * 29);

    // Terminal de computación activa de la sala
    const termPos = this.getTerminalPosition(room);
    const solved = this.events.isRoomSolved?.(room) ?? false;
    drawComputerTerminal(ctx, termPos.x, termPos.y, !solved || true, t);

    // Cajas de suministros y módulos de hardware
    drawSupplyCrate(ctx, rx + 50, 250, 22);
    drawSupplyCrate(ctx, rx + 74, 258, 18);
    drawSupplyCrate(ctx, rx + 530, 240, 24);

    // Cables de alto voltaje en el suelo con chispas
    const spark = Math.sin(t * 7 + room) > 0.94;
    drawFloorCable(ctx, rx + 132, 86, rx + 220, 130, spark);
    drawFloorCable(ctx, rx + 480, 86, rx + 400, 140, false);

    // Proyecciones holográficas según la narrativa
    if (room === 1) {
      // Proyección inicial de Lía comunicándose
      drawHologramEntity(ctx, rx + 240, 60, 'lia', t);
    } else if (room === 6 || room === 9) {
      // El Alucinador interviniendo los sistemas
      drawHologramEntity(ctx, rx + 430, 160, 'alucinador', t);
    } else if (room === 10) {
      // Sala 10: Enfrentamiento dual Lía vs El Alucinador
      drawHologramEntity(ctx, rx + 240, 150, 'lia', t);
      drawHologramEntity(ctx, rx + 380, 150, 'alucinador', t);
    }
  }

  /** Dibuja la iluminación dinámica con linterna, luces de terminal y resplandor. */
  private drawDynamicLighting(cx: number, cy: number): void {
    const lctx = this.lightContext;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Limpiar buffer con oscuridad ambiental profunda
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgba(7, 5, 11, 0.91)';
    lctx.fillRect(0, 0, w, h);

    // 2. Recortar huecos de luz con 'destination-out'
    lctx.globalCompositeOperation = 'destination-out';

    // Luz de la linterna de Kiro
    const px = Math.round(this.player.x - cx + this.player.width / 2);
    const py = Math.round(this.player.y - cy + this.player.height / 2);
    const flashGrad = lctx.createRadialGradient(px, py, 14, px, py, 88);
    flashGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    flashGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
    flashGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.25)');
    flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lctx.fillStyle = flashGrad;
    lctx.beginPath();
    lctx.arc(px, py, 88, 0, Math.PI * 2);
    lctx.fill();

    // Luz de la terminal CRT verde de la sala
    const term = this.getTerminalPosition(this.currentRoom);
    const tx = Math.round(term.x - cx + 14);
    const ty = Math.round(term.y - cy + 12);
    const termGrad = lctx.createRadialGradient(tx, ty, 8, tx, ty, 75);
    termGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    termGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
    termGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lctx.fillStyle = termGrad;
    lctx.beginPath();
    lctx.arc(tx, ty, 75, 0, Math.PI * 2);
    lctx.fill();

    // Luces de los hologramas (si están presentes)
    if (this.currentRoom === 1 || this.currentRoom === 10) {
      const hx = Math.round((this.currentRoom - 1) * ROOM_WIDTH + 252 - cx);
      const hy = Math.round(72 - cy);
      const holoGrad = lctx.createRadialGradient(hx, hy, 4, hx, hy, 55);
      holoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      holoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lctx.fillStyle = holoGrad;
      lctx.beginPath();
      lctx.arc(hx, hy, 55, 0, Math.PI * 2);
      lctx.fill();
    }

    // 3. Dibujar la capa de sombras sobre el canvas principal
    this.context.drawImage(this.lightCanvas, 0, 0);

    // 4. Agregar tinte de color brillante en modo 'lighter'
    this.context.save();
    this.context.globalCompositeOperation = 'lighter';

    // Halo verde de la terminal
    const glowGrad = this.context.createRadialGradient(tx, ty, 2, tx, ty, 60);
    glowGrad.addColorStop(0, 'rgba(76, 196, 122, 0.28)');
    glowGrad.addColorStop(0.6, 'rgba(76, 196, 122, 0.1)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.context.fillStyle = glowGrad;
    this.context.beginPath();
    this.context.arc(tx, ty, 60, 0, Math.PI * 2);
    this.context.fill();

    // Halo cálido naranja de Kiro
    const kiroGlow = this.context.createRadialGradient(px, py, 2, px, py, 40);
    kiroGlow.addColorStop(0, 'rgba(247, 147, 26, 0.18)');
    kiroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.context.fillStyle = kiroGlow;
    this.context.beginPath();
    this.context.arc(px, py, 40, 0, Math.PI * 2);
    this.context.fill();

    this.context.restore();
  }

  /** Partículas atmosféricas de polvo / datos que flotan suavemente. */
  private drawAtmosphericMotes(): void {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    for (const m of this.motes) {
      m.y += m.speed * 0.02;
      m.x += Math.sin(this.timeSeconds + m.phase) * 0.2;
      if (m.y > h) m.y = 0;
      if (m.x > w) m.x = 0;
      if (m.x < 0) m.x = w;

      ctx.fillStyle = `rgba(240, 225, 200, ${m.alpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Viñeta perimetral cinematográfica de lente en los bordes. */
  private drawVignette(): void {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.65);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
