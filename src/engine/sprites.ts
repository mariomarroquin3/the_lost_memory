/**
 * Sprites y props procedimentales dibujados por código en Pixel Art.
 * Basado estrictamente en la dirección visual de Proyecto 21 (SKILL_designs.md y movie_mode_SKILL.md)
 * adaptado a la temática de Inteligencia Artificial (Genesis 2097).
 */

export interface SpriteRenderer {
  context: CanvasRenderingContext2D;
}

/** Dibuja a Kiro (protagonista Sato) con orientación y animación de pasos (16x16). */
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
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, 1 + bob, 8, 4);
    ctx.fillStyle = '#3a2d45';
    ctx.fillRect(5, 2 + bob, 6, 2);

    // Rostro
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(4, 5 + bob, 8, 4);
    // Ojos
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(5, 6 + bob, 2, 2);
    ctx.fillRect(9, 6 + bob, 2, 2);

    // Chaqueta naranja bitcoin / Genesis
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(3, 9 + bob, 10, 5);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(4, 9 + bob, 8, 4);
    // Detalle cuello / logo Genesis
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(7, 10 + bob, 2, 2);

    // Brazos
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(2, 10 + bob, 2, 3);
    ctx.fillRect(12, 10 + bob, 2, 3);

    // Pantalones azules #3b5a9a
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(4, 14, 3, 3 + legOffset);
    ctx.fillRect(9, 14, 3, 3 - legOffset);

    // Calzado
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(3, 16 + legOffset, 4, 2);
    ctx.fillRect(9, 16 - legOffset, 4, 2);
  } else if (facing === 'up') {
    // Cabello posterior
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, 1 + bob, 8, 7);
    ctx.fillStyle = '#3a2d45';
    ctx.fillRect(5, 2 + bob, 6, 4);

    // Chaqueta (espalda)
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(3, 8 + bob, 10, 6);
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(4, 9 + bob, 8, 4);
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(4, 11 + bob, 8, 1);

    // Brazos
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(2, 9 + bob, 2, 4);
    ctx.fillRect(12, 9 + bob, 2, 4);

    // Pantalones
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(4, 14, 3, 3 - legOffset);
    ctx.fillRect(9, 14, 3, 3 + legOffset);

    // Calzado
    ctx.fillStyle = '#ece3d6';
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
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, 1 + bob, 7, 5);
    ctx.fillStyle = '#3a2d45';
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
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(5, 14, 5, 3);

    // Calzado
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(4 + legOffset, 16, 4, 2);
    ctx.fillRect(6 - legOffset, 16, 4, 2);

    ctx.restore();
  }

  ctx.restore();
}

/** Animación de Kiro despertando en el suelo (Cinemática de inicio). */
export function drawKiroWakingUpSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number, // 0.0 a 1.0
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Sombra alargada en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(8, 16, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (progress < 0.4) {
    // Fase 1: Kiro tendido en el suelo inconsciente
    // Piernas extendidas
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(0, 14, 8, 3);
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(0, 15, 3, 2);

    // Torso naranja en el suelo
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(6, 12, 8, 4);
    ctx.fillStyle = '#c46a0c';
    ctx.fillRect(6, 15, 8, 1);

    // Cabeza apoyada de lado, ojos cerrados
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(12, 10, 6, 5);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(14, 9, 5, 3); // Pelo
    // Línea de ojo cerrado
    ctx.fillStyle = '#3a2d45';
    ctx.fillRect(14, 12, 2, 1);
  } else if (progress < 0.75) {
    // Fase 2: Apoyándose sobre el codo, levantando el torso
    const lift = Math.round((progress - 0.4) * 8);

    // Piernas dobladas
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(2, 13, 6, 4);
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(1, 15, 4, 2);

    // Torso semi-inclinado
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(5, 10 - lift, 8, 5);
    // Brazo de apoyo en el suelo
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(3, 14, 2, 3);

    // Cabeza incorporándose
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(8, 6 - lift, 6, 5);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(9, 5 - lift, 6, 3);
    // Ojo entreabierto
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(11, 8 - lift, 2, 1);
  } else {
    // Fase 3: De rodillas y poniéndose de pie
    const standProgress = (progress - 0.75) / 0.25;
    const offsetY = Math.round((1 - standProgress) * 4);

    // Piernas
    ctx.fillStyle = '#3b5a9a';
    ctx.fillRect(4, 13 + offsetY, 4, 3);
    ctx.fillRect(8, 12 + offsetY, 4, 4);
    ctx.fillStyle = '#ece3d6';
    ctx.fillRect(3, 15 + offsetY, 4, 2);
    ctx.fillRect(8, 15 + offsetY, 4, 2);

    // Torso
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(3, 8 + offsetY, 10, 5);
    // Cabeza
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(4, 4 + offsetY, 8, 4);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(4, 2 + offsetY, 8, 3);
    // Ojos abiertos
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(5, 5 + offsetY, 2, 2);
    ctx.fillRect(9, 5 + offsetY, 2, 2);
  }

  ctx.restore();
}

