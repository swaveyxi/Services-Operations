import { useEffect, useState } from 'react';
import { Routes, Route, Link, useParams } from 'react-router-dom';
import Dashboard from '../../modules/CoreAtlas/Dashboard';
import Roster from '../../modules/CoreAtlas/Roster';
import CandidateProfile from '../../modules/CoreAtlas/Roster/CandidateProfile';
import Shortlist from '../../modules/CoreAtlas/Shortlist';
import Reports from '../../modules/CoreAtlas/Reports';
import CommsOverview from '../../modules/CoreAtlas/Comms/CommsOverview';
import CommsPlatformDetail from '../../modules/CoreAtlas/Comms/CommsPlatformDetail';
import CommsCandidateTimeline from '../../modules/CoreAtlas/Comms/CommsCandidateTimeline';
import { ComingSoon } from '../../modules/CoreAtlas/components/ComingSoon';
import { getCampaign } from '../../modules/CoreAtlas/services/campaigns';
import { isApiErrorStatus } from '@/services/api';

type GuardStatus = 'loading' | 'ready' | 'unregistered' | 'error';

// Cases created before a stage config existed (or created with no stages)
// have no atlas_campaign_id, so every /api/atlas/* call 409s. Check
// registration once here instead of letting each page hang on "Loading…"
// forever waiting on a request that will never succeed.
function useAtlasRegistration(id: string) {
  const [status, setStatus] = useState<GuardStatus>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getCampaign(id)
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(isApiErrorStatus(err, 409) ? 'unregistered' : 'error');
      });
    return () => {
      active = false;
    };
  }, [id]);

  return status;
}

// Mounted at /atlas/:id/* (see client/src/App.tsx) — relative routes here.
export default function CoreAtlas() {
  const { id = '' } = useParams();
  const status = useAtlasRegistration(id);

  if (status === 'loading') {
    return <div className='loading-state'>Loading campaign…</div>;
  }

  if (status === 'unregistered') {
    return (
      <div className='empty-state' style={{ padding: 'var(--space-10)' }}>
        <i className='fa-solid fa-plug-circle-xmark' aria-hidden='true' />
        <div
          style={{
            marginTop: 'var(--space-3)',
            fontWeight: 600,
            fontSize: '1rem',
            color: 'var(--c-text)',
          }}
        >
          This case hasn't been registered on Atlas.
        </div>
        <p
          style={{
            margin: 'var(--space-2) auto 0',
            color: 'var(--c-text-muted)',
            fontSize: '1.1rem',
            maxWidth: 600,
          }}
        >
          It was created without any application stages configured, so there's nothing here to view
          yet.
        </p>
        <Link
          to={`/tracker/${id}`}
          className='btn btn-secondary'
          style={{ marginTop: 'var(--space-4)' }}
        >
          <i className='fa-solid fa-arrow-left' aria-hidden='true' /> Back to Tracker
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className='error-state'>
        <i className='fa-solid fa-triangle-exclamation' aria-hidden='true' /> Couldn't load this
        campaign. Try refreshing the page.
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path='candidates' element={<Roster />} />
      <Route path='candidates/:candidateId' element={<CandidateProfile />} />
      <Route path='shortlist' element={<Shortlist />} />
      <Route path='reports' element={<Reports />} />
      <Route path='communications' element={<CommsOverview />} />
      <Route path='communications/:platformId' element={<CommsPlatformDetail />} />
      <Route path='communications/candidates/:candidateId' element={<CommsCandidateTimeline />} />
      <Route path='*' element={<ComingSoon label='Page' />} />
    </Routes>
  );
}
