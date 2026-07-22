/*
 * Launches Microsoft's own File Picker v8 (Recent/My files/Shared/Shared
 * libraries/Organization sites — the same native UI OneDrive.com and the
 * ACT module use) in a popup window, and speaks its postMessage protocol
 * directly. Protocol verified against Microsoft's own reference sample:
 * github.com/OneDrive/samples — samples/file-picking/csharp-basic/.../filepicker.js
 * and samples/file-picking/sdk-pnptimeline/src/picker.ts.
 *
 * Embedding this in an iframe (rather than a popup) is blocked by SharePoint's
 * own CSP for any non-Microsoft domain — confirmed via a closed-as-answered
 * report on Microsoft's own docs repo (OneDrive/onedrive-api-docs#1593) — so
 * a popup is the only viable host for a third-party app like this one.
 */
import { acquireGraphToken, acquireTokenForResource } from '@/auth/msalClient';
import type { OneDriveFile } from '@shared/types';

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';

type PickedItemRef = {
  id: string;
  parentReference?: { driveId?: string };
};

async function resolvePickedFile(graphToken: string, ref: PickedItemRef): Promise<OneDriveFile> {
  const driveId = ref.parentReference?.driveId;
  if (!driveId) throw new Error('Picked item is missing its drive reference.');
  const res = await fetch(
    `${GRAPH_ROOT}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(ref.id)}?$select=id,name,webUrl,size,file,parentReference`,
    { headers: { Authorization: `Bearer ${graphToken}` } },
  );
  if (!res.ok) throw new Error(`Could not resolve picked file: ${res.status}`);
  const item = await res.json();
  return {
    id: item.id,
    drive_id: item.parentReference?.driveId ?? driveId,
    name: item.name,
    web_url: item.webUrl,
    mime_type: item.file?.mimeType,
    size: item.size,
  };
}

async function getOneDriveBaseUrl(graphToken: string): Promise<string> {
  const res = await fetch(`${GRAPH_ROOT}/me/drive?$select=webUrl`, {
    headers: { Authorization: `Bearer ${graphToken}` },
  });
  if (!res.ok) throw new Error('Could not resolve your OneDrive address.');
  const { webUrl } = (await res.json()) as { webUrl: string };
  return webUrl.replace(/\/[^/]+\/?$/, '');
}

export async function openFilePicker(loginHint: string): Promise<OneDriveFile[]> {
  // Open synchronously, still inside the caller's click handler, so the
  // browser treats this as a direct result of the user's gesture rather
  // than blocking it as an unsolicited popup.
  const opened = window.open('', 'onedrive-file-picker', 'width=1100,height=750');
  if (!opened) throw new Error('Popup blocked. Please allow popups for this site and try again.');
  const win: Window = opened;

  try {
    const graphToken = await acquireGraphToken(loginHint, true);
    const baseUrl = await getOneDriveBaseUrl(graphToken);
    const channelId = crypto.randomUUID();

    const options = {
      sdk: '8.0',
      entry: { oneDrive: { files: {} } },
      authentication: {},
      selection: { mode: 'multiple' },
      typesAndSources: {
        mode: 'all',
        pivots: { oneDrive: true, recent: true, shared: true, sharedLibraries: true, myOrganization: true },
      },
      messaging: { origin: window.location.origin, channelId },
    };

    return await new Promise<OneDriveFile[]>((resolve, reject) => {
      let port: MessagePort | undefined;
      let settled = false;
      let closeCheck: ReturnType<typeof setInterval>;

      function finish(result: OneDriveFile[] | Error) {
        if (settled) return;
        settled = true;
        clearInterval(closeCheck);
        window.removeEventListener('message', onInit);
        try {
          win.close();
        } catch {
          /* already closed */
        }
        if (result instanceof Error) reject(result);
        else resolve(result);
      }

      function getTokenForCommand(resource: string, type: string): Promise<string> {
        return type === 'Graph'
          ? acquireGraphToken(loginHint, false)
          : acquireTokenForResource(loginHint, resource, false);
      }

      async function onChannelMessage(message: MessageEvent) {
        const payload = message.data;
        if (payload?.type !== 'command' || !port) return;
        const activePort = port;

        activePort.postMessage({ type: 'acknowledge', id: payload.id });
        const command = payload.data;

        if (command.command === 'authenticate') {
          try {
            const token = await getTokenForCommand(command.resource, command.type);
            activePort.postMessage({ type: 'result', id: payload.id, data: { result: 'token', token } });
          } catch (e) {
            activePort.postMessage({
              type: 'result',
              id: payload.id,
              data: { result: 'error', error: { code: 'unableToObtainToken', message: String(e) } },
            });
          }
        } else if (command.command === 'pick') {
          try {
            const refs: PickedItemRef[] = command.items ?? [];
            const files = await Promise.all(refs.map((ref) => resolvePickedFile(graphToken, ref)));
            activePort.postMessage({ type: 'result', id: payload.id, data: { result: 'success' } });
            finish(files);
          } catch (e) {
            activePort.postMessage({
              type: 'result',
              id: payload.id,
              data: { result: 'error', error: { code: 'unusableItem', message: String(e) } },
            });
          }
        } else if (command.command === 'close') {
          activePort.postMessage({ type: 'result', id: payload.id, data: { result: 'success' } });
          finish([]);
        } else {
          activePort.postMessage({
            type: 'result',
            id: payload.id,
            data: { result: 'error', error: { code: 'unsupportedCommand', message: command.command } },
          });
        }
      }

      function onInit(event: MessageEvent) {
        if (event.source !== win || event.data?.type !== 'initialize' || event.data?.channelId !== channelId) return;
        port = event.ports[0];
        port.addEventListener('message', onChannelMessage);
        port.start();
        port.postMessage({ type: 'activate' });
      }

      window.addEventListener('message', onInit);

      closeCheck = setInterval(() => {
        if (win.closed) finish([]);
      }, 500);

      (async () => {
        try {
          const formToken = await getTokenForCommand(baseUrl, 'SharePoint');
          const queryString = new URLSearchParams({ filePicker: JSON.stringify(options) });
          const url = `${baseUrl}/_layouts/15/FilePicker.aspx?${queryString.toString()}`;

          const form = win.document.createElement('form');
          form.setAttribute('action', url);
          form.setAttribute('method', 'POST');
          const tokenInput = win.document.createElement('input');
          tokenInput.setAttribute('type', 'hidden');
          tokenInput.setAttribute('name', 'access_token');
          tokenInput.setAttribute('value', formToken);
          form.appendChild(tokenInput);
          win.document.body.appendChild(form);
          form.submit();
        } catch (e) {
          finish(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    });
  } catch (e) {
    try {
      win.close();
    } catch {
      /* already closed */
    }
    throw e;
  }
}
