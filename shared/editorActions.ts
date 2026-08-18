import type { RoutePath } from "./playbook";

/**
 * Editor interaction contract.
 *
 * A route becomes part of the diagram only after it has at least two points;
 * this prevents accidental taps from creating empty arrows. Undo removes only
 * the most recently finalized route. Player-specific clearing leaves every
 * other assignment intact, while clear-all removes every finalized route.
 * Drag interactions are mutually exclusive: a pointer can drag one player or
 * the ball, never both. Ending a pointer interaction always clears that state.
 */
export type EditorDragState = {
  playerId: string | null;
  ball: boolean;
};

export const idleDragState = (): EditorDragState => ({ playerId: null, ball: false });
export const playerDragState = (playerId: string): EditorDragState => ({ playerId, ball: false });
export const ballDragState = (): EditorDragState => ({ playerId: null, ball: true });

export function finalizeRoute(routes: RoutePath[], drawingRoute: RoutePath | null): RoutePath[] {
  return drawingRoute && drawingRoute.points.length > 1 ? [...routes, drawingRoute] : routes;
}

export function undoLastRoute(routes: RoutePath[]): RoutePath[] {
  return routes.slice(0, -1);
}

export function clearPlayerRoutes(routes: RoutePath[], playerId: string): RoutePath[] {
  return routes.filter(route => route.playerId !== playerId);
}

export function clearAllRoutes(): RoutePath[] {
  return [];
}
