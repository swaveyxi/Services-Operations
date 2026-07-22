import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import {
  getDevSessionUser,
  checkAuthHash,
  getStoredAuth,
  verifySession,
  redirectToShell,
  DEV_BYPASS,
} from './auth/authBridge';
import './styles/global.css';

/*
 * The OneDrive connector's MSAL popup/silent-iframe flow (see auth/msalClient.ts)
 * reuses this app's own origin as its redirectUri — so after Microsoft signs
 * the user in, the popup/iframe navigates back to this same SPA with an auth
 * response in the URL hash (#code=...). This msal-browser version (5.x) relies
 * on a BroadcastChannel-based "redirect bridge", not location polling: the
 * page that lands on the response is expected to call
 * broadcastResponseToMainFrame(), which posts the payload back to the opener
 * (identified by the correlation id embedded in the `state` param) and closes
 * itself. Nothing does that by default, so instead of booting our full app in
 * this throwaway window, hand it straight to MSAL's bridge.
 */
function isMsalAuthResponseWindow(): boolean {
  const isPopupOrIframe = window.opener !== null || window.parent !== window.self;
  const hasAuthResponse = /[#&](code|error)=/.test(window.location.hash);
  return isPopupOrIframe && hasAuthResponse;
}

async function bridgeMsalAuthResponse() {
  const { broadcastResponseToMainFrame } = await import('@azure/msal-browser/redirect-bridge');
  await broadcastResponseToMainFrame();
}

async function boot() {
  const dev = await getDevSessionUser();
  const hashAuth = dev ? null : await checkAuthHash();
  const stored = dev ?? hashAuth ?? getStoredAuth();
  const auth = stored ?? (DEV_BYPASS ? null : await verifySession());

  if (!auth) {
    redirectToShell();
    return;
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <AuthProvider user={{ id: auth.id, name: auth.name, email: auth.email }} roles={auth.roles}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>,
  );
}

if (isMsalAuthResponseWindow()) {
  bridgeMsalAuthResponse();
} else {
  boot();
}