/** Dibuja el dron asistente de IA (inspirado en el oso blanco/mascota de Proyecto 21). */
export function drawAIDroneCompanion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time = 0,
): void {
  ctx.save();
  const hoverY = y + Math.sin(time * 3) * 2;
  ctx.translate(Math.round(x), Math.round(hoverY));

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(14, 24, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo blanco/crema del dron cuadrúpedo/mecánico
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(2, 4, 24, 16);

  ctx.fillStyle = '#ece3d6';
  ctx.fillRect(3, 5, 22, 14);

  // Orejas / sensores
  ctx.fillStyle = '#ece3d6';
  ctx.fillRect(19, 1, 3, 4);
  ctx.fillRect(23, 1, 3, 4);

  // Ojo / visor azul cian con parpadeo suave
  const eyeBlink = Math.sin(time * 0.8) > 0.95;
  ctx.fillStyle = eyeBlink ? '#1a1420' : '#00e5ff';
  ctx.fillRect(21, 6, 4, 2);

  // Collar / anillo naranja con sello
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(18, 9, 3, 5);

  // Patas mecánicas
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(4, 18, 5, 4);
  ctx.fillRect(11, 18, 5, 4);
  ctx.fillRect(18, 18, 5, 4);

  ctx.fillStyle = '#dcd5c6';
  ctx.fillRect(5, 18, 3, 4);
  ctx.fillRect(12, 18, 3, 4);
  ctx.fillRect(19, 18, 3, 4);

  ctx.restore();
}

/** Dibuja rack de servidores caído en el suelo (movie_mode_SKILL.md). */
export function drawFallenRack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(1, 2, 32, 14);

  // Carcasa caída horizontal
  ctx.fillStyle = '#16131f';
  ctx.fillRect(0, 0, 30, 12);
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(1, 1, 28, 2);

  // Paneles doblados
  ctx.fillStyle = '#1f1b2c';
  ctx.fillRect(2, 3, 12, 8);
  ctx.fillRect(16, 3, 12, 8);

  // LED quemado / cables sueltos
  ctx.fillStyle = '#ff1744';
  ctx.fillRect(26, 5, 2, 2);

  ctx.strokeStyle = '#c46a0c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 6);
  ctx.lineTo(36, 9);
  ctx.lineTo(39, 7);
  ctx.stroke();

  ctx.restore();
}

/** Dibuja montones de escombros de concreto (movie_mode_SKILL.md). */
export function drawRubblePile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(1, 4, 18, 6);

  // Rocas grandes
  ctx.fillStyle = '#3b3836';
  ctx.fillRect(2, 2, 7, 5);
  ctx.fillRect(8, 0, 8, 7);
  ctx.fillRect(14, 3, 5, 4);

  // Luces de aristas
  ctx.fillStyle = '#5b5650';
  ctx.fillRect(3, 2, 5, 2);
  ctx.fillRect(9, 1, 6, 2);
  ctx.fillRect(15, 3, 3, 1);

  // Piedrecitas dispersas
  ctx.fillStyle = '#3b3836';
  ctx.fillRect(0, 6, 2, 2);
  ctx.fillRect(19, 5, 2, 2);

  ctx.restore();
}

