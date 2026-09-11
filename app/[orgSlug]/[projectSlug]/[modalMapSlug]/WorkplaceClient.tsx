"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Loader2, Crosshair } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DetailsDrawer, type AddComponentData } from "./DetailsDrawer";
import { addComponentToModalMap, deleteComponent, type ModalMapComponent } from "@/app/actions/components";

// ── Local types ───────────────────────────────────────────────────────────────

type BarTooltip = {
  x: number;
  y: number;
  range: { base_low: number; base_high: number | null; safe_low: number | null; safe_high: number | null };
};

// ── Scrubber config — tune these values to adjust feel ────────────────────────

const SCRUBBER_CONFIG = {
  MIN_FREQ:          0,      // left boundary in Hz
  MAX_FREQ:          6000,   // right boundary in Hz
  DEFAULT_VIEW_START: 0,
  DEFAULT_VIEW_END:   400,
  MIN_RANGE:         2,      // maximum zoom in  (minimum visible Hz range)
  MAX_RANGE:         6000,   // maximum zoom out (maximum visible Hz range)
  ZOOM_SENSITIVITY:  0.001,  // lower = slower zoom, higher = faster
  TICK_INTERVALS:    [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.1],
  TARGET_TICK_COUNT: 8,      // approximate number of ruler ticks to show
} as const;

// ── Pure frequency math ────────────────────────────────────────────────────────

/** Map a frequency value to a pixel x-position within the canvas width. */
function freqToX(freq: number, viewStart: number, viewEnd: number, width: number): number {
  return ((freq - viewStart) / (viewEnd - viewStart)) * width;
}

/**
 * Pick the largest interval from the clean list where dividing the visible
 * range by that interval produces between 5 and 12 ticks. Iterating
 * largest-first means we always prefer fewer, roomier ticks and only step
 * down when the current interval would produce too many.
 *
 * Because every candidate is a round number, ticks always land on clean
 * multiples (e.g. 94, 95, 96 or 93.5, 94.0, 94.5) — never on arbitrary
 * decimals like 93.8, 94.2.
 */
function getNiceInterval(range: number): number {
  const { TICK_INTERVALS, TARGET_TICK_COUNT } = SCRUBBER_CONFIG;
  const lo = TARGET_TICK_COUNT * 0.6; // ~60 % of target → accept fewer ticks
  const hi = TARGET_TICK_COUNT * 1.5; // ~150 % of target → accept more ticks

  for (const interval of TICK_INTERVALS) {
    const tickCount = range / interval;
    if (tickCount >= lo && tickCount <= hi) return interval;
  }

  // Fallback: finest interval available
  return TICK_INTERVALS[TICK_INTERVALS.length - 1];
}

/** Return the set of tick frequencies visible in [viewStart, viewEnd]. */
function getRulerTicks(viewStart: number, viewEnd: number): number[] {
  const interval = getNiceInterval(viewEnd - viewStart);
  // Start from the first clean multiple of the interval at or after viewStart.
  // No epsilon fudge needed — interval is always a round number so integer
  // multiples are exact (or exact to 1 decimal place for 0.5 / 0.1).
  const first = Math.ceil(viewStart / interval) * interval;
  const ticks: number[] = [];
  for (let f = first; f <= viewEnd + interval * 0.001; f += interval) {
    ticks.push(parseFloat(f.toPrecision(10)));
  }
  return ticks;
}

