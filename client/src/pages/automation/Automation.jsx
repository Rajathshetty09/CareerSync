import { useState } from 'react';
import { Bot } from 'lucide-react';
import NaukriSetup from './components/NaukriSetup.jsx';
import LinkedInSetup from './components/LinkedInSetup.jsx';
import TriggerPanel from './components/TriggerPanel.jsx';
import RunHistory from './components/RunHistory.jsx';

const PORTAL_TABS = [
  { id: 'naukri',   label: 'Naukri',   logo: 'N',  logoColor: 'text-[#FF7555]' },
  { id: 'linkedin', label: 'LinkedIn', logo: 'in', logoColor: 'text-[#0A66C2]' },
];

const Automation = () => {
  const [portalTab, setPortalTab]       = useState('naukri');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot size={24} className="text-primary-600" />
          Job Automation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Auto-apply to Naukri and LinkedIn Easy Apply jobs — a visible browser runs on your machine while you focus on interviews.
        </p>
      </div>

      {/* Warning banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
        <p className="font-medium">Before you start:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Keep your Naukri / LinkedIn profile complete and up-to-date.</li>
          <li>The bot pauses at each apply step — answer any screening questions in the browser window.</li>
          <li>Use specific keywords (e.g. "React Developer" not "developer") for better matches.</li>
          <li>Start with 5–10 jobs to verify everything works before running larger batches.</li>
          <li>LinkedIn may ask for identity verification on first login from this device.</li>
        </ul>
      </div>

      {/* Step 1: Portal setup (tabbed) */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Connect a Portal</p>

        {/* Portal tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
          {PORTAL_TABS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPortalTab(p.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                portalTab === p.id
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`font-bold leading-none ${p.logoColor}`}>{p.logo}</span>
              {p.label}
            </button>
          ))}
        </div>

        {portalTab === 'naukri'   && <NaukriSetup />}
        {portalTab === 'linkedin' && <LinkedInSetup />}
      </section>

      {/* Step 2: Trigger */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Run Auto-Apply</p>
        <TriggerPanel onRunStarted={() => setRefreshTrigger((n) => n + 1)} />
      </section>

      {/* Run history */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Run History</p>
        <RunHistory refreshTrigger={refreshTrigger} />
      </section>
    </div>
  );
};

export default Automation;
