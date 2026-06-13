import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpenCheck, MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { AppMode } from '../types';

export function Layout() {
  const { settings, setSettings } = useApp();
  const nav = useNavigate();

  const switchMode = (mode: AppMode) => {
    if (settings.mode !== mode) setSettings({ ...settings, mode });
    nav(mode === 'chat' ? '/chat' : '/practice');
  };

  return (
    <div className="relative min-h-screen text-slate-900 overflow-x-hidden">
      {/* Liquid-glass background: soft gradient + drifting blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-sky-100 via-rose-100 to-violet-100" />
      <div className="pointer-events-none fixed -z-10 -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none fixed -z-10 top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-pink-300/40 blur-3xl" />
      <div className="pointer-events-none fixed -z-10 -bottom-24 left-1/3 w-[28rem] h-[28rem] rounded-full bg-violet-300/40 blur-3xl" />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/55 border-b border-white/40">
        <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-2xl bg-gradient-to-br from-sky-400 via-pink-400 to-violet-400 shadow-md shadow-sky-300/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a8 8 0 0 1-12.74 6.5L3 21l2.5-5.26A8 8 0 1 1 21 12Z" />
              </svg>
            </span>
            <span className="text-base">TalkSim</span>
          </Link>

          <div className="inline-flex items-center rounded-full bg-white/60 backdrop-blur-md border border-white/50 p-0.5 shadow-sm">
            <ModeChip
              active={settings.mode === 'practice'}
              onClick={() => switchMode('practice')}
              icon={<BookOpenCheck size={15} strokeWidth={2.4} />}
              label="Practice"
            />
            <ModeChip
              active={settings.mode === 'chat'}
              onClick={() => switchMode('chat')}
              icon={<MessageCircle size={15} strokeWidth={2.4} />}
              label="Chat"
            />
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md border transition ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white/60 border-white/50 text-slate-700 hover:bg-white/80'
              }`
            }
            title="Settings"
          >
            <SettingsIcon size={17} strokeWidth={2.2} />
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active
          ? 'bg-slate-900 text-white shadow'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
