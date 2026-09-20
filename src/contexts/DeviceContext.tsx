import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  DeviceInfo,
  detectDeviceSync,
  enrichWithClientHints,
  applyUIProfileToDOM,
  resolveUIProfile,
} from '../lib/deviceIntelligence';
import { useAuth } from './useAuth';
import { DeviceContext, UserPreferences } from './device-context';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'id',
  fontScale: 1.0,
  sidebarState: 'expanded',
  density: 'normal',
};

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [device, setDevice] = useState<DeviceInfo>(() => {
    const initial = detectDeviceSync();
    applyUIProfileToDOM(initial);
    return initial;
  });
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const lastSentRef = useRef<number>(0);
  const isEnrichedRef = useRef(false);

  // Send registration non-blockingly
  const registerDevice = useCallback(
    async (currentDevice: DeviceInfo, force = false) => {
      if (typeof window === 'undefined') return;

      const now = Date.now();
      // Throttle: don't send if sent within the last 30 seconds unless forced
      if (!force && now - lastSentRef.current < 30000) {
        return;
      }

      try {
        lastSentRef.current = now;

        const payload = {
          deviceId: currentDevice.deviceId,
          deviceType: currentDevice.deviceType,
          uiProfile: currentDevice.uiProfile,
          deviceBrand: currentDevice.deviceBrand,
          deviceModel: currentDevice.deviceModel,
          osName: currentDevice.osName,
          osVersion: currentDevice.osVersion,
          browserName: currentDevice.browserName,
          browserVersion: currentDevice.browserVersion,
          platform: currentDevice.platform,
          architecture: currentDevice.architecture,
          screen: currentDevice.screen,
          viewport: currentDevice.viewport,
          input: currentDevice.input,
          orientation: currentDevice.orientation,
          pwa: currentDevice.pwa,
          language: currentDevice.language,
          timezone: currentDevice.timezone,
          userId: user?.id || null,
        };

        const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/device/register', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsRegistered(true);
        }
      } catch (err) {
        // Non-blocking, do not interrupt UI
        console.debug('[DeviceContext] Registration skipped/offline:', err);
      }
    },
    [user?.id, session?.access_token]
  );

  // Initial enrichment and registration
  useEffect(() => {
    let mounted = true;

    if (!isEnrichedRef.current) {
      isEnrichedRef.current = true;
      enrichWithClientHints(device).then((enriched) => {
        if (mounted) {
          setDevice(enriched);
          applyUIProfileToDOM(enriched);
          registerDevice(enriched, true);
        }
      });
    } else {
      registerDevice(device);
    }

    return () => {
      mounted = false;
    };
  }, [device, registerDevice]);

  // Re-register when user logs in or changes
  useEffect(() => {
    if (user?.id) {
      registerDevice(device, true);
    }
  }, [user?.id, device, registerDevice]);

  // Handle resize and orientation changes
  useEffect(() => {
    let timeoutId: number;

    const handleResizeOrOrientation = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setDevice((prev) => {
          const width = window.innerWidth || document.documentElement.clientWidth || prev.viewport.width;
          const height = window.innerHeight || document.documentElement.clientHeight || prev.viewport.height;
          const orientation: 'portrait' | 'landscape' = height > width ? 'portrait' : 'landscape';
          const uiProfile = resolveUIProfile(width, prev.input.touch, orientation);

          const updated: DeviceInfo = {
            ...prev,
            viewport: { width, height },
            orientation,
            uiProfile,
          };

          applyUIProfileToDOM(updated);
          return updated;
        });
      }, 150);
    };

    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResizeOrOrientation);
      window.removeEventListener('orientationchange', handleResizeOrOrientation);
    };
  }, []);

  // Heartbeat & visibility change
  useEffect(() => {
    const interval = window.setInterval(() => {
      registerDevice(device);
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registerDevice(device);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [device, registerDevice]);

  // Update preferences helper
  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    setPreferences((prev) => ({
      ...(prev || defaultPreferences),
      ...newPrefs,
    }));

    if (user?.id) {
      try {
        const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('loxer_local_auth_token') : null);
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newPrefs),
        });
      } catch (err) {
        console.warn('[DeviceContext] Gagal menyimpan preferences:', err);
      }
    }
  };

  const refreshDevice = () => {
    const latest = detectDeviceSync();
    setDevice(latest);
    applyUIProfileToDOM(latest);
    registerDevice(latest, true);
  };

  return (
    <DeviceContext.Provider
      value={{
        device,
        preferences,
        updatePreferences,
        refreshDevice,
        isRegistered,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}