/** Format a frequency for display in the ruler. Always plain Hz, no "k". */
function formatFreq(f: number): string {
  // Round to avoid floating-point display artefacts (e.g. 99.99999)
  const rounded = parseFloat(f.toPrecision(10));
  const base = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${base} Hz`;
}

/** Format a number without the Hz suffix (used inside tooltip range strings). */
function formatNum(n: number): string {
  const rounded = parseFloat(n.toPrecision(10));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModalMapData {
  id: string;
  name: string;
}

// Extends the server-returned type with an optional optimistic flag
type ComponentRow = ModalMapComponent & { optimistic?: boolean };

interface Props {
  orgSlug: string;
  projectSlug: string;
  projectName: string;
  modalMap: ModalMapData;
  components: ModalMapComponent[];
}

// ── WorkplaceClient ────────────────────────────────────────────────────────────

export function WorkplaceClient({
  orgSlug,
  projectSlug,
  projectName,
  modalMap,
  components: initialComponents,
}: Props) {
  const backHref = `/${orgSlug}/${projectSlug}`;

  // ── Component list (mutable for optimistic updates) ───────────────────────
  const [componentList, setComponentList]     = useState<ComponentRow[]>(initialComponents);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [editingComponent, setEditingComponent] = useState<ModalMapComponent | null>(null);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);

  // ── Optimistic add ─────────────────────────────────────────────────────────
  async function handleAdd(data: AddComponentData) {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticRow: ComponentRow = {
      id:                 optimisticId,
      name:               data.name,
      description:        data.description,
      component_type:     data.componentType,
      display_order:      componentList.length,
      source_template_id: data.sourceTemplateId ?? null,
      frequency_ranges:   data.frequencyRanges,
      optimistic:         true,
    };

    setComponentList((prev) => [...prev, optimisticRow]);
    setDrawerOpen(false);

    const result = await addComponentToModalMap(orgSlug, projectSlug, {
      modalMapId:       modalMap.id,
      name:             data.name,
      description:      data.description,
      componentType:    data.componentType,
      frequencyRanges:  data.frequencyRanges,
      sourceTemplateId: data.sourceTemplateId,
      displayOrder:     componentList.length,
    });

    if (result.success) {
      // Replace the optimistic row with the confirmed server row
      setComponentList((prev) =>
        prev.map((c) => (c.id === optimisticId ? result.component : c))
      );
    } else {
      // Roll back the optimistic row and surface the error
      setComponentList((prev) => prev.filter((c) => c.id !== optimisticId));
      setErrorMsg(result.error);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  // ── Optimistic delete ──────────────────────────────────────────────────────
  async function handleDelete(componentId: string) {
    const saved = componentList.find((c) => c.id === componentId);
    if (!saved) return;

    setComponentList((prev) => prev.filter((c) => c.id !== componentId));
    setDrawerOpen(false);
    setEditingComponent(null);

    const result = await deleteComponent(orgSlug, projectSlug, componentId);

    if (!result.success) {
      setComponentList((prev) => [...prev, saved]);
      setErrorMsg(result.error);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  // ── Frequency view state ───────────────────────────────────────────────────
  const [viewStart, setViewStart] = useState<number>(SCRUBBER_CONFIG.DEFAULT_VIEW_START);
  const [viewEnd, setViewEnd]     = useState<number>(SCRUBBER_CONFIG.DEFAULT_VIEW_END);

  // Ref mirrors state so event-handler closures always see current values
  // without needing to be re-registered on every render.
  const viewRef = useRef<{ start: number; end: number }>({ start: SCRUBBER_CONFIG.DEFAULT_VIEW_START, end: SCRUBBER_CONFIG.DEFAULT_VIEW_END });

  const [canvasWidth, setCanvasWidth] = useState(0);
  const [hoverX, setHoverX]           = useState<number | null>(null);
  const [crosshairOn, setCrosshairOn] = useState(false);

  const [barTooltip, setBarTooltip]   = useState<BarTooltip | null>(null);

  // The ruler div is the interaction surface for zoom/pan AND provides the
  // width used by freqToX. It sits in the fixed header row.
  const rulerRef = useRef<HTMLDivElement>(null);

  // The outermost Modal Map View container — wheel listener lives here so
  // horizontal swipes anywhere in the workspace are intercepted.
  const mapViewRef = useRef<HTMLDivElement>(null);

  // The canvas rows container (kept for other uses).
  const canvasRowsRef = useRef<HTMLDivElement>(null);

  // ── Clamped view updater ───────────────────────────────────────────────────
  const setView = useCallback((start: number, end: number) => {
    const { MIN_FREQ, MAX_FREQ, MIN_RANGE, MAX_RANGE } = SCRUBBER_CONFIG;
    let range = end - start;

    // Clamp range: cannot zoom in past MIN_RANGE or zoom out past MAX_RANGE
    range = Math.max(MIN_RANGE, Math.min(MAX_RANGE, range));

    // Clamp start so the window stays within [MIN_FREQ, MAX_FREQ]
    let s = Math.max(MIN_FREQ, Math.min(MAX_FREQ - range, start));
    let e = s + range;

    // Safety guards — should never trigger after the above, but be explicit
    if (e > MAX_FREQ) { e = MAX_FREQ; s = e - range; }
    if (s < MIN_FREQ) { s = MIN_FREQ; e = s + range; }

    viewRef.current = { start: s, end: e };
    setViewStart(s);
    setViewEnd(e);
  }, []);

  // ── ResizeObserver: track ruler width for freqToX ─────────────────────────
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Wheel zoom + horizontal pan ───────────────────────────────────────────
  // Attached to the outermost map view container so every wheel event inside
  // the workspace is captured before the browser can act on it.
  useEffect(() => {
    const container = mapViewRef.current;
    const ruler     = rulerRef.current;
    if (!container || !ruler) return;

    function onWheel(e: WheelEvent) {
      const w = ruler!.getBoundingClientRect().width;
      if (w === 0) return;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+scroll — zoom around cursor position
        e.preventDefault();
        const { start, end } = viewRef.current;
        const mouseX    = e.clientX - ruler!.getBoundingClientRect().left;
        const pivotFreq = start + (mouseX / w) * (end - start);
        const scale     = 1 + e.deltaY * SCRUBBER_CONFIG.ZOOM_SENSITIVITY;
        const factor    = Math.max(0.1, scale);
        const newRange  = (end - start) * factor;
        setView(
          pivotFreq - (mouseX / w)       * newRange,
          pivotFreq + ((w - mouseX) / w) * newRange,
        );
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal swipe — unconditionally block browser navigation and pan
        e.preventDefault();
        const freqPerPixel = (viewRef.current.end - viewRef.current.start) / w;
        const deltaFreq    = e.deltaX * freqPerPixel;
        setView(viewRef.current.start + deltaFreq, viewRef.current.end + deltaFreq);
      }
      // Pure vertical scroll — fall through, browser handles row scrolling
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [setView]);

  // ── Mouse drag pan ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;

    let dragging = false;
    let lastX    = 0;

    function onMouseDown(e: MouseEvent) {
      dragging = true;
      lastX    = e.clientX;
      el!.style.cursor = "grabbing";
      e.preventDefault(); // prevent text selection while dragging
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const rect = el!.getBoundingClientRect();
      const w    = rect.width;
      if (w === 0) return;

      const dx            = e.clientX - lastX;
      const { start, end } = viewRef.current;
      const freqPerPx     = (end - start) / w;
      // Dragging right → view shifts left (lower frequencies)
      const delta         = -dx * freqPerPx;
      const range         = end - start;

      setView(start + delta, start + delta + range);
      lastX = e.clientX;
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging             = false;
      el!.style.cursor     = "grab";
    }

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    el.style.cursor = "grab";

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [setView]);

  // ── Touch zoom (pinch) + pan (single finger) ───────────────────────────────
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;

    type PinchState = {
      initialDist: number;
      pivotFreq: number;
      initialStart: number;
      initialEnd: number;
    };

    let lastTouchX = 0;
    let pinch: PinchState | null = null;

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();

      if (e.touches.length >= 2) {
        const t1   = e.touches[0];
        const t2   = e.touches[1];
        const rect = el!.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const { start, end } = viewRef.current;

        pinch = {
          initialDist:  Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
          pivotFreq:    start + (midX / rect.width) * (end - start),
          initialStart: start,
          initialEnd:   end,
        };
      } else {
        pinch      = null;
        lastTouchX = e.touches[0].clientX;
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const w    = rect.width;
      if (w === 0) return;

      if (e.touches.length >= 2 && pinch) {
        // Pinch zoom — scale around the original pivot
        const t1      = e.touches[0];
        const t2      = e.touches[1];
        const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        // Increasing distance (fingers apart) → zoom in (smaller range)
        const factor   = pinch.initialDist / newDist;
        const origRange = pinch.initialEnd - pinch.initialStart;
        const newRange  = origRange * factor;
        const midX     = (t1.clientX + t2.clientX) / 2 - rect.left;

        setView(
          pinch.pivotFreq - (midX / w)       * newRange,
          pinch.pivotFreq + ((w - midX) / w) * newRange,
        );
      } else if (e.touches.length === 1 && !pinch) {
        // Single-finger pan
        const dx            = e.touches[0].clientX - lastTouchX;
        const { start, end } = viewRef.current;
        const freqPerPx     = (end - start) / w;
        const delta         = -dx * freqPerPx;
        const range         = end - start;

        setView(start + delta, start + delta + range);
        lastTouchX = e.touches[0].clientX;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length === 1) lastTouchX = e.touches[0].clientX;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [setView]);

  // ── Ruler ticks (derived from view state) ──────────────────────────────────
  const ticks = getRulerTicks(viewStart, viewEnd);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Workplace Header ────────────────────────────────────────────── */}
      <header className="flex h-(--header-height) shrink-0 items-center border-b">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          {/* Sidebar collapse — identical to PageHeader */}
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />

          {/* Back to project */}
          <Link
            href={backHref}
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to project"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </Link>

          {/* Project → Modal Map */}
          <div className="ml-0.5 flex items-center gap-1.5 text-[13px]">
            <span className="text-muted-foreground">{projectName}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground">{modalMap.name}</span>
          </div>

          <div className="flex-1" />

          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCrosshairOn((v) => !v)}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                crosshairOn
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
              aria-label="Toggle crosshair"
              title="Crosshair"
            >
              <Crosshair size={14} />
            </button>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        </div>
      </header>

      {/* ── Modal Map View ───────────────────────────────────────────────── */}
      <div ref={mapViewRef} className="flex flex-1 flex-col overflow-hidden">

        {/* ── Sticky header row: component column header + ruler ────────── */}
        <div className="flex h-12 shrink-0 border-b bg-card" style={{ zIndex: 10 }}>

          {/* Component column header */}
          <div className="flex w-[280px] shrink-0 items-center justify-between border-r border-border/60 px-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Components
            </span>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Add component"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Frequency ruler — also shows hover tooltip */}
          <div
            ref={rulerRef}
            className="relative flex-1 select-none overflow-hidden"
            onMouseMove={(e) => {
              if (!crosshairOn) return;
              const rect = rulerRef.current!.getBoundingClientRect();
              setHoverX(e.clientX - rect.left);
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            {canvasWidth > 0 && ticks.map((f) => {
              const x = freqToX(f, viewStart, viewEnd, canvasWidth);
              if (x < -40 || x > canvasWidth + 40) return null;

              const EDGE = 30;
              let labelLeft: number;
              let labelTransform: string;
              if (x < EDGE) {
                labelLeft      = 4;
                labelTransform = "none";
              } else if (x > canvasWidth - EDGE) {
                labelLeft      = canvasWidth - 4;
                labelTransform = "translateX(-100%)";
              } else {
                labelLeft      = x;
                labelTransform = "translateX(-50%)";
              }

              return (
                <React.Fragment key={f}>
                  <span
                    className="absolute text-[10px] leading-none tabular-nums text-muted-foreground/60"
                    style={{ left: labelLeft, bottom: "8px", transform: labelTransform }}
                  >
                    {formatFreq(f)}
                  </span>
                  <div
                    className="absolute bottom-0 h-2 w-px bg-border/70"
                    style={{ left: x }}
                  />
                </React.Fragment>
              );
            })}

            {/* Hover tooltip — pill that follows cursor horizontally */}
            {hoverX !== null && canvasWidth > 0 && (() => {
              const freq    = viewStart + (hoverX / canvasWidth) * (viewEnd - viewStart);
              const PILL_W  = 72;
              const pinned  = Math.max(PILL_W / 2, Math.min(canvasWidth - PILL_W / 2, hoverX));
              return (
                <div
                  className="pointer-events-none absolute top-1.5 z-20 -translate-x-1/2 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] tabular-nums text-background"
                  style={{ left: pinned }}
                >
                  {formatFreq(freq)}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Single scroll container ───────────────────────────────────── */}
        {/* Full-width rows, each with a 280px left cell + flex-1 right cell */}
        <div
          ref={canvasRowsRef}
          className="relative flex-1 overflow-y-auto"
          onMouseMove={(e) => {
            if (!crosshairOn) return;
            const rect = rulerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setHoverX(e.clientX - rect.left);
          }}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Hairline — fixed at cursor X, spans full scroll height */}
          {hoverX !== null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px"
              style={{ left: 280 + hoverX, backgroundColor: "rgba(255,255,255,0.18)" }}
            />
          )}

          {componentList.map((component) => (
            <div
              key={component.id}
              className="flex h-12 border-b border-border/60 last:border-b-0"
            >
              {/* Component name cell */}
              <div className="flex w-[280px] shrink-0 items-center gap-2 border-r border-border/60 bg-card px-4">
                {component.optimistic && (
                  <Loader2 size={11} className="shrink-0 animate-spin text-muted-foreground/40" />
                )}
                <button
                  disabled={!!component.optimistic}
                  onClick={() => {
                    setEditingComponent(component);
                    setDrawerOpen(true);
                  }}
                  className={[
                    "truncate text-left text-[13px]",
                    component.optimistic
                      ? "pointer-events-none text-muted-foreground/50"
                      : "text-foreground hover:underline",
                  ].join(" ")}
                >
                  {component.name}
                </button>
              </div>

              {/* Canvas cell — frequency bars + grid lines */}
              <div className="relative flex-1 overflow-hidden">
                {/* Grid lines — one per ruler tick */}
                {canvasWidth > 0 && ticks.map((f) => {
                  const x = freqToX(f, viewStart, viewEnd, canvasWidth);
                  if (x < 0 || x > canvasWidth) return null;
                  return (
                    <div
                      key={f}
                      className="absolute inset-y-0 w-px pointer-events-none"
                      style={{ left: x, backgroundColor: "rgba(255,255,255,0.06)" }}
                    />
                  );
                })}

                {/* Frequency bars */}
                {canvasWidth > 0 && component.frequency_ranges.map((range, ri) => {
                  const x1 = freqToX(range.base_low, viewStart, viewEnd, canvasWidth);

                  // ── Shared bar tooltip handlers ───────────────────────────
                  const barEnter = (e: React.MouseEvent) =>
                    setBarTooltip({ x: e.clientX, y: e.clientY, range });
                  const barMove  = (e: React.MouseEvent) =>
                    setBarTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                  const barLeave = () => setBarTooltip(null);

                  // ── Point frequency (base_high is null) ──────────────────
                  if (range.base_high == null) {
                    if (x1 < 0 || x1 > canvasWidth) return null;
                    return (
                      <div key={ri} className="absolute inset-y-0" style={{ left: x1 - 8, width: 16 }}
                        onMouseEnter={barEnter} onMouseMove={barMove} onMouseLeave={barLeave}
                      >
                        <div
                          className="absolute rounded"
                          style={{
                            left:            6.5,
                            width:           3,
                            top:             "50%",
                            height:          "40%",
                            transform:       "translateY(-50%)",
                            backgroundColor: "oklch(0.55 0.12 250 / 0.70)",
                          }}
                        />
                      </div>
                    );
                  }

                  // ── Range bar (base_high is set) ─────────────────────────
                  const x2 = freqToX(range.base_high, viewStart, viewEnd, canvasWidth);

                  const baseVisible = !(x2 < 0 || x1 > canvasWidth);
                  const baseLeft    = Math.max(0, x1);
                  const baseRight   = Math.min(canvasWidth, x2);
                  const baseWidth   = baseRight - baseLeft;

                  let safeLeft = 0, safeWidth = 0, showSafe = false;
                  if (range.safe_low != null && range.safe_high != null) {
                    const sx1 = freqToX(range.safe_low,  viewStart, viewEnd, canvasWidth);
                    const sx2 = freqToX(range.safe_high, viewStart, viewEnd, canvasWidth);
                    if (sx1 < canvasWidth && sx2 > 0) {
                      safeLeft  = Math.max(0, sx1);
                      safeWidth = Math.min(canvasWidth, sx2) - safeLeft;
                      showSafe  = true;
                    }
                  }

                  if (!baseVisible && !showSafe) return null;

                  // Hit area covers the widest visible extent of this range
                  const hitLeft  = showSafe ? safeLeft  : baseLeft;
                  const hitWidth = showSafe ? safeWidth : baseWidth;

                  return (
                    <React.Fragment key={ri}>
                      {showSafe && (
                        <div
                          className="absolute rounded"
                          style={{
                            left:            safeLeft,
                            width:           safeWidth,
                            top:             8,
                            bottom:          8,
                            backgroundColor: "oklch(0.55 0.12 250 / 0.20)",
                          }}
                        />
                      )}
                      {baseVisible && (
                        <div
                          className="absolute rounded"
                          style={{
                            left:            baseLeft,
                            width:           Math.max(2, baseWidth),
                            top:             "50%",
                            height:          "40%",
                            transform:       "translateY(-50%)",
                            backgroundColor: "oklch(0.55 0.12 250 / 0.70)",
                          }}
                        />
                      )}
                      {/* Transparent hit area — captures mouse events for the whole range */}
                      <div
                        className="absolute inset-y-0"
                        style={{ left: hitLeft, width: Math.max(8, hitWidth) }}
                        onMouseEnter={barEnter}
                        onMouseMove={barMove}
                        onMouseLeave={barLeave}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}

          {componentList.length === 0 && (
            <div className="flex min-h-full">
              <div className="w-[280px] shrink-0 border-r border-border/60 bg-card" />
              <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
                <p className="text-[13px] italic text-muted-foreground/50">No components yet</p>
                <p className="mt-1 text-[12px] text-muted-foreground/35">
                  Use the + button above to add the first component.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Details Drawer ─────────────────────────────────────────────── */}
        {drawerOpen && (
          <DetailsDrawer
            onClose={() => { setDrawerOpen(false); setEditingComponent(null); }}
            onAdd={handleAdd}
            onDelete={handleDelete}
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            editingComponent={editingComponent}
          />
        )}

        {/* ── Bar tooltip (fixed so it escapes overflow clipping) ──────── */}
        {barTooltip && (() => {
          const { x, y, range } = barTooltip;
          const baseLine = range.base_high != null && range.base_high > 0
            ? `Base: ${formatNum(range.base_low)} – ${formatNum(range.base_high)} Hz`
            : `Base: ${formatNum(range.base_low)} Hz`;
          const safeLine = range.safe_low != null && range.safe_high != null
            ? `Safe: ${formatNum(range.safe_low)} – ${formatNum(range.safe_high)} Hz`
            : null;
          return (
            <div
              className="pointer-events-none fixed z-50 rounded-md bg-foreground/95 px-2.5 py-1.5 text-[11px] leading-snug text-background shadow-lg"
              style={{ left: x + 12, top: y - (safeLine ? 52 : 36) }}
            >
              <div>{baseLine}</div>
              {safeLine && <div className="mt-0.5 text-background/70">{safeLine}</div>}
            </div>
          );
        })()}

        {/* ── Error notification ─────────────────────────────────────────── */}
        {errorMsg && (
          <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-destructive/20 bg-card px-4 py-2.5 text-[13px] text-destructive shadow-md">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
