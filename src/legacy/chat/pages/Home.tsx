import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageSquarePlus, PlayCircle } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { LANGUAGES } from '../../../types';

export function HomePage() {
  const { vocab, pastSessions, currentSession } = useApp();

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-5 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chat practice</h1>
        <p className="text-sm text-slate-600 mt-1">
          Free-form roleplay. The AI takes the other side of the scene.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentSession && (
            <Link
              to="/chat/conversation"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              <PlayCircle size={16} />
              Resume session
            </Link>
          )}
          <Link
            to="/chat/setup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 shadow"
          >
            <MessageSquarePlus size={16} />
            {currentSession ? 'New session' : 'Start session'}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/chat/vocab"
          className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-4 hover:bg-white/80 transition flex items-start gap-3"
        >
          <BookOpen size={20} className="text-violet-600 mt-0.5" />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Vocabulary</div>
            <div className="text-2xl font-bold text-slate-900">{vocab.length}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              Review <ArrowRight size={11} />
            </div>
          </div>
        </Link>
        <div className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Sessions</div>
          <div className="text-2xl font-bold text-slate-900">{pastSessions.length}</div>
          <div className="text-xs text-slate-500">Completed</div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-4">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
          Languages
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(LANGUAGES).map(([k, v]) => (
            <span
              key={k}
              className="text-xs px-2.5 py-1 rounded-full bg-white/70 border border-white/70 text-slate-700"
            >
              {v.label}
              <span className="text-slate-400"> · {v.nativeName}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
