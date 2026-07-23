/*
 * Delegated MSAL auth for the OneDrive/SharePoint attachment connector ONLY.
 */
import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser';

// ReadWrite (rather than Read) is required to call Graph's createLink and mint
// an organization-scoped sharing link for picked attachments — see filePicker.ts.
export const GRAPH_SCOPES = ['Files.ReadWrite.All', 'Sites.ReadWrite.All'];

let msal: PublicClientApplication | null = null;
let ready: Promise<void> | null = null;

function instance(): PublicClientApplication {
  if (!msal) {
    msal = new PublicClientApplication({
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    });
    ready = msal.initialize();
  }
  return msal;
}

function findAccount(m: PublicClientApplication, loginHint: string): AccountInfo | undefined {
  return m.getAllAccounts().find((a) => a.username.toLowerCase() === loginHint.toLowerCase());
}

/*
 * Speculative silent probe — call once at app-shell mount (not at
 * picker-open time).
 */
export async function probeSilentSso(loginHint: string): Promise<boolean> {
  if (!loginHint) return false;
  try {
    await ready;
    await instance().ssoSilent({ scopes: GRAPH_SCOPES, loginHint });
    return true;
  } catch {
    return false;
  }
}

async function acquireToken(
  loginHint: string,
  scopes: string[],
  viaPopup: boolean,
): Promise<string> {
  await ready;
  const m = instance();
  const account = findAccount(m, loginHint);
  const request = { scopes, loginHint, account };

  try {
    const result = account ? await m.acquireTokenSilent(request) : await m.ssoSilent(request);
    return result.accessToken;
  } catch (err) {
    if (!viaPopup) throw err;
    const result = await m.loginPopup(request);
    return result.accessToken;
  }
}

/*
 * Acquire a Graph-scoped access token. Always tries silent first (cheap;
 * transparently renews via the cached refresh token).
 */
export function acquireGraphToken(loginHint: string, viaPopup: boolean): Promise<string> {
  return acquireToken(loginHint, GRAPH_SCOPES, viaPopup);
}

/*
 * Microsoft's File Picker v8 (see services/filePicker.ts)
 */
export function acquireTokenForResource(
  loginHint: string,
  resource: string,
  viaPopup: boolean,
): Promise<string> {
  // Azure AD registers a service principal per SharePoint tenant HOST
  const origin = new URL(resource).origin;
  return acquireToken(loginHint, [`${origin}/.default`], viaPopup);
}

export function hasGraphAccount(loginHint: string): boolean {
  if (!msal) return false;
  return Boolean(findAccount(msal, loginHint));
}
