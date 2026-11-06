import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { isWalkable, type Cell, type VenueMap } from "@riftrun/world-protocol";
type Props = { map: VenueMap; cells: Cell[]; paused: boolean; round: number; onFinish: () => void; onBadges: (count: number) => void; movement: { current: { x: number; y: number } } };
export function Game(props: Props) {
  const parent = useRef<HTMLDivElement>(null); const latest = useRef(props); latest.current = props;
  useEffect(() => {
    if (!parent.current) return;
    const map = props.map; const tile = 24;
    class VenueScene extends Phaser.Scene {
      avatar!: Phaser.GameObjects.Container; glow!: Phaser.GameObjects.Arc; cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      wasd!: Record<string, Phaser.Input.Keyboard.Key>; collected = 0; finished = false;
      badges: Phaser.GameObjects.Container[] = [];
      create() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
        this.input.keyboard!.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "SPACE"]);
        const badgePositions = [{ x: 5.5, y: 7.5 }, { x: 20.5, y: 20.5 }, { x: 35.5, y: 6.5 }];
        this.badges = badgePositions.map(p => {
          const diamond = this.add.rectangle(0, 0, 10, 10, 0xffd27e).setAngle(45);
          const halo = this.add.circle(0, 0, 12, 0xffd27e, .14);
          const badge = this.add.container(p.x * tile, p.y * tile, [halo, diamond]);
          this.tweens.add({ targets: diamond, angle: 135, duration: 1600, repeat: -1, yoyo: true }); return badge;
        });
        this.glow = this.add.circle(0, 0, 15, 0xffd2a0, .16);
        const body = this.add.circle(0, 0, 7, 0xfff3d9).setStrokeStyle(2, 0x28101c);
        const eye = this.add.rectangle(1, -1, 5, 3, 0xfb794d);
        this.avatar = this.add.container((map.spawn.x + .5) * tile, (map.spawn.y + .5) * tile, [this.glow, body, eye]);
        latest.current.onBadges(0);
      }
      blocked(x: number, y: number) {
        return [[-5, -5], [5, -5], [-5, 5], [5, 5]].some(([dx, dy]) => !isWalkable(map, { x: Math.floor((x + dx) / tile), y: Math.floor((y + dy) / tile) }, latest.current.cells));
      }
      update(_time: number, delta: number) {
        if (!this.avatar || this.finished || latest.current.paused) return;
        // A wall may appear around a moving local player: move to the safe spawn, never softlock.
        if (this.blocked(this.avatar.x, this.avatar.y)) this.avatar.setPosition((map.spawn.x + .5) * tile, (map.spawn.y + .5) * tile);
        const touch = latest.current.movement.current;
        let dx = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown) + touch.x;
        let dy = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown) + touch.y;
        const length = Math.hypot(dx, dy); if (length > 0) { dx /= length; dy /= length; }
        const distance = 115 * Math.min(delta, 32) / 1000;
        if (!this.blocked(this.avatar.x + dx * distance, this.avatar.y)) this.avatar.x += dx * distance;
        if (!this.blocked(this.avatar.x, this.avatar.y + dy * distance)) this.avatar.y += dy * distance;
        for (const badge of this.badges) if (badge.active && Phaser.Math.Distance.Between(this.avatar.x, this.avatar.y, badge.x, badge.y) < 16) { badge.destroy(); this.collected++; latest.current.onBadges(this.collected); }
        if (this.collected === 3 && Phaser.Math.Distance.Between(this.avatar.x, this.avatar.y, (map.finish.x + .5) * tile, (map.finish.y + .5) * tile) < 18) { this.finished = true; latest.current.onFinish(); }
      }
    }
    const game = new Phaser.Game({ type: Phaser.AUTO, width: map.width * tile, height: map.height * tile, parent: parent.current, transparent: true, antialias: true, scene: VenueScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, input: { keyboard: true }, banner: false, audio: { noAudio: true } });
    return () => game.destroy(true);
  }, [props.map.version, props.round]);
  return <div ref={parent} className="phaser-layer" aria-label="Runner game. Use arrow keys or WASD to collect three badges and reach Main Stage." role="application" />;
}