/** Dibuja luz de emergencia en la pared con alarma roja intermitente a 2 Hz (movie_mode_SKILL.md). */
export function drawEmergencyLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active: boolean,
  time = 0,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Soporte de pared metálico
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, 8, 12);
  ctx.fillStyle = '#3a3347';
  ctx.fillRect(1, 1, 6, 10);

  // Bombilla roja
  const flash = active && Math.sin(time * Math.PI * 4) > 0;
  ctx.fillStyle = flash ? '#ff1744' : '#5e141a';
  ctx.fillRect(2, 3, 4, 6);

  if (flash) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 4, 2, 2);
  }

  ctx.restore();
}

/** Dibuja charco reflectante en el suelo (movie_mode_SKILL.md). */
export function drawPuddle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = 24,
  height = 10,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#121820';
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Reflejo tenue cian / azul
  ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.beginPath();
  ctx.ellipse(width / 2 + 2, height / 2, width / 3, height / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Dibuja vidrios rotos en el suelo con destellos. */
export function drawBrokenGlass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#8fe0e8';
  ctx.fillRect(0, 2, 3, 2);
  ctx.fillRect(4, 0, 2, 3);
  ctx.fillRect(6, 3, 3, 2);
  ctx.fillRect(2, 4, 2, 1);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 2, 1, 1);
  ctx.fillRect(5, 1, 1, 1);

  ctx.restore();
}

/** Dibuja hojas de papel dispersas por el suelo con líneas de texto (Imagen 1). */
export function drawScatteredPapers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle = 0,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(1, 1, 10, 8);

  ctx.fillStyle = '#ece3d6';
  ctx.fillRect(0, 0, 10, 8);

  ctx.fillStyle = '#9d93a9';
  ctx.fillRect(2, 2, 6, 1);
  ctx.fillRect(2, 4, 5, 1);
  ctx.fillRect(2, 6, 4, 1);

  ctx.restore();
}

/** Dibuja pequeñas pepitas de oro / celdas de energía dorada (Imagen 1). */
export function drawEnergyNuggets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#c46a0c';
  ctx.fillRect(0, 2, 7, 5);
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(1, 2, 5, 4);
  ctx.fillStyle = '#ffd978';
  ctx.fillRect(2, 3, 2, 2);

  ctx.fillStyle = '#c46a0c';
  ctx.fillRect(5, 0, 6, 4);
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(6, 1, 4, 3);
  ctx.fillStyle = '#ffd978';
  ctx.fillRect(7, 1, 2, 1);

  ctx.fillStyle = '#c46a0c';
  ctx.fillRect(8, 3, 5, 4);
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(9, 4, 3, 3);

  ctx.restore();
}

/** Dibuja estantería de libros / archivos (Imagen 1). */
export function drawBookshelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = 38,
  height = 28,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#4a2f1b';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#6d4c30';
  ctx.fillRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = '#3b2515';
  ctx.fillRect(1, Math.floor(height / 2), width - 2, 2);

  const bookColors = ['#e05252', '#3b5a9a', '#e0b23c', '#4cc47a', '#ece3d6', '#f7931a', '#9b6bd6'];
  let curX = 3;
  let colorIdx = 0;
  while (curX < width - 5) {
    const bw = 2 + (colorIdx % 3 === 0 ? 1 : 0);
    ctx.fillStyle = bookColors[colorIdx % bookColors.length];
    ctx.fillRect(curX, 3, bw, Math.floor(height / 2) - 4);
    curX += bw + 1;
    colorIdx++;
  }

  curX = 3;
  while (curX < width - 5) {
    const bw = 2 + (colorIdx % 2 === 0 ? 1 : 0);
    ctx.fillStyle = bookColors[(colorIdx + 3) % bookColors.length];
    ctx.fillRect(curX, Math.floor(height / 2) + 3, bw, height - Math.floor(height / 2) - 6);
    curX += bw + 1;
    colorIdx++;
  }

  ctx.restore();
}

