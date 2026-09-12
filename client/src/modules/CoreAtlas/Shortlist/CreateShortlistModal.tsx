import { useState } from 'react';
import { createShortlist } from '../services/shortlist';
import type { PipelineStage, Shortlist } from '../types';

export function CreateShortlistModal({
  campaignId,
  stages,
  onCancel,
  onCreated,
}: {
  campaignId: string;
  stages: PipelineStage[];
  onCancel: () => void;
  onCreated: (shortlist: Shortlist) => void;
}) {
  const [platformSlug, setPlatformSlug] = useState(stages[0]?.platform_slug ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!platformSlug || !name.trim()) {
      setError('Pick a stage and enter a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const shortlist = await createShortlist(campaignId, platformSlug, name.trim());
      onCreated(shortlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shortlist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">New shortlist</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">
              Stage<span className="field-req">*</span>
            </label>
            <select className="select" value={platformSlug} onChange={(e) => setPlatformSlug(e.target.value)}>
              {stages.map((st) => (
                <option key={st.platform_slug} value={st.platform_slug}>
                  {st.platform_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">
              Name<span className="field-req">*</span>
            </label>
            <input
              className="input"
              placeholder="e.g. FOT Shortlist v1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {error && <span className="field-error">{error}</span>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
