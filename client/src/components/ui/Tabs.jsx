/**
 * Controlled tab bar.
 *
 * Usage:
 *   const [tab, setTab] = useState('personal');
 *   <Tabs
 *     activeTab={tab}
 *     onChange={setTab}
 *     tabs={[
 *       { id: 'personal', label: 'Personal Info', icon: User },
 *       { id: 'skills',   label: 'Skills' },
 *     ]}
 *   />
 */
const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="border-b border-gray-200">
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium',
              'border-b-2 transition-colors focus:outline-none',
              active
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {Icon && <Icon size={15} />}
            {label}
          </button>
        );
      })}
    </nav>
  </div>
);

export default Tabs;
