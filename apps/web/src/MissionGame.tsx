import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  freshMission,
  isWalkable,
  nearPoint,
  stepMission,
  type Cell,
  type Mission,
  type VenueMap,
} from "@riftrun/world-protocol";
export type PlayerStatus = { mission: Mission; nearby: boolean };
type Props = {
  map: VenueMap;
  cells: Cell[];
  paused: boolean;
  epoch: string;
  seconds: number;
  onStatus: (value: PlayerStatus) => void;
  movement: { current: { x: number; y: number } };
  interaction: { current: { held: boolean; pressed: boolean } };
};
export default function MissionGame(props: Props) {
  const parent = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (!parent.current) return;
    const map = props.map;
    const tile = 24;
    class VenueScene extends Phaser.Scene {
      avatar!: Phaser.GameObjects.Container;
      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      keys!: Record<string, Phaser.Input.Keyboard.Key>;
      mission = freshMission();
      lastReport = 0;
      create() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = this.input.keyboard!.addKeys("W,A,S,D,E") as Record<
          string,
          Phaser.Input.Keyboard.Key
        >;
        this.avatar = this.add.container(
          (map.spawn.x + 0.5) * tile,
          (map.spawn.y + 0.5) * tile,
          [
            this.add.circle(0, 0, 15, 0xffd2a0, 0.2),
            this.add.circle(0, 0, 7, 0xfff3d9).setStrokeStyle(2, 0x28101c),
            this.add.rectangle(1, -1, 5, 3, 0xfb794d),
          ],
        );
        latest.current.onStatus({ mission: this.mission, nearby: false });
      }
      blocked(x: number, y: number) {
        return [
          [-5, -5],
          [5, -5],
          [-5, 5],
          [5, 5],
        ].some(
          ([dx, dy]) =>
            !isWalkable(
              map,
              {
                x: Math.floor((x + dx) / tile),
                y: Math.floor((y + dy) / tile),
              },
              latest.current.cells,
            ),
        );
      }
      update(time: number, delta: number) {
        if (!this.avatar) return;
        const p = latest.current;
        const touch = p.movement.current;
        if (!p.paused && !this.mission.finished) {
          if (this.blocked(this.avatar.x, this.avatar.y))
            this.avatar.setPosition(
              (map.spawn.x + 0.5) * tile,
              (map.spawn.y + 0.5) * tile,
            );
          let dx =
            Number(this.cursors.right.isDown || this.keys.D.isDown) -
            Number(this.cursors.left.isDown || this.keys.A.isDown) +
            touch.x;
          let dy =
            Number(this.cursors.down.isDown || this.keys.S.isDown) -
            Number(this.cursors.up.isDown || this.keys.W.isDown) +
            touch.y;
          const length = Math.hypot(dx, dy);
          if (length > 0) {
            dx /= length;
            dy /= length;
          }
          const distance = (115 * Math.min(delta, 32)) / 1000;
          if (!this.blocked(this.avatar.x + dx * distance, this.avatar.y))
            this.avatar.x += dx * distance;
          if (!this.blocked(this.avatar.x, this.avatar.y + dy * distance))
            this.avatar.y += dy * distance;
        }
        const position = { x: this.avatar.x / tile, y: this.avatar.y / tile };
        const previous = this.mission;
        this.mission = stepMission(
          this.mission,
          {
            position,
            pressed:
              Phaser.Input.Keyboard.JustDown(this.keys.E) ||
              p.interaction.current.pressed,
            held: this.keys.E.isDown || p.interaction.current.held,
            delta,
            paused: p.paused,
            timeRemaining: p.seconds,
          },
          map,
        );
        p.interaction.current.pressed = false;
        if (
          time - this.lastReport > 100 ||
          previous.step !== this.mission.step ||
          previous.finished !== this.mission.finished
        ) {
          const target = map.checkpoints[this.mission.step] ?? map.finish;
          p.onStatus({
            mission: this.mission,
            nearby: nearPoint(position, target),
          });
          this.lastReport = time;
        }
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: map.width * tile,
      height: map.height * tile,
      parent: parent.current,
      transparent: true,
      antialias: true,
      scene: VenueScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: true },
      banner: false,
      audio: { noAudio: true },
    });
    return () => game.destroy(true);
  }, [props.map.version, props.epoch]);
  return (
    <div
      ref={parent}
      className="phaser-layer"
      role="application"
      aria-label="Runner game. WASD or arrows to move. E to interact at the current checkpoint."
    />
  );
}
