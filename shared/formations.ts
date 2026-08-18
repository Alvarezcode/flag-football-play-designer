import type { FieldPoint, PlayerToken } from "./playbook";

export type FormationSide = "offense" | "defense";

export type FormationTemplate = {
  id: string;
  name: string;
  side: FormationSide;
  description: string;
  positions: Record<string, FieldPoint>;
};

export const formationTemplates: FormationTemplate[] = [
  {
    id: "spread",
    name: "Spread",
    side: "offense",
    description: "Balanced width with a single back.",
    positions: { l1: { x: 45, y: 16 }, l2: { x: 43, y: 34 }, r2: { x: 43, y: 66 }, r1: { x: 45, y: 84 }, center: { x: 48, y: 50 }, quarterback: { x: 39, y: 50 }, back: { x: 32, y: 62 } },
  },
  {
    id: "trips-right",
    name: "Trips Right",
    side: "offense",
    description: "Three receivers condensed to the right.",
    positions: { l1: { x: 43, y: 58 }, l2: { x: 43, y: 67 }, r2: { x: 43, y: 76 }, r1: { x: 43, y: 85 }, center: { x: 48, y: 50 }, quarterback: { x: 38, y: 50 }, back: { x: 32, y: 66 } },
  },
  {
    id: "bunch-left",
    name: "Bunch Left",
    side: "offense",
    description: "A tight cluster to create quick releases.",
    positions: { l1: { x: 43, y: 16 }, l2: { x: 43, y: 25 }, r2: { x: 43, y: 34 }, r1: { x: 43, y: 43 }, center: { x: 48, y: 50 }, quarterback: { x: 38, y: 50 }, back: { x: 33, y: 37 } },
  },
  {
    id: "zone-2-3",
    name: "2–3 Zone",
    side: "defense",
    description: "Two deep defenders over a three-player underneath shell.",
    positions: { d1: { x: 72, y: 26 }, d2: { x: 72, y: 74 }, d3: { x: 61, y: 25 }, d4: { x: 61, y: 50 }, d5: { x: 61, y: 75 }, d6: { x: 80, y: 37 }, d7: { x: 80, y: 63 } },
  },
  {
    id: "man-press",
    name: "Man Press",
    side: "defense",
    description: "Tight, aggressive alignment at the line.",
    positions: { d1: { x: 54, y: 21 }, d2: { x: 54, y: 40 }, d3: { x: 54, y: 60 }, d4: { x: 54, y: 79 }, d5: { x: 61, y: 50 }, d6: { x: 67, y: 34 }, d7: { x: 67, y: 66 } },
  },
  {
    id: "cover-1",
    name: "Cover 1",
    side: "defense",
    description: "Man underneath with a single deep safety.",
    positions: { d1: { x: 57, y: 22 }, d2: { x: 57, y: 39 }, d3: { x: 57, y: 61 }, d4: { x: 57, y: 78 }, d5: { x: 64, y: 50 }, d6: { x: 69, y: 37 }, d7: { x: 82, y: 50 } },
  },
];

export function applyFormationTemplate(players: PlayerToken[], template: FormationTemplate): PlayerToken[] {
  return players.map(player => {
    const point = player.side === template.side ? template.positions[player.id] : undefined;
    return point ? { ...player, ...point } : player;
  });
}
