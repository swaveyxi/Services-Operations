import { useState } from 'react';
import type { OneDriveFile } from '@shared/types';
import { useAuth } from '@/context/AuthContext';
import { iconForFile } from '@/utils/fileIcon';
import { openFilePicker } from '@/services/filePicker';
import s from './AttachmentField.module.css';

export function AttachmentField({
  label,
  required,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: OneDriveFile[];
  onChange: (files: OneDriveFile[]) => void;
  error?: string;
}) {
  const { userEmail } = useAuth();
  const [busy, setBusy] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function remove(id: string, driveId: string) {
    onChange(value.filter((f) => !(f.id === id && f.drive_id === driveId)));
  }

  async function attachFromOneDrive() {
    setBusy(true);
    setPickerError(null);
    try {
      const picked = await openFilePicker(userEmail);
      if (picked.length === 0) return;
      const existingKeys = new Set(value.map((f) => `${f.drive_id}:${f.id}`));
      const merged = [...value, ...picked.filter((f) => !existingKeys.has(`${f.drive_id}:${f.id}`))];
      onChange(merged);
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : 'Could not open OneDrive. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label className="field-label">
        {label}
        {required && <span className="field-req">*</span>}
      </label>
      {hint && <span className="field-hint">{hint}</span>}

      {value.length > 0 && (
        <div className={s.chips}>
          {value.map((f) => (
            <span className={s.chip} key={`${f.drive_id}:${f.id}`}>
              <i className={`fa-solid ${iconForFile(f.name, f.mime_type)}`} aria-hidden="true" />
              <a
                className={s.chipName}
                href={f.web_url}
                target="_blank"
                rel="noopener"
                title={f.name}
              >
                {f.name}
              </a>
              <button
                type="button"
                className={s.chipRemove}
                aria-label={`Remove ${f.name}`}
                onClick={() => remove(f.id, f.drive_id)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-secondary btn-sm" onClick={attachFromOneDrive} disabled={busy}>
        <i className="fa-brands fa-microsoft" aria-hidden="true" /> {busy ? 'Opening OneDrive…' : 'Attach from OneDrive'}
      </button>

      {(error || pickerError) && <span className="field-error">{error || pickerError}</span>}
    </div>
  );
}
