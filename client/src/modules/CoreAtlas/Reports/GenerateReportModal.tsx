import { useState } from 'react';
import { generateReport } from '../services/reports';
import type { PipelineStage, ReportSummary, ReportType } from '../types';

export function GenerateReportModal({
  campaignId,
  stages,
  onCancel,
  onGenerated,
}: {
  campaignId: string;
  stages: PipelineStage[];
  onCancel: () => void;
  onGenerated: (report: ReportSummary) => void;
}) {
  const [reportType, setReportType] = useState<ReportType>('STAGE');
  const [scopeSlug, setScopeSlug] = useState(stages[0]?.platform_slug ?? '');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (reportType === 'STAGE' && !scopeSlug) {
      setError('Pick a stage.');
      return;
    }
    if (reportType === 'CUSTOM' && prompt.trim().length < 10) {
      setError('Describe what you want in at least 10 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const report = await generateReport(campaignId, {
        report_type: reportType,
        scope_slug: reportType === 'STAGE' ? scopeSlug : undefined,
        prompt: reportType === 'CUSTOM' ? prompt.trim() : undefined,
        title: title.trim() || undefined,
      });
      onGenerated(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start report generation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Generate report</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">
              Report type<span className="field-req">*</span>
            </label>
            <select className="select" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              <option value="STAGE">Stage report</option>
              <option value="CAMPAIGN">Campaign report</option>
              <option value="CUSTOM">Custom (AI narrative)</option>
            </select>
          </div>

          {reportType === 'STAGE' && (
            <div className="field">
              <label className="field-label">
                Stage<span className="field-req">*</span>
              </label>
              <select className="select" value={scopeSlug} onChange={(e) => setScopeSlug(e.target.value)}>
                {stages.map((st) => (
                  <option key={st.platform_slug} value={st.platform_slug}>
                    {st.platform_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'CUSTOM' && (
            <div className="field">
              <label className="field-label">
                What do you want to know?<span className="field-req">*</span>
              </label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="e.g. Summarize FOT performance for candidates based in Lagos, highlighting any flags."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <span className="field-hint">Requires Azure OpenAI to be configured on this deployment.</span>
            </div>
          )}

          <div className="field">
            <label className="field-label">Title</label>
            <input
              className="input"
              placeholder="Optional — a sensible default is generated"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {error && <span className="field-error">{error}</span>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Starting…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
