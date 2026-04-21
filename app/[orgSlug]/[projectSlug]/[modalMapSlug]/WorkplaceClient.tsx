"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

// ── Scrubber config — tune these values to adjust feel ────────────────────────

const SCRUBBER_CONFIG = {
  MIN_FREQ:         0,      // left boundary in Hz
  MAX_FREQ:         6000,   // right boundary in Hz
  MIN_RANGE:        2,      // maximum zoom in  (minimum visible Hz range)
  MAX_RANGE:        6000,   // maximum zoom out (maximum visible Hz range)
  ZOOM_SENSITIVITY: 0.001,  // lower = slower zoom, higher = faster
  TICK_INTERVALS:   [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.1],
  TARGET_TICK_COUNT: 8,     // approximate number of ruler ticks to show
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
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModalMapData {
  id: string;
  name: string;
}

interface ComponentData {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  orgSlug: string;
  projectSlug: string;
  projectName: string;
  modalMap: ModalMapData;
  components: ComponentData[];
}

// ── WorkplaceClient ────────────────────────────────────────────────────────────

export function WorkplaceClient({
  orgSlug,
  projectSlug,
  projectName,
  modalMap,
  components,
}: Props) {
  const backHref = `/${orgSlug}/${projectSlug}`;

  // ── Frequency view state ───────────────────────────────────────────────────
  const [viewStart, setViewStart] = useState(SCRUBBER_CONFIG.MIN_FREQ);
  const [viewEnd, setViewEnd]     = useState(SCRUBBER_CONFIG.MAX_FREQ);

  // Ref mirrors state so event-handler closures always see current values
  // without needing to be re-registered on every render.
  const viewRef = useRef<{ start: number; end: number }>({ start: SCRUBBER_CONFIG.MIN_FREQ, end: SCRUBBER_CONFIG.MAX_FREQ });

  const [canvasWidth, setCanvasWidth] = useState(0);

  // The ruler div is the interaction surface for zoom/pan AND provides the
  // width used by freqToX. It sits in the fixed header row.
  const rulerRef = useRef<HTMLDivElement>(null);

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

  // ── Wheel zoom (passive: false so we can call preventDefault) ─────────────
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const w = rect.width;
      if (w === 0) return;

      const mouseX   = e.clientX - rect.left;
      const { start, end } = viewRef.current;
      const pivotFreq = start + (mouseX / w) * (end - start);
      // Sensitivity-based zoom: deltaY is in pixels/lines/pages depending on
      // the device; multiply by sensitivity to get a fractional scale change.
      const scale    = 1 + e.deltaY * SCRUBBER_CONFIG.ZOOM_SENSITIVITY;
      const factor   = Math.max(0.1, scale); // clamp to prevent sign flip
      const newRange  = (end - start) * factor;

      setView(
        pivotFreq - (mouseX / w)       * newRange,
        pivotFreq + ((w - mouseX) / w) * newRange,
      );
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
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

          <Button variant="outline" size="sm">Edit</Button>
        </div>
      </header>

      {/* ── Modal Map View ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Fixed column header row ─────────────────────────────────────── */}
        <div className="flex h-12 shrink-0 border-b bg-card">

          {/* Component column header */}
          <div className="flex w-[280px] shrink-0 items-center justify-between border-r px-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Components
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Add component"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Frequency ruler ──────────────────────────────────────────── */}
          {/* This div is also the interaction surface for zoom/pan.       */}
          <div
            ref={rulerRef}
            className="relative flex-1 select-none overflow-hidden"
          >
            {canvasWidth > 0 &&
              ticks.map((f) => {
                const x = freqToX(f, viewStart, viewEnd, canvasWidth);
                // Skip ticks fully off-screen
                if (x < -40 || x > canvasWidth + 40) return null;

                // The tick line always sits at the exact frequency pixel.
                // The label shifts so it never overflows either edge.
                const EDGE = 30; // px threshold for "near the edge"
                let labelLeft: number;
                let labelTransform: string;
                if (x < EDGE) {
                  // Near left edge — pin label 4px from the left
                  labelLeft      = 4;
                  labelTransform = "none";
                } else if (x > canvasWidth - EDGE) {
                  // Near right edge — pin label 4px from the right
                  labelLeft      = canvasWidth - 4;
                  labelTransform = "translateX(-100%)";
                } else {
                  // Centre label on tick mark
                  labelLeft      = x;
                  labelTransform = "translateX(-50%)";
                }

                return (
                  <React.Fragment key={f}>
                    {/* Label — position adjusted to avoid edge clipping */}
                    <span
                      className="absolute mb-1.5 text-[10px] leading-none tabular-nums text-muted-foreground/60"
                      style={{ left: labelLeft, bottom: "8px", transform: labelTransform }}
                    >
                      {formatFreq(f)}
                    </span>
                    {/* Tick line — always at exact frequency position */}
                    <div
                      className="absolute bottom-0 h-2 w-px bg-border/70"
                      style={{ left: x }}
                    />
                  </React.Fragment>
                );
              })}
          </div>
        </div>

        {/* ── Unified scroll container ──────────────────────────────────── */}
        {/* Single overflow-y-auto div. Each row is full-width flex, so     */}
        {/* the component-name cell and canvas cell scroll as one unit.     */}
        <div className="flex-1 overflow-y-auto">
          {components.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-[13px] italic text-muted-foreground/50">
                No components yet
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground/35">
                Use the + button above to add the first component.
              </p>
            </div>
          ) : (
            components.map((component) => (
              <div
                key={component.id}
                className="flex h-12 border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/20"
              >
                {/* Component name cell — matches column header width */}
                <div className="flex w-[280px] shrink-0 items-center border-r border-border/60 bg-card px-4">
                  <span className="truncate text-[13px] text-foreground">
                    {component.name}
                  </span>
                </div>

                {/* Canvas cell — frequency data visualisation goes here */}
                <div className="relative flex-1" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
