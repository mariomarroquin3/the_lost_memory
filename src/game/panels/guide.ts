import type { World } from '../../shared/reducer.js';

/** Guía del jugador: qué hacer, en pocas palabras. */
export function guideHtml(world: World, solo: boolean): string {
  const start = world === 'real' ? 'Recepción' : 'la Puerta de transición';
  const steps: Array<[string, string, string]> = [
    ['🎯', 'Tu misión', `Recupera los fragmentos de memoria de Lía. Cada sala tiene una <b>terminal</b> con un reto. Al resolverlo, se abre la puerta siguiente.`],
    ['🧱', 'Primero: el muro falso', `En la pared izquierda de ${start} hay un panel que sopla aire (flecha azul). Pulsa <b>E</b>, repite las luces y se abre la <b>sala de comunicaciones</b>.`],
    solo
      ? ['⇄', 'Dos mundos, un jugador', 'Muchas salas necesitan un dato del otro mundo. Usa el <b>portal</b> de la sala de comunicaciones para cambiar de mundo y leerlo.']
      : ['💡', 'Habla con la pared de luces', 'Tu compañero está en el otro mundo y solo podéis hablar con luces. Pulsad las bombillas para escribir. Primero mandad vuestra <b>clave</b> y confirmad la del otro.'],
    ['🔎', 'Busca los chips', 'Los datos que necesita el otro mundo son <b>chips que brillan en el suelo</b>. Léelos con <b>E</b> y pásalos. Ejemplo: <b>S1 4 5 10</b>.'],
    ['▶', 'Si te pierdes', 'Mira la línea <b>▶</b> del panel de arriba a la derecha: siempre dice qué hacer ahora. Pulsa <b>G</b> para volver a ver esta guía.'],
  ];
  return `<section class="puzzle crt-panel rp guide" role="dialog" aria-modal="true">
    <div class="puzzle__head"><h2>MANUAL DEL JUGADOR</h2><button type="button" class="btn-retro" data-close>Empezar (Esc)</button></div>
    <ol class="guide__steps">${steps.map(([icon, title, text]) => `<li><span class="guide__icon">${icon}</span><div><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
    <p class="rp-small">Controles: flechas o WASD para caminar · E para usar · Esc para cerrar · M música · F pantalla completa.</p>
  </section>`;
}
