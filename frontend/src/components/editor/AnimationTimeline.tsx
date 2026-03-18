import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { WButton, WDropdown, WInputNumber } from '../w';
import { keyframesToCSS, ANIMATION_KEYFRAMES_CSS } from '../../animations';
import type { AnimationKeyframe } from '../../animations';

const EASING_OPTIONS = [
  { value: 'ease',         label: 'Ease' },
  { value: 'ease-in',      label: 'Ease In' },
  { value: 'ease-out',     label: 'Ease Out' },
  { value: 'ease-in-out',  label: 'Ease In Out' },
  { value: 'linear',       label: 'Linear' },
];

interface Props {
  label: string;
  /** 'customIn' or 'customOut' — used to namespace preview keyframe name */
  trackId: string;
  keyframes: AnimationKeyframe[];
  duration: number;
  onChange: (keyframes: AnimationKeyframe[]) => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function AnimationTimeline({ label, trackId, keyframes, duration, onChange }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);

  const kfName = `custom_${trackId}`;

  // Sort by time for rendering, map back by original index
  const sorted = [...keyframes]
    .map((kf, i) => ({ kf, i }))
    .sort((a, b) => a.kf.time - b.kf.time);

  // ----- Keyframe CRUD -------------------------------------------------------

  const addKeyframe = useCallback(() => {
    // Insert at midpoint of longest gap
    const sorted2 = [...keyframes].sort((a, b) => a.time - b.time);
    const stops = [0, ...sorted2.map(k => k.time), 1];
    let maxGap = 0;
    let insertAt = 0.5;
    for (let i = 0; i < stops.length - 1; i++) {
      const gap = stops[i + 1] - stops[i];
      if (gap > maxGap) { maxGap = gap; insertAt = (stops[i] + stops[i + 1]) / 2; }
    }
    const newKf: AnimationKeyframe = { time: parseFloat(insertAt.toFixed(2)), opacity: 1 };
    const next = [...keyframes, newKf];
    onChange(next);
    setSelectedIdx(next.length - 1);
  }, [keyframes, onChange]);

  const removeKeyframe = useCallback((idx: number) => {
    const next = keyframes.filter((_, i) => i !== idx);
    onChange(next);
    setSelectedIdx(null);
  }, [keyframes, onChange]);

  const updateKeyframe = useCallback((idx: number, patch: Partial<AnimationKeyframe>) => {
    const next = keyframes.map((kf, i) => i === idx ? { ...kf, ...patch } : kf);
    onChange(next);
  }, [keyframes, onChange]);

  // ----- Drag on timeline bar ------------------------------------------------

  const handleTimelineDragStart = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingIdx.current = idx;
    setSelectedIdx(idx);

