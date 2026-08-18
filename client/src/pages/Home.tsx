import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import PlayField, { PlayThumbnail } from "@/components/PlayField";
import type { FieldOrientation, FieldPoint, PlayDiagram, PlayerSide, PlayerToken, RouteKind, RoutePath, RouteStyle } from "@shared/playbook";
import { appendRoutePoint, transformFieldPoint } from "@shared/playDesigner";
import { ballDragState, clearAllRoutes, clearPlayerRoutes, finalizeRoute, idleDragState, playerDragState, undoLastRoute, updateRoutePoint } from "@shared/editorActions";
import { applyFormationTemplate, formationTemplates, type FormationSide, type FormationTemplate } from "@shared/formations";
import { nanoid } from "nanoid";
import { ArrowDownToLine, ChevronRight, CircleDot, Copy, Eraser, FilePlus2, Flag, LayoutGrid, LayoutTemplate, Link2, Loader2, LogIn, MousePointer2, PenTool, RefreshCw, RotateCcw, Save, Shield, Share2, Sparkles, Trash2, Undo2, UsersRound, X } from "lucide-react";

type View = "design" | "playbook";
type Tool = "select" | "route" | "ball";
type RoutePointHandle = { routeId: string; pointIndex: number };

const routePresets: { id: RouteKind; label: string; color: string; style: RouteStyle }[] = [
  { id: "go", label: "Go", color: "#42D5FF", style: "solid" },
  { id: "slant", label: "Slant", color: "#F7CF45", style: "solid" },
  { id: "curl", label: "Curl", color: "#FF964A", style: "solid" },
  { id: "block", label: "Block", color: "#FF6F91", style: "dotted" },
  { id: "motion", label: "Motion", color: "#EDEDED", style: "dashed" },
];

const routeColors = ["#42D5FF", "#F7CF45", "#FF964A", "#FF6F91", "#A6EF68", "#FFFFFF"];

function basePlayers(format: "5v5" | "7v7"): PlayerToken[] {
  const standard: PlayerToken[] = [
    { id: "l1", label: "WR", side: "offense", x: 45, y: 22 },
    { id: "r1", label: "WR", side: "offense", x: 45, y: 78 },
    { id: "center", label: "C", side: "offense", x: 48, y: 50 },
    { id: "quarterback", label: "QB", side: "offense", x: 39, y: 50 },
    { id: "back", label: "RB", side: "offense", x: 32, y: 62 },
    { id: "d1", label: "D1", side: "defense", x: 61, y: 25 },
    { id: "d2", label: "D2", side: "defense", x: 61, y: 49 },
    { id: "d3", label: "D3", side: "defense", x: 61, y: 75 },
    { id: "d4", label: "D4", side: "defense", x: 70, y: 50 },
    { id: "d5", label: "D5", side: "defense", x: 78, y: 50 },
  ];
  if (format === "5v5") return standard;
  return [
    { id: "l2", label: "WR", side: "offense", x: 42, y: 37 },
    { id: "r2", label: "WR", side: "offense", x: 42, y: 64 },
    ...standard,
    { id: "d6", label: "D6", side: "defense", x: 70, y: 30 },
    { id: "d7", label: "D7", side: "defense", x: 70, y: 70 },
  ];
}

function transformPlayers(players: PlayerToken[], direction: "horizontalToVertical" | "verticalToHorizontal") {
  return players.map(player => ({ ...player, ...transformFieldPoint(player, direction) }));
}

