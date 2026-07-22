export type Unit = 'Recruitment' | 'Scholarships' | 'Testing';

type AccountRange = {
  min: number;
  max: number;
  kind: 'income' | 'cost';
  unit: Unit;
  subCategory: string | null; // cost accounts only
  parentAccountNumber: string; // matches parent_accounts.account_number
};

// Single source of truth for how a QBO AcctNum maps to our catalog — unit,
// income/cost table, cost sub-category, and parent grouping account. Order
// matters: more specific sub-ranges must come before their broader fallback.
const RANGES: AccountRange[] = [
  // Income
  { min: 40000, max: 40999, kind: 'income', unit: 'Scholarships', subCategory: null, parentAccountNumber: '40000' },
  { min: 41000, max: 41999, kind: 'income', unit: 'Recruitment', subCategory: null, parentAccountNumber: '41000' },
  { min: 44000, max: 44999, kind: 'income', unit: 'Testing', subCategory: null, parentAccountNumber: '44000' },
  // Cost — Recruitment
  { min: 52500, max: 52599, kind: 'cost', unit: 'Recruitment', subCategory: 'Talent Management', parentAccountNumber: '52500' },
  { min: 51300, max: 51399, kind: 'cost', unit: 'Recruitment', subCategory: 'Assessment Centre', parentAccountNumber: '51300' },
  { min: 51200, max: 51299, kind: 'cost', unit: 'Recruitment', subCategory: 'Verification', parentAccountNumber: '51200' },
  { min: 51100, max: 51199, kind: 'cost', unit: 'Recruitment', subCategory: 'Testing', parentAccountNumber: '51100' },
  { min: 51000, max: 51099, kind: 'cost', unit: 'Recruitment', subCategory: 'Direct', parentAccountNumber: '51000' },
  // Cost — Scholarships
  { min: 50200, max: 50299, kind: 'cost', unit: 'Scholarships', subCategory: 'Verification', parentAccountNumber: '50200' },
  { min: 50100, max: 50199, kind: 'cost', unit: 'Scholarships', subCategory: 'Testing', parentAccountNumber: '50100' },
  { min: 50000, max: 50999, kind: 'cost', unit: 'Scholarships', subCategory: 'Direct', parentAccountNumber: '50000' },
];

function findRange(acctNum: string): AccountRange | null {
  const n = parseInt(acctNum, 10);
  return RANGES.find((r) => n >= r.min && n <= r.max) ?? null;
}

// Which catalog table a leaf account belongs in. Parent grouping accounts
// (e.g. 41000, 51000, 52500) fall in these same ranges but are tracked
// separately in parent_accounts — callers must check that table first.
export function catalogKind(acctNum: string): 'income' | 'cost' | null {
  return findRange(acctNum)?.kind ?? null;
}

export function unitFromAcctNum(acctNum: string): Unit | null {
  return findRange(acctNum)?.unit ?? null;
}

export function subCategory(acctNum: string): string | null {
  return findRange(acctNum)?.subCategory ?? null;
}

// account_number of this leaf account's parent grouping row in parent_accounts.
export function parentAccountNumberFor(acctNum: string): string | null {
  return findRange(acctNum)?.parentAccountNumber ?? null;
}

// Only these specific accounts are grouping/parent accounts we track — NOT
// "any account QBO calls a top-level account" (that's most of the chart of
// accounts: bank accounts, AP/AR, equity, generic expenses, ...). Scope is
// exactly the parent numbers our own RANGES table references.
const KNOWN_PARENT_ACCOUNT_NUMBERS = new Set(RANGES.map((r) => r.parentAccountNumber));

export function isKnownParentAccountNumber(acctNum: string): boolean {
  return KNOWN_PARENT_ACCOUNT_NUMBERS.has(acctNum);
}
