const CACHE_TTL_MS = 10 * 60 * 1000;

let capabilitiesCache = {
  value: null,
  fetchedAt: 0,
};

function getSupabaseConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  try {
    return {
      ok: response.ok,
      status: response.status,
      data: text ? JSON.parse(text) : null,
    };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: text || null,
    };
  }
}

async function probeOtpCapability(baseUrl, anonKey, payload) {
  const result = await fetchJson(`${baseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const errorCode =
    typeof result.data === 'object' && result.data && typeof result.data.error_code === 'string'
      ? result.data.error_code
      : '';

  return {
    enabled: errorCode !== 'otp_disabled',
    status: result.status,
    errorCode: errorCode || '',
  };
}

async function loadCapabilities() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return {
      configured: false,
      googleEnabled: false,
      emailAuthEnabled: false,
      phoneAuthEnabled: false,
      emailOtpEnabled: false,
      smsOtpEnabled: false,
      mailerAutoconfirm: false,
      smsProvider: '',
      fetchedAt: new Date().toISOString(),
    };
  }

  const settingsResult = await fetchJson(`${url}/auth/v1/settings`, {
    headers: {
      apikey: anonKey,
    },
  });

  const settings = typeof settingsResult.data === 'object' && settingsResult.data ? settingsResult.data : {};
  const external = typeof settings.external === 'object' && settings.external ? settings.external : {};

  const [emailOtpProbe, smsOtpProbe] = await Promise.all([
    probeOtpCapability(url, anonKey, {
      email: 'nobody@example.invalid',
      create_user: false,
    }),
    probeOtpCapability(url, anonKey, {
      phone: '+6281234567890',
      create_user: false,
      channel: 'sms',
    }),
  ]);

  return {
    configured: true,
    googleEnabled: Boolean(external.google),
    emailAuthEnabled: Boolean(external.email),
    phoneAuthEnabled: Boolean(external.phone),
    emailOtpEnabled: emailOtpProbe.enabled,
    smsOtpEnabled: Boolean(external.phone) && smsOtpProbe.enabled,
    mailerAutoconfirm: Boolean(settings.mailer_autoconfirm),
    smsProvider: typeof settings.sms_provider === 'string' ? settings.sms_provider : '',
    probes: {
      emailOtp: emailOtpProbe,
      smsOtp: smsOtpProbe,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(_req, res) {
  try {
    const isFresh = capabilitiesCache.value && Date.now() - capabilitiesCache.fetchedAt < CACHE_TTL_MS;
    if (!isFresh) {
      const value = await loadCapabilities();
      capabilitiesCache = {
        value,
        fetchedAt: Date.now(),
      };
    }

    res.status(200).json(capabilitiesCache.value);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Gagal memuat auth capabilities',
    });
  }
}
