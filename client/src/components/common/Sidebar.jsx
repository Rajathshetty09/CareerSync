import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Briefcase, BookmarkCheck,
  FileText, BarChart2, Settings, ClipboardList, Sparkles, Bot,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',         icon: Briefcase,       label: 'Jobs' },
  { to: '/saved-jobs',   icon: BookmarkCheck,   label: 'Saved Jobs' },
  { to: '/resumes',      icon: FileText,        label: 'Resumes' },
  { to: '/applications', icon: ClipboardList,   label: 'Applications' },
  { to: '/ai/analyse',   icon: Sparkles,        label: 'AI Tools' },
  { to: '/automation',   icon: Bot,             label: 'Automation' },
  { to: '/analytics',    icon: BarChart2,       label: 'Analytics' },
  { to: '/profile',      icon: Settings,        label: 'Profile' },
];

const Sidebar = () => {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-30 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${sidebarOpen ? 'justify-start' : 'justify-center'}`}>
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
          <Briefcase size={16} className="text-white" />
        </div>
        {sidebarOpen && (
          <span className="ml-3 font-bold text-gray-900 text-lg">CareerSync</span>
        )}
      </div>

      <nav className="flex flex-col gap-1 p-3 mt-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${!sidebarOpen ? 'justify-center' : ''}`
            }
          >
            <Icon size={18} className="shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
