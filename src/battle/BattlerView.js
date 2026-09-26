import * as Phaser from 'phaser';

const PARTY_FOOT = 46 / 48;

/**
 * On-screen representation of one Combatant: sprite, shadow, status icons
 * and (for enemies) a small HP gauge. Purely presentational; all numbers
 * come from the BattleEngine's Combatant.
 */
export class BattlerView {
  constructor(scene, combatant, { x, y }) {
    this.scene = scene;
    this.c = combatant;
    this.homeX = x;
    this.homeY = y;
    this.isParty = combatant.side === 'party';
    this.texture = this.isParty ? `battle_${combatant.def.id}` : `enemy_${combatant.def.sprite ?? combatant.def.id}`;
    const first = this.isParty ? 'ready' : 'battle_idle0';
    this.sprite = scene.add.sprite(x, y, this.texture, first).setOrigin(0.5, this.isParty ? PARTY_FOOT : 1);
    const fw = this.sprite.frame.width;
    this.bodyHeight = this.isParty ? 40 : Math.max(12, this.sprite.frame.height - 4);
    this.shadow = scene.add.image(x, y, 'fx', fw >= 56 ? 'shadow_l' : fw >= 36 ? 'shadow_m' : 'shadow_s').setOrigin(0.5, 0.6);
    // Side-view enemies face right with their tails behind: centre the shadow on the body.
    this.shadowDx = this.isParty ? 0 : Math.round(fw * 0.1);
    this.icons = [];
    this.hpBar = null;
    this.hpTimer = null;
    this.dead = false;
    this.updateDepth();
    this.idle();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  /** Where effects and numbers should appear. */
  get hitX() {
    return Math.round(this.sprite.x + (this.isParty ? -2 : 2));
  }

  get hitY() {
    return Math.round(this.sprite.y - this.bodyHeight * 0.55);
  }

  get headY() {
    return Math.round(this.sprite.y - this.bodyHeight - 2);
  }

  updateDepth() {
    this.sprite.setDepth(100 + this.sprite.y);
    this.shadow.setDepth(99);
    this.shadow.setPosition(Math.round(this.sprite.x) + this.shadowDx, Math.round(this.homeY));
  }

  animKey(name) {
    return this.isParty ? `${this.texture}:${name}` : `${this.texture}:battle_${name}`;
  }

  idle() {
    if (this.dead) return;
    if (this.isParty && !this.c.isAlive()) {
      this.pose('ko');
      return;
    }
    if (this.isParty && this.c.hasStatus('defending')) {
      this.pose('defend');
      return;
    }
    this.sprite.play(this.isParty ? this.animKey('ready') : this.animKey('idle'), true);
  }

  pose(name) {
    this.sprite.stop();
    this.sprite.setFrame(this.isParty ? name : `battle_${name}`);
  }

  playVictory() {
    if (this.c.isAlive()) this.sprite.play(this.animKey('victory'), true);
  }

  moveTo(x, y, duration, ease = 'Quad.Out') {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        x,
        y,
        duration,
        ease,
        onUpdate: () => this.updateDepth(),
        onComplete: () => {
          this.updateDepth();
          resolve();
        },
      });
    });
  }

  returnHome(duration = 220) {
    return this.moveTo(this.homeX, this.homeY, duration, 'Quad.InOut');
  }

  flash(color = 0xffffff, ms = 70) {
    this.sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  /** Recoil on taking damage. */
  hurt() {
    this.pose('hurt');
    this.flash(0xffffff, 60);
    const baseX = this.sprite.x;
    const dir = this.isParty ? 1 : -1;
    this.scene.tweens.add({
      targets: this.sprite,
      x: { from: baseX + dir * 3, to: baseX },
      duration: 240,
      ease: 'Bounce.Out',
    });
    this.scene.time.delayedCall(360, () => {
      if (!this.dead) this.idle();
    });
  }

  /** Knock-out: enemies flicker and fade; party members collapse. */
  ko() {
    if (this.isParty) {
      this.pose('ko');
      this.clearIcons();
      return Promise.resolve();
    }
    this.dead = true;
    this.clearIcons();
    this.hideHp();
    this.pose('hurt');
    this.sprite.setTint(0xff9090).setTintMode(Phaser.TintModes.FILL);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: [this.sprite, this.shadow],
        alpha: { from: 1, to: 0 },
        duration: 420,
        ease: 'Stepped',
        easeParams: [6],
        onComplete: () => {
          this.sprite.setVisible(false);
          this.shadow.setVisible(false);
          resolve();
        },
      });
    });
  }

  revive() {
    this.dead = false;
    this.sprite.setVisible(true).setAlpha(1).clearTint();
    this.shadow.setVisible(true).setAlpha(1);
    this.idle();
  }

  clearIcons() {
    this.icons.forEach((i) => i.destroy());
    this.icons = [];
  }

  /** Status icons in a row above the head. */
  refreshStatuses() {
    this.clearIcons();
    if (this.dead || !this.c.isAlive()) return;
    const ids = this.c.statusIds().filter((id) => this.scene.textures.getFrame('ui', `status_${id}`));
    const total = ids.length * 8 - 2;
    let x = Math.round(this.homeX - total / 2);
    for (const id of ids) {
      this.icons.push(this.scene.add.image(x, this.headY - 8, 'ui', `status_${id}`).setOrigin(0, 0).setDepth(900));
      x += 8;
    }
  }

  /** Small HP gauge under an enemy (shown while targeting or after a hit). */
  showHp(ms = 1400) {
    if (this.isParty || this.dead) return;
    const w = 26;
    const x = Math.round(this.homeX - w / 2);
    const y = this.homeY + 4;
    if (!this.hpBar) {
      const bg = this.scene.add.rectangle(x - 1, y - 1, w + 2, 5, 0x0a0810).setOrigin(0).setDepth(890);
      const fill = this.scene.add.rectangle(x, y, w, 3, 0x6cc050).setOrigin(0).setDepth(891);
      this.hpBar = { bg, fill, w };
    }
    const pct = Math.max(0, this.c.hp / this.c.maxHp);
    this.hpBar.fill.width = Math.max(pct > 0 ? 1 : 0, Math.round(w * pct));
    this.hpBar.fill.fillColor = pct > 0.5 ? 0x6cc050 : pct > 0.25 ? 0xe8b830 : 0xe05040;
    this.hpBar.bg.setVisible(true);
    this.hpBar.fill.setVisible(true);
    this.hpTimer?.remove();
    this.hpTimer = ms > 0 ? this.scene.time.delayedCall(ms, () => this.hideHp()) : null;
  }

  hideHp() {
    this.hpTimer?.remove();
    this.hpTimer = null;
    if (!this.hpBar) return;
    this.hpBar.bg.setVisible(false);
    this.hpBar.fill.setVisible(false);
  }

  destroy() {
    this.clearIcons();
    this.hideHp();
    this.hpBar?.bg.destroy();
    this.hpBar?.fill.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
