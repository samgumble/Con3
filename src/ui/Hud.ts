import { Resources } from "../game/Resources";

/** Minimal DOM resource readout, refreshed each frame from the store. */
export class Hud {
  private el: HTMLElement;

  constructor(private resources: Resources) {
    this.el = document.getElementById("resources") as HTMLElement;
  }

  update(): void {
    const r = this.resources;
    this.el.innerHTML =
      `&#128176; Funding <b>${Math.floor(r.funding)}</b>` +
      ` &nbsp;·&nbsp; &#129521; Materials <b>${r.materials}</b>` +
      ` &nbsp;·&nbsp; &#129690; Steel <b>${r.steel}</b>` +
      ` &nbsp;·&nbsp; &#129704; Concrete <b>${r.concrete}</b>` +
      ` &nbsp;·&nbsp; &#128119; Labor <b>${r.labor}/${r.laborCap}</b>`;
  }
}