    const onMove = (me: MouseEvent) => {
      if (draggingIdx.current === null || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const t = clamp((me.clientX - rect.left) / rect.width, 0, 1);
      updateKeyframe(draggingIdx.current, { time: parseFloat(t.toFixed(2)) });
    };
    const onUp = () => {
      draggingIdx.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ----- Preview animation ---------------------------------------------------

  const previewRef = useRef<HTMLDivElement>(null);

  const runPreview = useCallback(() => {
    if (!previewRef.current || keyframes.length < 2) return;
    const css = keyframesToCSS(kfName, keyframes) + ANIMATION_KEYFRAMES_CSS;
    // Inject/update style
    let styleEl = document.getElementById(`preview-style-${kfName}`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `preview-style-${kfName}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    // Reset animation
    previewRef.current.style.animation = 'none';
    // Force reflow
    void previewRef.current.offsetWidth;
    previewRef.current.style.animation = `${kfName} ${duration}ms ease both`;
  }, [kfName, keyframes, duration]);

  // ----- Selected keyframe ---------------------------------------------------

  const sel = selectedIdx !== null ? keyframes[selectedIdx] : null;

  // ----- Render --------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="flex gap-1">
          <WButton
            size="small"
            text
            onClick={runPreview}
            title="Preview"
            className="!p-1"
            disabled={keyframes.length < 2}
          >
            <Play size={11} />
          </WButton>
          <WButton size="small" text onClick={addKeyframe} className="!p-1" title="Add keyframe">
            <Plus size={11} />
          </WButton>
        </div>
      </div>

      {/* Preview swatch */}
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 6,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          ref={previewRef}
          style={{
            width: 40,
            height: 16,
            borderRadius: 4,
            background: 'var(--primary)',
            opacity: 1,
          }}
        />
      </div>

      {/* Timeline bar */}
      <div
        ref={timelineRef}
        style={{
          position: 'relative',
          height: 24,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 4,
          border: '1px solid var(--border)',
          cursor: 'crosshair',
        }}
        onClick={(e) => {
          if (!timelineRef.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const t = clamp((e.clientX - rect.left) / rect.width, 0, 1);
          const newKf: AnimationKeyframe = { time: parseFloat(t.toFixed(2)), opacity: 1 };
          const next = [...keyframes, newKf];
          onChange(next);
          setSelectedIdx(next.length - 1);
        }}
      >
        {/* Time ruler ticks */}
        {[0.25, 0.5, 0.75].map(t => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: `${t * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.1)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Keyframe markers */}
        {sorted.map(({ kf, i }) => (
          <div
            key={i}
            title={`t=${Math.round(kf.time * 100)}% | opacity=${kf.opacity ?? '–'}`}
            onMouseDown={handleTimelineDragStart(i)}
            onClick={(e) => { e.stopPropagation(); setSelectedIdx(i); }}
            style={{
              position: 'absolute',
              left: `calc(${kf.time * 100}% - 5px)`,
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: 10,
              height: 10,
              background: selectedIdx === i ? 'var(--primary)' : '#ffffff',
              border: '1.5px solid var(--border)',
              cursor: 'grab',
              zIndex: 2,
            }}
          />
        ))}
      </div>

      {/* Selected keyframe editor */}
      {sel !== null && selectedIdx !== null && (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            padding: '8px',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Keyframe @ {Math.round(sel.time * 100)}%
            </span>
            <WButton
              size="small"
              text
              severity="danger"
              onClick={() => removeKeyframe(selectedIdx)}
              className="!p-0.5"
            >
              <Trash2 size={10} />
            </WButton>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Time */}
            <div>
              <span className="text-xs text-muted-foreground">Time %</span>
              <WInputNumber
                value={Math.round(sel.time * 100)}
                min={0}
                max={100}
                onValueChange={(e) => updateKeyframe(selectedIdx, { time: clamp((e.value ?? 0) / 100, 0, 1) })}
                className="w-full mt-0.5"
                suffix="%"
              />
            </div>

            {/* Opacity */}
            <div>
              <span className="text-xs text-muted-foreground">Opacity</span>
              <WInputNumber
                value={sel.opacity !== undefined ? Math.round(sel.opacity * 100) : 100}
                min={0}
                max={100}
                onValueChange={(e) => updateKeyframe(selectedIdx, { opacity: clamp((e.value ?? 100) / 100, 0, 1) })}
                className="w-full mt-0.5"
                suffix="%"
              />
            </div>

            {/* TranslateX */}
            <div>
              <span className="text-xs text-muted-foreground">X (px)</span>
              <WInputNumber
                value={sel.x ?? 0}
                min={-2000}
                max={2000}
                onValueChange={(e) => updateKeyframe(selectedIdx, { x: e.value ?? 0 })}
                className="w-full mt-0.5"
              />
            </div>

            {/* TranslateY */}
            <div>
              <span className="text-xs text-muted-foreground">Y (px)</span>
              <WInputNumber
                value={sel.y ?? 0}
                min={-2000}
                max={2000}
                onValueChange={(e) => updateKeyframe(selectedIdx, { y: e.value ?? 0 })}
                className="w-full mt-0.5"
              />
            </div>

            {/* Scale */}
            <div>
              <span className="text-xs text-muted-foreground">Scale X</span>
              <WInputNumber
                value={sel.scaleX !== undefined ? Math.round(sel.scaleX * 100) : 100}
                min={0}
                max={500}
                onValueChange={(e) => updateKeyframe(selectedIdx, { scaleX: (e.value ?? 100) / 100 })}
                className="w-full mt-0.5"
                suffix="%"
              />
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Scale Y</span>
              <WInputNumber
                value={sel.scaleY !== undefined ? Math.round(sel.scaleY * 100) : 100}
                min={0}
                max={500}
                onValueChange={(e) => updateKeyframe(selectedIdx, { scaleY: (e.value ?? 100) / 100 })}
                className="w-full mt-0.5"
                suffix="%"
              />
            </div>

            {/* Rotation */}
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Rotation (°)</span>
              <WInputNumber
                value={sel.rotate ?? 0}
                min={-360}
                max={360}
                onValueChange={(e) => updateKeyframe(selectedIdx, { rotate: e.value ?? 0 })}
                className="w-full mt-0.5"
                suffix="°"
              />
            </div>

            {/* Easing */}
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Easing</span>
              <WDropdown
                value={sel.easing ?? 'ease'}
                options={EASING_OPTIONS}
                onChange={(e) => updateKeyframe(selectedIdx, { easing: e.value })}
                optionLabel="label"
                optionValue="value"
                className="w-full mt-0.5"
              />
            </div>
          </div>
        </div>
      )}

      {keyframes.length < 2 && (
        <p className="text-muted-foreground" style={{ fontSize: '10px' }}>
          Click the timeline to add keyframes. Need at least 2 to preview.
        </p>
      )}
    </div>
  );
}
