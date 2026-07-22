import { Request, Response } from 'express';
import createError from 'http-errors';
import {
  submitForm,
  acknowledgeDelivery,
  markDelivered,
  sendHandoff,
  acknowledgeHandoff,
  completeHandoff,
  updateFormDetails,
} from '../services/forms.service';
import { findAllForms, findFormById } from '../models/forms';

// GET /api/forms
export async function listForms(_req: Request, res: Response): Promise<void> {
  const forms = await findAllForms();
  res.json(forms);
}

// POST /api/forms
export async function createForm(req: Request, res: Response): Promise<void> {
  const { campaign_id, form_type, form_details, operations_team, delivery_status, submitted_on } =
    req.body;

  const form = await submitForm({
    campaign_id,
    form_type,
    form_details: form_details ?? null,
    operations_team,
    delivery_status: delivery_status ?? 'Submitted',
    submitted_on: submitted_on ? new Date(submitted_on) : new Date(),
    submitter_user_id: req.user!.id,
  });
  res.status(201).json(form);
}

// GET /api/forms/:id
export async function getForm(req: Request, res: Response): Promise<void> {
  const form = await findFormById(String(req.params.id));
  if (!form) throw createError(404, 'Form not found.');
  res.json(form);
}

// PATCH /api/forms/:id
export async function patchForm(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { action, handoff_team, handoff_id, attachment, report, note, evidence } = req.body;

  if (action === 'deliver') {
    await markDelivered(id, req.user!.name, note, evidence);
    res.json({ message: 'Form marked as delivered.' });
    return;
  }

  if (action === 'acknowledge') {
    await acknowledgeDelivery(id, req.user!.name);
    res.json({ message: 'Delivery acknowledged.' });
    return;
  }

  if (action === 'handoff') {
    await sendHandoff(id, handoff_team, req.user!.name, attachment);
    res.json({ message: 'Handoff sent.' });
    return;
  }

  if (action === 'acknowledge-handoff') {
    await acknowledgeHandoff(handoff_id, req.user!.name);
    res.json({ message: 'Handoff acknowledged.' });
    return;
  }

  if (action === 'complete-handoff') {
    await completeHandoff(handoff_id, req.user!.name, report);
    res.json({ message: 'Handoff completed.' });
    return;
  }

  if (req.body.form_details) {
    const updated = await updateFormDetails(id, req.body.form_details);
    res.json(updated);
    return;
  }

  throw createError(400, 'Invalid or missing action.');
}
