import type { Team } from '@/services';
import type { Campaign, ConfiguredWorkplan, SupportForm } from '@shared/types';

/* Every team-workspace section receives the team + the shared datasets the shell has
   already loaded. A section may also fetch its own team-specific data internally. */
export type SectionProps = {
  team: Team;
  campaigns: Campaign[];
  workplans: ConfiguredWorkplan[];
  forms: SupportForm[];
  handoffs: SupportForm[];
  activeFormId: string | null;
};
