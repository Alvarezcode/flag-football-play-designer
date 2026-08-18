import type { PointerEvent as ReactPointerEvent } from "react";
import type { FieldOrientation, FieldPoint, PlayerToken, RoutePath } from "@shared/playbook";
import { clampFieldPoint } from "@shared/playDesigner";

type ActiveTool = "select" | "route" | "ball";
type RoutePointHandle = { routeId: string; pointIndex: number };

type PlayFieldProps = {
  orientation: FieldOrientation;
  players: PlayerToken[];
  routes: RoutePath[];
  ball: FieldPoint;
  activeTool: ActiveTool;
  activePlayerId: string | null;
  selectedRouteId: string | null;
  drawingRoute: RoutePath | null;
  draggingPlayerId: string | null;
  draggingBall: boolean;
  draggingRoutePoint: RoutePointHandle | null;
  onPlayerStart: (id: string, point: FieldPoint) => void;
  onPlayerMove: (id: string, point: FieldPoint) => void;
  onBallStart: (point: FieldPoint) => void;
  onBallMove: (point: FieldPoint) => void;
  onRouteStart: (id: string, point: FieldPoint) => void;
  onRouteExtend: (point: FieldPoint) => void;
  onRouteSelect: (id: string) => void;
  onRoutePointStart: (routeId: string, pointIndex: number) => void;
  onRoutePointMove: (routeId: string, pointIndex: number, point: FieldPoint) => void;
  onInteractionEnd: () => void;
};

export const fieldSize = (orientation: FieldOrientation) => orientation === "horizontal"
  ? { width: 1000, height: 600 }
  : { width: 600, height: 1000 };

function getPoint(clientX: number, clientY: number, svg: SVGSVGElement, orientation: FieldOrientation): FieldPoint {
  const { width, height } = fieldSize(orientation);
  const rect = svg.getBoundingClientRect();
  return clampFieldPoint({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  });
}

function toSvgPoint(point: FieldPoint, orientation: FieldOrientation) {
  const { width, height } = fieldSize(orientation);
  return { x: (point.x / 100) * width, y: (point.y / 100) * height };
}

function dashFor(style: RoutePath["style"]) {
  if (style === "dashed") return "18 13";
  if (style === "dotted") return "3 13";
  return undefined;
}

function FieldMarkings({ orientation }: { orientation: FieldOrientation }) {
  const { width, height } = fieldSize(orientation);
  const yardLabels = ["10", "20", "30", "40", "50", "40", "30", "20", "10"];
  const vertical = orientation === "vertical";

  return (
    <>
      <defs>
        <linearGradient id="turf-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#155b48" />
          <stop offset="100%" stopColor="#0d3f34" />
        </linearGradient>
        <pattern id="turf-stripes" width={vertical ? 600 : 1000} height={vertical ? 100 : 80} patternUnits="userSpaceOnUse">
          <rect width={vertical ? 600 : 1000} height={vertical ? 50 : 40} fill="rgba(255,255,255,0.028)" />
        </pattern>
      </defs>
      <rect width={width} height={height} rx="26" fill="url(#turf-shade)" />
      <rect width={width} height={height} rx="26" fill="url(#turf-stripes)" />
      {vertical ? (
        <>
          <rect x="0" y="0" width={width} height="100" fill="#0e4b3c" opacity="0.94" />
          <rect x="0" y={height - 100} width={width} height="100" fill="#0e4b3c" opacity="0.94" />
          <text x={width / 2} y="61" textAnchor="middle" className="field-endzone-label">END ZONE</text>
          <text x={width / 2} y={height - 39} textAnchor="middle" className="field-endzone-label">END ZONE</text>
          {yardLabels.map((label, index) => {
            const y = 100 + index * 100;
            return <g key={`${label}-${index}`}>
              <line x1="0" y1={y} x2={width} y2={y} className="field-yard-line" />
              <line x1={width * 0.25} y1={y - 13} x2={width * 0.25} y2={y + 13} className="field-hash" />
              <line x1={width * 0.75} y1={y - 13} x2={width * 0.75} y2={y + 13} className="field-hash" />
              <text x="25" y={y - 13} className="field-yard-label">{label}</text>
              <text x={width - 25} y={y - 13} textAnchor="end" className="field-yard-label">{label}</text>
            </g>;
          })}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="field-los" />
          <text x="17" y={height / 2 - 16} className="field-los-label">LOS</text>
          <text x={width / 2} y={height - 122} textAnchor="middle" className="field-direction-label">OFFENSE ↑</text>
        </>
      ) : (
        <>
          <rect x="0" y="0" width="100" height={height} fill="#0e4b3c" opacity="0.94" />
          <rect x={width - 100} y="0" width="100" height={height} fill="#0e4b3c" opacity="0.94" />
          <text x="54" y={height / 2} textAnchor="middle" transform={`rotate(-90 54 ${height / 2})`} className="field-endzone-label">END ZONE</text>
          <text x={width - 42} y={height / 2} textAnchor="middle" transform={`rotate(90 ${width - 42} ${height / 2})`} className="field-endzone-label">END ZONE</text>
          {yardLabels.map((label, index) => {
            const x = 100 + index * 100;
            return <g key={`${label}-${index}`}>
              <line x1={x} y1="0" x2={x} y2={height} className="field-yard-line" />
              <line x1={x - 13} y1={height * 0.25} x2={x + 13} y2={height * 0.25} className="field-hash" />
              <line x1={x - 13} y1={height * 0.75} x2={x + 13} y2={height * 0.75} className="field-hash" />
              <text x={x + 12} y="31" className="field-yard-label">{label}</text>
              <text x={x + 12} y={height - 18} className="field-yard-label">{label}</text>
            </g>;
          })}
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} className="field-los" />
          <text x={width / 2 + 15} y="30" className="field-los-label">LOS</text>
          <text x="124" y={height - 28} className="field-direction-label">OFFENSE →</text>
        </>
      )}
      <rect x="9" y="9" width={width - 18} height={height - 18} rx="18" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
    </>
  );
}

