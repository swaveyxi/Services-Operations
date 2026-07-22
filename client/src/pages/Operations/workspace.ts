import type { ComponentType } from 'react';
import type { SectionProps } from './sections/types';
import ReviewsSection from './sections/ReviewsSection';
import FormsSection from './sections/FormsSection';
import HandoffsSection from './sections/HandoffsSection';

/* A team workspace is composed from sections. To add a team-specific view:
   1. write a `<NewSection>` component that takes SectionProps (it may fetch its own data),
   2. register it here under a new id,
   3. list that id for the relevant team in TEAM_SECTIONS.
   Teams not listed in TEAM_SECTIONS fall back to DEFAULT_SECTIONS. */
export type SectionId = 'reviews' | 'forms' | 'handoffs';

export const SECTION_COMPONENTS: Record<SectionId, ComponentType<SectionProps>> = {
  reviews: ReviewsSection,
  forms: FormsSection,
  handoffs: HandoffsSection,
};

export const DEFAULT_SECTIONS: SectionId[] = ['handoffs', 'reviews', 'forms'];

/* Per-team overrides, keyed by team key (see TEAM_NAME in services/teams.ts). */
export const TEAM_SECTIONS: Partial<Record<string, SectionId[]>> = {
  candidate_experience: ['handoffs', 'reviews', 'forms'],
};

export function sectionsForTeam(teamKey: string): SectionId[] {
  return TEAM_SECTIONS[teamKey] ?? DEFAULT_SECTIONS;
}
