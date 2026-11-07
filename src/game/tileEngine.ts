// Motor de cada mundo con el sistema de Proyecto 21: mapa de baldosas a 320 x 192, cámara que sigue a Sato,
// objetos ordenados por la línea de los pies, oscuridad con huecos de luz y Sato de 16 x 16.
import { bossArenaPosition, bossTargetPair, type BossState, type BossVector, ROOMS, type World } from '../shared/reducer.js';
import { satoFrames, type Facing } from '../p21/sato';
import { SPRITES, drawMap } from '../p21/tiles';
import { CH, CW, T, type Door, type Thing, type TileMap } from '../p21/tilemap';
import { buildWorld } from './worlds';
import { animateProp, drawBossSpider, propLight } from './scenery';
import type { Mood } from '../p21/tilemap';

const VW = 320;
const VH = 192;
const SPEED = 72;
const SATO = satoFrames();

export interface TileHooks {
  /** ¿Está abierta una puerta con esta condición ('hidden' o id de sala)? */
  isOpen(gate: string): boolean;
  isSolved(roomId: string): boolean;
  hasClue(world: World, roomId: string): boolean;
  onInteract(act: string, thing: Thing): void;
  onRoomChanged(index: number): void;
  onBlocked(door: Door): void;
  /** Fragmentos recuperados (para las ranuras del núcleo). */
  fragments(): number;
  /** Indica si debe publicar la posición local durante el jefe final. */
  bossActive?: () => boolean;
  bossState?: () => BossState | null;
  bossWorld?: () => World;
  bossConnected?: (world: World) => boolean;
  /** Publica la posición local con el límite de frecuencia del motor. */
  onBossPosition?: (x: number, y: number) => void;
  onBossFire?: (fire: { stop: number; raw: BossVector; unit: BossVector }) => void;
  onBossWebHit?: () => void;
  onBossFrame?: () => void;
  intro: () => string[];
  solo: boolean;
}

interface Light { x: number; y: number; inner: number; r: number; tint?: string }
interface BossWeb { x: number; y: number; vx: number; vy: number; life: number; target: World }
interface BossRay { raw: BossVector; unit: BossVector; stop: number; until: number }

const MOTES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 97) % VW, y: (i * 53) % VH, speed: 3 + (i % 5), size: 0.5 + (i % 3) * 0.35, phase: i * 1.7,
}));

export class TileEngine {
  paused = false;
  world: World;
  room = 1;
  map!: TileMap;

  private readonly low = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly big = document.createElement('canvas');
  private readonly out: CanvasRenderingContext2D;
  private readonly mapCanvas = document.createElement('canvas');
  private readonly shade = document.createElement('canvas');
  private scaleX = 1;
  private scaleY = 1;
  readonly player = { x: 0, y: 0, facing: 'down' as Facing, walk: 0, moving: false };
  private readonly keys = new Set<string>();
  private camX = 0;
  private camY = 0;
  private time = 0;
  private last = 0;
  private intro = 0;
  private introOn = true;
  get inIntro(): boolean { return this.introOn; }
  private wallMsg: { text: string; t0: number } | null = null;
  /** Enciende en la pared de luces del mapa un mensaje que llegó del otro mundo. */
  wallMessage(text: string): void { this.wallMsg = { text, t0: this.time }; }
  private glitch = 0;
  private lastBlocked = -10;
  private lastBossPosition = -10;
  private bossAim: { stop: number; raw: BossVector; options: BossVector[] } | null = null;
  private bossRay: BossRay | null = null;
  private readonly bossWebs: BossWeb[] = [];
  private nextBossWeb = 0;
  private bossWebSlowUntil = 0;
  private openState = '';

  constructor(private readonly canvas: HTMLCanvasElement, world: World, private readonly hooks: TileHooks) {
    this.world = world;
    this.low.width = VW + 1;
    this.low.height = VH + 1;
    this.ctx = this.low.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.out = canvas.getContext('2d')!;
    this.fit();
    new ResizeObserver(() => this.fit()).observe(canvas);
    this.load(world);
    this.bind();
  }

  private load(world: World): void {
    this.world = world;
    this.map = buildWorld(world, (id) => this.hooks.hasClue(world, id), this.hooks.solo);
    this.openState = '';
    this.refresh();
  }

  /** Vuelve a dibujar el mapa si cambió alguna puerta. */
  refresh(): void {
    const state = this.map.doors.map((d) => (this.locked(d) ? '1' : '0')).join('');
    if (state === this.openState) return;
    this.openState = state;
    drawMap(this.mapCanvas, this.map, (d) => this.locked(d));
  }

  private locked(door: Door): boolean {
    return Boolean(door.gate) && !this.hooks.isOpen(door.gate!);
  }

