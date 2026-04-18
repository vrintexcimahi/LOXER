import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { useAuth } from '../../contexts/useAuth';
import { logAdminAction } from '../../lib/adminUtils';
import { supabase } from '../../lib/supabase';

type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
type ModerationEntity = 'job' | 'company' | 'user' | 'application';

interface ModerationItem {
  id: string;
  entity_type: ModerationEntity;
  entity_id: string;
  reason: string;
  ai_score: number | null;
  ai_flags: string[];
  status: ModerationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CLASS: Record<ModerationStatus, string> = {
  pending: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  approved: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  rejected: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  escalated: 'border-violet-400/20 bg-violet-500/10 text-violet-100',
};

const ENTITY_LABEL: Record<ModerationEntity, string> = {
  job: 'Lowongan',
  company: 'Perusahaan',
  user: 'User',
  application: 'Lamaran',
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-500">Belum ada AI score</span>;
  const pct = Math.round(score * 100);
  const tone = pct >= 70 ? 'text-emerald-300' : pct >= 40 ? 'text-amber-300' : 'text-rose-300';
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${tone}`}>{pct}%</span>
    </div>
  );
}

export default function ModerationQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ModerationStatus | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadQueue() {
    if (!supabase) {
      setErrorMessage('Supabase belum dikonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    let query = supabase.from('moderation_queue').select('*').order('created_at', { ascending: false }).limit(50);
    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.code === '42P01' ? 'Tabel moderation_queue belum ada. Jalankan migration God Mode.' : error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data || []) as ModerationItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadQueue();
  }, [filter]);

  async function updateStatus(item: ModerationItem, nextStatus: Exclude<ModerationStatus, 'pending'>, notes?: string) {
    if (!supabase || !user) return;

    setBusyId(item.id);
    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: nextStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', item.id);

    if (error) {
      setErrorMessage(error.message);
      setBusyId(null);
      return;
    }

    await logAdminAction(user.id, user.email || '', `moderation_${nextStatus}`, item.entity_type, item.entity_id, item.reason);
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: nextStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(), notes: notes || null } : row)));
    setBusyId(null);
  }

  async function runAIScore(item: ModerationItem) {
    if (!supabase || !user) return;
    setBusyId(item.id);
    const mockScore = Number(Math.random().toFixed(2));
    const mockFlags = mockScore < 0.35 ? ['spam_keywords', 'suspicious_pattern'] : mockScore < 0.55 ? ['needs_review'] : [];

    const { error } = await supabase.from('moderation_queue').update({ ai_score: mockScore, ai_flags: mockFlags }).eq('id', item.id);
    if (error) {
      setErrorMessage(error.message);
      setBusyId(null);
      return;
    }

    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ai_score: mockScore, ai_flags: mockFlags } : row)));
    await logAdminAction(user.id, user.email || '', 'moderation_rescore', item.entity_type, item.entity_id, `score=${mockScore}`);
    setBusyId(null);
  }

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'pending').length, [items]);

  return (
    <GodModeLayout title="Moderation Queue" description="Review konten yang butuh perhatian, tambahkan AI score, dan eskalasi kasus berisiko.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-300">Queue aktif</p>
              <p className="text-xs text-slate-500">{pendingCount} item menunggu review.</p>
            </div>
          </div>
          <button
            onClick={() => {
              void loadQueue();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'escalated'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] ${filter === status ? 'bg-cyan-500 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}
            >
              {status}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">{errorMessage}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">Memuat moderation queue...</div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-14 text-center text-slate-400">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-300/60" />
            Queue kosong untuk filter ini.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                        {ENTITY_LABEL[item.entity_type]}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${STATUS_CLASS[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-medium text-white">{item.reason}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{item.entity_id}</p>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">AI Quality Score</p>
                    <div className="mt-3">
                      <ScoreBadge score={item.ai_score} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.ai_flags.length ? (
                        item.ai_flags.map((flag) => (
                          <span key={flag} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Belum ada AI flags.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Quick Actions</p>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => {
                          void runAIScore(item);
                        }}
                        disabled={busyId === item.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        Run AI Score
                      </button>
                      <button
                        onClick={() => {
                          void updateStatus(item, 'approved');
                        }}
                        disabled={busyId === item.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          void updateStatus(item, 'rejected');
                        }}
                        disabled={busyId === item.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          void updateStatus(item, 'escalated', 'Perlu review lanjutan');
                        }}
                        disabled={busyId === item.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Escalate
                      </button>
                    </div>
                  </div>
                </div>

                {item.notes ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                    Catatan review: {item.notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
