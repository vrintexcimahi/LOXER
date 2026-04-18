import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, Clock, Monitor, RefreshCw, Shield, Trash2, Wifi } from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { useAuth } from '../../contexts/useAuth';
import { logAdminAction } from '../../lib/adminUtils';
import { supabase } from '../../lib/supabase';

interface IPBlockRow {
  id: string;
  ip_address: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

interface AdminSessionRow {
  id: string;
  admin_id: string;
  impersonating: string | null;
  ip_address: string | null;
  user_agent: string | null;
  started_at: string;
  last_active_at: string;
  ended_at: string | null;
}

interface AuditAlert {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
}

export default function SecurityCenter() {
  const { user } = useAuth();
  const [ipBlocks, setIpBlocks] = useState<IPBlockRow[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState<'ip' | 'sessions' | 'alerts'>('ip');
  const [newIP, setNewIP] = useState('');
  const [newReason, setNewReason] = useState('');

  async function loadData() {
    if (!supabase) {
      setErrorMessage('Supabase belum dikonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const [blocksRes, sessionsRes, alertsRes] = await Promise.all([
      supabase.from('ip_blocks').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('admin_sessions').select('*').order('last_active_at', { ascending: false }).limit(20),
      supabase
        .from('audit_logs')
        .select('*')
        .in('action', ['ban_user', 'delete_user', 'change_role', 'feature_flag_toggle', 'broadcast_sent', 'broadcast_scheduled'])
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    if (blocksRes.error && blocksRes.error.code !== '42P01') setErrorMessage(blocksRes.error.message);
    if (sessionsRes.error && sessionsRes.error.code !== '42P01') setErrorMessage(sessionsRes.error.message);
    if (alertsRes.error && alertsRes.error.code !== '42P01') setErrorMessage(alertsRes.error.message);

    setIpBlocks((blocksRes.data || []) as IPBlockRow[]);
    setSessions((sessionsRes.data || []) as AdminSessionRow[]);
    setAlerts((alertsRes.data || []) as AuditAlert[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function addIPBlock() {
    if (!supabase || !user || !newIP.trim() || !newReason.trim()) return;

    const { data, error } = await supabase
      .from('ip_blocks')
      .insert({
        ip_address: newIP.trim(),
        reason: newReason.trim(),
        blocked_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      setErrorMessage(error.code === '42P01' ? 'Tabel ip_blocks belum ada. Jalankan migration God Mode.' : error.message);
      return;
    }

    await logAdminAction(user.id, user.email || '', 'ip_block_added', 'ip_blocks', data.id, `${newIP.trim()} | ${newReason.trim()}`);
    setIpBlocks((current) => [data as IPBlockRow, ...current]);
    setNewIP('');
    setNewReason('');
  }

  async function removeIPBlock(id: string) {
    if (!supabase || !user) return;
    const { error } = await supabase.from('ip_blocks').delete().eq('id', id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await logAdminAction(user.id, user.email || '', 'ip_block_removed', 'ip_blocks', id, 'remove block');
    setIpBlocks((current) => current.filter((item) => item.id !== id));
  }

  async function terminateSession(id: string) {
    if (!supabase || !user) return;
    const endedAt = new Date().toISOString();
    const { error } = await supabase.from('admin_sessions').update({ ended_at: endedAt }).eq('id', id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await logAdminAction(user.id, user.email || '', 'admin_session_terminated', 'admin_sessions', id, endedAt);
    setSessions((current) => current.map((session) => (session.id === id ? { ...session, ended_at: endedAt } : session)));
  }

  const activeSessions = useMemo(() => sessions.filter((session) => !session.ended_at).length, [sessions]);

  return (
    <GodModeLayout title="Security Center" description="Pantau blokir IP, session admin aktif, dan jejak tindakan sensitif di panel admin.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Ban className="h-4 w-4 text-rose-300" />
              IP Diblokir
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{ipBlocks.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <Monitor className="h-4 w-4 text-cyan-300" />
              Session Aktif
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{activeSessions}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <AlertCircle className="h-4 w-4 text-amber-300" />
              Alert Terakhir
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{alerts.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {[
              { key: 'ip', label: 'IP Block List' },
              { key: 'sessions', label: 'Admin Sessions' },
              { key: 'alerts', label: 'Activity Alerts' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as 'ip' | 'sessions' | 'alerts')}
                className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] ${tab === item.key ? 'bg-cyan-500 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              void loadData();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">{errorMessage}</div>
        ) : null}

        {tab === 'ip' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                <input
                  value={newIP}
                  onChange={(event) => setNewIP(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  placeholder="103.28.54.12"
                />
                <input
                  value={newReason}
                  onChange={(event) => setNewReason(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  placeholder="Alasan pemblokiran"
                />
                <button
                  onClick={() => {
                    void addIPBlock();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white"
                >
                  <Shield className="h-4 w-4" />
                  Blokir IP
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">Memuat IP block list...</div>
              ) : ipBlocks.length ? (
                ipBlocks.map((block) => (
                  <div key={block.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-rose-300" />
                          <p className="font-mono text-sm text-white">{block.ip_address}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{block.reason}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Dibuat: {new Date(block.created_at).toLocaleString('id-ID')}
                          {block.expires_at ? ` | Expire: ${new Date(block.expires_at).toLocaleString('id-ID')}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          void removeIPBlock(block.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-10 text-center text-slate-400">
                  Belum ada IP yang diblokir.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'sessions' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">Memuat admin sessions...</div>
            ) : sessions.length ? (
              sessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${session.ended_at ? 'bg-slate-500' : 'bg-emerald-400'}`} />
                        <p className="text-sm font-medium text-white">{session.ended_at ? 'Session ended' : 'Session active'}</p>
                      </div>
                      <p className="mt-2 font-mono text-xs text-slate-500">{session.admin_id}</p>
                      <p className="mt-2 text-sm text-slate-300">{session.user_agent || 'No user-agent recorded'}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Wifi className="h-3.5 w-3.5" />
                          {session.ip_address || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Start: {new Date(session.started_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    {!session.ended_at ? (
                      <button
                        onClick={() => {
                          void terminateSession(session.id);
                        }}
                        className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
                      >
                        Terminate
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-10 text-center text-slate-400">
                Belum ada admin session tercatat.
              </div>
            )}
          </div>
        ) : null}

        {tab === 'alerts' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-10 text-center text-slate-400">Memuat activity alerts...</div>
            ) : alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-300" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{alert.action.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-sm text-slate-300">{alert.detail || `${alert.target_type} :: ${alert.target_id}`}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(alert.created_at).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-5 py-10 text-center text-slate-400">
                Belum ada alert yang cocok dari audit log.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </GodModeLayout>
  );
}
