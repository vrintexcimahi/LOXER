import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Laptop,
  LogOut,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { formatRelativeTime } from '../../lib/adminUtils';
import { useDevice } from '../../contexts/useDevice';
import { useAuth } from '../../contexts/useAuth';

interface UserDeviceItem {
  id: string;
  device_id: string;
  device_type: string;
  ui_profile: string;
  device_model: string | null;
  os_name: string | null;
  browser_name: string | null;
  last_ip: string | null;
  last_seen_at: string;
  pwa: number;
}

export default function MyDevicesSection() {
  const { device } = useDevice();
  const { user } = useAuth();
  const [devices, setDevices] = useState<UserDeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('loxer_local_auth_token');
      const res = await fetch('/api/user/devices', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('[MyDevicesSection] Gagal memuat perangkat:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevoke = async (deviceId: string) => {
    setRevoking(true);
    try {
      const token = localStorage.getItem('loxer_local_auth_token');
      const res = await fetch('/api/user/devices/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deviceId }),
      });

      if (res.ok) {
        setConfirmRevokeId(null);
        await loadDevices();
      }
    } catch (err) {
      console.error('[MyDevicesSection] Gagal mencabut perangkat:', err);
    } finally {
      setRevoking(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'mobile') return <Smartphone className="h-5 w-5 text-cyan-400" />;
    if (type === 'tablet') return <Tablet className="h-5 w-5 text-purple-400" />;
    if (type === 'desktop-touch') return <Laptop className="h-5 w-5 text-emerald-400" />;
    if (type === 'desktop') return <Monitor className="h-5 w-5 text-blue-400" />;
    return <Globe className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            Perangkat Saya
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar perangkat yang saat ini masuk ke akun Anda. Anda dapat mencabut akses perangkat yang tidak dikenal.
          </p>
        </div>
        <button
          onClick={() => loadDevices()}
          disabled={loading}
          className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white disabled:opacity-50"
          title="Segarkan daftar perangkat"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">Memuat data perangkat...</div>
      ) : devices.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">Belum ada perangkat lain yang tercatat.</div>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => {
            const isThisDevice = d.device_id === device.deviceId;
            return (
              <div
                key={d.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-4 transition-colors ${
                  isThisDevice
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : 'border-white/5 bg-slate-950/60 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="mt-0.5 sm:mt-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-white/10">
                    {getDeviceIcon(d.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {d.device_model || (d.device_type === 'mobile' ? 'Smartphone' : d.device_type === 'desktop' ? 'Komputer Desktop' : d.device_type)}
                      </span>
                      {isThisDevice && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                          Perangkat Ini
                        </span>
                      )}
                      {d.pwa === 1 && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          PWA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {d.os_name || 'OS'} • {d.browser_name || 'Browser'}
                      <span className="mx-1.5 text-slate-600">|</span>
                      <span>Terakhir aktif: {isThisDevice ? 'Sekarang' : formatRelativeTime(d.last_seen_at)}</span>
                    </div>
                  </div>
                </div>

                {!isThisDevice && (
                  <button
                    onClick={() => setConfirmRevokeId(d.device_id)}
                    className="self-end sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout Perangkat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal / Bottom Sheet */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-red-500/30 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fade-up">
            <div className="sm:hidden flex justify-center pb-1">
              <div className="bottom-sheet-handle" />
            </div>
            <h4 className="text-base font-bold text-white">Logout dari Perangkat Ini?</h4>
            <p className="text-xs text-slate-300">
              Sesi pada perangkat tersebut akan dihentikan dan user harus melakukan login ulang.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmRevokeId(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                Batal
              </button>
              <button
                onClick={() => handleRevoke(confirmRevokeId)}
                disabled={revoking}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {revoking ? 'Memproses...' : 'Ya, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
