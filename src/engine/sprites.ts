/**
 * Sprites y props procedimentales dibujados por código en Pixel Art.
 * Estilo: Genesis 2097 / Laboratorio de Inteligencia Artificial.
 */

export interface SpriteRenderer {
  context: CanvasRenderingContext2D;
}

/** Dibuja a Kiro (protagonista) con orientación y animación de pasos. */
export function drawKiroSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'up' | 'down' | 'left' | 'right',
  step: number,
  moving: boolean,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const bob = moving ? (step % 2 === 0 ? 0 : -1) : 0;
  const legOffset = moving ? (step % 2 === 0 ? 1 : -1) : 0;

  // Sombra de contacto
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(8, 16, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (facing === 'down') {
    // Cabello
    ctx.fillStyle = '#b8540b';
    ctx.fillRect(4, 1 + bob, 8, 4);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(5, 2 + bob, 6, 2);

    // Rostro
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(4, 5 + bob, 8, 4);
    // Ojos
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(5, 6 + bob, 2, 2);
    ctx.fillRect(9, 6 + bob, 2, 2);

    // Chaqueta técnica naranja Genesis
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(3, 9 + bob, 10, 5);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(4, 9 + bob, 8, 4);
    // Detalle cuello / logo
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(7, 10 + bob, 2, 2);

    // Brazos
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(2, 10 + bob, 2, 3);
    ctx.fillRect(12, 10 + bob, 2, 3);

    // Pantalones técnicos
    ctx.fillStyle = '#263445';
    ctx.fillRect(4, 14, 3, 3 + legOffset);
    ctx.fillRect(9, 14, 3, 3 - legOffset);

    // Calzado
    ctx.fillStyle = '#e5dfd5';
    ctx.fillRect(3, 16 + legOffset, 4, 2);
    ctx.fillRect(9, 16 - legOffset, 4, 2);
  } else if (facing === 'up') {
    // Cabello posterior
    ctx.fillStyle = '#b8540b';
    ctx.fillRect(4, 1 + bob, 8, 7);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(5, 2 + bob, 6, 4);

    // Chaqueta técnica (espalda)
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(3, 8 + bob, 10, 6);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(4, 9 + bob, 8, 4);
    // Banda técnica reflectante
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(4, 11 + bob, 8, 1);

    // Brazos
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(2, 9 + bob, 2, 4);
    ctx.fillRect(12, 9 + bob, 2, 4);

    // Pantalones
    ctx.fillStyle = '#263445';
    ctx.fillRect(4, 14, 3, 3 - legOffset);
    ctx.fillRect(9, 14, 3, 3 + legOffset);

    // Calzado
    ctx.fillStyle = '#e5dfd5';
    ctx.fillRect(3, 16 - legOffset, 4, 2);
    ctx.fillRect(9, 16 + legOffset, 4, 2);
  } else {
    // Lateral (left o right)
    const flip = facing === 'left';
    ctx.save();
    if (flip) {
      ctx.scale(-1, 1);
      ctx.translate(-16, 0);
    }

    // Cabello
    ctx.fillStyle = '#b8540b';
    ctx.fillRect(4, 1 + bob, 7, 5);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(5, 2 + bob, 5, 3);

    // Rostro lateral
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(7, 5 + bob, 5, 4);
    // Ojo
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(9, 6 + bob, 2, 2);

    // Chaqueta
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(4, 9 + bob, 7, 5);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(5, 9 + bob, 5, 4);

    // Brazo lateral oscilante
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(5 + legOffset, 11 + bob, 3, 3);

    // Pantalón lateral
    ctx.fillStyle = '#263445';
    ctx.fillRect(5, 14, 5, 3);

    // Calzado
    ctx.fillStyle = '#e5dfd5';
    ctx.fillRect(4 + legOffset, 16, 4, 2);
    ctx.fillRect(6 - legOffset, 16, 4, 2);

    ctx.restore();
  }

  ctx.restore();
}

