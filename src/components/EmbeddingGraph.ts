export type EmbeddingGraphState = 'STABLE' | 'GLITCHING' | 'SCATTERED';

interface EmbeddingNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  central: boolean;
}

const MAX_NODES = 72;
const TAU = Math.PI * 2;

/**
 * Dibuja una red de embeddings con un presupuesto fijo de nodos.
 * La escena usa un canvas independiente para no cargar el canvas del juego.
 */
export class EmbeddingGraph {
  private readonly context: CanvasRenderingContext2D;
  private readonly nodes: EmbeddingNode[];
  private readonly resizeObserver: ResizeObserver;
  private state: EmbeddingGraphState = 'STABLE';
  private frameId: number | null = null;
  private lastTime = 0;
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement, nodeCount = MAX_NODES) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el contexto del grafo de embeddings.');
    this.context = context;
    this.nodes = Array.from({ length: Math.min(MAX_NODES, Math.max(1, nodeCount)) }, (_, index) => ({
      x: 0.5 + (Math.random() - 0.5) * 0.28,
      y: 0.5 + (Math.random() - 0.5) * 0.28,
      vx: (Math.random() - 0.5) * 0.025,
      vy: (Math.random() - 0.5) * 0.025,
      radius: 1.2 + Math.random() * 2.1,
      phase: index * 0.73,
      central: index < 8,
    }));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  /** Cambia el comportamiento visual sin reconstruir el grafo. */
  setState(state: EmbeddingGraphState): void {
    this.state = state;
    if (state === 'STABLE') {
      this.nodes.forEach((node, index) => {
        const angle = (index / this.nodes.length) * TAU;
        const radius = 0.08 + (index % 5) * 0.018;
        node.x = 0.5 + Math.cos(angle) * radius;
        node.y = 0.5 + Math.sin(angle) * radius * 0.72;
        node.vx *= 0.25;
        node.vy *= 0.25;
      });
    } else if (state === 'SCATTERED') {
      this.nodes.forEach((node, index) => {
        node.x = index < 8 ? 0.5 + (index - 3.5) * 0.025 : 0.08 + Math.random() * 0.84;
        node.y = index < 8 ? 0.5 + ((index % 3) - 1) * 0.03 : 0.12 + Math.random() * 0.76;
        node.vx = (Math.random() - 0.5) * 0.08;
        node.vy = (Math.random() - 0.5) * 0.08;
      });
    } else {
      this.nodes.forEach((node) => {
        node.vx = (Math.random() - 0.5) * 0.16;
        node.vy = (Math.random() - 0.5) * 0.16;
      });
    }
  }

  /** Inicia el único requestAnimationFrame del componente. */
  start(): void {
    if (this.frameId !== null) return;
    this.lastTime = 0;
    this.frameId = requestAnimationFrame((time) => this.frame(time));
  }

  /** Detiene la animación y libera el observer cuando la cinemática termina. */
  destroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.resizeObserver.disconnect();
    this.context.clearRect(0, 0, this.width, this.height);
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private frame(time: number): void {
    const dt = this.lastTime ? Math.min(0.05, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    this.update(dt, time / 1000);
    this.draw(time / 1000);
    this.frameId = requestAnimationFrame((next) => this.frame(next));
  }

  private update(dt: number, time: number): void {
    for (const node of this.nodes) {
      if (this.state === 'STABLE') {
        const targetX = 0.5 + Math.cos(node.phase + time * 0.35) * 0.12;
        const targetY = 0.5 + Math.sin(node.phase * 1.3 + time * 0.27) * 0.09;
        node.vx += (targetX - node.x) * dt * 0.8;
        node.vy += (targetY - node.y) * dt * 0.8;
        node.vx *= 0.985;
        node.vy *= 0.985;
      } else if (this.state === 'GLITCHING') {
        node.vx += Math.sin(time * 16 + node.phase * 7) * dt * 0.08;
        node.vy += Math.cos(time * 19 + node.phase * 5) * dt * 0.08;
        node.vx *= 0.995;
        node.vy *= 0.995;
      } else {
        node.vx *= 0.998;
        node.vy *= 0.998;
      }
      node.x += node.vx * dt;
      node.y += node.vy * dt;
      if (node.x < 0.03 || node.x > 0.97) node.vx *= -1;
      if (node.y < 0.05 || node.y > 0.95) node.vy *= -1;
      node.x = Math.max(0.02, Math.min(0.98, node.x));
      node.y = Math.max(0.04, Math.min(0.96, node.y));
    }
  }

  private draw(time: number): void {
    const g = this.context;
    g.clearRect(0, 0, this.width, this.height);
    g.save();
    g.globalCompositeOperation = 'lighter';
    this.drawConnections(g);
    for (const node of this.nodes) {
      const x = node.x * this.width;
      const y = node.y * this.height;
      const pulse = 0.75 + Math.sin(time * 2 + node.phase) * 0.25;
      const color = this.state === 'GLITCHING'
        ? (node.central ? '#ff1744' : (Math.round(node.phase * 10) % 2 ? '#00e5ff' : '#ff3d71'))
        : this.state === 'SCATTERED'
          ? (node.central ? '#00e5ff' : '#527f9a')
          : '#00d9ff';
      g.globalAlpha = this.state === 'SCATTERED' && !node.central ? 0.42 : pulse;
      g.fillStyle = color;
      g.beginPath();
      g.arc(x, y, node.radius * (this.state === 'GLITCHING' ? 1.25 : 1), 0, TAU);
      g.fill();
    }
    g.restore();
  }

  private drawConnections(g: CanvasRenderingContext2D): void {
    const maxDistance = this.state === 'STABLE' ? 0.16 : this.state === 'GLITCHING' ? 0.28 : 0.14;
    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const first = nodes[i];
        const second = nodes[j];
        const centralPair = first.central && second.central;
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        const allowed = this.state === 'SCATTERED' ? centralPair && distance < maxDistance : distance < maxDistance;
        if (!allowed) continue;
        g.globalAlpha = this.state === 'GLITCHING' ? 0.2 : this.state === 'SCATTERED' ? 0.55 : 0.18;
        g.strokeStyle = this.state === 'GLITCHING' ? '#ff1744' : '#00b8d4';
        g.lineWidth = this.state === 'GLITCHING' ? 0.8 : 0.5;
        g.beginPath();
        g.moveTo(first.x * this.width, first.y * this.height);
        g.lineTo(second.x * this.width, second.y * this.height);
        g.stroke();
      }
    }
  }
}
