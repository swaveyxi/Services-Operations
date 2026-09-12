/* Cross-tier enums, status values, and routing maps. */

export const isProduction = process.env.NODE_ENV === 'production';

export const BUSINESS_UNITS = ['Recruitment', 'Scholarships', 'Testing'] as const;
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

export const CAMPAIGN_STATUSES = ['Draft', 'Pending', 'Active', 'Inactive'] as const;
export const WORKPLAN_STATUSES = ['Not Started', 'Draft', 'Configured'] as const;
export const OPS_REVIEW_STATUSES = ['Not Started', 'Pending', 'Accepted', 'Amended'] as const;
export const APPROVAL_STATUSES = ['Not Started', 'Pending', 'Approved', 'Rejected'] as const;
export const FORM_STATUSES = ['Open', 'In Progress', 'Closed'] as const;
export const DELIVERY_STATUSES = ['Submitted', 'Delivered', 'Acknowledged', 'Completed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/* Delivery-status go-live cutoff: forms before this with no status are legacy/delivered. */
export const DELIVERY_GO_LIVE = '2026-07-18T00:00:00Z';

/* Profitability auto-approval threshold (Phase 2 backend automation). */
export const AUTO_APPROVE_THRESHOLD = 60;

/* Test Order candidate count at/above which the automatic Tech resource
   scaling handoff is triggered — below this, infrastructure scaling isn't needed. */
export const RESOURCE_SCALING_CANDIDATE_THRESHOLD = 1000;

/* Template name → ops team. */
export const OPS_TEAM_NAME_MAP: Record<string, string> = {
  'Experienced Hire Recruitment': 'Client Engagement',
  'Graduate Trainee Recruitment': 'Client Engagement',
  'CIBN Institutional Testing': 'Testing Operations',
  'GSE Aptitude Test': 'Testing Operations',
  'Institutional Testing': 'Testing Operations',
  'Regular Testing': 'Testing Operations',
  'Verification Campaign': 'Verifications Operations',
  'Scholarship Workplan': 'Scholarship Services',
};

export function getOpsTeam(templateName: string): string {
  return OPS_TEAM_NAME_MAP[templateName] || 'Operations';
}

/* Business unit → the ops team that owns that unit's case work (distinct from
   OPS_TEAM_NAME_MAP, which routes by workplan template rather than unit). */
export const BUSINESS_UNIT_TEAM_MAP: Record<BusinessUnit, string> = {
  Recruitment: 'Client Engagement',
  Scholarships: 'Scholarship Services',
  Testing: 'Testing Operations',
};

export function getBusinessUnitTeam(unit: BusinessUnit): string {
  return BUSINESS_UNIT_TEAM_MAP[unit];
}

/* Reverse of BUSINESS_UNIT_TEAM_MAP — ops team name → the business unit it
   owns case work for. Teams with no case-owning unit (Tech, Finance,
   Marketing, Candidate Experience, Verifications Operations) simply have no
   entry here. */
export const TEAM_TO_BUSINESS_UNIT_MAP: Partial<Record<string, BusinessUnit>> = Object.fromEntries(
  Object.entries(BUSINESS_UNIT_TEAM_MAP).map(([unit, team]) => [team, unit as BusinessUnit]),
);

export function getBusinessUnitsForTeams(teamNames: string[]): BusinessUnit[] {
  return [
    ...new Set(
      teamNames
        .map((t) => TEAM_TO_BUSINESS_UNIT_MAP[t])
        .filter((u): u is BusinessUnit => Boolean(u)),
    ),
  ];
}

/* Support form catalog: key → display title + routed ops team. */
export const FORM_CATALOG_META: Record<string, { title: string; operations_team: string }> = {
  'client-onboarding': { title: 'Client Onboarding Form', operations_team: 'Client Engagement' },
  'client-feedback': { title: 'Client Feedback Form', operations_team: 'Client Engagement' },
  'cs-adhoc-briefing': {
    title: 'Customer Service Adhoc Briefing Form',
    operations_team: 'Client Engagement',
  },
  'invoice-request': { title: 'Invoice Request Form', operations_team: 'Finance' },
  'graduate-trainee-briefing': {
    title: 'Client Graduate Trainee Briefing Form',
    operations_team: 'Client Engagement',
  },
  'recruitment-briefing': {
    title: 'Client Recruitment Briefing Form',
    operations_team: 'Client Engagement',
  },
  'test-centre-booking': {
    title: 'Test Centre Booking Form',
    operations_team: 'Testing Operations',
  },
  'verification-order': {
    title: 'Verification Order Form',
    operations_team: 'Verifications Operations',
  },
  'test-order': { title: 'Test Order Form', operations_team: 'Testing Operations' },
  'creative-asset': { title: 'Creative Asset Form', operations_team: 'Marketing' },
  'portal-config': { title: 'Portal Configuration Form', operations_team: 'Tech' },
};

/* Form display title → key (forms are stored by display title in new_formtype). */
export const FORM_TITLE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(FORM_CATALOG_META).map(([key, m]) => [m.title, key]),
);

/* Form catalog key → default handoff target team name. */
export const HANDOFF_DEFAULTS: Record<string, string> = {
  'test-order': 'Candidate Experience',
};

/* ERP org_role that can approve profitability assessments. */
export const MD_ROLE = 'md' as const;

export const COO_ROLE = 'coo' as const;

/* ERP org_role for executive committee members — copied on full case-approval reports. */
export const EXCO_ROLE = 'exco' as const;

/* Platform roles — granted locally via this app's Admin Panel; any super_admin
   can grant these to others. */
export const SUPER_ADMIN_ROLE = 'super_admin' as const;
export const OPERATIONS_ADMIN_ROLE = 'operations_admin' as const;

export const OPERATIONS_ROLE = 'operations' as const;

export const PLATFORM_ROLES = [SUPER_ADMIN_ROLE, OPERATIONS_ADMIN_ROLE] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
