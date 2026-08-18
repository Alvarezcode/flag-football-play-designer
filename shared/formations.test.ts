import { describe, expect, it } from "vitest";
import { applyFormationTemplate, formationTemplates } from "./formations";
import type { PlayerToken } from "./playbook";

const players: PlayerToken[] = [
  { id: "l1", label: "WR", side: "offense", x: 10, y: 10 },
  { id: "quarterback", label: "QB", side: "offense", x: 10, y: 50 },
  { id: "d1", label: "D1", side: "defense", x: 90, y: 20 },
  { id: "d2", label: "D2", side: "defense", x: 90, y: 80 },
];

describe("formation templates", () => {
  it("repositions only the matching side of the ball", () => {
    const spread = formationTemplates.find(template => template.id === "spread");
    if (!spread) throw new Error("Spread template missing");
    const result = applyFormationTemplate(players, spread);

    expect(result.find(player => player.id === "l1")).toMatchObject({ x: 45, y: 16 });
    expect(result.find(player => player.id === "quarterback")).toMatchObject({ x: 39, y: 50 });
    expect(result.find(player => player.id === "d1")).toMatchObject({ x: 90, y: 20 });
  });

  it("loads standard defensive looks without moving offense tokens", () => {
    const zone = formationTemplates.find(template => template.id === "zone-2-3");
    if (!zone) throw new Error("Zone template missing");
    const result = applyFormationTemplate(players, zone);

    expect(result.find(player => player.id === "d1")).toMatchObject({ x: 72, y: 26 });
    expect(result.find(player => player.id === "l1")).toMatchObject({ x: 10, y: 10 });
  });

  it("gives each offensive template a visibly different receiver alignment", () => {
    const spread = formationTemplates.find(template => template.id === "spread");
    const trips = formationTemplates.find(template => template.id === "trips-right");
    const bunch = formationTemplates.find(template => template.id === "bunch-left");
    if (!spread || !trips || !bunch) throw new Error("Offensive formation template missing");

    const spreadLeftReceiver = applyFormationTemplate(players, spread).find(player => player.id === "l1");
    const tripsLeftReceiver = applyFormationTemplate(players, trips).find(player => player.id === "l1");
    const bunchRightReceiver = applyFormationTemplate([
      ...players,
      { id: "r1", label: "WR", side: "offense" as const, x: 10, y: 90 },
    ], bunch).find(player => player.id === "r1");

    expect(tripsLeftReceiver).toMatchObject({ x: 43, y: 58 });
    expect(tripsLeftReceiver?.y).not.toBe(spreadLeftReceiver?.y);
    expect(bunchRightReceiver).toMatchObject({ x: 43, y: 43 });
  });
});