/** Dibuja caja de suministros de madera con refuerzo en X (Imagen 1 y 2). */
export function drawSupplyCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 20,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = '#5e3b25';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#734a33';
  ctx.fillRect(1, 1, size - 2, size - 2);

  ctx.fillStyle = '#4a2e1c';
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  ctx.strokeStyle = '#4a2e1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(size - 2, size - 2);
  ctx.moveTo(size - 2, 2);
  ctx.lineTo(2, size - 2);
  ctx.stroke();

  ctx.fillStyle = '#c4aa8e';
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillRect(size - 4, 2, 2, 2);
  ctx.fillRect(2, size - 4, 2, 2);
  ctx.fillRect(size - 4, size - 4, 2, 2);

  ctx.restore();
}

/** Dibuja cinta de peligro diagonal (hazard tape amarillo/negro) (Imagen 1). */
export function drawHazardTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height = 10,
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

  ctx.fillStyle = '#3a2e47';
  ctx.fillRect(0, 0, width, 1);
  ctx.fillRect(0, height - 1, width, 1);

  ctx.restore();
}

/** Dibuja clúster de servidores con LEDs titilantes. */
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

  ctx.fillStyle = '#16131f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(1, 1, width - 2, 1);
  ctx.fillStyle = '#0d0a13';
  ctx.fillRect(0, height - 1, width, 1);

  const blades = Math.floor((height - 4) / 6);
  for (let i = 0; i < blades; i++) {
    const by = 3 + i * 6;
    ctx.fillStyle = '#1f1b2c';
    ctx.fillRect(2, by, width - 4, 5);
    ctx.fillStyle = '#2d273e';
    ctx.fillRect(2, by, width - 4, 1);

    ctx.fillStyle = '#120f1a';
    ctx.fillRect(4, by + 2, width - 14, 2);

    const t = time * 2 + seed + i;
    const led1On = Math.sin(t * 3.7) > -0.2;
    const led2On = Math.cos(t * 2.3) > 0.1;
    const led3On = Math.sin(t * 5.1) > 0.4;

    ctx.fillStyle = led1On ? '#4cc47a' : '#143820';
    ctx.fillRect(width - 9, by + 2, 2, 2);

    ctx.fillStyle = led2On ? '#00e5ff' : '#00363d';
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-2, 24, 32, 6);

  ctx.fillStyle = '#3a3347';
  ctx.fillRect(2, 16, 24, 10);
  ctx.fillStyle = '#262130';
  ctx.fillRect(4, 22, 20, 4);

  ctx.fillStyle = '#4f475e';
  ctx.fillRect(4, 17, 20, 4);
  ctx.fillStyle = '#ece3d6';
  for (let k = 5; k < 23; k += 3) {
    ctx.fillRect(k, 18, 2, 1);
  }

  ctx.fillStyle = '#2b2536';
  ctx.fillRect(3, 0, 22, 17);
  ctx.fillStyle = '#403750';
  ctx.fillRect(4, 1, 20, 1);

  ctx.fillStyle = active ? '#041408' : '#0f1411';
  ctx.fillRect(5, 2, 18, 12);

  if (active) {
    ctx.fillStyle = '#4cc47a';
    ctx.fillRect(7, 4, 12, 1);
    ctx.fillRect(7, 6, 8, 1);
    ctx.fillRect(7, 8, 14, 1);

    if (Math.sin(time * 5) > 0) {
      ctx.fillStyle = '#7ef59b';
      ctx.fillRect(7, 10, 3, 2);
    }
  }

  ctx.restore();
}

/** Dibuja el badge flotante interactivo [ E ] en pixel art (Imagen 3). */
export function drawInteractionPrompt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time = 0,
): void {
  ctx.save();
  const floatY = y + Math.sin(time * 5) * 3;
  ctx.translate(Math.round(x), Math.round(floatY));

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-1, 15, 16, 4);

  ctx.fillStyle = '#1a1420';
  ctx.fillRect(0, 0, 14, 14);

  ctx.fillStyle = '#f7931a';
  ctx.fillRect(1, 1, 12, 12);

  ctx.fillStyle = '#ffd08a';
  ctx.fillRect(1, 1, 12, 2);

  ctx.fillStyle = '#1a1420';
  ctx.fillRect(4, 4, 6, 2);
  ctx.fillRect(4, 6, 2, 4);
  ctx.fillRect(4, 7, 5, 2);
  ctx.fillRect(4, 9, 6, 2);

  ctx.restore();
}

