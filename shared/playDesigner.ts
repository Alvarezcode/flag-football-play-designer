import type { FieldPoint, RoutePath } from "./playbook";

export function clampFieldPoint(point: FieldPoint): FieldPoint {
  return {
    x: Math.max(0, Math.min(100, point.x)),
    y: Math.max(0, Math.min(100, point.y)),
  };
}

export function appendRoutePoint(route: RoutePath, point: FieldPoint, minimumDistance = 0.65): RoutePath {
  const nextPoint = clampFieldPoint(point);
  const latest = route.points[route.points.length - 1];
  const distance = Math.hypot(nextPoint.x - latest.x, nextPoint.y - latest.y);
  return distance < minimumDistance ? route : { ...route, points: [...route.points, nextPoint] };
}

export function transformFieldPoint(point: FieldPoint, direction: "horizontalToVertical" | "verticalToHorizontal"): FieldPoint {
  return direction === "horizontalToVertical"
    ? { x: point.y, y: 100 - point.x }
    : { x: 100 - point.y, y: point.x };
}
