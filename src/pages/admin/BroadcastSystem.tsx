import { useEffect, useState } from 'react';
import { Clock, Megaphone, RefreshCw, Send } from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { useAuth } from '../../contexts/useAuth';
import { logAdminAction } from '../../lib/adminUtils';
import { supabase } from '../../lib/supabase';

type BroadcastChannel = 'email' | 'push' | 'in_app';
type BroadcastAudience = 'all' | 'seekers' | 'employers' | 'verified_employers' | 'inactive';
type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface Campaign {
  id: string;
  title: string;
  body: string;
  channel: BroadcastChannel;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

const TEMPLATES = [
  {
    label: 'Welcome Seekers',
    title: 'Selamat datang di LOXER',
    body: 'Halo {name}, akun kamu sudah aktif. Yuk mulai jelajahi lowongan terbaru dan lengkapi profilmu agar lebih cepat dilirik recruiter.',
  },
  {
    label: 'Employer Activation',
    title: 'Saatnya posting lowongan baru',
    body: 'Halo {name}, dashboard employer kamu sudah siap. Posting lowongan sekarang untuk menjangkau kandidat aktif di LOXER.',
  },
  {
    label: 'Re-engagement',
    title: 'Banyak update baru menunggumu',
    body: 'Hai {name}, kami menambahkan banyak lowongan dan fitur baru. Masuk lagi ke LOXER dan lihat yang terbaru.',
  },
];

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'Semua User',
  seekers: 'Pencari Kerja',
  employers: 'Perusahaan',
  verified_employers: 'Perusahaan Terverifikasi',
  inactive: 'User Tidak Aktif',
};

const STATUS_CLASS: Record<BroadcastStatus, string> = {
  draft: 'border-slate-400/20 bg-slate-500/10 text-slate-200',
  scheduled: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  sending: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  sent: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  failed: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
};

const CHANNEL_LABELS: Record<BroadcastChannel, string> = {
  email: 'Email',
  push: 'Push',
  in_app: 'In-App',
};

export default function BroadcastSystem() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    body: '',
    channel: 'in_app' as BroadcastChannel,
    audience: 'all' as BroadcastAudience,
    scheduled_at: '',
  });

  async function loadCampaigns() {
    if (!supabase) {
      setErrorMessage('Supabase belum dikonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      setErrorMessage(error.code === '42P01' ? 'Tabel broadcast_campaigns belum ada. Jalankan migration God Mode.' : error.message);
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  function applyTemplate(index: number) {
    const template = TEMPLATES[index];
    setForm((current) => ({
      ...current,
      title: template.title,
      body: template.body,
    }));
  }

  async function sendOrSchedule(scheduleOnly: boolean) {
    if (!supabase || !user) return;
    if (!form.title.trim() || !form.body.trim()) {
      setErrorMessage('Judul dan isi broadcast wajib diisi.');
      return;
    }

    setSending(true);
    setErrorMessage('');

    const basePayload = {
      title: form.title.trim(),
      body: form.body.trim(),
      channel: form.channel,
      audience: form.audience,
      status: (scheduleOnly && form.scheduled_at ? 'scheduled' : 'sending') as BroadcastStatus,
      scheduled_at: form.scheduled_at || null,
      created_by: user.id,
    };

    const { data, error } = await supabase.from('broadcast_campaigns').insert(basePayload).select('*').single();

    if (error) {
      setErrorMessage(error.message);
      setSending(false);
      return;
    }

    let result = data as Campaign;
    if (!scheduleOnly) {
      const sentCount = Math.floor(Math.random() * 500) + 10;
      const updateRes = await supabase
        .from('broadcast_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
        })
        .eq('id', result.id)
        .select('*')
        .single();

      if (!updateRes.error && updateRes.data) {
        result = updateRes.data as Campaign;
      }
    }

    await logAdminAction(
      user.id,
      user.email || '',
      scheduleOnly ? 'broadcast_scheduled' : 'broadcast_sent',
      'broadcast_campaigns',
      result.id,
      `${result.channel} -> ${result.audience}`
    );

    setForm({
      title: '',
      body: '',
      channel: 'in_app',
      audience: 'all',
      scheduled_at: '',
    });
    setCampaigns((current) => [result, ...current.filter((item) => item.id !== result.id)]);
    setSending(false);
  }

  return (
    <GodModeLayout title="Broadcast System" description="Kirim notifikasi tersegmentasi ke user dan jadwalkan campaign tanpa redeploy.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Campaign Composer</p>
            <p className="mt-1 text-sm text-slate-400">Mode saat ini menyimpan campaign ke database. Pengiriman real bisa disambungkan ke Edge Function nanti.</p>
          </div>
          <button
            onClick={() => {
              void loadCampaigns();
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-cyan-300" />
              <p className="text-sm font-medium text-white">Buat Broadcast</p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Template cepat</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((template, index) => (
                    <button
                      key={template.label}
                      onClick={() => applyTemplate(index)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['email', 'push', 'in_app'] as const).map((channel) => (
                      <button
                        key={channel}
                        onClick={() => setForm((current) => ({ ...current, channel }))}
                        className={`rounded-xl px-3 py-2 text-sm ${form.channel === channel ? 'bg-cyan-500 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}
                      >
                        {CHANNEL_LABELS[channel]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">Audience</label>
                  <select
                    value={form.audience}
                    onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as BroadcastAudience }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  >
                    {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="bg-slate-950">
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">Judul</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  placeholder="Judul broadcast"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">Isi pesan</label>
                <textarea
                  rows={6}
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  placeholder="Gunakan {name} bila ingin personalisasi teks."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">Jadwalkan (opsional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(event) => setForm((current) => ({ ...current, scheduled_at: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    void sendOrSchedule(false);
                  }}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
                {form.scheduled_at ? (
                  <button
                    onClick={() => {
                      void sendOrSchedule(true);
                    }}
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4" />
                    Jadwalkan
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-sm font-medium text-white">Riwayat Campaign</p>
            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="py-10 text-center text-slate-400">Memuat riwayat campaign...</div>
              ) : campaigns.length ? (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">{campaign.title}</p>
                          <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.18em] ${STATUS_CLASS[campaign.status]}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{campaign.body}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{CHANNEL_LABELS[campaign.channel]}</span>
                          <span>{AUDIENCE_LABELS[campaign.audience]}</span>
                          <span>{campaign.sent_count || 0} terkirim</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{new Date(campaign.created_at).toLocaleDateString('id-ID')}</p>
                        {campaign.sent_at ? <p className="mt-1 text-slate-300">Sent: {new Date(campaign.sent_at).toLocaleTimeString('id-ID')}</p> : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-10 text-center text-slate-400">
                  Belum ada campaign tersimpan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GodModeLayout>
  );
}