function RouteLine({ route, orientation, markerId, faded = false, selected = false, onSelect }: { route: RoutePath; orientation: FieldOrientation; markerId: string; faded?: boolean; selected?: boolean; onSelect?: (id: string) => void }) {
  const points = route.points.map(point => {
    const coord = toSvgPoint(point, orientation);
    return `${coord.x},${coord.y}`;
  }).join(" ");
  return <g onPointerDown={onSelect ? event => { event.stopPropagation(); onSelect(route.id); } : undefined} className={onSelect ? "route-path-selectable" : undefined}>
    {onSelect && <polyline points={points} fill="none" stroke="transparent" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />}
    <polyline
      points={points}
      fill="none"
      stroke={route.color}
      strokeWidth={selected ? "10" : "8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashFor(route.style)}
      markerEnd={`url(#${markerId})`}
      opacity={faded ? 0.65 : 1}
      style={{ filter: selected ? "drop-shadow(0 0 5px rgba(255,255,255,.85))" : "drop-shadow(0 2px 2px rgba(0,0,0,.28))" }}
    />
  </g>;
}

function editablePointIndexes(points: FieldPoint[]) {
  if (points.length <= 6) return points.map((_, index) => index);
  return Array.from(new Set(Array.from({ length: 6 }, (_, index) => Math.round((points.length - 1) * index / 5))));
}

function RouteHandles({ route, orientation, onPointStart }: { route: RoutePath; orientation: FieldOrientation; onPointStart: (pointIndex: number) => void }) {
  return <g className="route-point-handles">
    {editablePointIndexes(route.points).map(pointIndex => {
      const point = toSvgPoint(route.points[pointIndex], orientation);
      return <g key={`route-handle-${route.id}-${pointIndex}`} className="route-point-handle" onPointerDown={event => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); onPointStart(pointIndex); }}>
        <circle cx={point.x} cy={point.y} r="13" fill="rgba(9,20,22,.7)" stroke="white" strokeWidth="3" />
        <circle cx={point.x} cy={point.y} r="6" fill={route.color} stroke="rgba(9,20,22,.75)" strokeWidth="2" />
      </g>;
    })}
  </g>;
}

