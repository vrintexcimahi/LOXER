/**
 * Google Identity Services (GIS) & OAuth 2.0 Client for LOXER
 * Docs: https://developers.google.com/identity/gsi/web/guides/overview
 */

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
        id: {
          initialize: (config: { client_id: string; callback: (res: unknown) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function getGoogleClientId(): string {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    import.meta.env.GOOGLE_CLIENT_ID ||
    ''
  ).trim();
}

export function hasGoogleClientId(): boolean {
  return Boolean(getGoogleClientId());
}

/**
 * Triggers native Google OAuth 2.0 popup using Google Identity Services (GIS)
 */
export function triggerNativeGoogleOAuth(
  onSuccess: (profile: GoogleUserProfile) => void,
  onError: (error: Error) => void
): boolean {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return false;
  }

  if (!window.google?.accounts?.oauth2) {
    onError(new Error('Google Identity Services SDK sedang dimuat. Silakan coba lagi dalam beberapa detik.'));
    return false;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          onError(new Error(tokenResponse.error_description || tokenResponse.error || 'Autentikasi Google dibatalkan'));
          return;
        }

        if (!tokenResponse.access_token) {
          onError(new Error('Gagal menerima access token dari Google'));
          return;
        }

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
              Accept: 'application/json',
            },
          });

          if (!res.ok) {
            throw new Error(`Google API error (${res.status})`);
          }

          const userInfo = await res.json();
          onSuccess({
            email: userInfo.email,
            name: userInfo.name || userInfo.email.split('@')[0],
            picture: userInfo.picture,
            sub: userInfo.sub,
          });
        } catch (fetchErr) {
          onError(fetchErr instanceof Error ? fetchErr : new Error('Gagal mengambil data profil Google'));
        }
      },
    });

    tokenClient.requestAccessToken();
    return true;
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Gagal membuka popup Google OAuth'));
    return false;
  }
}