function diagramToDataUri(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelector(".route-point-handles")?.remove();
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "1600");
  clone.setAttribute("height", "1000");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = Math.round((image.height / image.width) * 1600);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = `${filename || "flag-play"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("PNG exported to your downloads.");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    toast.error("We could not export this diagram. Please try again.");
  };
  image.src = url;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [view, setView] = useState<View>("design");
  const [orientation, setOrientation] = useState<FieldOrientation>("horizontal");
  const [format, setFormat] = useState<"5v5" | "7v7">("5v5");
  const [players, setPlayers] = useState<PlayerToken[]>(() => basePlayers("5v5"));
  const [routes, setRoutes] = useState<RoutePath[]>([]);
  const [ball, setBall] = useState<FieldPoint>({ x: 46, y: 50 });
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [dragState, setDragState] = useState(idleDragState);
  const [draggingRoutePoint, setDraggingRoutePoint] = useState<RoutePointHandle | null>(null);
  const [drawingRoute, setDrawingRoute] = useState<RoutePath | null>(null);
  const [routeKind, setRouteKind] = useState<RouteKind>("go");
  const [routeColor, setRouteColor] = useState("#42D5FF");
  const [routeStyle, setRouteStyle] = useState<RouteStyle>("solid");
  const [playName, setPlayName] = useState("");
  const [formation, setFormation] = useState("Spread");
  const [playType, setPlayType] = useState<"run" | "pass">("pass");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [templateSide, setTemplateSide] = useState<FormationSide>("offense");
  const [shareOpen, setShareOpen] = useState(false);
  const [studyLink, setStudyLink] = useState<{ token: string } | null>(null);
  const fieldFrameRef = useRef<HTMLDivElement>(null);
  const drawingRouteRef = useRef<RoutePath | null>(null);

  const playsQuery = trpc.playbook.list.useQuery(undefined, { enabled: isAuthenticated });
  const createPlay = trpc.playbook.create.useMutation();
  const updatePlay = trpc.playbook.update.useMutation();
  const deletePlay = trpc.playbook.delete.useMutation();
  const getStudyLink = trpc.study.getLink.useMutation();
  const regenerateStudyLink = trpc.study.regenerateLink.useMutation();

  const activePreset = useMemo(() => routePresets.find(preset => preset.id === routeKind), [routeKind]);
  const diagram: PlayDiagram = useMemo(() => ({ orientation, format, players, routes, ball }), [orientation, format, players, routes, ball]);
  const isSaving = createPlay.isPending || updatePlay.isPending;
  const activePlayer = players.find(player => player.id === activePlayerId);
  const selectedRoute = routes.find(route => route.id === selectedRouteId);
  const draggingPlayerId = dragState.playerId;
  const draggingBall = dragState.ball;

  const selectPreset = (preset: typeof routePresets[number]) => {
    setRouteKind(preset.id);
    setRouteColor(preset.color);
    setRouteStyle(preset.style);
    setActiveTool("route");
  };

  const toggleOrientation = () => {
    const next = orientation === "horizontal" ? "vertical" : "horizontal";
    const direction = orientation === "horizontal" ? "horizontalToVertical" : "verticalToHorizontal";
    setPlayers(current => transformPlayers(current, direction));
    setRoutes(current => current.map(route => ({ ...route, points: route.points.map(point => transformFieldPoint(point, direction)) })));
    setBall(current => transformFieldPoint(current, direction));
    setOrientation(next);
  };

  const resetFormation = () => {
    const initial = basePlayers(format);
    const transformed = orientation === "vertical" ? transformPlayers(initial, "horizontalToVertical") : initial;
    setPlayers(transformed);
    setRoutes([]);
    setBall(orientation === "vertical" ? { x: 50, y: 54 } : { x: 46, y: 50 });
    setActivePlayerId(null);
    setSelectedRouteId(null);
    toast.message("Formation reset. Routes cleared.");
  };

  const changeFormat = (nextFormat: "5v5" | "7v7") => {
    if (nextFormat === format) return;
    const initial = basePlayers(nextFormat);
    setFormat(nextFormat);
    setPlayers(orientation === "vertical" ? transformPlayers(initial, "horizontalToVertical") : initial);
    setRoutes([]);
    setActivePlayerId(null);
    setSelectedRouteId(null);
    toast.message(`${nextFormat} formation loaded. Routes cleared.`);
  };

  const addPlayer = (side: PlayerSide) => {
    const existing = players.filter(player => player.side === side).length + 1;
    const label = side === "offense" ? `O${existing}` : `D${existing}`;
    setPlayers(current => [...current, {
      id: nanoid(), label, side,
      x: side === "offense" ? 39 : 65,
      y: Math.min(85, 18 + existing * 10),
    }]);
    setActiveTool("select");
    toast.message(`${side === "offense" ? "Offense" : "Defense"} token added.`);
  };

  const startPlayerInteraction = (id: string) => {
    setActivePlayerId(id);
    setDragState(playerDragState(id));
  };

  const movePlayer = (id: string, point: FieldPoint) => setPlayers(current => current.map(player => player.id === id ? { ...player, ...point } : player));
  const moveBall = (point: FieldPoint) => setBall(point);

  const startRoute = (playerId: string, point: FieldPoint) => {
    setActivePlayerId(playerId);
    setSelectedRouteId(null);
    const draft = { id: nanoid(), playerId, points: [point], color: routeColor, style: routeStyle, kind: routeKind };
    drawingRouteRef.current = draft;
    setDrawingRoute(draft);
  };

  const extendRoute = (point: FieldPoint) => {
    const current = drawingRouteRef.current;
    if (!current) return;
    const extended = appendRoutePoint(current, point);
    if (extended === current) return;
    drawingRouteRef.current = extended;
    setDrawingRoute(extended);
  };

  const endInteraction = () => {
    setDragState(idleDragState());
    setDraggingRoutePoint(null);
    const draft = drawingRouteRef.current;
    drawingRouteRef.current = null;
    setDrawingRoute(null);
    setRoutes(routes => finalizeRoute(routes, draft));
    if (draft && draft.points.length > 1) setSelectedRouteId(draft.id);
  };

  const undoRoute = () => {
    setRoutes(undoLastRoute);
    setSelectedRouteId(null);
  };
  const clearSelectedPlayerRoutes = () => {
    if (!activePlayerId) return toast.message("Select a player first.");
    setRoutes(current => clearPlayerRoutes(current, activePlayerId));
    setSelectedRouteId(null);
  };

  const selectRoute = (id: string) => {
    setSelectedRouteId(id);
    setActiveTool("select");
  };

  const moveRoutePoint = (routeId: string, pointIndex: number, point: FieldPoint) => setRoutes(current => updateRoutePoint(current, routeId, pointIndex, point));

  const applyTemplate = (template: FormationTemplate) => {
    setPlayers(current => applyFormationTemplate(current, template));
    setRoutes([]);
    setActivePlayerId(null);
    setSelectedRouteId(null);
    setFormation(template.name);
    toast.message(`${template.name} loaded. Routes cleared.`);
  };

  const newPlay = () => {
    setOrientation("horizontal");
    setFormat("5v5");
    setPlayers(basePlayers("5v5"));
    setRoutes([]);
    setBall({ x: 46, y: 50 });
    setPlayName("");
    setFormation("Spread");
    setPlayType("pass");
    setNotes("");
    setEditingId(null);
    setActivePlayerId(null);
    setSelectedRouteId(null);
    setView("design");
  };

  const buildPayload = () => ({ name: playName.trim(), formation: formation.trim(), playType, notes: notes.trim(), diagram });

  const savePlay = () => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    if (!playName.trim()) {
      toast.error("Give this play a name before saving.");
      return;
    }
    const payload = buildPayload();
    if (editingId) {
      updatePlay.mutate({ id: editingId, play: payload }, {
        onSuccess: () => {
          utils.playbook.list.invalidate();
          toast.success("Changes saved to your playbook.");
        },
        onError: () => toast.error("Could not update this play. Please try again."),
      });
    } else {
      createPlay.mutate(payload, {
        onSuccess: saved => {
          setEditingId(saved?.id ?? null);
          utils.playbook.list.invalidate();
          toast.success("Play saved to your private playbook.");
        },
        onError: () => toast.error("Could not save this play. Please try again."),
      });
    }
  };

  const loadPlay = (play: NonNullable<typeof playsQuery.data>[number]) => {
    const savedDiagram = play.diagram;
    setOrientation(savedDiagram.orientation);
    setFormat(savedDiagram.format);
    setPlayers(savedDiagram.players);
    setRoutes(savedDiagram.routes);
    setBall(savedDiagram.ball);
    setPlayName(play.name);
    setFormation(play.formation);
    setPlayType(play.playType);
    setNotes(play.notes);
    setEditingId(play.id);
    setActivePlayerId(null);
    setSelectedRouteId(null);
    setView("design");
    toast.message(`Loaded ${play.name}.`);
  };

  const removePlay = (id: number) => {
    if (!window.confirm("Delete this play from your playbook? This cannot be undone.")) return;
    deletePlay.mutate({ id }, {
      onSuccess: () => {
        if (editingId === id) newPlay();
        utils.playbook.list.invalidate();
        toast.success("Play deleted.");
      },
      onError: () => toast.error("Could not delete this play. Please try again."),
    });
  };

  const exportPng = () => {
    const svg = fieldFrameRef.current?.querySelector("svg");
    if (svg) diagramToDataUri(svg, playName.trim().replace(/\s+/g, "-").toLowerCase());
  };

  const studyUrl = studyLink ? `${window.location.origin}/study/${studyLink.token}` : "";

  const openSharing = () => {
    if (!isAuthenticated) return startLogin();
    setShareOpen(true);
    if (!studyLink) getStudyLink.mutate(undefined, { onSuccess: link => setStudyLink(link), onError: () => toast.error("Could not create a study link. Please try again.") });
  };

  const copyStudyLink = async () => {
    if (!studyUrl) return;
    try {
      await navigator.clipboard.writeText(studyUrl);
      toast.success("Study link copied. Share it with your players.");
    } catch {
      toast.error("Copy failed. Select the link and copy it manually.");
    }
  };

  const replaceStudyLink = () => {
    if (!window.confirm("Replace this study link? Anyone with the old link will lose access.")) return;
    regenerateStudyLink.mutate(undefined, { onSuccess: link => { setStudyLink(link); toast.success("New study link created. The old link no longer works."); }, onError: () => toast.error("Could not replace the study link. Please try again.") });
  };

  const labelForFormat = format === "5v5" ? "5 v 5" : "7 v 7";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#091416] text-[#e8f0e7]">
      <header className="border-b border-white/10 bg-[#0c1a1d]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={() => setView("design")} className="group flex items-center gap-3 text-left" aria-label="Open play designer">
            <span className="grid size-10 place-items-center rounded-xl bg-[#f3b348] text-[#132023] shadow-[0_8px_22px_rgba(243,179,72,.18)] transition-transform duration-150 group-active:scale-95"><Flag className="size-5" /></span>
            <span>
              <span className="block font-display text-sm font-semibold tracking-[0.03em] text-white sm:text-base">FieldCraft</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea5a0] sm:block">Flag play designer</span>
            </span>
          </button>
          <nav className="flex items-center gap-1 rounded-xl bg-white/[0.06] p-1" aria-label="Application navigation">
            <button onClick={() => setView("design")} className={`nav-tab ${view === "design" ? "nav-tab-active" : ""}`}><PenTool className="size-3.5" /> <span className="hidden sm:inline">Designer</span></button>
            <button onClick={() => setView("playbook")} className={`nav-tab ${view === "playbook" ? "nav-tab-active" : ""}`}><LayoutGrid className="size-3.5" /> <span className="hidden sm:inline">Playbook</span></button>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? <><button onClick={openSharing} className="share-trigger"><Share2 className="size-3.5" /> <span className="hidden sm:inline">Share</span></button><span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#c5d5d0] lg:block">Coach {user?.name?.split(" ")[0] ?? ""}</span></> : <button onClick={startLogin} className="header-login"><LogIn className="size-3.5" /> Sign in</button>}
          </div>
        </div>
      </header>

      {shareOpen && <div className="share-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setShareOpen(false); }}><section className="share-modal" role="dialog" aria-modal="true" aria-label="Share team study link"><button onClick={() => setShareOpen(false)} className="share-close" aria-label="Close sharing dialog"><X className="size-4" /></button><span className="share-modal-icon"><Share2 className="size-5" /></span><p className="eyebrow mt-4">Team study link</p><h2>Help your players prepare.</h2><p className="mt-2 text-sm leading-6 text-[#9bb0aa]">Players can open this link on any device to study every saved play. They can view, but never edit, your playbook.</p>{getStudyLink.isPending ? <div className="share-loading"><Loader2 className="size-5 animate-spin text-[#f3b348]" /> Creating your private link…</div> : studyLink ? <div className="mt-5"><label className="field-label">Player study link<div className="share-link-row"><input value={studyUrl} readOnly className="designer-input" aria-label="Player study link" /><button onClick={copyStudyLink} className="copy-link-button" aria-label="Copy study link"><Copy className="size-4" /></button></div></label><button onClick={copyStudyLink} className="save-button mt-3"><Link2 className="size-4" /> Copy link</button><button onClick={replaceStudyLink} disabled={regenerateStudyLink.isPending} className="regenerate-link-button mt-3">{regenerateStudyLink.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Replace link & revoke old access</button><p className="mt-4 text-xs leading-5 text-[#7f9891]">Replacing this link immediately stops the old link from working. Use it if a player leaves the team.</p></div> : <div className="share-loading text-[#ffabb6]">We could not load your link. Try closing and reopening this panel.</div>}</section></div>}

      {view === "design" ? (
        <main className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="eyebrow"><Sparkles className="size-3" /> Sideline-ready diagrams</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Make the next call clear.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a7bab5]">Set the formation, trace the idea, and keep every coaching call in one private playbook.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={newPlay} className="secondary-action"><FilePlus2 className="size-4" /> New play</button>
              <button onClick={toggleOrientation} className="secondary-action"><RotateCcw className="size-4" /> {orientation === "horizontal" ? "Portrait field" : "Landscape field"}</button>
              <button onClick={exportPng} className="secondary-action"><ArrowDownToLine className="size-4" /> Export PNG</button>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[286px_minmax(0,1fr)_306px]">
            <aside className="order-2 space-y-4 xl:order-1">
              <section className="control-card">
                <div className="control-heading"><span>Field tools</span><span className="status-dot" /></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button onClick={() => setActiveTool("select")} className={`tool-button ${activeTool === "select" ? "tool-button-active" : ""}`}><MousePointer2 className="size-4" />Move</button>
                  <button onClick={() => setActiveTool("route")} className={`tool-button ${activeTool === "route" ? "tool-button-active" : ""}`}><PenTool className="size-4" />Route</button>
                  <button onClick={() => setActiveTool("ball")} className={`tool-button ${activeTool === "ball" ? "tool-button-active" : ""}`}><CircleDot className="size-4" />Ball</button>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#89a19a]">{selectedRoute ? "Route selected — drag the white control points to refine it." : activeTool === "route" ? "Press on a player and trace their path." : activeTool === "ball" ? "Drag the football to set the snap point." : "Drag tokens anywhere on the field."}</p>
              </section>

              <section className="control-card">
                <div className="control-heading"><span>Route family</span><span className="font-mono text-[10px] text-[#809792]">{activePreset?.label}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {routePresets.map(preset => <button key={preset.id} onClick={() => selectPreset(preset)} className={`route-preset ${routeKind === preset.id ? "route-preset-active" : ""}`}><span style={{ background: preset.color }} className="route-swatch" />{preset.label}</button>)}
                </div>
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <p className="control-label">Route color</p>
                  <div className="mt-2 flex gap-2">
                    {routeColors.map(color => <button key={color} onClick={() => setRouteColor(color)} className={`color-choice ${routeColor === color ? "color-choice-active" : ""}`} style={{ background: color }} aria-label={`Choose ${color} route color`} />)}
                  </div>
                  <p className="mt-4 control-label">Path style</p>
                  <div className="mt-2 flex rounded-lg bg-black/20 p-1">
                    {(["solid", "dashed", "dotted"] as RouteStyle[]).map(style => <button key={style} onClick={() => setRouteStyle(style)} className={`style-choice ${routeStyle === style ? "style-choice-active" : ""}`}><span className={`line-preview line-preview-${style}`} />{style}</button>)}
                  </div>
                </div>
              </section>

              <section className="control-card">
                <div className="control-heading"><span>Personnel</span><UsersRound className="size-4 text-[#89a19a]" /></div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => addPlayer("offense")} className="mini-action flex-1">+ Offense</button>
                  <button onClick={() => addPlayer("defense")} className="mini-action flex-1">+ Defense</button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => changeFormat("5v5")} className={`format-button ${format === "5v5" ? "format-button-active" : ""}`}>5 v 5</button>
                  <button onClick={() => changeFormat("7v7")} className={`format-button ${format === "7v7" ? "format-button-active" : ""}`}>7 v 7</button>
                  <button onClick={resetFormation} className="icon-action" aria-label="Reset formation"><RotateCcw className="size-4" /></button>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#89a19a]">{labelForFormat} personnel. Reset restores the base look and clears paths.</p>
              </section>

              <section className="control-card">
                <div className="control-heading"><span>Formation library</span><LayoutTemplate className="size-4 text-[#89a19a]" /></div>
                <div className="template-side-toggle mt-3">
                  <button onClick={() => setTemplateSide("offense")} className={`template-side-button ${templateSide === "offense" ? "template-side-button-active" : ""}`}><Flag className="size-3.5" /> Offense</button>
                  <button onClick={() => setTemplateSide("defense")} className={`template-side-button ${templateSide === "defense" ? "template-side-button-active" : ""}`}><Shield className="size-3.5" /> Defense</button>
                </div>
                <div className="mt-3 space-y-2">
                  {formationTemplates.filter(template => template.side === templateSide).map(template => <button key={template.id} onClick={() => applyTemplate(template)} className="formation-template"><span className={`formation-template-mark ${template.side === "offense" ? "formation-template-mark-offense" : "formation-template-mark-defense"}`}>{template.side === "offense" ? <Flag className="size-3" /> : <Shield className="size-3" />}</span><span className="min-w-0 text-left"><span className="block text-xs font-semibold text-[#e7f0eb]">{template.name}</span><span className="mt-0.5 block truncate text-[10px] leading-4 text-[#839a93]">{template.description}</span></span><ChevronRight className="ml-auto size-3.5 shrink-0 text-[#718780]" /></button>)}
                </div>
              </section>
            </aside>

            <section className="order-1 min-w-0 xl:order-2">
              <div className="field-shell" ref={fieldFrameRef}>
                <div className="field-shell-topbar">
                  <div><span className="field-pill">{orientation === "horizontal" ? "LANDSCAPE" : "PORTRAIT"}</span><span className="ml-2 font-mono text-[10px] tracking-[.13em] text-[#8ba29c]">{format} FLAG</span></div>
                  <div className="flex items-center gap-2"><span className="hidden text-xs text-[#a9bcb7] sm:inline">{routes.length} {routes.length === 1 ? "path" : "paths"}</span><span className="status-dot" /></div>
                </div>
                <div className={`field-canvas ${orientation === "vertical" ? "field-canvas-vertical" : ""}`}>
                  <PlayField
                    orientation={orientation}
                    players={players}
                    routes={routes}
                    ball={ball}
                    activeTool={activeTool}
                    activePlayerId={activePlayerId}
                    selectedRouteId={selectedRouteId}
                    drawingRoute={drawingRoute}
                    draggingPlayerId={draggingPlayerId}
                    draggingBall={draggingBall}
                    draggingRoutePoint={draggingRoutePoint}
                    onPlayerStart={id => startPlayerInteraction(id)}
                    onPlayerMove={movePlayer}
                    onBallStart={() => setDragState(ballDragState())}
                    onBallMove={moveBall}
                    onRouteStart={startRoute}
                    onRouteExtend={extendRoute}
                    onRouteSelect={selectRoute}
                    onRoutePointStart={(routeId, pointIndex) => setDraggingRoutePoint({ routeId, pointIndex })}
                    onRoutePointMove={moveRoutePoint}
                    onInteractionEnd={endInteraction}
                  />
                </div>
                <div className="field-shell-footer">
                  <span>{selectedRoute ? <><span className="text-white">{selectedRoute.kind}</span> route selected — drag a control point</> : activePlayer ? <><span className="text-white">{activePlayer.label}</span> selected</> : "Tap a route to reveal editing handles"}</span>
                  <div className="flex gap-2">
                    <button onClick={undoRoute} disabled={!routes.length} className="canvas-action"><Undo2 className="size-3.5" /> Undo</button>
                    <button onClick={clearSelectedPlayerRoutes} disabled={!activePlayerId} className="canvas-action"><Eraser className="size-3.5" /> Clear player</button>
                    <button onClick={() => { setRoutes(clearAllRoutes()); setActivePlayerId(null); }} disabled={!routes.length} className="canvas-action text-[#ffabb6]"><Trash2 className="size-3.5" /> Clear all</button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="order-3 space-y-4">
              <section className="control-card">
                <div className="control-heading"><span>Play details</span>{editingId && <span className="edit-chip">EDITING</span>}</div>
                <div className="mt-4 space-y-3">
                  <label className="field-label">Play name<input value={playName} onChange={event => setPlayName(event.target.value)} placeholder="Flood Right" className="designer-input" maxLength={120} /></label>
                  <label className="field-label">Formation<input value={formation} onChange={event => setFormation(event.target.value)} placeholder="Trips" className="designer-input" maxLength={120} /></label>
                  <label className="field-label">Play type<select value={playType} onChange={event => setPlayType(event.target.value as "run" | "pass")} className="designer-input"><option value="pass">Pass</option><option value="run">Run</option></select></label>
                  <label className="field-label">Coaching note<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Primary read, coaching point, or reminder…" className="designer-input min-h-24 resize-y py-2.5" maxLength={2000} /></label>
                </div>
                <button onClick={savePlay} disabled={isSaving || loading} className="save-button mt-4">{isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{editingId ? "Save changes" : "Save to playbook"}<ChevronRight className="ml-auto size-4" /></button>
                {!isAuthenticated && !loading && <p className="mt-3 text-center text-xs leading-5 text-[#8ea39d]">Sign in to keep this play private and available on every device.</p>}
              </section>
              <section className="coach-note">
                <span className="coach-note-icon"><Sparkles className="size-4" /></span>
                <div><p className="font-display text-sm font-medium text-white">Built for quick calls.</p><p className="mt-1 text-xs leading-5 text-[#92aaa2]">Every field control works with a thumb, a stylus, or a mouse.</p></div>
              </section>
            </aside>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          <section className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
            <div><p className="eyebrow"><LayoutGrid className="size-3" /> Your private library</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Playbook</h1><p className="mt-2 text-sm text-[#a7bab5]">Saved calls, ready the moment you need them.</p></div>
            <button onClick={newPlay} className="primary-action"><FilePlus2 className="size-4" /> New play</button>
          </section>
          {!isAuthenticated && !loading ? <div className="empty-playbook"><LogIn className="size-7 text-[#f3b348]" /><h2>Sign in to open your playbook</h2><p>Your diagrams are stored privately for your coaching account.</p><button onClick={startLogin} className="primary-action mt-2">Sign in</button></div> : playsQuery.isLoading || loading ? <div className="empty-playbook"><Loader2 className="size-6 animate-spin text-[#f3b348]" /><p>Loading your private playbook…</p></div> : playsQuery.isError ? <div className="empty-playbook"><RotateCcw className="size-7 text-[#f3b348]" /><h2>Playbook connection interrupted</h2><p>We could not load your saved calls. Your diagrams are still private; please try again.</p><button onClick={() => playsQuery.refetch()} className="primary-action mt-2">Try again</button></div> : playsQuery.data?.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{playsQuery.data.map(play => <article key={play.id} className="play-card"><button onClick={() => loadPlay(play)} className="play-card-preview"><PlayThumbnail orientation={play.diagram.orientation} players={play.diagram.players} routes={play.diagram.routes} /></button><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-semibold tracking-[-.025em] text-white">{play.name}</p><p className="mt-1 text-xs text-[#94aaa3]">{play.formation || "No formation"} <span className="mx-1 text-[#596e68]">·</span> <span className="uppercase tracking-[.14em]">{play.playType}</span></p></div><span className="play-card-count">{play.diagram.routes.length} path{play.diagram.routes.length === 1 ? "" : "s"}</span></div>{play.notes && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#91a8a0]">{play.notes}</p>}<div className="mt-4 flex gap-2"><button onClick={() => loadPlay(play)} className="mini-action flex-1">Edit diagram</button><button onClick={() => removePlay(play.id)} disabled={deletePlay.isPending} className="delete-action" aria-label={`Delete ${play.name}`}><Trash2 className="size-4" /></button></div></div></article>)}</div> : <div className="empty-playbook"><Flag className="size-8 text-[#f3b348]" /><h2>Your first call starts here</h2><p>Build a formation in the designer and save it to see it in your private playbook.</p><button onClick={() => setView("design")} className="primary-action mt-2">Open designer</button></div>}
        </main>
      )}
    </div>
  );
}