/** Dibuja cables en el suelo con chispas eléctricas. */
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

/** Dibuja grietas en la pared o suelo (Imagen 1). */
export function drawWallCracks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.strokeStyle = '#0d0a14';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 8, y + 10);
  ctx.lineTo(x + 6, y + 16);
  ctx.lineTo(x + 14, y + 22);
  ctx.moveTo(x + 8, y + 10);
  ctx.lineTo(x + 16, y + 12);
  ctx.stroke();
  ctx.restore();
}

/** Barra de memoria holográfica: señalética propia de Genesis, no un objeto decorativo externo. */
export function drawMemoryPrism(ctx: CanvasRenderingContext2D, x: number, y: number, room: number, time: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const pulse = 0.55 + Math.sin(time * 2 + room) * 0.2;
  ctx.fillStyle = '#111522';
  ctx.fillRect(0, 0, 100, 12);
  ctx.fillStyle = '#26314a';
  ctx.fillRect(2, 2, 96, 8);
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i < room % 8 ? '#f7931a' : `rgba(0, 229, 255, ${pulse})`;
    ctx.fillRect(6 + i * 11, 4, 7, 4);
  }
  ctx.restore();
}

/** Columna de proyección de contexto, con fallas magenta cuando el Alucinador interviene. */
export function drawHologramColumn(ctx: CanvasRenderingContext2D, x: number, y: number, room: number, time: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const corrupted = Math.sin(time * 1.7 + room) > 0.35;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.fillRect(0, 0, 24, 70);
  ctx.fillStyle = corrupted ? '#d500f9' : '#00e5ff';
  for (let row = 0; row < 8; row += 1) {
    const width = 8 + ((row + room) % 4) * 3;
    ctx.globalAlpha = 0.35 + (row % 3) * 0.15;
    ctx.fillRect(12 - width / 2, 4 + row * 8, width, 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(5, 68, 14, 4);
  ctx.restore();
}

/** Nodo de fibra que comunica las salas y pulsa al ritmo de la sincronización. */
export function drawFiberNode(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, time: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.strokeStyle = '#2f8a4c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(28, -4, 56, 14);
  ctx.stroke();
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(22, 5, 16, 13);
  ctx.fillStyle = Math.sin(time * 3 + seed) > 0 ? '#4cc47a' : '#143820';
  ctx.fillRect(26, 8, 3, 3);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(32, 8, 3, 3);
  ctx.restore();
}

/** Cápsula de contención para recuerdos fragmentados. */
export function drawContainmentPod(ctx: CanvasRenderingContext2D, x: number, y: number, room: number, time: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(0, 0, 0, .35)';
  ctx.fillRect(0, 30, 48, 5);
  ctx.fillStyle = '#3a3347';
  ctx.fillRect(4, 4, 40, 28);
  ctx.fillStyle = '#202b3d';
  ctx.fillRect(8, 7, 32, 20);
  ctx.strokeStyle = '#596a86';
  ctx.strokeRect(9.5, 8.5, 29, 17);
  ctx.fillStyle = room % 2 ? '#00e5ff' : '#d500f9';
  ctx.globalAlpha = 0.45 + Math.sin(time * 2 + room) * 0.15;
  ctx.fillRect(14, 12, 20, 10);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f7931a';
  ctx.fillRect(22, 0, 4, 4);
  ctx.restore();
}

/** Fragmento cristalino que representa una pieza de contexto fuera de fase. */
export function drawSignalShard(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + Math.sin(time * 2) * 2));
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(6, 0);
  ctx.lineTo(12, 8);
  ctx.lineTo(6, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d8fbff';
  ctx.fillRect(5, 4, 2, 5);
  ctx.restore();
}
