import { describe, expect, it } from "vitest";
import { playersAtPlaybackProgress, routePointAtProgress, routeTraceAtProgress } from "./playback";
import type { PlayerToken, RoutePath } from "./playbook";

const route: RoutePath = {
  id: "go-route",
  playerId: "wr-left",
  color: "#42D5FF",
  kind: "go",
  style: "solid",
  points: [{ x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 60 }],
};

describe("route playback", () => {
  it("interpolates a route at a deterministic playback point", () => {
    expect(routePointAtProgress(route, 0)).toEqual({ x: 10, y: 20 });
    expect(routePointAtProgress(route, 0.5)).toEqual({ x: 50, y: 20 });
    expect(routePointAtProgress(route, 1)).toEqual({ x: 50, y: 60 });
  });

  it("returns a trace that grows as the playback advances", () => {
    expect(routeTraceAtProgress(route, 0.25)).toEqual([{ x: 10, y: 20 }, { x: 30, y: 20 }]);
    expect(routeTraceAtProgress(route, 0.75)).toEqual([{ x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 40 }]);
  });

  it("moves only the players that own a drawn route", () => {
    const players: PlayerToken[] = [
      { id: "wr-left", label: "WR", side: "offense", x: 10, y: 20 },
      { id: "qb", label: "QB", side: "offense", x: 20, y: 50 },
    ];
    expect(playersAtPlaybackProgress(players, [route], 0.5)).toEqual([
      { id: "wr-left", label: "WR", side: "offense", x: 50, y: 20 },
      { id: "qb", label: "QB", side: "offense", x: 20, y: 50 },
    ]);
  });
});