/** Dibuja un clúster de servidores de IA con LEDs titilantes. */
export function drawServerRack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = 24,
  height = 42,
  time = 0,
  seed = 1,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Marco exterior
  ctx.fillStyle = '#16131f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(1, 1, width - 2, 1); // Luz superior
  ctx.fillStyle = '#0d0a13';
  ctx.fillRect(0, height - 1, width, 1); // Sombra base

  // Ranuras de servidores
  const blades = Math.floor((height - 4) / 6);
  for (let i = 0; i < blades; i++) {
    const by = 3 + i * 6;
    ctx.fillStyle = '#1f1b2c';
    ctx.fillRect(2, by, width - 4, 5);
    ctx.fillStyle = '#2d273e';
    ctx.fillRect(2, by, width - 4, 1);

    // Rejilla de ventilación
    ctx.fillStyle = '#120f1a';
    ctx.fillRect(4, by + 2, width - 14, 2);

    // LEDs de actividad de inferencia (cian, verde, naranja)
    const t = time * 2 + seed + i;
    const led1On = Math.sin(t * 3.7) > -0.2;
    const led2On = Math.cos(t * 2.3) > 0.1;
    const led3On = Math.sin(t * 5.1) > 0.4;

    ctx.fillStyle = led1On ? '#00e5ff' : '#00363d';
    ctx.fillRect(width - 9, by + 2, 2, 2);

    ctx.fillStyle = led2On ? '#4cc47a' : '#143820';
    ctx.fillRect(width - 6, by + 2, 2, 2);

    ctx.fillStyle = led3On ? '#f7931a' : '#452605';
    ctx.fillRect(width - 3, by + 2, 2, 2);
  }

  ctx.restore();
}

/** Dibuja una terminal de cómputo CRT con monitor de fósforo verde y teclado. */
export function drawComputerTerminal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active = true,
  time = 0,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Sombra en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-2, 24, 32, 6);

  // Mesa / pedestal metálico
  ctx.fillStyle = '#3a3347';
  ctx.fillRect(2, 16, 24, 10);
  ctx.fillStyle = '#262130';
  ctx.fillRect(4, 22, 20, 4);

  // Teclado con teclas blancas
  ctx.fillStyle = '#4f475e';
  ctx.fillRect(4, 17, 20, 4);
  ctx.fillStyle = '#e2dcce';
  for (let k = 5; k < 23; k += 3) {
    ctx.fillRect(k, 18, 2, 1);
  }

  // Carcasa del monitor CRT
  ctx.fillStyle = '#2b2536';
  ctx.fillRect(3, 0, 22, 17);
  ctx.fillStyle = '#403750';
  ctx.fillRect(4, 1, 20, 1);

  // Pantalla de fósforo verde
  ctx.fillStyle = active ? '#081a0e' : '#0f1411';
  ctx.fillRect(5, 2, 18, 12);

  if (active) {
    // Líneas de texto / código verde fosforescente
    ctx.fillStyle = '#4cc47a';
    ctx.fillRect(7, 4, 12, 1);
    ctx.fillRect(7, 6, 8, 1);
    ctx.fillRect(7, 8, 14, 1);

    // Cursor parpadeante
    if (Math.sin(time * 5) > 0) {
      ctx.fillStyle = '#7ef59b';
      ctx.fillRect(7, 10, 3, 2);
    }
  }

  ctx.restore();
}

/** Dibuja el badge flotante interactivo [ E ] en pixel art. */
export function drawInteractionPrompt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time = 0,
): void {
  ctx.save();
  const floatY = y + Math.sin(time * 5) * 3;
  ctx.translate(Math.round(x), Math.round(floatY));

  // Sombra suave del icono
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-1, 15, 16, 4);

  // Marco exterior naranja Bitcoin / Alerta
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, 14, 14);

  ctx.fillStyle = '#f7931a';
  ctx.fillRect(1, 1, 12, 12);

  ctx.fillStyle = '#ffd08a';
  ctx.fillRect(1, 1, 12, 2); // Brillo superior

  // Letra "E" pixelada
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(4, 4, 6, 2); // barra sup
  ctx.fillRect(4, 6, 2, 4); // columna izq
  ctx.fillRect(4, 7, 5, 2); // barra central
  ctx.fillRect(4, 9, 6, 2); // barra inf

  ctx.restore();
}