export function PlayThumbnail({ orientation, players, routes }: Pick<PlayFieldProps, "orientation" | "players" | "routes">) {
  const { width, height } = fieldSize(orientation);
  const markerId = `thumb-arrow-${orientation}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden="true">
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      <FieldMarkings orientation={orientation} />
      {routes.map((route, index) => <RouteLine key={`thumbnail-route-${route.id}-${index}`} route={route} orientation={orientation} markerId={markerId} />)}
      {players.map((player, index) => {
        const point = toSvgPoint(player, orientation);
        const radius = Math.min(width, height) * 0.045;
        return <circle key={`thumbnail-player-${player.id}-${index}`} cx={point.x} cy={point.y} r={radius} fill={player.side === "offense" ? "#f6b451" : "#203d4a"} stroke="white" strokeWidth="3" />;
      })}
    </svg>
  );
}

export default function PlayField({
  orientation,
  players,
  routes,
  ball,
  activeTool,
  activePlayerId,
  selectedRouteId,
  drawingRoute,
  draggingPlayerId,
  draggingBall,
  draggingRoutePoint,
  onPlayerStart,
  onPlayerMove,
  onBallStart,
  onBallMove,
  onRouteStart,
  onRouteExtend,
  onRouteSelect,
  onRoutePointStart,
  onRoutePointMove,
  onInteractionEnd,
}: PlayFieldProps) {
  const { width, height } = fieldSize(orientation);
  const markerId = "route-arrow";
  const radius = Math.min(width, height) * 0.043;

  const onSvgPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingRoute && !draggingPlayerId && !draggingBall && !draggingRoutePoint) return;
    const point = getPoint(event.clientX, event.clientY, event.currentTarget, orientation);
    if (drawingRoute) onRouteExtend(point);
    if (draggingPlayerId) onPlayerMove(draggingPlayerId, point);
    if (draggingBall) onBallMove(point);
    if (draggingRoutePoint) onRoutePointMove(draggingRoutePoint.routeId, draggingRoutePoint.pointIndex, point);
  };

  const onPlayerPointerDown = (event: ReactPointerEvent<SVGGElement>, player: PlayerToken) => {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activeTool === "route") {
      onRouteStart(player.id, { x: player.x, y: player.y });
    } else {
      onPlayerStart(player.id, getPoint(event.clientX, event.clientY, svg, orientation));
    }
  };

  const onBallPointerDown = (event: ReactPointerEvent<SVGGElement>) => {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onBallStart(getPoint(event.clientX, event.clientY, svg, orientation));
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="play-field-svg"
      role="application"
      aria-label="Interactive flag football play field"
      style={{ touchAction: "none" }}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onInteractionEnd}
      onPointerCancel={onInteractionEnd}
      onPointerLeave={event => { if (event.buttons === 0) onInteractionEnd(); }}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      <FieldMarkings orientation={orientation} />
      {[...routes, ...(drawingRoute ? [drawingRoute] : [])].map((route, index) => (
        <RouteLine key={`field-route-${route.id}-${index}`} route={route} orientation={orientation} markerId={markerId} faded={route.id === drawingRoute?.id} selected={route.id === selectedRouteId} onSelect={onRouteSelect} />
      ))}
      {routes.filter(route => route.id === selectedRouteId).map(route => <RouteHandles key={`handles-${route.id}`} route={route} orientation={orientation} onPointStart={pointIndex => onRoutePointStart(route.id, pointIndex)} />)}
      <g
        onPointerDown={onBallPointerDown}
        className="play-field-ball"
        aria-label="Drag football"
        role="button"
        tabIndex={0}
      >
        {(() => {
          const point = toSvgPoint(ball, orientation);
          return <>
            <ellipse cx={point.x} cy={point.y} rx={radius * 0.68} ry={radius * 0.45} fill="#f4e0c2" stroke="#613619" strokeWidth="5" transform={`rotate(-18 ${point.x} ${point.y})`} />
            <line x1={point.x - radius * 0.28} y1={point.y} x2={point.x + radius * 0.28} y2={point.y} stroke="#613619" strokeWidth="3" />
          </>;
        })()}
      </g>
      {players.map((player, index) => {
        const point = toSvgPoint(player, orientation);
        const selected = player.id === activePlayerId;
        return (
          <g
            key={`field-player-${player.id}-${index}`}
            onPointerDown={event => onPlayerPointerDown(event, player)}
            className="play-field-token"
            aria-label={`${player.side} ${player.label}`}
            role="button"
            tabIndex={0}
          >
            {selected && <circle cx={point.x} cy={point.y} r={radius + 12} fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.95" />}
            <circle cx={point.x} cy={point.y} r={radius} fill={player.side === "offense" ? "#f5b44e" : "#173544"} stroke={player.side === "offense" ? "#fff0d3" : "#d3e5e6"} strokeWidth="4" />
            <circle cx={point.x} cy={point.y} r={radius - 5} fill="none" stroke={player.side === "offense" ? "rgba(110,66,8,.22)" : "rgba(255,255,255,.12)"} strokeWidth="2" />
            <text x={point.x} y={point.y + 6} textAnchor="middle" className={player.side === "offense" ? "token-label token-label-offense" : "token-label"}>{player.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
