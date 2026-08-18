import { describe, expect, it } from "vitest";
import { ballDragState, clearAllRoutes, clearPlayerRoutes, finalizeRoute, idleDragState, playerDragState, undoLastRoute } from "./editorActions";
import type { RoutePath } from "./playbook";

const qRoute: RoutePath = { id: "route-q", playerId: "q", color: "#42D5FF", style: "solid", kind: "go", points: [{ x: 30, y: 50 }, { x: 65, y: 50 }] };
const wrRoute: RoutePath = { id: "route-wr", playerId: "wr", color: "#F7CF45", style: "dashed", kind: "motion", points: [{ x: 45, y: 20 }, { x: 70, y: 35 }] };

describe("editor route lifecycle", () => {
  it("finalizes only a route with a visible path", () => {
    expect(finalizeRoute([qRoute], { ...wrRoute, points: [wrRoute.points[0]] })).toEqual([qRoute]);
    expect(finalizeRoute([qRoute], wrRoute)).toEqual([qRoute, wrRoute]);
  });

  it("undoes only the latest finalized route", () => {
    expect(undoLastRoute([qRoute, wrRoute])).toEqual([qRoute]);
  });

  it("clears a selected player’s assignments without altering teammates", () => {
    expect(clearPlayerRoutes([qRoute, wrRoute], "q")).toEqual([wrRoute]);
    expect(clearAllRoutes()).toEqual([]);
  });
});

describe("editor drag lifecycle", () => {
  it("keeps token and football drags mutually exclusive and resets after release", () => {
    expect(playerDragState("q")).toEqual({ playerId: "q", ball: false });
    expect(ballDragState()).toEqual({ playerId: null, ball: true });
    expect(idleDragState()).toEqual({ playerId: null, ball: false });
  });
});