/** Dibuja cinta de peligro diagonal (hazard tape amarillo/negro). */
export function drawHazardTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height = 8,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#f7931a';
  for (let i = -height; i < width + height; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, height);
    ctx.lineTo(i + 6, height);
    ctx.lineTo(i + 12, 0);
    ctx.lineTo(i + 6, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Borde técnico
  ctx.fillStyle = '#3a2e47';
  ctx.fillRect(0, 0, width, 1);
  ctx.fillRect(0, height - 1, width, 1);

  ctx.restore();
}

/** Dibuja cajas de suministros / módulos de hardware con refuerzo en X. */
export function drawSupplyCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 20,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Madera tecnológica / caja de transporte
  ctx.fillStyle = '#6d4c30';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#8f6542';
  ctx.fillRect(1, 1, size - 2, size - 2);

  // Marco de metal
  ctx.fillStyle = '#4a382b';
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  // Refuerzo en X
  ctx.strokeStyle = '#573c26';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(size - 2, size - 2);
  ctx.moveTo(size - 2, 2);
  ctx.lineTo(2, size - 2);
  ctx.stroke();

  // Remaches en esquinas
  ctx.fillStyle = '#c4aa8e';
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillRect(size - 4, 2, 2, 2);
  ctx.fillRect(2, size - 4, 2, 2);
  ctx.fillRect(size - 4, size - 4, 2, 2);

  ctx.restore();
}

/** Dibuja cables en el suelo con chispas eléctricas ocasionales. */
export function drawFloorCable(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  spark = false,
  color = '#252033',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo((startX + endX) / 2, Math.max(startY, endY) + 6, endX, endY);
  ctx.stroke();

  if (spark) {
    const midX = (startX + endX) / 2;
    const midY = Math.max(startY, endY) + 6;
    ctx.fillStyle = '#ffd978';
    ctx.fillRect(midX - 2, midY - 2, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(midX - 1, midY - 1, 2, 2);
  }
  ctx.restore();
}

/** Dibuja proyección holográfica de IA (Lía en cian o Alucinador en magenta/rojo). */
export function drawHologramEntity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: 'lia' | 'alucinador',
  time = 0,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const pulse = Math.sin(time * 4) * 0.15 + 0.85;
  const isLia = variant === 'lia';
  const colorPrimary = isLia ? 'rgba(0, 229, 255, 0.75)' : 'rgba(255, 23, 68, 0.75)';
  const colorGlow = isLia ? 'rgba(0, 229, 255, 0.25)' : 'rgba(213, 0, 249, 0.25)';

  // Proyector en el suelo
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(4, 24, 16, 4);
  ctx.fillStyle = colorPrimary;
  ctx.fillRect(8, 24, 8, 2);

  // Cono de luz ascendente
  const grad = ctx.createLinearGradient(12, 24, 12, 0);
  grad.addColorStop(0, colorGlow);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(12, 24);
  ctx.lineTo(0, 0);
  ctx.lineTo(24, 0);
  ctx.closePath();
  ctx.fill();

  // Avatar digital / Silueta flotante
  ctx.globalAlpha = pulse;
  const floatBob = Math.sin(time * 3) * 3;

  ctx.fillStyle = colorPrimary;
  // Cabeza
  ctx.fillRect(8, 4 + floatBob, 8, 6);
  // Ojos luminosos
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 6 + floatBob, 2, 2);
  ctx.fillRect(13, 6 + floatBob, 2, 2);

  // Cuerpo geométrico flotante
  ctx.fillStyle = colorPrimary;
  ctx.fillRect(7, 11 + floatBob, 10, 8);

  // Líneas de scanline holográfico
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  for (let s = 4; s < 22; s += 2) {
    ctx.fillRect(6, s + floatBob, 12, 1);
  }

  ctx.restore();
}
