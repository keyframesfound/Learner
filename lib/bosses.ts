import { CHIBI_ERIC } from "./chibi";
import { ROBOT_SVG } from "./sprites";

/**
 * Raid bosses. The picker on /party offers these, the party row remembers the
 * choice, and the arena reads its name, sprite and hit points back from here so
 * adding a third boss is a single entry.
 *
 * `hp` is the number on the lobby card (flavour); `pips` is what the arena
 * actually tracks — one pip per correct answer from the whole party, so more
 * pips means the raid takes longer to clear.
 */
export type Boss = {
  id: string;
  name: string;
  level: number;
  hp: number;
  pips: number;
  blurb: string;
  sprite: string;
};

export const BOSSES: Boss[] = [
  {
    id: "segfault",
    name: "Segfault",
    level: 3,
    hp: 12_000,
    pips: 10,
    blurb: "Ten correct answers and it falls.",
    sprite: ROBOT_SVG,
  },
  {
    id: "eric",
    name: "Eric Chan",
    level: 5,
    hp: 18_000,
    pips: 14,
    blurb: "Fourteen answers. He marks harshly.",
    /* chibi pixel sprite, same construction as the party (scripts/chibi.py) */
    sprite: CHIBI_ERIC,
  },
];

export const DEFAULT_BOSS = BOSSES[0]!.id;

export function bossById(id: string | null | undefined): Boss {
  return BOSSES.find((b) => b.id === id) ?? BOSSES[0]!;
}

export function isBossId(id: unknown): id is string {
  return typeof id === "string" && BOSSES.some((b) => b.id === id);
}

/**
 * "Boss · level 3 · 12,000 HP" — the line under the name in the lobby.
 * The number and its unit are joined by a non-breaking space so a narrow screen
 * can only break before "12,000 HP", never between the value and the unit.
 */
export function bossLine(boss: Boss): string {
  return `Boss · level\u00A0${boss.level} · ${boss.hp.toLocaleString("en-US")}\u00A0HP`;
}