  private fit(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(VW, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(VH, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.shade.width = w;
      this.shade.height = h;
    }
    const k = Math.min(8, Math.ceil(w / VW));
    if (this.big.width !== (VW + 1) * k) {
      this.big.width = (VW + 1) * k;
      this.big.height = (VH + 1) * k;
    }
    this.scaleX = w / VW;
    this.scaleY = h / VH;
  }

  setWorld(world: World, roomIndex: number): void {
    this.load(world);
    this.placeIn(roomIndex);
    this.glitch = 0.8;
  }

  placeIn(roomIndex: number): void {
    const id = ROOMS[this.world][roomIndex] ?? ROOMS[this.world][1];
    const c = this.map.center(id);
    // Busca un hueco libre cerca del centro para no aparecer encima de un mueble.
    let spot = { x: c.x, y: c.y };
    search: for (let r = 0; r < 80; r += 8) {
      for (const [ox, oy] of [[0, r], [0, -r], [r, 0], [-r, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
        if (!this.hit(c.x + ox, c.y + oy)) { spot = { x: c.x + ox, y: c.y + oy }; break search; }
      }
    }
    Object.assign(this.player, { x: spot.x, y: spot.y, facing: 'down', moving: false });
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
    this.room = ROOMS[this.world].indexOf(id);
    this.hooks.onRoomChanged(this.room);
  }

  start(): void {
    requestAnimationFrame((ts) => this.frame(ts));
  }

  skipIntro(): void {
    if (this.introOn) { this.introOn = false; this.hooks.onRoomChanged(this.room); }
  }

  press(key: string): void { this.keys.add(key); }
  release(key: string): void { this.keys.delete(key); }

  setPaused(p: boolean): void {
    this.paused = p;
    if (p) { this.keys.clear(); this.player.moving = false; }
  }

  interact(): void {
    if (this.introOn) { this.skipIntro(); return; }
    if (this.paused) return;
    const thing = this.nearest();
    if (!thing) return;
    this.hooks.onInteract(thing.act ?? 'info', thing);
  }

  private bind(): void {
    const map: Record<string, string> = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (this.introOn && (k === ' ' || k === 'enter' || k === 'escape')) { e.preventDefault(); this.skipIntro(); return; }
      if (typing) return;
      if (this.hooks.bossActive?.()) {
        if (k === ' ') { e.preventDefault(); this.openBossAim(); return; }
        if (this.bossAim && ['1', '2', '3', '4'].includes(k)) {
          e.preventDefault(); this.fireBossOption(Number(k) - 1); return;
        }
      }
      if (map[k]) { e.preventDefault(); if (!this.paused) this.keys.add(map[k]); }
      if (k === 'e' && !e.repeat) this.interact();
    });
    window.addEventListener('keyup', (e) => { const k = map[e.key.toLowerCase()]; if (k) this.keys.delete(k); });
    window.addEventListener('blur', () => this.keys.clear());
    this.canvas.addEventListener('pointerdown', () => this.skipIntro());
  }

  private frame(ts: number): void {
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.time += dt;
    this.glitch = Math.max(0, this.glitch - dt);
    this.refresh();
    if (this.introOn) {
      this.intro += dt;
      if (this.intro > 7.5) this.skipIntro();
    } else this.update(dt);
    this.draw();
    this.hooks.onBossFrame?.();
    requestAnimationFrame((n) => this.frame(n));
  }

  // ---------- lógica ----------

  private solidAt(px: number, py: number): { door?: Door } | null {
    const c = this.map.cell(Math.floor(px / T), Math.floor(py / T));
    if (c.t === 0 || c.t === 1 || c.t === 4) return {};
    if (c.t === 3 && this.locked(this.map.doors[c.door])) return { door: this.map.doors[c.door] };
    for (const thing of this.map.things) {
      if (!thing.solid) continue;
      const [sx, sy, sw, sh] = thing.solid;
      if (px >= thing.x + sx && px < thing.x + sx + sw && py >= thing.y + sy && py < thing.y + sy + sh) return {};
    }
    return null;
  }

  private hit(x: number, y: number): { door?: Door } | null {
    for (const [px, py] of [[x - 4, y - 4], [x + 3, y - 4], [x - 4, y], [x + 3, y]]) {
      const found = this.solidAt(px, py);
      if (found) return found;
    }
    return null;
  }

  private update(dt: number): void {
    const p = this.player;
    let dx = 0;
    let dy = 0;
    const webSlowed = this.hooks.bossActive?.() && this.time < this.bossWebSlowUntil;
    if (!this.paused && !webSlowed) {
      if (this.keys.has('left')) dx -= 1;
      if (this.keys.has('right')) dx += 1;
      if (this.keys.has('up')) dy -= 1;
      if (this.keys.has('down')) dy += 1;
    }
    p.moving = dx !== 0 || dy !== 0;
    if (p.moving) {
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      const step = SPEED * dt;
      const bx = this.hit(p.x + dx * step, p.y);
      if (!bx) p.x += dx * step; else if (bx.door) this.blocked(bx.door);
      const by = this.hit(p.x, p.y + dy * step);
      if (!by) p.y += dy * step; else if (by.door) this.blocked(by.door);
      p.walk += dt;
    } else p.walk = 0;

    const ri = this.map.roomAt(p.x, p.y - 4);
    if (ri >= 0) {
      const index = ROOMS[this.world].indexOf(this.map.rooms[ri].id);
      if (index !== this.room) { this.room = index; this.hooks.onRoomChanged(index); }
    }
    if (this.hooks.bossActive?.() && this.time - this.lastBossPosition >= 0.1) {
      const room = this.map.rooms[ri];
      if (room) {
        this.lastBossPosition = this.time;
        this.hooks.onBossPosition?.(p.x - room.c * CW * T, p.y - room.r * CH * T);
      }
    }
    if (this.hooks.bossActive?.()) this.updateBossHazards(dt);
    const target = this.cameraTarget();
    const k = Math.min(1, dt * 6);
    this.camX += (target.x - this.camX) * k;
    this.camY += (target.y - this.camY) * k;
  }

  private openBossAim(): void {
    const boss = this.hooks.bossState?.();
    if (!boss?.active || !boss.startedAt) return;
    const arena = bossArenaPosition(boss.startedAt);
    if (!arena.vulnerable) return;
    const world = this.hooks.bossWorld?.() ?? this.world;
    const position = boss.positions[world];
    const raw = {
      x: Math.round((arena.x - position.x) / 16),
      y: Math.round((arena.y - position.y) / 16),
    };
    if (raw.x === 0 && raw.y === 0) return;
    const length = Math.hypot(raw.x, raw.y);
    const unit = { x: raw.x / length, y: raw.y / length };
    this.bossAim = {
      stop: arena.stop,
      raw,
      // Orden al azar: la correcta no puede estar siempre en el 1.
      options: [unit, { x: raw.x, y: raw.y }, { x: -unit.x, y: -unit.y }, { x: unit.x / 2, y: unit.y / 2 }]
        .map((v) => ({ v, k: Math.random() }))
        .sort((a, b) => a.k - b.k)
        .map(({ v }) => v),
    };
  }

  private fireBossOption(index: number): void {
    const aim = this.bossAim;
    if (!aim || !aim.options[index]) return;
    const unit = aim.options[index];
    this.bossRay = { raw: aim.raw, unit, stop: aim.stop, until: this.time + 0.45 };
    this.bossAim = null;
    this.hooks.onBossFire?.({ stop: aim.stop, raw: aim.raw, unit });
  }

  private updateBossHazards(dt: number): void {
    const boss = this.hooks.bossState?.();
    if (!boss?.active || !boss.startedAt) return;
    const arena = bossArenaPosition(boss.startedAt);
    const currentWorld = this.hooks.bossWorld?.() ?? this.world;
    if (!arena.vulnerable && this.time >= this.nextBossWeb) {
      this.nextBossWeb = this.time + 1.8;
      const realDistance = Math.hypot(boss.positions.real.x - arena.x, boss.positions.real.y - arena.y);
      const invertedDistance = Math.hypot(boss.positions.inverted.x - arena.x, boss.positions.inverted.y - arena.y);
      const targetWorld = realDistance <= invertedDistance ? 'real' : 'inverted';
      const target = boss.positions[targetWorld];
      const dx = target.x - arena.x;
      const dy = target.y - arena.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      this.bossWebs.push({ x: arena.x, y: arena.y, vx: dx / length * 24, vy: dy / length * 24, life: 4, target: targetWorld });
    }
    const world = this.hooks.bossWorld?.() ?? this.world;
    const target = boss.positions[world];
    for (let i = this.bossWebs.length - 1; i >= 0; i--) {
      const web = this.bossWebs[i];
      web.x += web.vx * dt;
      web.y += web.vy * dt;
      web.life -= dt;
      if (web.life <= 0 || web.x < 12 || web.x > 276 || web.y < 12 || web.y > 180) {
        this.bossWebs.splice(i, 1);
        continue;
      }
      if (web.target === currentWorld && Math.hypot(web.x - target.x, web.y - target.y) < 7) {
        this.bossWebSlowUntil = this.time + 2;
        this.hooks.onBossWebHit?.();
        this.bossWebs.splice(i, 1);
      }
    }
  }

  private blocked(door: Door): void {
    if (this.time - this.lastBlocked < 1.5 || this.paused || door.hidden) return;
    this.lastBlocked = this.time;
    this.hooks.onBlocked(door);
  }

  private cameraTarget(): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(this.map.GW * T - VW, this.player.x - VW / 2)),
      y: Math.max(0, Math.min(this.map.GH * T - VH, this.player.y - 8 - VH / 2)),
    };
  }

  private nearest(): Thing | null {
    let best: Thing | null = null;
    let bestD = 28;
    for (const thing of this.map.things) {
      if (!thing.act && !thing.info) continue;
      if (thing.act === 'hidden-panel' && this.hooks.isOpen('hidden')) continue;
      const tx = thing.x + thing.w / 2;
      const ty = thing.wall ? thing.y + thing.h + 10 : thing.y + thing.h - 4;
      const d = Math.hypot(tx - this.player.x, ty - this.player.y);
      if (d < bestD) { bestD = d; best = thing; }
    }
    return best;
  }

  // ---------- dibujo ----------

  private draw(): void {
    const g = this.ctx;
    const cx = Math.floor(this.camX);
    const cy = Math.floor(this.camY);
    const inv = this.world === 'inverted';
    g.fillStyle = inv ? '#07050f' : '#0b0910';
    g.fillRect(0, 0, VW + 1, VH + 1);
    const mw = Math.min(VW + 1, this.map.GW * T - cx);
    const mh = Math.min(VH + 1, this.map.GH * T - cy);
    g.drawImage(this.mapCanvas, cx, cy, mw, mh, 0, 0, mw, mh);

    const visible = (t: Thing): boolean => t.x + t.w > cx - 8 && t.x < cx + VW + 9 && t.y + t.h > cy - 30 && t.y < cy + VH + 9;
    const things = this.map.things;
    for (const thing of things) {
      if (thing.act === 'hidden-panel' && this.hooks.isOpen('hidden')) continue;
      if ((thing.flat || thing.wall) && visible(thing)) {
        g.drawImage(SPRITES[thing.sprite], thing.x - cx, thing.y - cy);
        this.animate(thing, thing.x - cx, thing.y - cy);
      }
    }
    const list: Array<{ z: number; draw: () => void }> = things.filter((t) => !t.flat && !t.wall && visible(t)).map((thing) => ({
      z: thing.y + thing.h,
      draw: () => {
        // En el Mundo Invertido lo que no está anclado flota un poco.
        const bob = 0;
        if (bob) {
          g.fillStyle = 'rgba(0,0,0,.25)';
          g.fillRect(thing.x - cx + 2, thing.y + thing.h - cy - 2, thing.w - 4, 2);
        }
        g.drawImage(SPRITES[thing.sprite], thing.x - cx, thing.y - cy + bob);
        this.animate(thing, thing.x - cx, thing.y - cy + bob);
      },
    }));
    const p = this.player;
    list.push({
      z: p.y,
      draw: () => {
        const frame = p.moving ? Math.floor(p.walk * 8) % 2 : 0;
        const sx = Math.round(p.x - 8 - cx);
        const sy = Math.round(p.y - 16 - cy) - (p.moving && frame ? 1 : 0);
        g.fillStyle = 'rgba(0,0,0,.3)';
        g.fillRect(sx + 4, Math.round(p.y - cy) - 1, 8, 2);
        g.drawImage(SATO[p.facing][frame], sx, sy);
      },
    });
    const core = this.map.rooms.find((r) => r.id === 'i10');
    if (core) {
      const x = core.c * CW * T + 192;
      const y = core.r * CH * T + 64;
      list.push({ z: y + 24, draw: () => this.drawCore(x - cx, y - cy) });
    }
    list.sort((a, b) => a.z - b.z).forEach((item) => item.draw());

    const ox = Math.round((this.camX - cx) * this.scaleX);
    const oy = Math.round((this.camY - cy) * this.scaleY);
    const b = this.big.getContext('2d')!;
    b.imageSmoothingEnabled = false;
    b.drawImage(this.low, 0, 0, this.big.width, this.big.height);
    const o = this.out;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = 'high';
    o.drawImage(this.big, -ox, -oy, (VW + 1) * this.scaleX, (VH + 1) * this.scaleY);
    o.setTransform(this.scaleX, 0, 0, this.scaleY, -ox, -oy);
    this.drawLight(cx, cy, visible);
    this.drawMotes(ox / this.scaleX, oy / this.scaleY);
    if (!this.introOn) { this.drawBeacons(cx, cy); this.drawPrompt(cx, cy); }
    this.drawBossArena(cx, cy);
    o.setTransform(1, 0, 0, 1, 0, 0);
    this.drawFx();
    if (this.introOn) this.drawIntro();
  }

  private mood(): Mood {
    const room = this.map.rooms[this.map.roomAt(this.player.x, this.player.y - 4)];
    if (room?.mood) return room.mood;
    return this.world === 'inverted'
      ? { shade: [8, 3, 22, 0.8], motes: 'spores', glow: 'rgba(0,229,255,.06)' }
      : { shade: [6, 4, 10, room?.dark ? 0.9 : 0.76], motes: 'dust', glow: 'rgba(247,147,26,.07)' };
  }

  private drawLight(cx: number, cy: number, visible: (t: Thing) => boolean): void {
    const g = this.out;
    const room = this.map.rooms[this.map.roomAt(this.player.x, this.player.y - 4)];
    const mood = this.mood();
    const [sr, sg, sb, darkness] = mood.shade;
    const lights: Light[] = [];
    const px = this.player.x - cx;
    const py = this.player.y - 8 - cy;
    lights.push({ x: px, y: py, inner: 14, r: room?.dark ? 70 : 110, tint: mood.glow });
    for (const thing of this.map.things) {
      if (!visible(thing)) continue;
      const x = thing.x + thing.w / 2 - cx;
      const y = thing.y + thing.h / 2 - cy;
      const own = propLight(thing, x, y, this.time);
      if (own) { lights.push(own); continue; }
      if (!thing.anim) continue;
      if (thing.anim === 'pc') lights.push({ x, y: y - 4, inner: 4, r: 60, tint: 'rgba(76,196,122,.22)' });
      else if (thing.anim === 'console') lights.push({ x, y, inner: 4, r: 64, tint: 'rgba(247,147,26,.18)' });
      else if (thing.anim === 'lights') lights.push({ x, y: y + 4, inner: 4, r: this.wallMsg ? 96 : 60, tint: this.wallMsg ? 'rgba(255,240,200,.35)' : this.world === 'inverted' ? 'rgba(0,229,255,.2)' : 'rgba(255,210,120,.2)' });
      else if (thing.anim === 'emlight') lights.push({ x, y: y + 18, inner: 4, r: 56, tint: this.world === 'inverted' ? 'rgba(164,108,255,.16)' : 'rgba(255,90,50,.14)' });
      else if (thing.anim === 'alarm' && Math.floor(this.time * 2) % 2 === 0) lights.push({ x, y: y + 10, inner: 2, r: 34, tint: 'rgba(255,60,60,.2)' });
      else if (thing.anim === 'spark' && this.sparking(thing)) lights.push({ x, y: y + 10, inner: 2, r: 34, tint: 'rgba(255,210,120,.22)' });
      else if (thing.anim === 'rack') lights.push({ x, y, inner: 2, r: 22, tint: 'rgba(76,196,122,.10)' });
      else if (thing.anim === 'relic') lights.push({ x, y, inner: 2, r: 30, tint: 'rgba(247,147,26,.24)' });
      else if (thing.anim === 'gen') lights.push({ x, y, inner: 2, r: 28, tint: 'rgba(76,196,122,.1)' });
    }
    const core = this.map.rooms.find((r) => r.id === 'i10');
    if (core) lights.push({ x: core.c * CW * T + 204 - cx, y: core.r * CH * T + 76 - cy, inner: 6, r: 80, tint: 'rgba(0,229,255,.22)' });

    const s = this.shade.getContext('2d')!;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, this.shade.width, this.shade.height);
    s.fillStyle = `rgba(${sr},${sg},${sb},${darkness})`;
    s.fillRect(0, 0, this.shade.width, this.shade.height);
    s.setTransform(g.getTransform());
    s.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const hole = s.createRadialGradient(l.x, l.y, l.inner, l.x, l.y, l.r);
      hole.addColorStop(0, 'rgba(0,0,0,1)');
      hole.addColorStop(0.35, 'rgba(0,0,0,.82)');
      hole.addColorStop(0.7, 'rgba(0,0,0,.3)');
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      s.fillStyle = hole;
      s.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    const t = g.getTransform();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.shade, 0, 0);
    g.setTransform(t);
    g.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.tint) continue;
      const glow = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      glow.addColorStop(0, l.tint);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow;
      g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }

  private drawMotes(fx: number, fy: number): void {
    const o = this.out;
    const lx = this.player.x - Math.floor(this.camX);
    const ly = this.player.y - 8 - Math.floor(this.camY);
    o.globalCompositeOperation = 'lighter';
    const kind = this.mood().motes;
    // dirección (1 sube, -1 cae), velocidad, color, tamaño y si se ven fuera de la luz
    const look: Record<Mood['motes'], [number, number, string, number, number]> = {
      dust: [1, 1, '255,226,170', 1, 0],
      snow: [-1, 2.2, '225,240,255', 1.3, 0.25],
      spores: [1, 0.7, '190,170,230', 1.6, 0.3],
      embers: [1, 3.5, '255,140,60', 0.9, 0.35],
      data: [1, 1.8, '0,229,255', 0.8, 0.2],
      ash: [-1, 0.8, '170,160,170', 1.2, 0.15],
    };
    const [dir, speed, rgb, size, ambient] = look[kind];
    for (const m of MOTES) {
      const x = (((m.x + Math.sin(this.time * 0.4 + m.phase) * (kind === 'snow' ? 14 : 6) - this.camX * 0.15) % VW) + VW) % VW + fx;
      const y = (((m.y - dir * this.time * m.speed * speed - this.camY * 0.15) % VH) + VH) % VH + fy;
      const a = Math.max(ambient * (0.5 + 0.5 * Math.sin(this.time + m.phase)), Math.max(0, 1 - Math.hypot(x - lx, y - ly) / 110) * 0.5);
      if (a < 0.02) continue;
      o.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
      if (kind === 'data') {
        o.fillRect(x, y, m.size * 1.6, m.size * 1.6);
        continue;
      }
      o.beginPath();
      o.arc(x, y, m.size * size, 0, Math.PI * 2);
      o.fill();
    }
    o.globalCompositeOperation = 'source-over';
  }

  /** Faro sobre la rejilla del canal oculto mientras siga cerrado: que se vea dónde está. */
  private drawBeacons(cx: number, cy: number): void {
    if (this.hooks.isOpen('hidden')) return;
    const g = this.out;
    for (const thing of this.map.things) {
      if (thing.act !== 'hidden-panel') continue;
      const x = thing.x + thing.w - cx;
      const y = Math.round(thing.y + thing.h / 2 - cy);
      if (x < -20 || x > VW + 40 || y < -30 || y > VH + 30) continue;
      const pulse = (Math.sin(this.time * 4) + 1) / 2;
      g.fillStyle = `rgba(0,229,255,${0.1 + pulse * 0.2})`;
      g.fillRect(x - thing.w - 1, y - thing.h / 2 - 1, thing.w + 2, thing.h + 2);
      // Corriente de aire: rayitas que salen del panel hacia la sala
      g.fillStyle = 'rgba(200,240,255,.7)';
      for (let i = 0; i < 3; i++) {
        const k = (this.time * 0.9 + i / 3) % 1;
        g.fillRect(x + 2 + k * 16, y - 8 + i * 7, 3, 1);
      }
      // Flecha que apunta al panel
      const ax = x + 24 + Math.sin(this.time * 5) * 2;
      g.fillStyle = '#00e5ff';
      g.fillRect(ax, y - 1, 6, 3);
      g.fillRect(ax - 2, y - 3, 2, 7);
      g.fillRect(ax - 3, y - 2, 1, 5);
      g.fillRect(ax - 4, y, 1, 1);
    }
  }

  private drawPrompt(cx: number, cy: number): void {
    if (this.paused) return;
    const thing = this.nearest();
    if (!thing) return;
    const g = this.out;
    const bx = Math.round(thing.x + thing.w / 2 - cx - 5);
    const by = (thing.wall ? thing.y + thing.h + 2 : thing.y) - cy - 12 + Math.sin(this.time * 5) * 1.5;
    // Marca de interacción: corchetes de visor, no un botón.
    const ink = this.world === 'inverted' ? '#c8b8ff' : '#00e5ff';
    g.fillStyle = 'rgba(6,10,16,.75)';
    g.fillRect(bx, by, 10, 10);
    g.fillStyle = ink;
    for (const [x0, y0, w0, h0] of [[0, 0, 3, 1], [0, 0, 1, 3], [7, 0, 3, 1], [9, 0, 1, 3], [0, 9, 3, 1], [0, 7, 1, 3], [7, 9, 3, 1], [9, 7, 1, 3]]) g.fillRect(bx + x0, by + y0, w0, h0);
    g.fillRect(bx + 4, by + 3, 3, 1);
    g.fillRect(bx + 4, by + 3, 1, 4);
    g.fillRect(bx + 4, by + 5, 2, 1);
    g.fillRect(bx + 4, by + 6, 3, 1);
    const label = thing.label ?? thing.info?.title;
    if (label) {
      g.font = '5px monospace';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(6,10,16,.85)';
      const w = g.measureText(label).width + 6;
      g.fillRect(bx + 5 - w / 2, by - 9, w, 7);
      g.fillStyle = ink;
      g.fillRect(bx + 5 - w / 2, by - 3, w, 1);
      g.fillStyle = '#e8f4fb';
      g.fillText(label, bx + 5, by - 4);
    }
  }

  private drawFx(): void {
    const o = this.out;
    const w = o.canvas.width;
    const h = o.canvas.height;
    const v = o.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.45)');
    o.fillStyle = v;
    o.fillRect(0, 0, w, h);
    // Interferencias del Alucinador
    if (this.glitch > 0) {
      for (let i = 0; i < 3; i++) {
        o.fillStyle = i % 2 ? 'rgba(255,23,68,0.14)' : 'rgba(0,229,255,0.12)';
        o.fillRect(0, Math.floor(Math.random() * h), w, (2 + Math.floor(Math.random() * 6)) * this.scaleY / 2);
      }
    }
  }

  private drawBossArena(cx: number, cy: number): void {
    const boss = this.hooks.bossState?.();
    if (!boss?.active || !boss.startedAt) return;
    const arenaRoom = this.map.rooms.find((room) => room.id === 'i10');
    if (!arenaRoom) return;
    const arena = bossArenaPosition(boss.startedAt);
    const ox = arenaRoom.c * CW * T;
    const oy = arenaRoom.r * CH * T;
    const o = this.out;
    o.save();
    o.setTransform(this.scaleX, 0, 0, this.scaleY, -cx * this.scaleX, -cy * this.scaleY);
    const spiderX = ox + arena.x;
    const spiderY = oy + arena.y;
    const thisStop = boss.lastCycle === arena.cycle;
    const wounded = [
      thisStop && boss.wounded.real && boss.hits.real === arena.stop,
      thisStop && boss.wounded.inverted && boss.hits.inverted === arena.stop,
    ];
    drawBossSpider(o, boss.legs, arena.vulnerable ? bossTargetPair(boss.legs, arena.stop) : -1, this.time, spiderX - 24, spiderY - 16, false, wounded);

    const world = this.hooks.bossWorld?.() ?? this.world;
    const other: World = world === 'real' ? 'inverted' : 'real';
    const echo = boss.positions[other];
    const echoX = ox + echo.x;
    const echoY = oy + echo.y;
    const frame = SATO.down[0];
    const connected = this.hooks.bossConnected?.(other) ?? false;
    // En modo 1 persona no hay otro jugador: no se dibuja eco.
    if (!this.hooks.solo) {
      // Tinte solo sobre la silueta (en un lienzo aparte), no sobre el suelo de alrededor.
      const tint = document.createElement('canvas');
      tint.width = 16;
      tint.height = 16;
      const tg = tint.getContext('2d')!;
      tg.drawImage(frame, 0, 0);
      tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = other === 'real' ? 'rgba(247,147,26,.6)' : 'rgba(164,108,255,.6)';
      tg.fillRect(0, 0, 16, 16);
      o.save();
      o.globalAlpha = connected ? 0.6 : 0.15;
      o.drawImage(tint, echoX - 8, echoY - 16);
      o.restore();
    }

    for (const web of this.bossWebs) {
      o.strokeStyle = 'rgba(255,23,68,.8)';
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(ox + web.x, oy + web.y);
      o.lineTo(ox + web.x - web.vx * 0.18, oy + web.y - web.vy * 0.18);
      o.stroke();
    }
    if (this.bossRay && this.bossRay.until > this.time) {
      const rayLength = Math.hypot(this.bossRay.raw.x, this.bossRay.raw.y) * Math.hypot(this.bossRay.unit.x, this.bossRay.unit.y) * 16;
      o.strokeStyle = '#00e5ff';
      o.lineWidth = 1.5;
      o.beginPath();
      o.moveTo(this.player.x, this.player.y - 8);
      o.lineTo(this.player.x + this.bossRay.unit.x * rayLength, this.player.y - 8 + this.bossRay.unit.y * rayLength);
      o.stroke();
    }
    if (arena.vulnerable && !this.bossAim && (!this.bossRay || this.bossRay.until <= this.time)) {
      const position = boss.positions[world];
      const raw = { x: Math.round((arena.x - position.x) / 16), y: Math.round((arena.y - position.y) / 16) };
      o.fillStyle = '#ffe9b0';
      o.font = '7px monospace';
      o.textAlign = 'center';
      o.fillText(`v = (${raw.x}, ${raw.y})`, this.player.x, this.player.y - 23);
    }
    if (this.bossAim) {
      const baseX = ox + 14;
      const baseY = oy + 142;
      o.fillStyle = 'rgba(5,4,10,.9)';
      o.fillRect(baseX, baseY, 260, 38);
      o.strokeStyle = '#00e5ff';
      o.strokeRect(baseX, baseY, 260, 38);
      o.font = '7px monospace';
      o.textAlign = 'left';
      o.fillStyle = '#ece3d6';
      o.fillText(`v = (${this.bossAim.raw.x}, ${this.bossAim.raw.y})  Elige 1-4`, baseX + 5, baseY + 9);
      this.bossAim.options.forEach((option, index) => {
        o.fillStyle = '#ffb454';
        o.fillText(`${index + 1}: (${option.x.toFixed(2)}, ${option.y.toFixed(2)})`, baseX + 5 + (index % 2) * 128, baseY + 20 + Math.floor(index / 2) * 10);
      });
    }
    o.restore();
  }

  private drawIntro(): void {
    const o = this.out;
    const w = o.canvas.width;
    const h = o.canvas.height;
    const bar = Math.round(h * 0.1 * (this.intro > 6.5 ? Math.max(0, 1 - (this.intro - 6.5)) : 1));
    o.fillStyle = '#000';
    o.fillRect(0, 0, w, bar);
    o.fillRect(0, h - bar, w, bar);
    const lines = this.hooks.intro();
    const idx = Math.min(lines.length - 1, Math.floor(this.intro / 2.4));
    o.font = `${Math.round(h * 0.028)}px monospace`;
    o.textAlign = 'center';
    o.fillStyle = idx === 0 ? '#f7931a' : '#00e5ff';
    o.fillText(lines[idx], w / 2, h - bar / 2 + h * 0.01);
    o.font = `${Math.round(h * 0.022)}px monospace`;
    o.textAlign = 'right';
    o.fillStyle = '#6d5a80';
    o.fillText('[ESPACIO / CLICK para saltar]', w - 20, bar * 0.6);
    if (this.intro < 1.2) {
      o.fillStyle = `rgba(0,0,0,${(1 - this.intro / 1.2).toFixed(3)})`;
      o.fillRect(0, 0, w, h);
    }
  }

  private sparking(thing: Thing): boolean {
    const tick = Math.floor(this.time * 10);
    return ((tick * 7919 + thing.x * 13) % 23) < 2;
  }

  private animate(thing: Thing, x: number, y: number): void {
    const g = this.ctx;
    const t = this.time;
    switch (thing.anim) {
      case 'rack':
        for (let i = 0; i < 6; i++) {
          g.fillStyle = Math.sin(t * (3 + i) + thing.x * 0.37 + i) > 0 ? '#4cc47a' : '#1f5a33';
          g.fillRect(x + 11, y + 4 + i * 4, 1, 1);
          g.fillStyle = Math.sin(t * 1.3 + i + thing.x) > 0.85 ? '#f7931a' : '#3a2a10';
          g.fillRect(x + 13, y + 4 + i * 4, 1, 1);
        }
        break;
      case 'alarm':
        g.fillStyle = Math.floor(t * 2) % 2 === 0 ? '#ff4d4d' : '#5a1c1c';
        g.fillRect(x + 2, y + 1, 4, 3);
        break;
      case 'emlight':
        g.fillStyle = this.world === 'inverted' ? '#a46cff' : '#ff7a4a';
        g.fillRect(x + 1, y + 1, 8, 4);
        break;
      case 'spark':
        if (!this.sparking(thing)) break;
        g.fillStyle = '#fff1a8';
        for (const [sx, sy] of [[5, 16], [8, 17], [3, 18], [7, 20], [10, 15]]) if (Math.sin(t * 40 + sx) > 0) g.fillRect(x + sx, y + sy, 1, 1);
        break;
      case 'gen':
        g.fillStyle = Math.floor(t * 3 + thing.x) % 2 ? '#4cc47a' : '#1f5a33';
        g.fillRect(x + 27, y + 18, 2, 2);
        break;
      case 'relic': {
        const k = (t * 0.6 + thing.x * 0.013) % 2;
        if (k < 0.3) {
          g.fillStyle = '#fff6d8';
          const sx = x + 1 + Math.floor((k / 0.3) * 8);
          g.fillRect(sx, y + 3, 1, 1);
          g.fillRect(sx - 1, y + 4, 1, 1);
        }
        if (Math.sin(t * 3 + thing.y) > 0.9) {
          g.fillStyle = '#ffffff';
          g.fillRect(x + 8, y - 1, 1, 1);
        }
        break;
      }
      case 'lights': {
        const colors = this.world === 'inverted' ? ['#00e5ff', '#a46cff', '#ffffff'] : ['#ffd978', '#ff4d4d', '#4cc47a', '#3ba7ff'];
        const n = thing.sprite.startsWith('alphabet') ? 26 : 8;
        const msg = this.wallMsg;
        if (thing.sprite.startsWith('alphabet') && msg) {
          const k = Math.floor((t - msg.t0) / 0.65);
          if (k >= msg.text.length + 1) { this.wallMsg = null; }
          else {
            const ch = msg.text[k] ?? ' ';
            const on = (t - msg.t0) % 0.65 < 0.5;
            const idx = ch >= 'A' && ch <= 'Z' ? ch.charCodeAt(0) - 65 : -1;
            for (let i = 0; i < 26; i++) {
              g.fillStyle = on && (i === idx || (idx < 0 && ch !== ' ')) ? (idx < 0 ? '#ffffff' : colors[i % colors.length]) : '#2a211d';
              g.fillRect(x + 3 + (i % 9) * 8, y + 2 + Math.floor(i / 9) * 5, 2, 1);
            }
            if (on && idx >= 0) {
              g.fillStyle = 'rgba(255,255,255,.35)';
              g.fillRect(x + 1 + (idx % 9) * 8, y + 1 + Math.floor(idx / 9) * 5, 6, 3);
            }
            break;
          }
        }
        for (let i = 0; i < n; i++) {
          const on = Math.sin(t * 2 + i * 1.7) > 0.4;
          g.fillStyle = on ? colors[i % colors.length] : '#2a211d';
          if (thing.sprite.startsWith('alphabet')) g.fillRect(x + 3 + (i % 9) * 8, y + 2 + Math.floor(i / 9) * 5, 2, 1);
          else g.fillRect(x + 4 + i * 4, y + 3, 2, 2);
        }
        break;
      }
      case 'pc': {
        const lines = Math.floor(t * 2) % 6;
        g.fillStyle = '#4cc47a';
        for (let i = 0; i < Math.min(lines, 4); i++) g.fillRect(x + 5, y + 2 + i * 2, 4 + ((i * 5) % 9), 1);
        if (Math.floor(t * 3) % 2) g.fillRect(x + 5 + 2 * (lines % 5), y + 10, 2, 1);
        break;
      }
      case 'console':
        for (let i = 0; i < 24; i++) {
          g.fillStyle = Math.sin(t * 2 + i) > 0.6 ? '#f7931a' : '#7a5218';
          g.fillRect(x + 4 + (i % 8) * 4, y + 2 + ((i / 8) | 0) * 3, 3, 2);
        }
        break;
      default: {
        const lit = thing.label?.startsWith('slot:') ? Number(thing.label.slice(5)) < this.hooks.fragments() : this.hooks.isSolved(thing.room);
        animateProp(g, thing, x, y, t, lit);
        break;
      }
    }
    if (thing.act?.startsWith('main') && this.hooks.isSolved(ROOMS[this.world][Number(thing.act.split(':')[1])])) {
      g.fillStyle = '#7ef59b';
      g.fillRect(x + thing.w / 2 - 3, y - 3, 6, 2);
    }
  }

  private drawCore(x: number, y: number): void {
    const g = this.ctx;
    const pulse = 1 + Math.sin(this.time * 2.4) * 0.5;
    const lift = Math.round(pulse);
    g.fillStyle = '#2e333a';
    g.fillRect(x + 2, y + 18, 20, 8);
    g.fillStyle = '#4a515c';
    g.fillRect(x + 2, y + 18, 20, 1);
    g.fillStyle = '#2a7fa0';
    g.fillRect(x + 7, y + 4 - lift, 10, 12);
    g.fillStyle = '#00e5ff';
    g.fillRect(x + 8, y + 5 - lift, 8, 10);
    g.fillStyle = '#e8fbff';
    g.fillRect(x + 11, y + 7 - lift, 2, 6);
    g.fillRect(x + 10, y + 8 - lift, 4, 1);
    g.fillRect(x + 10, y + 11 - lift, 4, 1);
  }
}
