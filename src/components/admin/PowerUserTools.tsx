import { Download, Eye, ShieldBan, Trash2, UserCheck, X } from 'lucide-react';
import { useState } from 'react';

interface BulkActionBarProps {
  selectedIds: string[];
  entityLabel?: string;
  onAction: (action: string, ids: string[]) => Promise<void>;
  onClear: () => void;
}

interface UserTimelineEvent {
  id: string;
  action: string;
  detail?: string;
  created_at: string;
}

interface UserTimelineProps {
  events: UserTimelineEvent[];
}

interface ImpersonateButtonProps {
  targetUserId: string;
  targetEmail: string;
  onImpersonate: (userId: string) => void;
}

const BULK_ACTIONS = [
  { key: 'activate', label: 'Aktifkan', icon: UserCheck, tone: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100', confirm: false },
  { key: 'suspend', label: 'Suspend', icon: ShieldBan, tone: 'border-amber-400/20 bg-amber-500/10 text-amber-100', confirm: true },
  { key: 'delete', label: 'Hapus', icon: Trash2, tone: 'border-rose-400/20 bg-rose-500/10 text-rose-100', confirm: true },
  { key: 'export_csv', label: 'Export CSV', icon: Download, tone: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100', confirm: false },
];

export function BulkActionBar({ selectedIds, entityLabel = 'item', onAction, onClear }: BulkActionBarProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  if (!selectedIds.length) return null;

  async function handleAction(actionKey: string, requiresConfirm: boolean) {
    if (requiresConfirm && !window.confirm(`${actionKey} ${selectedIds.length} ${entityLabel}?`)) return;
    setBusyAction(actionKey);
    await onAction(actionKey, selectedIds);
    setBusyAction(null);
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/95 px-5 py-3 shadow-2xl shadow-cyan-950/40 backdrop-blur">
      <div className="text-sm text-white">
        <span className="font-semibold">{selectedIds.length}</span> {entityLabel} dipilih
      </div>
      <div className="h-5 w-px bg-white/10" />
      <div className="flex items-center gap-2">
        {BULK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => {
                void handleAction(action.key, action.confirm);
              }}
              disabled={busyAction === action.key}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${action.tone} disabled:opacity-60`}
            >
              <Icon className="h-4 w-4" />
              {busyAction === action.key ? '...' : action.label}
            </button>
          );
        })}
      </div>
      <button onClick={onClear} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function UserTimeline({ events }: UserTimelineProps) {
  if (!events.length) {
    return <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-8 text-center text-sm text-slate-400">Tidak ada aktivitas tercatat.</div>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
          <p className="text-sm font-medium text-white">{event.action.replace(/_/g, ' ')}</p>
          {event.detail ? <p className="mt-1 text-sm text-slate-300">{event.detail}</p> : null}
          <p className="mt-2 text-xs text-slate-500">{new Date(event.created_at).toLocaleString('id-ID')}</p>
        </div>
      ))}
    </div>
  );
}

export function ImpersonateButton({ targetUserId, targetEmail, onImpersonate }: ImpersonateButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Impersonate ${targetEmail}?`)) return;
    setBusy(true);
    onImpersonate(targetUserId);
    setBusy(false);
  }

  return (
    <button
      onClick={() => {
        void handleClick();
      }}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-100 hover:bg-orange-500/20 disabled:opacity-60"
    >
      <Eye className="h-4 w-4" />
      {busy ? '...' : 'Impersonate'}
    </button>
  );
}
