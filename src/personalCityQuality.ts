/** Archive-only quality policy. The shared exhibition display never opts into this path. */
export function personalCityQuality(archive: boolean, quality: string | null, userAgent: string, touchPoints: number, coarsePointer: boolean): 'lite' | 'full' {
  if (!archive) return 'full';
  if (quality === 'lite' || quality === 'full') return quality;
  // iPadOS can identify as Macintosh; touch capability covers that case without changing desktop displays.
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || (touchPoints > 1 && coarsePointer) ? 'lite' : 'full';
}

export function personalCityPixelRatio(lite: boolean, archive: boolean, width: number, height: number, deviceRatio: number): number {
  if (!lite) return Math.min(deviceRatio, archive ? 1 : 1.5);
  return Math.min(deviceRatio, .7, 720 / Math.max(width, height, 1), Math.sqrt(360000 / Math.max(width * height, 1)));
}

/** Thirty FPS while interacting; one refresh/second at rest for late assets. Hidden archives do no work. */
export function personalCityFrameGate(lite: boolean) {
  let last = -Infinity;
  return (time: number, dirty: boolean, hidden: boolean) => {
    if (!lite) return true;
    if (hidden || time - last < (dirty ? 1000 / 30 : 1000) - .1) return false;
    last = time;
    return true;
  };
}
