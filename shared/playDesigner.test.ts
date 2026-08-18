import { describe, expect, it } from "vitest";
import { appendRoutePoint, clampFieldPoint, transformFieldPoint } from "./playDesigner";
import type { RoutePath } from "./playbook";

const route: RoutePath = {
  id: "route-1",
  playerId: "q",
  color: "#42D5FF",
  style: "solid",
  kind: "go",
  points: [{ x: 40, y: 50 }],
};

describe("field interaction helpers", () => {
  it("keeps token and ball coordinates inside the playable field", () => {
    expect(clampFieldPoint({ x: -8, y: 112 })).toEqual({ x: 0, y: 100 });
  });

  it("captures a continuous route while ignoring imperceptible pointer jitter", () => {
    const jitterIgnored = appendRoutePoint(route, { x: 40.2, y: 50.1 });
    const firstMove = appendRoutePoint(jitterIgnored, { x: 47, y: 47 });
    const tracedRoute = appendRoutePoint(firstMove, { x: 60, y: 28 });

    expect(jitterIgnored.points).toHaveLength(1);
    expect(tracedRoute.points).toEqual([{ x: 40, y: 50 }, { x: 47, y: 47 }, { x: 60, y: 28 }]);
  });

  it("preserves player placement through an orientation round trip", () => {
    const original = { x: 31, y: 74 };
    const vertical = transformFieldPoint(original, "horizontalToVertical");
    expect(transformFieldPoint(vertical, "verticalToHorizontal")).toEqual(original);
  });
});
