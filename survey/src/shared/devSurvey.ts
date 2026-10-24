import type { EnergyChoice } from './energy.ts';
import type { Vote } from './citySurveyState.ts';

/** DEV-ONLY: remove this capability or move its UI to Admin before exhibition use. */
export type DevSurveyConfig = {
  questionSetVersion: number;
  energy?: { questionId: string; options: { id: EnergyChoice; label: string }[] };
  meters: { axis: string; questionId: string; options: { id: string; label: string; vote: Vote }[] }[];
};
