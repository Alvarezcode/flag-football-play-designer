export type FieldOrientation = "horizontal" | "vertical";
export type PlayerSide = "offense" | "defense";
export type RouteStyle = "solid" | "dashed" | "dotted";
export type RouteKind = "go" | "slant" | "curl" | "block" | "motion" | "custom";

export type FieldPoint = { x: number; y: number };

export type PlayerToken = {
  id: string;
  label: string;
  side: PlayerSide;
  x: number;
  y: number;
};

export type RoutePath = {
  id: string;
  playerId: string;
  points: FieldPoint[];
  color: string;
  style: RouteStyle;
  kind: RouteKind;
};

export type PlayDiagram = {
  orientation: FieldOrientation;
  format: "5v5" | "7v7";
  players: PlayerToken[];
  routes: RoutePath[];
  ball: FieldPoint;
};

export type PlayType = "run" | "pass";
