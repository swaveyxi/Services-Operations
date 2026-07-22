import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { probeSilentSso } from './auth/msalClient';
import Home from './pages/Home';
import Builder from './pages/Builder';
import Tracker from './pages/Tracker';
import Workplan from './pages/Workplan';
import Operations from './pages/Operations';
import OperationsTeam from './pages/Operations/Team';
import FormPanel from './pages/Operations/FormPanel';
import HandoffPanel from './pages/Operations/HandoffPanel';
import WorkplanReview from './pages/WorkplanReview';
import WorkplanView from './pages/WorkplanView';
import Forms from './pages/Forms';
import OrgDashboard from './pages/OrgDashboard';
import Approvals from './pages/Approvals';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const { userEmail } = useAuth();

  useEffect(() => {
    // Speculative silent probe for the OneDrive connector (see auth/msalClient.ts) —
    // runs once at app mount so the "Attach from OneDrive" button already knows
    // whether it needs to fall back to a popup, keeping that fallback a direct
    // consequence of the user's click.
    if (userEmail) probeSilentSso(userEmail);
  }, [userEmail]);

  return (
    <ToastProvider>
      <ToastContainer />
      <ErrorBoundary>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/tracker/:id" element={<Tracker />} />
        <Route path="/workplan/:id" element={<Workplan />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/operations/:team" element={<OperationsTeam />}>
          <Route path="form/:formId" element={<FormPanel />} />
          <Route path="handoff/:formId" element={<HandoffPanel />} />
        </Route>
        <Route path="/workplan-review/:id" element={<WorkplanReview />} />
        <Route path="/workplan-view/:id" element={<WorkplanView />} />
        <Route path="/forms/:id" element={<Forms />} />
        <Route path="/org-dashboard" element={<OrgDashboard />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<div className="empty-state">Page not found.</div>} />
      </Route>
    </Routes>
      </ErrorBoundary>
    </ToastProvider>
  );
}
