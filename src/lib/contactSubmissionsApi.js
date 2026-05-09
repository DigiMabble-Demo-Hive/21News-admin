const API_PATH = '/api/admin-contact-submissions';

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

export const listContactSubmissions   = ()                  => call({ action: 'list' });
export const updateSubmissionStatus   = (id, status)        => call({ action: 'update_status', id, data: { status } });
export const deleteContactSubmission  = (id)                => call({ action: 'delete', id });
