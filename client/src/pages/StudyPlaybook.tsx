import React, { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { BookOpenCheck, Flag, Gauge, Loader2, Pause, Play, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import PlayField, { PlayThumbnail } from "@/components/PlayField";

export default function StudyPlaybook() {
  const [, params] = useRoute("/study/:token");
  const token = params?.token ?? "";
  const studyQuery = trpc.study.get.useQuery({ token }, { enabled: token.length >= 20, retry: false });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!selectedId && studyQuery.data?.plays[0]) setSelectedId(studyQuery.data.plays[0].id);
  }, [selectedId, studyQuery.data]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let lastTimestamp = performance.now();
    const duration = 6400 / speed;
    const tick = (timestamp: number) => {
      const nextProgress = Math.min(1, progressRef.current + (timestamp - lastTimestamp) / duration);
      lastTimestamp = timestamp;
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        setIsPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed]);

  if (studyQuery.isLoading) return <div className="study-loading"><Loader2 className="size-7 animate-spin text-[#f3b348]" /><p>Loading your team’s study room…</p></div>;
  if (studyQuery.isError || !studyQuery.data) return <div className="study-loading"><TriangleAlert className="size-8 text-[#f3b348]" /><h1>Study link unavailable</h1><p>This link may have been replaced by the coach. Ask for the current team study link.</p><Link href="/" className="primary-action mt-2">Open FieldCraft</Link></div>;

  const { coachName, plays } = studyQuery.data;
  const selected = plays.find(play => play.id === selectedId) ?? plays[0];
  const resetPlayback = (shouldPlay = false) => {
    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(shouldPlay);
  };
  const choosePlay = (id: number) => {
    setSelectedId(id);
    resetPlayback(false);
  };
  const togglePlayback = () => {
    if (progress >= 1) resetPlayback(true);
    else setIsPlaying(playing => !playing);
  };

  return <div className="min-h-screen bg-[#091416] text-[#e8f0e7]">
    <header className="border-b border-white/10 bg-[#0c1a1d]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#f3b348] text-[#132023]"><Flag className="size-4" /></span><span><span className="block font-display text-sm font-semibold text-white">FieldCraft</span><span className="block font-mono text-[9px] uppercase tracking-[.16em] text-[#8ea5a0]">Team study room</span></span></Link>
        <span className="flex items-center gap-2 rounded-full border border-[#83da93]/20 bg-[#83da93]/[.08] px-3 py-1.5 text-xs text-[#b4edbc]"><ShieldCheck className="size-3.5" /> Read-only access</span>
      </div>
    </header>
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow"><BookOpenCheck className="size-3" /> Player study</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">{coachName}’s playbook</h1><p className="mt-2 text-sm leading-6 text-[#a7bab5]">Study the call, learn your assignment, and arrive ready.</p></div><span className="font-mono text-[10px] uppercase tracking-[.14em] text-[#8ca29c]">{plays.length} saved {plays.length === 1 ? "play" : "plays"}</span></section>
      {!plays.length ? <div className="empty-playbook"><BookOpenCheck className="size-8 text-[#f3b348]" /><h2>Your coach has not added plays yet</h2><p>Check back after the next playbook update.</p></div> : <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="study-list"><p className="study-list-label">Choose a play</p><div className="mt-3 space-y-2">{plays.map(play => <button key={play.id} onClick={() => choosePlay(play.id)} className={`study-play-item ${play.id === selected?.id ? "study-play-item-active" : ""}`}><span className="study-play-thumb"><PlayThumbnail orientation={play.diagram.orientation} players={play.diagram.players} routes={play.diagram.routes} /></span><span className="min-w-0 text-left"><span className="block truncate text-sm font-semibold text-white">{play.name}</span><span className="mt-0.5 block truncate text-[11px] text-[#8fa39e]">{play.formation || "Formation not set"} · {play.playType}</span></span></button>)}</div></aside>{selected && <section className="min-w-0"><div className="study-field-shell"><div className="study-field-heading"><div><p className="font-display text-xl font-semibold text-white">{selected.name}</p><p className="mt-1 text-xs text-[#91a8a0]">{selected.formation || "Formation not set"} <span className="mx-1 text-[#5c726b]">·</span> <span className="uppercase tracking-[.12em]">{selected.playType}</span></p></div><span className="study-chip">Study mode</span></div><div className="study-playback-bar"><button onClick={togglePlayback} className="study-play-button">{isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />} {isPlaying ? "Pause" : progress >= 1 ? "Watch again" : "Watch play"}</button><button onClick={() => resetPlayback(true)} className="study-replay-button" aria-label="Replay from the beginning"><RotateCcw className="size-4" /></button><div className="study-progress"><div className="study-progress-track"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div><span>{Math.round(progress * 100)}%</span></div><div className="study-speed"><Gauge className="size-3.5" />{[1, 1.5].map(option => <button key={option} onClick={() => setSpeed(option)} className={speed === option ? "study-speed-active" : ""}>{option}×</button>)}</div></div><div className={`field-canvas ${selected.diagram.orientation === "vertical" ? "field-canvas-vertical" : ""}`}><PlayField orientation={selected.diagram.orientation} players={selected.diagram.players} routes={selected.diagram.routes} ball={selected.diagram.ball} activeTool="select" activePlayerId={null} selectedRouteId={null} drawingRoute={null} draggingPlayerId={null} draggingBall={false} draggingRoutePoint={null} onPlayerStart={() => {}} onPlayerMove={() => {}} onBallStart={() => {}} onBallMove={() => {}} onRouteStart={() => {}} onRouteExtend={() => {}} onRouteSelect={() => {}} onRoutePointStart={() => {}} onRoutePointMove={() => {}} onInteractionEnd={() => {}} readOnly playbackProgress={progress} /></div>{selected.notes && <div className="study-note"><span className="font-mono text-[10px] uppercase tracking-[.14em] text-[#f3b348]">Coach’s note</span><p className="mt-2 text-sm leading-6 text-[#c0d0cb]">{selected.notes}</p></div>}</div></section>}</div>}
    </main>
  </div>;
}
