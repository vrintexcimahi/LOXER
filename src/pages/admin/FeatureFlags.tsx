import { useEffect, useMemo, useState } from 'react';
import { Flag, RefreshCw } from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { useAuth } from '../../contexts/useAuth';
import { logAdminAction } from '../../lib/adminUtils';
import { supabase } from '../../lib/supabase';

interface FeatureFlagRow {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  rollout_pct: number;
  updated_at: string;
}

const RISK_LEVELS: Record<string, 'low' | 'medium' | 'high'> = {
  maintenance_mode: 'high',
  ai_job_scoring: 'low',
  employer_verification: 'medium',
  new_seeker_ui: 'low',
  api_rate_limiting: 'medium',
};

const RISK_CLASSES = {
  low: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
  medium: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
  high: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
};

export default function FeatureFlags() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');

  async function loadFlags() {
    if (!supabase) {
      setErrorMessage('Supabase belum dikonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.from('feature_flags').select('*').order('key');

    if (error) {
      setErrorMessage(error.code === '42P01' ? 'Tabel feature_flags belum ada. Jalankan migration God Mode.' : error.message);
      setFlags([]);
      setLoading(false);
      return;
    }

    setFlags((data || []) as FeatureFlagRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadFlags();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function toggleFlag(flag: FeatureFlagRow) {
    if (!supabase || !user) return;

    setSavingId(flag.id);
    const nextEnabled = !flag.enabled;
    const { error } = await supabase
      .from('feature_flags')
      .update({
        enabled: nextEnabled,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flag.id);

    if (error) {
      setToast(`Gagal mengubah ${flag.label}: ${error.message}`);
      setSavingId(null);
      return;
    }

    setFlags((current) => current.map((item) => (item.id === flag.id ? { ...item, enabled: nextEnabled } : item)));
    setToast(`${flag.label} ${nextEnabled ? 'diaktifkan' : 'dimatikan'}`);
    await logAdminAction(user.id, user.email || '', 'feature_flag_toggle', 'feature_flags', flag.id, `${flag.key}=${nextEnabled}`);
    setSavingId(null);
  }

  async function updateRollout(flag: FeatureFlagRow, rolloutPct: number) {
    if (!supabase || !user) return;

    setFlags((current) => current.map((item) => (item.id === flag.id ? { ...item, rollout_pct: rolloutPct } : item)));
    const { error } = await supabase
      .from('feature_flags')
      .update({
        rollout_pct: rolloutPct,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flag.id);

    if (error) {
      setToast(`Gagal update rollout ${flag.label}: ${error.message}`);
      await loadFlags();
      return;
    }

    await logAdminAction(user.id, user.email || '', 'feature_flag_rollout', 'feature_flags', flag.id, `${flag.key} rollout=${rolloutPct}`);
  }

  const maintenanceModeEnabled = useMemo(
    () => flags.some((flag) => flag.key === 'maintenance_mode' && flag.enabled),
    [flags]
  );

  return (
    <GodModeLayout title="Feature Flags" description="Kontrol fitur platform tanpa redeploy dan atur rollout secara bertahap.">
      <div className="space-y-6">
        {toast ? (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{toast}</div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Runtime Control</p>
            <p className="mt-1 text-sm text-slate-400">Feature flag ini disimpan di database dan bisa dipakai untuk gating UI maupun API.</p>
          </div>
          <button
            onClick={() => {
              void loadFlags();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {maintenanceModeEnabled ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            Maintenance mode sedang aktif. Pastikan middleware atau gate di frontend/backend membaca flag ini sebelum dipakai live.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">{errorMessage}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">Memuat feature flags...</div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => {
              const risk = RISK_LEVELS[flag.key] || 'low';
              const busy = savingId === flag.id;

              return (
                <div key={flag.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => {
                        void toggleFlag(flag);
                      }}
                      disabled={busy}
                      className={`relative h-7 w-14 rounded-full transition-all ${flag.enabled ? 'bg-cyan-500' : 'bg-white/20'} ${busy ? 'opacity-60' : ''}`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${flag.enabled ? 'left-8' : 'left-1'}`}
                      />
                    </button>

                    <div className="min-w-[240px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
                          <Flag className="h-4 w-4" />
                          {flag.label}
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${RISK_CLASSES[risk]}`}>
                          {risk}
                        </span>
                        {flag.enabled ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                            active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{flag.description}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{flag.key}</p>
                    </div>

                    <div className="w-full max-w-[220px]">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Rollout</span>
                        <span className="font-mono text-white">{flag.rollout_pct}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={flag.rollout_pct}
                        disabled={!flag.enabled}
                        onChange={(event) => {
                          void updateRollout(flag, Number(event.target.value));
                        }}
                        className="w-full accent-cyan-500 disabled:opacity-40"
                      />
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <p>Last update</p>
                      <p className="mt-1 text-slate-300">{new Date(flag.updated_at).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {!flags.length && !errorMessage ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-10 text-center text-slate-400">
                Belum ada feature flag. Jalankan migration God Mode untuk mengisi seed default.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
