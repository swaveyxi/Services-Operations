// ─── Startup validation ───────────────────────────────────────────────────────
// Called from server entry point — not at import time so tests are unaffected.

import { isProduction } from '@shared/constants';

export function validateEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[Config] DATABASE_URL is required but not set');
  }

  if (isProduction && process.env.DEV_BYPASS === 'true') {
    throw new Error(
      '[Config] DEV_BYPASS=true with NODE_ENV=production — refusing to start. ' +
        'DEV_BYPASS skips all real authentication; it must never be enabled in production.',
    );
  }

  const azureConfigured =
    process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID;
  if (!azureConfigured) {
    const message =
      '[Config] Azure Entra ID not fully configured — Microsoft login and Graph email will not work';
    // In production (with DEV_BYPASS necessarily off, per the check above)
    if (isProduction) throw new Error(message);
    console.warn(message);
  }
  if (!process.env.REVOKE_SECRET) {
    const message = '[Config] REVOKE_SECRET not set — POST /api/auth/revoke will refuse all requests until it is';
    if (isProduction) throw new Error(message);
    console.warn(message);
  }
  if (!process.env.GRAPH_SENDER_EMAIL) {
    console.warn(
      '[Config] GRAPH_SENDER_EMAIL not set — email notifications will be logged to console only',
    );
  }
  if (!process.env.APP_URL) {
    console.warn('[Config] APP_URL is required but not set');
  }
  if (
    !process.env.QB_CLIENT_ID ||
    !process.env.QB_CLIENT_SECRET ||
    !process.env.QB_REALM_ID ||
    !process.env.QB_WEBHOOK_VERIFIER_TOKEN ||
    !process.env.QB_URI ||
    !process.env.QB_TOKEN_ENDPOINT ||
    !process.env.QB_TOKEN_ENCRYPTION_KEY ||
    !process.env.QB_REDIRECT_URI
  ) {
    console.warn(
      '[Config] QuickBooks vars not fully configured — sync job and webhook will not work',
    );
  }
  if (
    process.env.QB_TOKEN_ENCRYPTION_KEY &&
    Buffer.from(process.env.QB_TOKEN_ENCRYPTION_KEY, 'base64').length !== 32
  ) {
    throw new Error(
      '[Config] QB_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (generate with `openssl rand -base64 32`)',
    );
  }
  if (!process.env.CORE_ATLAS_API_URL || !process.env.CORE_ATLAS_SERVICE_KEY) {
    console.warn(
      '[Config] Core Atlas vars not fully configured — Atlas integration routes will fail',
    );
  }
}
