const API_PATH = '/api/admin-featured-content';

const buildUrl = () => {
  const base = import.meta.env.VITE_ADMIN_API_BASE_URL?.trim();
  return base ? new URL(API_PATH, base).toString() : API_PATH;
};

const call = async (body) => {
  const res = await fetch(buildUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.error) throw new Error(payload?.error || `Request failed ${res.status}`);
  return payload;
};

export const listFeaturedContent   = ()          => call({ action: 'list' });
export const createFeaturedContent = (data)      => call({ action: 'create', data });
export const updateFeaturedContent = (id, data)  => call({ action: 'update', id, data });
export const deleteFeaturedContent = (id)        => call({ action: 'delete', id });
