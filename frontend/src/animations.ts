// =============================================================================
// Worxed Animation Registry
// CSS-based animations, OBS browser source compatible.
// =============================================================================

export interface AnimationPreset {
  id: string;
  label: string;
  category: 'enter' | 'exit';
  defaultDuration: number; // ms
  easing: string;
}

// -----------------------------------------------------------------------------
// Preset catalogue
// -----------------------------------------------------------------------------

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // --- Enter ---
  { id: 'fadeIn',         label: 'Fade In',           category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'fadeInUp',       label: 'Fade In Up',         category: 'enter', defaultDuration: 450,  easing: 'ease-out' },
  { id: 'fadeInDown',     label: 'Fade In Down',       category: 'enter', defaultDuration: 450,  easing: 'ease-out' },
  { id: 'fadeInLeft',     label: 'Fade In Left',       category: 'enter', defaultDuration: 450,  easing: 'ease-out' },
  { id: 'fadeInRight',    label: 'Fade In Right',      category: 'enter', defaultDuration: 450,  easing: 'ease-out' },
  { id: 'zoomIn',         label: 'Zoom In',            category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'zoomInUp',       label: 'Zoom In Up',         category: 'enter', defaultDuration: 500,  easing: 'ease-out' },
  { id: 'bounceIn',       label: 'Bounce In',          category: 'enter', defaultDuration: 700,  easing: 'ease-out' },
  { id: 'slideInLeft',    label: 'Slide In Left',      category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'slideInRight',   label: 'Slide In Right',     category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'slideInTop',     label: 'Slide In Top',       category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'slideInBottom',  label: 'Slide In Bottom',    category: 'enter', defaultDuration: 400,  easing: 'ease-out' },
  { id: 'flipInX',        label: 'Flip In X',          category: 'enter', defaultDuration: 600,  easing: 'ease-in-out' },
  { id: 'rollIn',         label: 'Roll In',            category: 'enter', defaultDuration: 600,  easing: 'ease-out' },

  // --- Exit ---
  { id: 'fadeOut',        label: 'Fade Out',           category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'fadeOutUp',      label: 'Fade Out Up',        category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'fadeOutDown',    label: 'Fade Out Down',      category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'fadeOutLeft',    label: 'Fade Out Left',      category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'fadeOutRight',   label: 'Fade Out Right',     category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'zoomOut',        label: 'Zoom Out',           category: 'exit',  defaultDuration: 350,  easing: 'ease-in' },
  { id: 'zoomOutDown',    label: 'Zoom Out Down',      category: 'exit',  defaultDuration: 500,  easing: 'ease-in' },
  { id: 'bounceOut',      label: 'Bounce Out',         category: 'exit',  defaultDuration: 700,  easing: 'ease-in' },
  { id: 'slideOutLeft',   label: 'Slide Out Left',     category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'slideOutRight',  label: 'Slide Out Right',    category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'slideOutTop',    label: 'Slide Out Top',      category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'slideOutBottom', label: 'Slide Out Bottom',   category: 'exit',  defaultDuration: 400,  easing: 'ease-in' },
  { id: 'flipOutX',       label: 'Flip Out X',         category: 'exit',  defaultDuration: 500,  easing: 'ease-in-out' },
  { id: 'hinge',          label: 'Hinge (Dramatic)',   category: 'exit',  defaultDuration: 1200, easing: 'ease-in-out' },
];

export const ENTER_PRESETS = ANIMATION_PRESETS.filter(a => a.category === 'enter');
export const EXIT_PRESETS  = ANIMATION_PRESETS.filter(a => a.category === 'exit');

export function getPreset(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find(a => a.id === id);
}

// Default pairing suggestions per enter animation
export const DEFAULT_EXIT_PAIR: Record<string, string> = {
  fadeIn:        'fadeOut',
  fadeInUp:      'fadeOutDown',
  fadeInDown:    'fadeOutUp',
  fadeInLeft:    'fadeOutLeft',
  fadeInRight:   'fadeOutRight',
  zoomIn:        'zoomOut',
  zoomInUp:      'zoomOutDown',
  bounceIn:      'bounceOut',
  slideInLeft:   'slideOutLeft',
  slideInRight:  'slideOutRight',
  slideInTop:    'slideOutTop',
  slideInBottom: 'slideOutBottom',
  flipInX:       'flipOutX',
  rollIn:        'fadeOut',
};

// -----------------------------------------------------------------------------
// @keyframes CSS — inject once into a <style> tag
// -----------------------------------------------------------------------------

