import { Request, Response } from 'express';
import createError from 'http-errors';
import { verifySignature, getAccount, getCustomer } from '../services/qbClient.service';
import { getAccessToken } from '../jobs/qbOAuth';
import {
  syncAccountFromQB,
  syncClientFromQB,
  deleteAccountByQbId,
  deleteClientFromQB,
} from '../services/qbSync.service';

// Normalized shape both the new (CloudEvents) and legacy (eventNotifications)
// QBO webhook payloads get mapped into before processing.
type QbWebhookEvent = {
  entity: string; // 'account' | 'customer' | ...
  operation: string; // 'created' | 'updated' | 'deleted' | 'merged' | 'voided' | ...
  intuitentityid: string;
  intuitaccountid: string;
  deletedId?: string;
};

// New CloudEvents-style array payload — `type: "qbo.<entity>.<operation>.v1"`.
type CloudEventPayload = {
  type: string;
  intuitentityid: string;
  intuitaccountid: string;
  data?: { deletedid?: string };
};

// Legacy wrapped payload — `{ eventNotifications: [{ realmId, dataChangeEvent: { entities: [...] } }] }`.
type LegacyNotificationPayload = {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{ name: string; id: string; operation: string; deletedId?: string }>;
    };
  }>;
};

function normalizeEvents(parsed: unknown): QbWebhookEvent[] {
  if (Array.isArray(parsed)) {
    return (parsed as CloudEventPayload[]).map((e) => {
      const [, entity, operation] = e.type.split('.');
      return {
        entity,
        operation,
        intuitentityid: e.intuitentityid,
        intuitaccountid: e.intuitaccountid,
        deletedId: e.data?.deletedid,
      };
    });
  }

  const legacy = parsed as LegacyNotificationPayload;
  if (Array.isArray(legacy?.eventNotifications)) {
    return legacy.eventNotifications.flatMap((n) =>
      (n.dataChangeEvent?.entities ?? []).map((entity) => ({
        entity: entity.name.toLowerCase(),
        operation: entity.operation.toLowerCase(),
        intuitentityid: entity.id,
        intuitaccountid: n.realmId,
        deletedId: entity.deletedId,
      })),
    );
  }

  console.error('[QB Webhook] unrecognized payload shape', JSON.stringify(parsed));
  return [];
}

export async function quickbookEvent(req: Request, res: Response) {
  const signature = req.headers['intuit-signature'] as string;
  const verifierToken = process.env.QB_WEBHOOK_VERIFIER_TOKEN as string;
  const rawBody = req.body as Buffer;

  if (!signature) {
    throw createError(401, 'Missing signature');
  }

  const isValid = await verifySignature(rawBody, signature, verifierToken);
  if (!isValid) {
    throw createError(401, 'Invalid signature');
  }

  // Intuit requires a 200 within 3 seconds — ack first, process after.
  res.status(200).json({ received: true });

  const raw = rawBody.toString('utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[QB Webhook] failed to parse payload as JSON', err);
    return;
  }

  const events = normalizeEvents(parsed);
  console.log(
    `[QB Webhook] received ${events.length} event(s):`,
    events.map((e) => `${e.entity}.${e.operation}`),
  );
  processWebhookEvents(events).catch((err) => {
    console.error('[QB Webhook] processing failed', err);
  });
}

async function processWebhookEvents(events: QbWebhookEvent[]): Promise<void> {
  const relevant = events.filter((event) => event.intuitaccountid === process.env.QB_REALM_ID);
  if (relevant.length !== events.length) {
    console.warn(
      `[QB Webhook] ignoring ${events.length - relevant.length} event(s) for a different realm`,
    );
  }
  if (!relevant.length) return;

  const token = await getAccessToken();

  for (const event of relevant) {
    try {
      if (event.entity === 'account') {
        await handleAccountEvent(event, token);
      } else if (event.entity === 'customer') {
        await handleCustomerEvent(event, token);
      }
    } catch (err) {
      console.error(
        `[QB Webhook] failed to process ${event.entity}.${event.operation} (${event.intuitentityid})`,
        err,
      );
    }
  }
}

async function handleAccountEvent(event: QbWebhookEvent, token: string): Promise<void> {
  if (event.operation === 'merged') {
    if (event.deletedId) await deleteAccountByQbId(event.deletedId);
    return;
  }
  if (event.operation === 'deleted') {
    await deleteAccountByQbId(event.intuitentityid);
    return;
  }
  const account = await getAccount(token, event.intuitentityid);
  await syncAccountFromQB(account, 'upsert');
}

async function handleCustomerEvent(event: QbWebhookEvent, token: string): Promise<void> {
  if (event.operation === 'merged') {
    if (event.deletedId) await deleteClientFromQB(event.deletedId);
    return;
  }
  if (event.operation === 'deleted') {
    await deleteClientFromQB(event.intuitentityid);
    return;
  }
  const customer = await getCustomer(token, event.intuitentityid);
  await syncClientFromQB(customer, 'upsert');
}
