import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import createError from 'http-errors';
import { searchClients, createClient, findClientById, updateClient } from '../models/clients';
import { getIncomesByUnit, getCostsByUnit, getAllParentAccounts, getWorkplanTemplates } from '../models/catalog';

type Unit = 'Recruitment' | 'Scholarships' | 'Testing';
const VALID_UNITS: Unit[] = ['Recruitment', 'Scholarships', 'Testing'];

export async function listClients(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    res.json([]);
    return;
  }
  const clients = await searchClients(q, 20);
  res.json(clients);
}

export async function getClient(req: Request, res: Response): Promise<void> {
  const client = await findClientById(String(req.params.id));
  if (!client) throw createError(404, 'Client not found.');
  res.json(client);
}

export async function addClient(req: Request, res: Response): Promise<void> {
  const { display_name, company_name, abbreviation, email, phone } = req.body;
  if (!display_name) throw createError(400, 'display_name is required.');
  const id = randomUUID();
  await createClient({
    id,
    display_name,
    company_name: company_name ?? null,
    abbreviation: abbreviation ?? null,
    email: email ?? null,
    phone: phone ?? null,
  });
  const created = await findClientById(id);
  res.status(201).json(created);
}

export async function patchClient(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { abbreviation, email, phone } = req.body;
  const data: Record<string, unknown> = {};
  if (abbreviation !== undefined) {
    const trimmed = String(abbreviation).trim();
    if (!trimmed) throw createError(400, 'abbreviation cannot be empty.');
    data.abbreviation = trimmed;
  }
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (Object.keys(data).length === 0) throw createError(400, 'No fields to update.');

  await updateClient(id, data);
  const updated = await findClientById(id);
  if (!updated) throw createError(404, 'Client not found.');
  res.json(updated);
}

export async function getServiceCatalog(req: Request, res: Response): Promise<void> {
  const unit = req.query.unit as Unit | undefined;
  if (unit && !VALID_UNITS.includes(unit)) {
    throw createError(400, `unit must be one of: ${VALID_UNITS.join(', ')}.`);
  }

  const [incomes, costs, parentAccountList] = await Promise.all([
    unit ? getIncomesByUnit(unit) : Promise.resolve([]),
    unit ? getCostsByUnit(unit) : Promise.resolve([]),
    getAllParentAccounts(),
  ]);

  res.json({ incomes, costs, parentAccounts: parentAccountList });
}

export async function listWorkplanTemplates(req: Request, res: Response): Promise<void> {
  const unit = req.query.unit as Unit | undefined;
  if (unit && !VALID_UNITS.includes(unit)) {
    throw createError(400, `unit must be one of: ${VALID_UNITS.join(', ')}.`);
  }
  const templates = await getWorkplanTemplates(unit);
  res.json(templates);
}
