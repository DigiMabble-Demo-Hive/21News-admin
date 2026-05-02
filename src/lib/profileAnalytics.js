import { supabase } from './supabase';

const TABLE_NAME = 'profile_events';
const SESSION_KEY = 'profile_analytics_session_id';
const FLUSH_DELAY_MS = 1500;
const MAX_BATCH_SIZE = 20;

let queue = [];
let flushTimer = null;

const viewDedup = new Map();

const generateSessionId = () => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
};

const getSessionId = () => {
  try {
    let existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    existing = generateSessionId();
    window.sessionStorage.setItem(SESSION_KEY, existing);
    return existing;
  } catch {
    return generateSessionId();
  }
};

const scheduleFlush = () => {
  if (flushTimer || queue.length === 0) return;

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushProfileEvents();
  }, FLUSH_DELAY_MS);
};

export const trackProfileEvent = ({ profileId, eventType, sectionKey = null, metadata = {} }) => {
  if (!profileId || !eventType) return;

  const now = Date.now();

  if (eventType === 'profile_view' || eventType === 'section_view') {
    const dedupKey = `${profileId}:${eventType}:${sectionKey || ''}`;
    const previous = viewDedup.get(dedupKey);
    if (previous && now - previous < 30 * 60 * 1000) {
      return;
    }
    viewDedup.set(dedupKey, now);
  }

  queue.push({
    profile_id: String(profileId),
    event_type: eventType,
    section_key: sectionKey,
    session_id: getSessionId(),
    page_path: window.location.pathname,
    metadata,
    event_time: new Date().toISOString(),
  });

  if (queue.length >= MAX_BATCH_SIZE) {
    flushProfileEvents();
    return;
  }

  scheduleFlush();
};

export const flushProfileEvents = async () => {
  if (queue.length === 0) return;

  const payload = queue;
  queue = [];

  try {
    await supabase.from(TABLE_NAME).insert(payload);
  } catch {
    // Analytics should never interrupt user interactions.
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProfileEvents();
    }
  });
}
