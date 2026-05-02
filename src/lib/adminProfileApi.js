const ADMIN_UPDATE_PATH = '/api/admin-update-profile';

const buildAdminApiUrl = () => {
  const baseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL?.trim();

  if (!baseUrl) {
    return ADMIN_UPDATE_PATH;
  }

  return new URL(ADMIN_UPDATE_PATH, baseUrl).toString();
};

const extractErrorMessage = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json();
    if (payload?.error) return payload.error;
    return `Request failed with status ${response.status}`;
  }

  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
};

export const updateAdminProfile = async ({ userId, updateData, table }) => {
  const response = await fetch(buildAdminApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, updateData, table }),
  });

  if (!response.ok) {
    const message = response.status === 404
      ? 'Admin update API not available in this environment. Start a host that serves /api or set VITE_ADMIN_API_BASE_URL.'
      : await extractErrorMessage(response);

    throw new Error(message);
  }

  const payload = await response.json();

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload;
};

export { buildAdminApiUrl };
