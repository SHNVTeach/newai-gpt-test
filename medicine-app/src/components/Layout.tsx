import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Pill, Clock, Activity, Search, MoreHorizontal, Thermometer, AlertCircle, Zap, FileText, Users, X } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useProfiles } from '../hooks/useProfiles';

const MORE_ITEMS = [
  { to: '/vitals', icon: Thermometer, label: 'Vitals' },
  { to: '/side-effects', icon: AlertCircle, label: 'Side Effects' },
  { to: '/triggers', icon: Zap, label: 'Triggers' },
  { to: '/doctor-report', icon: FileText, label: 'Doctor Report' },
  { to: '/profiles', icon: Users, label: 'Profiles' },
  { to: '/inventory', icon: Pill, label: 'Inventory' },
];

export function Layout() {
  const { activeProfileId } = useProfile();
  const { profiles } = useProfiles();
  const navigate = useNavigate();
  const active = profiles.find((p) => p.id === activeProfileId);
  const [showMore, setShowMore] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Today' },
    { to: '/medications', icon: Pill, label: 'Meds' },
    { to: '/conditions', icon: Activity, label: 'Conditions' },
    { to: '/history', icon: Clock, label: 'History' },
  ];

  function handleMoreNav(to: string) {
    setShowMore(false);
    navigate(to);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow">
        <h1 className="text-lg font-bold tracking-tight">MedTrack</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          {active && (
            <NavLink to="/profiles" className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: active.color }}
              >
                {active.avatar}
              </span>
              <span className="text-sm font-medium">{active.name}</span>
            </NavLink>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* More menu overlay */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 rounded-t-2xl z-50 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">More</span>
              <button onClick={() => setShowMore(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => handleMoreNav(to)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-gray-600"
                >
                  <Icon size={22} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setShowMore(v => !v)}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
            showMore ? 'text-indigo-600' : 'text-gray-500'
          }`}
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>
    </div>
  );
}
