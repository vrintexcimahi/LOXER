// ==============================================================================
// LOXER Simulator Session Isolation Engine
// Memastikan setiap window/iframe simulator role memiliki storage & session terisolasi
// sehingga sesi login tidak menyatu / tertimpa antar role.
// ==============================================================================

export type SimRole = 'seeker' | 'employer' | 'freelancer' | 'admin';

export interface SimRoleInfo {
  id: SimRole;
  label: string;
  email: string;
  password?: string;
  defaultPath: string;
  role: 'seeker' | 'employer' | 'admin';
}

export const SIM_ROLE_USERS: Record<SimRole, SimRoleInfo> = {
  seeker: {
    id: 'seeker',
    label: 'Budi Santoso (Seeker)',
    email: 'seeker@demo.com',
    password: 'seeker123',
    defaultPath: '/seeker/dashboard',
    role: 'seeker',
  },
  employer: {
    id: 'employer',
    label: 'PT Vrintex Solusi Teknologi (Employer)',
    email: 'employer@demo.com',
    password: 'employer123',
    defaultPath: '/employer/dashboard',
    role: 'employer',
  },
  freelancer: {
    id: 'freelancer',
    label: 'Arifin Ahmad (Penyedia Jasa)',
    email: 'arifin.ahmad@example.com',
    password: 'seeker123',
    defaultPath: '/seeker/marketplace',
    role: 'seeker',
  },
  admin: {
    id: 'admin',
    label: 'Super Admin (God Mode)',
    email: 'vrintex',
    password: 'kayaraya3+',
    defaultPath: '/admin/dashboard',
    role: 'admin',
  },
};

/**
 * Mendeteksi role simulasi aktif pada browsing context saat ini.
 * Membaca URL parameter sim_role / preview_role atau context window.name yang terisolasi.
 */
export function getActiveSimRole(): SimRole | null {
  if (typeof window === 'undefined') return null;

  try {
    const sp = new URLSearchParams(window.location.search);
    const fromQuery = sp.get('sim_role') || sp.get('session_role') || sp.get('preview_role');
    if (fromQuery && ['seeker', 'employer', 'freelancer', 'admin'].includes(fromQuery)) {
      try {
        window.name = `loxer_sim_${fromQuery}`;
      } catch {
        // ignore window.name error
      }
      return fromQuery as SimRole;
    }

    if (window.name && window.name.startsWith('loxer_sim_')) {
      const fromName = window.name.replace('loxer_sim_', '');
      if (['seeker', 'employer', 'freelancer', 'admin'].includes(fromName)) {
        return fromName as SimRole;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Mendapatkan storage key terisolasi berdasarkan simRole aktif.
 */
export function getSimStorageKeys(forcedRole?: SimRole | null): { tokenKey: string; userKey: string } {
  const role = forcedRole !== undefined ? forcedRole : getActiveSimRole();
  if (role) {
    return {
      tokenKey: `loxer_local_auth_token_${role}`,
      userKey: `loxer_local_auth_user_${role}`,
    };
  }
  return {
    tokenKey: 'loxer_local_auth_token',
    userKey: 'loxer_local_auth_user',
  };
}

/**
 * Auto-login mandiri untuk role simulasi tertentu
 */
export async function seedSimRoleSession(role: SimRole): Promise<{ token: string; user: unknown } | null> {
  if (typeof window === 'undefined') return null;
  const cfg = SIM_ROLE_USERS[role];
  if (!cfg) return null;

  const { tokenKey, userKey } = getSimStorageKeys(role);

  try {
    const res = await fetch('/api/local/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cfg.email, password: cfg.password }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data?.session?.access_token && json.data?.user) {
        localStorage.setItem(tokenKey, json.data.session.access_token);
        localStorage.setItem(userKey, JSON.stringify(json.data.user));
        if (role === 'admin') {
          try {
            sessionStorage.setItem('loxer_admin_unlocked', 'true');
            sessionStorage.setItem('app_admin_unlocked', 'true');
          } catch {
            // ignore
          }
        }
        return { token: json.data.session.access_token, user: json.data.user };
      }
    }
  } catch (err) {
    console.warn(`[simSession] Failed to seed online session for ${role}:`, err);
  }

  // Fallback offline mock session
  const mockUser = {
    id: `sim-user-${role}`,
    email: cfg.email === 'vrintex' ? 'vrintex@loxer.app' : cfg.email,
    user_metadata: { role: cfg.role, full_name: cfg.label },
    role: cfg.role,
    created_at: new Date().toISOString(),
  };
  const mockToken = `local-sim-token-${role}-${Date.now()}`;
  localStorage.setItem(tokenKey, mockToken);
  localStorage.setItem(userKey, JSON.stringify(mockUser));
  return { token: mockToken, user: mockUser };
}

/**
 * Reset / logout hanya untuk role simulasi tertentu tanpa mengganggu sesi role lain
 */
export function clearSimRoleSession(role: SimRole): void {
  if (typeof window === 'undefined') return;
  const { tokenKey, userKey } = getSimStorageKeys(role);
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);

  // Dispatch custom event for real-time memory cleanup
  window.dispatchEvent(
    new CustomEvent('loxer:sim-session-cleared', {
      detail: { role },
    })
  );
}

/**
 * Pembersihan atomik seluruh token dan sesi simulasi untuk mencegah kebocoran residual data profil
 */
export function clearAllSimSessions(): void {
  if (typeof window === 'undefined') return;
  const roles: SimRole[] = ['seeker', 'employer', 'freelancer', 'admin'];
  for (const role of roles) {
    const { tokenKey, userKey } = getSimStorageKeys(role);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }
  window.dispatchEvent(new CustomEvent('loxer:sim-session-cleared', { detail: { role: 'all' } }));
}

/**
 * Beralih antar role simulasi secara atomik dengan pembersihan state residual
 */
export async function switchSimRole(newRole: SimRole | null): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!newRole) {
    // Kembali ke sesi live utama
    try {
      window.name = '';
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('loxer:sim-session-cleared', { detail: { role: 'exit' } }));
    return;
  }

  try {
    window.name = `loxer_sim_${newRole}`;
  } catch {
    // ignore
  }

  await seedSimRoleSession(newRole);
  window.dispatchEvent(
    new CustomEvent('loxer:sim-session-switched', {
      detail: { role: newRole },
    })
  );
}
