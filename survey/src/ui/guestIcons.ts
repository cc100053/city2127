// Small line pictograms for the guest's options (2026-11-10). Decorative only: every option keeps its text label,
// so the icons are aria-hidden and an unknown option id simply renders without one.
const SVG_NS = 'http://www.w3.org/2000/svg';

/** 24×24 path data, stroked with currentColor. */
const ICON_PATHS: Record<string, string> = {
  // service-2127: who helps you
  'human-led': 'M8 7.5a2.5 2.5 0 1 0 0 .01M3.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5M14 4h7v5h-3l-2 2V9h-2z',
  'human-machine': 'M7 7.5a2.5 2.5 0 1 0 0 .01M2.5 19c0-3 2-5 4.5-5s4.5 2 4.5 5M14 9h7v6h-7zM16 12h.01M19 12h.01M17.5 9V7',
  autonomous: 'M6 8h12v10H6zM9.5 12.5h.01M14.5 12.5h.01M9.5 15.5h5M12 8V5M10.5 4.5h3M4 12v3M20 12v3',
  // commons-2127: how the waterfront is shared
  'private-pods': 'M5 19v-6a7 7 0 0 1 14 0v6zM10 19v-4h4v4M2 21h20',
  'mixed-seating': 'M3 19v-4a4 4 0 0 1 8 0v4zM2 21h20M14 16c1.5-1.5 2.5-1.5 4 0s2.5 1.5 4 0M15.5 11.5a1.5 1.5 0 1 0 0 .01M20 11.5a1.5 1.5 0 1 0 0 .01',
  'open-commons': 'M2 18c2-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0M6 10a2 2 0 1 0 0 .01M12 8.5a2 2 0 1 0 0 .01M18 10a2 2 0 1 0 0 .01M4 14.5c.5-1.5 1-2 2-2s1.5.5 2 2M10 13c.5-1.5 1-2 2-2s1.5.5 2 2M16 14.5c.5-1.5 1-2 2-2s1.5.5 2 2',
  // energy-2127: where the electricity comes from
  'water-storage': 'M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9zM2 20c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0',
  'rotor-storage': 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 4v6M12 14v6M4 12h6M14 12h6',
  'orbital-supply': 'M12 3l2 2-2 2-2-2zM12 7v4M8 11l-3 7M12 11v7M16 11l3 7M3 21h18',
  'island-supply': 'M2 19c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0M6 16c1-3 3-4 6-4s5 1 6 4M12 12V4M10 6h4M10 9h4',
  // functions-2127: how you move through the town
  'distributed-pavilions': 'M2 20h20M3 20v-4l3-2 3 2v4M10 20v-5l3-2 3 2v5M17 20v-3l2-1.5 2 1.5v3',
  'mixed-functions': 'M2 20h20M4 20v-5h5v5M11 20V5h5v15M13 8h1M13 11h1M13 14h1M18 20v-8h3v8',
  'vertical-functions': 'M2 21h20M9 21V3h6v18M11 6h2M11 9h2M11 12h2M11 15h2M11 18h2',
};

export function hasOptionIcon(optionId: string) {
  return Object.hasOwn(ICON_PATHS, optionId);
}

export function optionIcon(optionId: string, className = 'guest-icon') {
  const path = ICON_PATHS[optionId];
  if (!path) return undefined;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const stroke = document.createElementNS(SVG_NS, 'path');
  stroke.setAttribute('d', path);
  svg.append(stroke);
  return svg;
}
