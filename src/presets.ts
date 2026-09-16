export type WorldState = { timeOfDay:number; neon:number; traffic:number; crowd:number; signage:number; greenery:number; haze:number; windowLife:number; glyph:number; warmth:number };
export type StateName = 'neutral' | 'pulse' | 'still';
export const presets: Record<StateName, Readonly<WorldState>> = {
  neutral: { timeOfDay:18.7, neon:.25, traffic:.35, crowd:.20, signage:.30, greenery:.35, haze:.20, windowLife:.45, glyph:0, warmth:.55 },
  pulse: { timeOfDay:21.5, neon:.95, traffic:.90, crowd:.85, signage:1, greenery:.10, haze:.35, windowLife:.90, glyph:.80, warmth:.15 },
  still: { timeOfDay:6.2, neon:.05, traffic:.05, crowd:.02, signage:.08, greenery:.85, haze:.08, windowLife:.25, glyph:.35, warmth:.85 },
};
