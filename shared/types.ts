/*
 * Cross-tier domain types — match the API contract exactly so no mapping is needed.
 * All field names are snake_case, matching the MySQL columns and JSON responses.
 */

export type LineItem = {
  id?: string;
  service_name: string;
  acct_num: string;
  parent_account: string;
  quantity: number;
  rate: number;
};

export type Profitability = {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_percent: number;
};

export type Campaign = {
  id: string;
  campaign_id: string;
  client_id: string | null;
  owner_user_id: string;
  unit: string;
  description: string | null;
  campaign_status: string;
  approval_status: string | null;
  approval_note: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  profitability: Profitability;
  revenue_items?: LineItem[];
  cost_items?: LineItem[];
};

export type OpsUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export type Activity = {
  name: string;
  start_date?: string;
  end_date?: string;
  ops_start_date?: string;
  ops_end_date?: string;
};

export type ConfiguredWorkplan = {
  id: string;
  campaign_id: string;
  template_id: string;
  template_name: string;
  status: string;
  activities: Activity[];
  ops_start_date: string | null;
  ops_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkplanTemplate = {
  id: string;
  template_id: string;
  template_name: string;
  activities: { sequence: number; name: string }[];
};

export type OneDriveFile = {
  id: string;
  drive_id: string;
  name: string;
  web_url: string;
  mime_type?: string;
  size?: number;
};

export type LegacyAttachment = { type: 'file' | 'link'; name?: string; value: string };

export type HandoffEntry = {
  id: string;
  form_id: string;
  team: string;
  status: 'Pending' | 'Acknowledged' | 'Completed';
  sent_by: string;
  sent_at: string;
  auto: boolean;
  attachment?: OneDriveFile[] | LegacyAttachment | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  report?: OneDriveFile[] | LegacyAttachment | null;
  reminders_sent: string[];
  created_at: string;
};

export type SupportForm = {
  id: string;
  campaign_id: string;
  form_type: string;
  form_details: Record<string, unknown>;
  delivery_status: string;
  operations_team: string;
  submitter_user_id: string | null;
  submitter_name: string | null;
  submitted_on: string | null;
  created_at: string;
  handoffs: HandoffEntry[];
};

export type ClientContact = {
  id: string;
  qb_id: string | null;
  display_name: string;
  company_name: string | null;
  abbreviation: string | null;
  email: string | null;
  phone: string | null;
  created_on: string | null;
};

export type Service = {
  id: string;
  acct_num: string;
  service: string;
  parent_account: string;
  associated_cost_ids?: string[];
};

export type ParentAccount = {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  service_type: string | null;
};

export type UserInfo = {
  id?: string;
  name: string;
  email: string;
  roles: string[];
  expiresOn?: number;
};
