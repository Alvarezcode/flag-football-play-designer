import type { FieldPoint, PlayerToken, RoutePath } from "./playbook";

function segmentLength(from: FieldPoint, to: FieldPoint) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function clampPlaybackProgress(progress: number) {
  return Math.min(1, Math.max(0, progress));
}

export function routeTraceAtProgress(route: RoutePath, progress: number): FieldPoint[] {
  if (route.points.length < 2) return route.points;
  const clamped = clampPlaybackProgress(progress);
  const lengths = route.points.slice(1).map((point, index) => segmentLength(route.points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!total) return [route.points[0]];
  const target = total * clamped;
  let traveled = 0;
  const trace = [route.points[0]];

  for (let index = 0; index < lengths.length; index += 1) {
    const from = route.points[index];
    const to = route.points[index + 1];
    const length = lengths[index];
    if (traveled + length <= target) {
      trace.push(to);
      traveled += length;
      continue;
    }
    const fraction = length ? (target - traveled) / length : 0;
    trace.push({ x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction });
    break;
  }

  return trace;
}

export function routePointAtProgress(route: RoutePath, progress: number): FieldPoint {
  const trace = routeTraceAtProgress(route, progress);
  return trace[trace.length - 1] ?? { x: 0, y: 0 };
}

export function playersAtPlaybackProgress(players: PlayerToken[], routes: RoutePath[], progress: number) {
  const routeByPlayer = new Map<string, RoutePath>();
  routes.forEach(route => {
    if (!routeByPlayer.has(route.playerId)) routeByPlayer.set(route.playerId, route);
  });
  return players.map(player => {
    const route = routeByPlayer.get(player.id);
    return route ? { ...player, ...routePointAtProgress(route, progress) } : player;
  });
}
