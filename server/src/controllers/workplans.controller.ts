import { Request, Response } from 'express';
import createError from 'http-errors';
import { OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../../../shared/constants';
import {
  createConfiguredWorkplan,
  submitWorkplan,
  acceptWorkplan,
  amendWorkplan,
  updateWorkplanDraft,
  removeWorkplan,
} from '../services/workplans.service';
import { findAllWorkplans } from '../models/workplans';

// GET /api/workplans
export async function listWorkplans(_req: Request, res: Response): Promise<void> {
  const workplans = await findAllWorkplans();
  res.json(workplans);
}

// POST /api/workplans
export async function createWorkplan(req: Request, res: Response): Promise<void> {
  const { campaign_id, template_id, template_name, activities, ops_start_date, ops_end_date } = req.body;
  const workplan = await createConfiguredWorkplan(
    {
      campaign_id,
      template_id,
      template_name,
      activities: activities ?? null,
      ops_start_date: ops_start_date ? new Date(ops_start_date) : null,
      ops_end_date: ops_end_date ? new Date(ops_end_date) : null,
      status: 'Draft',
    },
    req.user!.id,
  );
  res.status(201).json(workplan);
}

// PATCH /api/workplans/:id
export async function patchWorkplan(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { action, activities, ops_start_date, ops_end_date, template_name } = req.body;

  if (action === 'submit') {
    await submitWorkplan(id, req.user!.id, req.user!.roles);
    res.json({ message: 'Workplan submitted.' });
    return;
  }

  if (action === 'accept') {
    await acceptWorkplan(id, req.user!.id);
    res.json({ message: 'Workplan accepted.' });
    return;
  }

  if (action === 'amend') {
    const r = req.user!.roles;
    if (!r.includes(OPERATIONS_ROLE) && !r.includes(OPERATIONS_ADMIN_ROLE) && !r.includes(SUPER_ADMIN_ROLE)) {
      throw createError(403, 'Only operations team members can amend workplans.');
    }
    await amendWorkplan(
      id,
      {
        activities,
        ops_start_date: ops_start_date ? new Date(ops_start_date) : undefined,
        ops_end_date: ops_end_date ? new Date(ops_end_date) : undefined,
      },
      req.user!.id,
    );
    res.json({ message: 'Workplan amended.' });
    return;
  }

  // Draft edits (no action field)
  await updateWorkplanDraft(
    id,
    {
      activities,
      ops_start_date: ops_start_date ? new Date(ops_start_date) : undefined,
      ops_end_date: ops_end_date ? new Date(ops_end_date) : undefined,
      template_name,
    },
    req.user!.id,
  );
  res.json({ message: 'Workplan updated.' });
}

// DELETE /api/workplans/:id
export async function deleteWorkplan(req: Request, res: Response): Promise<void> {
  await removeWorkplan(String(req.params.id));
  res.status(204).send();
}
