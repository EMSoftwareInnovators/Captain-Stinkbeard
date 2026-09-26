import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { UiLayer } from './UiLayer.js';
import { EQUIPMENT_SLOTS } from '../../config/constants.js';

export const STAT_NAMES = { maxHp: 'Max HP', attack: 'Attack', defense: 'Defense', speed: 'Speed', luck: 'Luck' };
export const SLOT_NAMES = { weapon: 'Weapon', body: 'Coat', feet: 'Boots', accessory: 'Trinket' };

/** Draws a thin gauge (bar) with a dark rim. */
export function gauge(scene, layer, x, y, w, pct, color, depth) {
  layer.add(scene.add.rectangle(x - 1, y - 1, w + 2, 5, 0x0a0810).setOrigin(0).setDepth(depth));
  const fw = Math.max(pct > 0 ? 1 : 0, Math.round(w * Math.max(0, Math.min(1, pct))));
  if (fw) {
    layer.add(scene.add.rectangle(x, y, fw, 3, color).setOrigin(0).setDepth(depth + 1));
    layer.add(scene.add.rectangle(x, y, fw, 1, 0xffffff, 0.3).setOrigin(0).setDepth(depth + 2));
  }
}

/**
 * Party status: portrait, level, HP, experience, stats, equipment and
 * Captain's Orders. Read-only; cycles members with up/down when there are
 * several.
 */
export class StatusPage {
  constructor(scene, rect) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.layer = new UiLayer(scene);
    this.memberIndex = 0;
  }

  get members() {
    return this.app.session.party.members;
  }

  render() {
    this.layer.clear();
    const { scene, layer, rect } = this;
    const D = 20;
    const content = this.app.content;
    const ch = this.members[this.memberIndex];
    const x = rect.x + 10;
    let y = rect.y + 10;
    layer.add(addPanel(scene, x - 2, y - 2, 56, 56, { style: 'inset', depth: D }));
    const portraitId = ch.def.portrait ?? ch.id;
    const frame = `${portraitId}_neutral`;
    if (scene.textures.getFrame('portraits', frame)) layer.add(scene.add.image(x + 2, y + 2, 'portraits', frame).setOrigin(0).setDepth(D + 1));
    const tx = x + 62;
    layer.add(addText(scene, tx, y, ch.name, { font: 'bold', depth: D + 1 }));
    layer.add(addText(scene, tx, y + 14, `${ch.def.title ?? ''}  <k>Level</> ${ch.level}`, { depth: D + 1 }));
    layer.add(addText(scene, tx, y + 27, `<k>HP</>  ${ch.hp}/${ch.maxHp}`, { depth: D + 1 }));
    gauge(scene, layer, tx + 70, y + 30, 70, ch.hp / ch.maxHp, ch.hp > ch.maxHp / 4 ? 0x6cc050 : 0xe05040, D + 1);
    const next = ch.xpToNext();
    const prog = ch.progression;
    const span = prog.xpForLevel(ch.level + 1) - prog.xpForLevel(ch.level);
    const into = ch.xp - prog.xpForLevel(ch.level);
    layer.add(addText(scene, tx, y + 40, next > 0 ? `<k>Next</>  ${next} XP` : '<k>Next</>  —', { depth: D + 1 }));
    gauge(scene, layer, tx + 70, y + 43, 70, span > 0 ? into / span : 1, 0x6a8ad8, D + 1);

    y = rect.y + 76;
    layer.add(addText(scene, x, y, 'STATS', { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    const stats = ch.stats();
    Object.entries(STAT_NAMES).forEach(([k, label], i) => {
      const ry = y + 15 + i * 11;
      layer.add(addText(scene, x, ry, label, { color: UI_COLORS.dim, depth: D + 1 }));
      const v = addText(scene, 0, ry, String(stats[k]), { depth: D + 1 });
      v.x = x + 82 - v.textWidth;
      layer.add(v);
      const bonus = ch.equipmentBonus(k);
      if (bonus) layer.add(addText(scene, x + 86, ry, bonus > 0 ? `<g>+${bonus}</>` : `<r>${bonus}</>`, { depth: D + 1 }));
    });

    const ex = rect.x + 118;
    layer.add(addText(scene, ex, y, 'GEAR', { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    EQUIPMENT_SLOTS.forEach((slot, i) => {
      const ry = y + 15 + i * 11;
      const itemId = ch.equipment[slot];
      const def = itemId ? content.items.get(itemId) : null;
      if (def?.icon) layer.add(scene.add.image(ex, ry - 3, 'ui', `icon_${def.icon}`).setOrigin(0).setDepth(D + 1));
      layer.add(addText(scene, ex + 18, ry, def ? def.name : `<k>no ${SLOT_NAMES[slot].toLowerCase()}</>`, { depth: D + 1 }));
    });

    y = rect.y + 150;
    layer.add(addText(scene, x, y, "CAPTAIN'S ORDERS", { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    const orders = ch.abilities.map((id) => content.abilities.get(id)).filter((a) => a && a.kind === 'order');
    if (!orders.length) layer.add(addText(scene, x, y + 15, '<k>None yet.</>', { depth: D + 1 }));
    orders.forEach((ab, i) => {
      const cost = Object.values(ab.cost ?? {})[0] ?? 0;
      layer.add(addText(scene, x, y + 15 + i * 11, `${ab.name}  <y>${cost} CMD</>`, { depth: D + 1 }));
      layer.add(addText(scene, x + 88, y + 15 + i * 11, `<k>${shortDescription(ab.description)}</>`, { depth: D + 1 }));
    });
    const learnset = (ch.def.learnset || []).filter((e) => e.level > ch.level);
    if (learnset.length) {
      const nextAb = content.abilities.get(learnset[0].ability);
      layer.add(addText(scene, x, rect.y + rect.h - 16, `<k>Learns</> ${nextAb?.name ?? learnset[0].ability} <k>at level ${learnset[0].level}</>`, { depth: D + 1 }));
    }
  }

  focus() {
    return this.members.length > 1;
  }

  update(input) {
    if (input.pressed('cancel')) {
      input.consume('cancel');
      return 'exit';
    }
    let d = 0;
    if (input.repeat('down')) d = 1;
    if (input.repeat('up')) d = -1;
    if (d) {
      this.memberIndex = (this.memberIndex + d + this.members.length) % this.members.length;
      this.app.audio.ui('cursor');
      this.render();
    }
    return null;
  }

  destroy() {
    this.layer.clear();
  }
}

function shortDescription(text = '') {
  const s = text.replace(/^Captain's Order\.\s*/, '');
  return s.length > 22 ? `${s.slice(0, 21)}…` : s;
}
