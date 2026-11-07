import type { PanelCtx } from './common';

/** El combate final se dibuja en TileEngine; este adaptador conserva imports antiguos. */
export function openBossFinal(ctx: PanelCtx): () => void {
  ctx.host.hidden = true;
  ctx.host.replaceChildren();
  return () => undefined;
}