export const ANIMATION_KEYFRAMES_CSS = `
/* ---- Enter ---- */

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-40px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.75); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes zoomInUp {
  from { opacity: 0; transform: scale(0.75) translateY(40px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes bounceIn {
  0%   { opacity: 0; transform: scale(0.6); }
  55%  { opacity: 1; transform: scale(1.08); }
  75%  { transform: scale(0.95); }
  90%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slideInTop {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideInBottom {
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes flipInX {
  from { opacity: 0; transform: perspective(600px) rotateX(90deg); }
  40%  { transform: perspective(600px) rotateX(-10deg); }
  70%  { transform: perspective(600px) rotateX(10deg); }
  to   { opacity: 1; transform: perspective(600px) rotateX(0); }
}

@keyframes rollIn {
  from { opacity: 0; transform: translateX(-100%) rotate(-120deg); }
  to   { opacity: 1; transform: translateX(0) rotate(0); }
}

/* ---- Exit ---- */

@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes fadeOutUp {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-40px); }
}

@keyframes fadeOutDown {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(40px); }
}

@keyframes fadeOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-40px); }
}

@keyframes fadeOutRight {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(40px); }
}

@keyframes zoomOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.75); }
}

@keyframes zoomOutDown {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to   { opacity: 0; transform: scale(0.75) translateY(40px); }
}

@keyframes bounceOut {
  0%   { transform: scale(1); }
  25%  { transform: scale(1.05); }
  55%  { opacity: 1; transform: scale(0.92); }
  100% { opacity: 0; transform: scale(0.5); }
}

@keyframes slideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-100%); }
}

@keyframes slideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
}

@keyframes slideOutTop {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-100%); }
}

@keyframes slideOutBottom {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(100%); }
}

@keyframes flipOutX {
  from { opacity: 1; transform: perspective(600px) rotateX(0); }
  30%  { transform: perspective(600px) rotateX(-10deg); }
  to   { opacity: 0; transform: perspective(600px) rotateX(90deg); }
}

@keyframes hinge {
  0%   { transform: rotate(0); transform-origin: top left; }
  20%, 60% { transform: rotate(80deg); transform-origin: top left; }
  40%, 80% { transform: rotate(60deg); transform-origin: top left; opacity: 1; }
  100% { transform: translateY(700px); opacity: 0; }
}

/* ---- Chat message entry ---- */

@keyframes msgSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes msgFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes msgPopIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
`;

// -----------------------------------------------------------------------------
// Keyframe timeline types
// -----------------------------------------------------------------------------

export interface AnimationKeyframe {
  /** Normalized time: 0 = start, 1 = end of animation duration */
  time: number;
  opacity?: number;
  /** translateX in px */
  x?: number;
  /** translateY in px */
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  easing?: string;
}

/** Convert a keyframe array to a CSS @keyframes string */
export function keyframesToCSS(name: string, keyframes: AnimationKeyframe[]): string {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const stops = sorted.map(kf => {
    const props: string[] = [];
    if (kf.opacity !== undefined) props.push(`opacity: ${kf.opacity}`);
    const transforms: string[] = [];
    if (kf.x !== undefined) transforms.push(`translateX(${kf.x}px)`);
    if (kf.y !== undefined) transforms.push(`translateY(${kf.y}px)`);
    if (kf.scaleX !== undefined || kf.scaleY !== undefined) {
      transforms.push(`scale(${kf.scaleX ?? 1}, ${kf.scaleY ?? 1})`);
    }
    if (kf.rotate !== undefined) transforms.push(`rotate(${kf.rotate}deg)`);
    if (transforms.length) props.push(`transform: ${transforms.join(' ')}`);
    if (kf.easing) props.push(`animation-timing-function: ${kf.easing}`);
    return `  ${Math.round(kf.time * 100)}% { ${props.join('; ')}; }`;
  });
  return `@keyframes ${name} {\n${stops.join('\n')}\n}`;
}

// Drop-in option lists for WDropdown
export const ENTER_OPTIONS = ENTER_PRESETS.map(p => ({ value: p.id, label: p.label }));
export const EXIT_OPTIONS  = EXIT_PRESETS.map(p => ({ value: p.id, label: p.label }));

export const CHAT_ANIMATION_OPTIONS = [
  { value: 'msgSlideIn', label: 'Slide In' },
  { value: 'msgFadeIn',  label: 'Fade In' },
  { value: 'msgPopIn',   label: 'Pop In' },
  { value: 'none',       label: 'None' },
];

/** Options for the secondary text animation inside an alert box */
export const TEXT_ANIMATION_OPTIONS = [
  { value: 'none',       label: 'None' },
  { value: 'fadeIn',     label: 'Fade In' },
  { value: 'fadeInUp',   label: 'Fade In Up' },
  { value: 'fadeInDown', label: 'Fade In Down' },
  { value: 'zoomIn',     label: 'Zoom In' },
  { value: 'bounceIn',   label: 'Bounce In' },
  { value: 'flipInX',    label: 'Flip In X' },
];
