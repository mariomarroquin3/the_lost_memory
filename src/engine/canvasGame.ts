import type { CanvasGameEvents, Facing, Player, Rect, RoomMap } from './types';
import { MAP_HEIGHT, MAP_WIDTH, ROOM_HEIGHT, ROOM_WIDTH, roomAtPosition, roomOrigin } from './roomLayout';
import {
  drawKiroSprite,
  drawKiroWakingUpSprite,
  drawMemoryPrism,
  drawHologramColumn,
  drawFiberNode,
  drawContainmentPod,
  drawSignalShard,
  drawPuddle,
  drawBrokenGlass,
  drawEmergencyLight,
  drawServerRack,
  drawComputerTerminal,
  drawInteractionPrompt,
  drawFloorCable,
  drawWallCracks,
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

export { ROOM_WIDTH, ROOM_HEIGHT } from './roomLayout';

/**
 * Motor Canvas de Proyecto 21 / Genesis 2097 con Modo Película / Cinemática de Inicio.
 * Rejilla de 16px, perspectiva 3/4, iluminación volumétrica, parpadeo de linterna,
 * alarma de 2 Hz, calcomanías de daño, props de laboratorio y franjas cinemáticas.
 */
export class CanvasGame {
  readonly player: Player;
  paused = false;

  // Estado cinemático del inicio (Movie Mode)
  introActive = true;
  introElapsed = 0;

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

    // Buffer de máscara de iluminación
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = canvas.width;
    this.lightCanvas.height = canvas.height;
    const lctx = this.lightCanvas.getContext('2d');
    if (!lctx) throw new Error('No se pudo crear el buffer de iluminación.');
    this.lightContext = lctx;

    this.player = {
      x: 312,
      y: 200,
      width: 16,
      height: 18,
      speed: 76,
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
        speed: 6 + Math.random() * 12,
        radius: 1 + Math.random() * 1.4,
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
    if (this.introActive && (key === ' ' || key === 'enter' || key === 'escape')) {
      this.skipIntro();
      return;
    }
    this.pressed.add(key.toLowerCase());
  }

  releaseKey(key: string): void {
    this.pressed.delete(key.toLowerCase());
  }

  interact(): void {
    if (this.introActive) {
      this.skipIntro();
      return;
    }
    if (!this.paused) this.events.onInteract?.();
  }

  /** Salta o acelera la cinemática de inicio. */
  skipIntro(): void {
    if (this.introActive) {
      this.introElapsed = 8.5;
      this.introActive = false;
      this.setPaused(false);
      this.events.onRoomChanged?.(this.currentRoom);
    }
  }

  /** Devuelve la ubicación de la terminal de cada sala. */
  getTerminalPosition(roomId: number): { x: number; y: number } {
    const origin = roomOrigin(roomId);
    return { x: origin.x + 296, y: origin.y + 52 };
  }

  /** Comprueba si el jugador está junto a la terminal. */
  isNearTerminal(): boolean {
    if (this.introActive) return false;
    const term = this.getTerminalPosition(this.currentRoom);
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    const distSq = (px - (term.x + 14)) ** 2 + (py - (term.y + 16)) ** 2;
    return distSq < 74 * 74;
  }

  private bindInput(): void {
    window.addEventListener('keydown', (event) => {
      if (this.introActive && (event.key === ' ' || event.key === 'Enter' || event.key === 'Escape')) {
        event.preventDefault();
        this.skipIntro();
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        event.preventDefault();
        this.pressed.add(event.key.toLowerCase());
      }
      if (event.key.toLowerCase() === 'e' && !event.repeat && !this.paused) {
        this.events.onInteract?.();
      }
    });
    window.addEventListener('keyup', (event) => this.pressed.delete(event.key.toLowerCase()));
    this.canvas.addEventListener('pointerdown', () => {
      if (this.introActive) this.skipIntro();
    });
  }

  private frame(timestamp: number): void {
    const delta = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0);
    this.lastTimestamp = timestamp;
    this.timeSeconds += delta;

    // Actualizar cinemática de inicio
    if (this.introActive) {
      this.introElapsed += delta;
      if (this.introElapsed >= 8.2) {
        this.introActive = false;
        this.events.onRoomChanged?.(this.currentRoom);
      }
    }

    if (!this.paused && !this.introActive) {
      this.update(delta);
    }
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

    const nextRoom = roomAtPosition(this.player.x, this.player.y);
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
    const targetRoom = roomOrigin(this.currentRoom);

    // Cámara suavemente enmarcada en la sala actual
    const targetCamX = clamp(this.player.x - width / 2, targetRoom.x, targetRoom.x + ROOM_WIDTH - width);
    const targetCamY = clamp(this.player.y - height / 2, targetRoom.y, targetRoom.y + ROOM_HEIGHT - height);

    this.cameraX += (targetCamX - this.cameraX) * 0.18;
    this.cameraY += (targetCamY - this.cameraY) * 0.18;

    const cx = Math.floor(this.cameraX);
    const cy = Math.floor(this.cameraY);

    // 1. Fondo vacío exterior
    this.context.fillStyle = '#0b0910';
    this.context.fillRect(0, 0, width, height);

    this.context.save();
    this.context.translate(-cx, -cy);

    // 2. Renderizar salas visibles
    for (let r = 1; r <= 10; r++) this.drawRoom(r);

    // 3. Renderizar al protagonista (Kiro)
    if (this.introActive && this.introElapsed < 4.0) {
      // Animación de despertar en el suelo
      const wakeProgress = clamp((this.introElapsed - 1.5) / 2.2, 0, 1);
      drawKiroWakingUpSprite(this.context, this.player.x, this.player.y, wakeProgress);
    } else {
      const step = Math.floor(this.walkDistance / 14) % 2;
      drawKiroSprite(this.context, this.player.x, this.player.y, this.player.facing, step, this.player.moving);
    }

    // 4. Indicador interactivo flotante [ E ] sobre la terminal activa
    if (this.isNearTerminal()) {
      const term = this.getTerminalPosition(this.currentRoom);
      drawInteractionPrompt(this.context, term.x + 8, term.y - 18, this.timeSeconds);
    }

    this.context.restore();

    // 5. Capa de sombras y linterna dinámica (con parpadeo al inicio)
    this.drawLighting(cx, cy);

    // 6. Polvo flotante con paralaje
    this.drawMotes();

    // 7. Viñeta perimetral de lente
    this.drawVignette();

    // 8. Modo Película: Franjas negras de cine y subtítulos de inicio
    if (this.introActive || this.introElapsed < 8.5) {
      this.drawMovieModeLetterbox();
    }
  }

  /** Renderiza una sala completa según movie_mode_SKILL.md (Sala 1: Estación de seguridad). */
  private drawRoom(room: number): void {
    const ctx = this.context;
    const origin = roomOrigin(room);
    const rx = origin.x;
    const ry = origin.y;
    const t = this.timeSeconds;
    ctx.save();
    ctx.translate(0, ry);

    // A. SUELO TÉCNICO (Grid de centro de datos con remaches de 32px)
    ctx.fillStyle = '#1e1c25';
    ctx.fillRect(rx, 44, ROOM_WIDTH, ROOM_HEIGHT - 88);

    ctx.strokeStyle = '#14121a';
    ctx.lineWidth = 1;
    for (let x = rx; x < rx + ROOM_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 44);
      ctx.lineTo(x, ROOM_HEIGHT - 44);
      ctx.stroke();
    }
    for (let y = 44; y < ROOM_HEIGHT - 44; y += 32) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + ROOM_WIDTH, y);
      ctx.stroke();
    }

    // Remaches en cruces de baldosas
    ctx.fillStyle = '#2d2737';
    for (let x = rx; x < rx + ROOM_WIDTH; x += 32) {
      for (let y = 44; y < ROOM_HEIGHT - 44; y += 32) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // B. MURO SUPERIOR (movie_mode_SKILL.md: Cara frontal técnica azul acero #2c3340 con hiladas)
    ctx.fillStyle = '#2c3340';
    ctx.fillRect(rx, 0, ROOM_WIDTH, 44);

    // Junta horizontal y remaches del muro de acero
    ctx.fillStyle = '#1b222c';
    ctx.fillRect(rx, 22, ROOM_WIDTH, 1);
    ctx.fillStyle = '#4a515c';
    for (let rxRem = rx + 16; rxRem < rx + ROOM_WIDTH; rxRem += 48) {
      ctx.fillRect(rxRem, 20, 2, 2);
    }

    // Tapa oscura arriba
    ctx.fillStyle = '#1b1622';
    ctx.fillRect(rx, 0, ROOM_WIDTH, 6);
    ctx.fillStyle = '#231d2b';
    ctx.fillRect(rx, 5, ROOM_WIDTH, 1);

    // Sombra de contacto de 3 px bajo el muro superior (movie_mode_SKILL.md)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(rx, 44, ROOM_WIDTH, 3);

    // C. SEÑALÉTICA PROPIA DE GENESIS: una barra de memoria en vez de cinta de peligro.
    drawMemoryPrism(ctx, rx + 146, 10, room, t);

    // D. LUZ DE EMERGENCIA EN LA PARED EN X: 232 (movie_mode_SKILL.md)
    drawEmergencyLight(ctx, rx + 232, 14, true, t);

    // E. FALLAS DE CONTEXTO: cortes de señal y un panel de memoria incompleto.
    drawHologramColumn(ctx, rx + 366, 20, room, t);
    drawSignalShard(ctx, rx + 448, 112, t);

    // F. MURO INFERIOR: canal de fibra óptica, exclusivo del complejo Genesis.
    drawFiberNode(ctx, rx + 40, ROOM_HEIGHT - 35, room, t);
    drawFiberNode(ctx, rx + 220, ROOM_HEIGHT - 35, room + 2, t);
    drawFiberNode(ctx, rx + 400, ROOM_HEIGHT - 35, room + 4, t);

    // G. MUROS LATERALES Y COMPUERTAS (Tapa oscura #1b1622 con motas y sombra de 2 px)
    ctx.fillStyle = '#1b1622';
    ctx.fillRect(rx, 0, 16, 134);
    ctx.fillRect(rx, 250, 16, ROOM_HEIGHT - 250);
    ctx.fillRect(rx + ROOM_WIDTH - 16, 0, 16, 134);
    ctx.fillRect(rx + ROOM_WIDTH - 16, 250, 16, ROOM_HEIGHT - 250);

    // Sombra de contacto vertical izquierda (movie_mode_SKILL.md)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(rx + 16, 44, 2, ROOM_HEIGHT - 88);

    // Marcos metálicos de compuerta
    ctx.fillStyle = '#4a515c';
    ctx.fillRect(rx + ROOM_WIDTH - 16, 130, 16, 6);
    ctx.fillRect(rx + ROOM_WIDTH - 16, 248, 16, 6);

    // H. TERMINAL CRT DE LA SALA (EN EL CENTRO SUPERIOR)
    const termPos = this.getTerminalPosition(room);
    const termActive = this.introActive ? this.introElapsed > 3.6 : true;
    drawComputerTerminal(ctx, termPos.x, termPos.y, termActive, t);

    // Racks de servidores superiores
    drawServerRack(ctx, rx + 44, 48, 26, 40, t, room * 7);
    drawServerRack(ctx, rx + 74, 48, 26, 40, t, room * 11);

    // I. Cápsula de contención de memoria: identidad propia de Genesis.
    drawContainmentPod(ctx, rx + 286, 112, room, t);

    // J. Daño ambiental abstracto: reflejos, cables y fracturas de señal.
    drawPuddle(ctx, rx + 370, 220, 34, 12);
    drawBrokenGlass(ctx, rx + 150, 240);

    // Cables sueltos con ráfagas de chispas
    const spark = Math.sin(t * 8 + room) > 0.94;
    drawFloorCable(ctx, rx + 100, 88, rx + 170, 140, spark);
    ctx.restore();
  }

  /** Iluminación con linterna dinámica y parpadeo realista de inicio. */
  private drawLighting(cx: number, cy: number): void {
    const lctx = this.lightContext;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Capa de oscuridad profunda
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgba(6, 4, 10, 0.92)';
    lctx.fillRect(0, 0, w, h);

    // 2. Recorte de huecos de luz (destination-out)
    lctx.globalCompositeOperation = 'destination-out';

    // Cálculo del parpadeo de linterna durante la intro
    let flashRadius = 84;
    let flashAlpha = 1.0;

    if (this.introActive) {
      if (this.introElapsed < 1.4) {
        // Totalmente a oscuras
        flashRadius = 0;
        flashAlpha = 0;
      } else if (this.introElapsed < 1.7) {
        // Primer chispazo tenue
        flashRadius = 35;
        flashAlpha = 0.35;
      } else if (this.introElapsed < 2.0) {
        // Apagón momentáneo
        flashRadius = 0;
        flashAlpha = 0;
      } else if (this.introElapsed < 2.4) {
        // Doble parpadeo rápido
        const pulse = Math.sin(this.introElapsed * 24) > 0 ? 0.75 : 0.1;
        flashRadius = 60 * pulse;
        flashAlpha = pulse;
      } else if (this.introElapsed < 2.9) {
        // Subida de voltaje
        flashRadius = 75;
        flashAlpha = 0.9;
      }
    }

    const px = Math.round(this.player.x - cx + this.player.width / 2);
    const py = Math.round(this.player.y - cy + this.player.height / 2);

    if (flashRadius > 0 && flashAlpha > 0) {
      const flashGrad = lctx.createRadialGradient(px, py, 14, px, py, flashRadius);
      flashGrad.addColorStop(0, `rgba(0, 0, 0, ${flashAlpha})`);
      flashGrad.addColorStop(0.5, `rgba(0, 0, 0, ${flashAlpha * 0.7})`);
      flashGrad.addColorStop(0.85, `rgba(0, 0, 0, ${flashAlpha * 0.2})`);
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lctx.fillStyle = flashGrad;
      lctx.beginPath();
      lctx.arc(px, py, flashRadius, 0, Math.PI * 2);
      lctx.fill();
    }

    // Luz de la terminal (se enciende a partir de los 3.6s de la intro)
    const termActive = !this.introActive || this.introElapsed > 3.6;
    const term = this.getTerminalPosition(this.currentRoom);
    const tx = Math.round(term.x - cx + 14);
    const ty = Math.round(term.y - cy + 12);

    if (termActive) {
      const termGrad = lctx.createRadialGradient(tx, ty, 8, tx, ty, 68);
      termGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      termGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      termGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lctx.fillStyle = termGrad;
      lctx.beginPath();
      lctx.arc(tx, ty, 68, 0, Math.PI * 2);
      lctx.fill();
    }

    // Luz roja de emergencia en la pared a 2 Hz (movie_mode_SKILL.md)
    const alarmOrigin = roomOrigin(this.currentRoom);
    const alarmX = Math.round(alarmOrigin.x + 236 - cx);
    const alarmY = Math.round(alarmOrigin.y + 20 - cy);
    const alarmOn = Math.sin(this.timeSeconds * Math.PI * 4) > 0;
    if (alarmOn) {
      const alarmGrad = lctx.createRadialGradient(alarmX, alarmY, 4, alarmX, alarmY, 54);
      alarmGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      alarmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lctx.fillStyle = alarmGrad;
      lctx.beginPath();
      lctx.arc(alarmX, alarmY, 54, 0, Math.PI * 2);
      lctx.fill();
    }

    // 3. Pintar capa de oscuridad sobre el mundo
    this.context.drawImage(this.lightCanvas, 0, 0);

    // 4. Resplandores coloreados en modo aditivo 'lighter'
    this.context.save();
    this.context.globalCompositeOperation = 'lighter';

    if (termActive) {
      const glowGrad = this.context.createRadialGradient(tx, ty, 2, tx, ty, 58);
      glowGrad.addColorStop(0, 'rgba(76, 196, 122, 0.25)');
      glowGrad.addColorStop(0.6, 'rgba(76, 196, 122, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.context.fillStyle = glowGrad;
      this.context.beginPath();
      this.context.arc(tx, ty, 58, 0, Math.PI * 2);
      this.context.fill();
    }

    if (flashRadius > 0 && flashAlpha > 0) {
      const kiroGlow = this.context.createRadialGradient(px, py, 2, px, py, 38);
      kiroGlow.addColorStop(0, `rgba(247, 147, 26, ${0.16 * flashAlpha})`);
      kiroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.context.fillStyle = kiroGlow;
      this.context.beginPath();
      this.context.arc(px, py, 38, 0, Math.PI * 2);
      this.context.fill();
    }

    if (alarmOn) {
      const redGlow = this.context.createRadialGradient(alarmX, alarmY, 2, alarmX, alarmY, 48);
      redGlow.addColorStop(0, 'rgba(255, 23, 68, 0.25)');
      redGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.context.fillStyle = redGlow;
      this.context.beginPath();
      this.context.arc(alarmX, alarmY, 48, 0, Math.PI * 2);
      this.context.fill();
    }

    this.context.restore();
  }

  /** Partículas de polvo flotante (36 motas crema con movimiento). */
  private drawMotes(): void {
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

      ctx.fillStyle = `rgba(255, 226, 170, ${m.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Viñeta perimetral de lente. */
  private drawVignette(): void {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.44, w / 2, h / 2, w * 0.64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /**
   * MODO PELÍCULA / CINEMÁTICA DE INICIO:
   * Franjas negras de cine (letterbox), fundido desde negro y subtítulos centrados.
   */
  private drawMovieModeLetterbox(): void {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Calcular desplazamiento de salida de las franjas (al final de la intro)
    let barHeight = 36;
    if (this.introElapsed > 7.2) {
      const outProgress = clamp((this.introElapsed - 7.2) / 1.0, 0, 1);
      barHeight = Math.round(36 * (1 - outProgress));
    }

    if (barHeight > 0) {
      // Franja negra superior
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, barHeight);
      ctx.strokeStyle = '#2c2436';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, barHeight);
      ctx.lineTo(w, barHeight);
      ctx.stroke();

      // Franja negra inferior
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, h - barHeight, w, barHeight);
      ctx.beginPath();
      ctx.moveTo(0, h - barHeight);
      ctx.lineTo(w, h - barHeight);
      ctx.stroke();

      // Subtítulo centrado según la fase de la cinemática
      ctx.save();
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';

      let subtitle = '';
      let subColor = '#ece3d6';

      if (this.introElapsed < 1.6) {
        subtitle = 'GENESIS // AÑO 2097 · PROTOCOLO DE ENTROPÍA DETECTADO';
        subColor = '#f7931a';
      } else if (this.introElapsed < 3.8) {
        subtitle = '«Sato... despierta... ¿puedes oírme? La red está colapsando.»';
        subColor = '#00e5ff';
      } else if (this.introElapsed < 7.2) {
        subtitle = 'LÍA: «Algo está fragmentando mis registros. Identifica el registro anómalo.»';
        subColor = '#7ef59b';
      }

      if (subtitle) {
        ctx.fillStyle = subColor;
        ctx.fillText(subtitle, w / 2, h - barHeight / 2 + 3);
      }

      // Prompt para saltar intro
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#6d5a80';
      ctx.fillText('[ESPACIO / CLICK para saltar]', w - 16, barHeight - 12);

      ctx.restore();
    }

    // Fundido a negro inicial suave
    if (this.introElapsed < 1.2) {
      const fadeAlpha = 1 - (this.introElapsed / 1.2);
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Glitch de interferencia del Alucinador a los 5.4s
    if (this.introElapsed >= 5.2 && this.introElapsed <= 5.5) {
      ctx.fillStyle = 'rgba(255, 23, 68, 0.18)';
      ctx.fillRect(0, Math.floor(Math.random() * h), w, 8);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.fillRect(0, Math.floor(Math.random() * h), w, 6);
    }
  }
}
