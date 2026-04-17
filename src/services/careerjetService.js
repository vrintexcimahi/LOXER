function buildProxyQuery(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

async function parseProxyPayload(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function fetchCareerjetJobs(params = {}) {
  const query = buildProxyQuery({
    ...params,
    sort: params.sort || 'date',
    user_agent:
      typeof navigator === 'undefined'
        ? ''
        : navigator.userAgent,
  });

  const response = await fetch(`/api/jobs?${query}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await parseProxyPayload(response);

  if (!response.ok) {
    throw new Error(payload.message || 'Gagal memuat data lowongan dari server LOXER.');
  }

  return payload;
}
