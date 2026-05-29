import { supabase } from './supabase';

const API_PATH = '/api/blog';

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

export const generateSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const checkSlugUnique = async (slug, excludeId = null) => {
  const { unique } = await call({ action: 'slug-check', slug, excludeId });
  return unique;
};

export const listBlogPosts = async () => {
  const { data } = await call({ action: 'list' });
  return data || [];
};

export const getBlogPost = async (id) => {
  const { data } = await call({ action: 'get', id });
  return data;
};

export const createBlogPost = async (postData) => {
  const { data } = await call({ action: 'create', data: postData });
  return data;
};

export const updateBlogPost = async (id, postData) => {
  const { data } = await call({ action: 'update', id, data: postData });
  return data;
};

export const deleteBlogPost = async (id) => {
  await call({ action: 'delete', id });
};

/* Image upload still goes directly — reads only need anon key + storage is public */
export const uploadBlogImage = async (blob) => {
  const fileName = `blog/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, blob, { upsert: false, contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
  return publicUrl;
};
