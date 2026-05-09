import { useState, useEffect, useCallback } from 'react';
import ToastContainer, { useToast } from '../components/Toast';
import FeaturedImageUpload from '../components/FeaturedImageUpload';
import {
  listFeaturedContent,
  createFeaturedContent,
  updateFeaturedContent,
  deleteFeaturedContent,
} from '../lib/featuredContentApi';
import './FeaturedContent.css';

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  title: '',
  content_type: 'Interview',
  summary: '',
  date: '',
  image_url: '',
  link_url: '',
  link_text: '',
  tags: '',
  entity_id: '',
  is_hidden: false,
};

const formatDate = (str) => {
  if (!str) return null;
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ── Card image with clickable overlay ── */
const CardImage = ({ src, alt, onClick }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="fca-card-img-wrap" onClick={onClick} title="Click to change image">
      {src && !err ? (
        <img src={src} alt={alt} className="fca-card-img" onError={() => setErr(true)} />
      ) : (
        <div className="fca-card-img-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>No image · click to upload</span>
        </div>
      )}
      <div className="fca-card-img-overlay">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Change Image
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   Form Drawer
══════════════════════════════════════════ */
const FormDrawer = ({ open, item, onClose, onSave, saving }) => {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    setForm(item ? {
      title:        item.title        || '',
      content_type: item.content_type || 'Interview',
      summary:      item.summary      || '',
      date:         item.date         || '',
      image_url:    item.image_url    || '',
      link_url:     item.link_url     || '',
      link_text:    item.link_text    || '',
      tags:         item.tags         || '',
      entity_id:    item.entity_id    || '',
      is_hidden:    item.is_hidden    ?? false,
    } : EMPTY_FORM);
  }, [item, open]);

  const set   = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const field = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <>
      {open && <div className="fca-overlay" onClick={onClose} />}
      <div className={`fca-drawer${open ? ' fca-drawer--open' : ''}`}>

        <div className="fca-drawer-header">
          <h2>{item ? 'Edit Entry' : 'New Featured Entry'}</h2>
          <button className="fca-drawer-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="fca-drawer-body" onSubmit={handleSubmit}>

          {/* Image picker */}
          <div className="fca-field">
            <label>Featured Image <span className="fca-hint">(16:9 recommended)</span></label>
            <div className="fca-img-picker" onClick={() => setImgOpen(true)}>
              {form.image_url ? (
                <>
                  <img src={form.image_url} alt="preview" className="fca-img-picker-img"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="fca-img-picker-overlay">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Change Image
                  </div>
                </>
              ) : (
                <div className="fca-img-picker-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="fca-img-picker-title">Click to upload image</span>
                  <span className="fca-img-picker-hint">JPG · PNG · WebP · Max 8 MB · 16:9 crop</span>
                </div>
              )}
            </div>
          </div>

          <div className="fca-field">
            <label>Title <span className="fca-required">*</span></label>
            <input type="text" placeholder="e.g. Bill Gates on Microsoft @ 50" required {...field('title')} />
          </div>

          <div className="fca-field-row">
            <div className="fca-field">
              <label>Content Type</label>
              <input type="text" placeholder="Interview" {...field('content_type')} />
            </div>
            <div className="fca-field">
              <label>Date</label>
              <input type="date" {...field('date')} />
            </div>
          </div>

          <div className="fca-field">
            <label>Summary</label>
            <textarea rows={4} placeholder="Short description shown on the card…" {...field('summary')} />
          </div>

          <div className="fca-field-row">
            <div className="fca-field">
              <label>Link URL</label>
              <input type="url" placeholder="https://youtube.com/…" {...field('link_url')} />
            </div>
            <div className="fca-field">
              <label>Button Text</label>
              <input type="text" placeholder="Watch Full Interview" {...field('link_text')} />
            </div>
          </div>

          <div className="fca-field">
            <label>Tags <span className="fca-hint">(comma separated)</span></label>
            <input type="text" placeholder="Technology, AI, Leadership" {...field('tags')} />
          </div>

          <div className="fca-field">
            <label>Entity ID <span className="fca-hint">(optional — links "View Authority Profile")</span></label>
            <input type="text" placeholder="user_id or entity slug" {...field('entity_id')} />
          </div>

          <div className="fca-field fca-field--toggle">
            <label>Hide from site</label>
            <button
              type="button"
              className={`fca-toggle${form.is_hidden ? ' fca-toggle--on' : ''}`}
              onClick={() => set('is_hidden', !form.is_hidden)}
              aria-pressed={form.is_hidden}
            >
              <span className="fca-toggle-knob" />
            </button>
            <span className="fca-toggle-label">{form.is_hidden ? 'Hidden' : 'Visible'}</span>
          </div>

          <div className="fca-drawer-footer">
            <button type="button" className="fca-btn fca-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="fca-btn fca-btn--primary" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : item ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>

        {/* Image upload modal — sits inside drawer context */}
        <FeaturedImageUpload
          isOpen={imgOpen && open}
          onClose={() => setImgOpen(false)}
          currentUrl={form.image_url}
          onSave={(url) => { set('image_url', url); setImgOpen(false); }}
        />
      </div>
    </>
  );
};

/* ══════════════════════════════════════════
   Featured Content Admin Page
══════════════════════════════════════════ */
const FeaturedContent = () => {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [confirmId, setConfirmId]   = useState(null);
  const [page, setPage]             = useState(0);
  const [imgEditItem, setImgEditItem] = useState(null);
  const { toasts, toast, dismiss }  = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFeaturedContent();
      if (result.tableNotFound) { setTableReady(false); setItems([]); }
      else { setTableReady(true); setItems(result.data || []); }
    } catch (err) {
      toast(`Failed to load: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate  = () => { setEditItem(null); setDrawerOpen(true); };
  const openEdit    = (item) => { setEditItem(item); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setEditItem(null); };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editItem) {
        const { data } = await updateFeaturedContent(editItem.id, formData);
        setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, ...data } : i)));
        toast('Entry updated', 'success');
      } else {
        const { data } = await createFeaturedContent(formData);
        setItems((prev) => [data, ...prev]);
        setPage(0);
        toast('Entry created', 'success');
      }
      closeDrawer();
    } catch (err) {
      toast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteFeaturedContent(id);
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        const maxPage = Math.max(0, Math.ceil(next.length / PAGE_SIZE) - 1);
        if (page > maxPage) setPage(maxPage);
        return next;
      });
      toast('Entry deleted', 'info');
    } catch (err) {
      toast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const handleToggleHidden = async (item) => {
    const newVal = !item.is_hidden;
    try {
      await updateFeaturedContent(item.id, { is_hidden: newVal });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_hidden: newVal } : i)));
      toast(newVal ? 'Entry hidden from site' : 'Entry now visible on site', 'success');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleCardImageSaved = async (url) => {
    if (!imgEditItem) return;
    try {
      await updateFeaturedContent(imgEditItem.id, { image_url: url });
      setItems((prev) => prev.map((i) => (i.id === imgEditItem.id ? { ...i, image_url: url } : i)));
      toast('Image updated', 'success');
    } catch (err) {
      toast(`Failed: ${err.message}`, 'error');
    } finally {
      setImgEditItem(null);
    }
  };

  const liveId     = items.find((i) => !i.is_hidden)?.id;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems  = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="fca-page">

      {/* ── Header ── */}
      <div className="fca-header">
        <div className="fca-header-inner">
          <div>
            <h1>Featured Interviews &amp; Insights</h1>
            <p>Manage the featured carousel shown on the 21 News home page. The newest visible entry is displayed live.</p>
          </div>
          <button className="fca-btn fca-btn--primary fca-btn--lg" onClick={openCreate}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Entry
          </button>
        </div>
      </div>

      {/* ── Setup banner ── */}
      {!tableReady && (
        <div className="fca-setup-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Database table not found.</strong> Run the following SQL in your{' '}
            <a href="https://supabase.com/dashboard/project/xwowiwznmqqnlnrhpwke/sql/new" target="_blank" rel="noopener noreferrer">
              Supabase SQL editor
            </a>{' '}
            to create the <code>featured_content</code> table, then refresh.
            <pre className="fca-setup-sql">{`CREATE TABLE IF NOT EXISTS featured_content (
  id           bigserial PRIMARY KEY,
  title        text NOT NULL,
  content_type text,
  summary      text,
  date         date,
  image_url    text,
  link_url     text,
  link_text    text,
  tags         text,
  entity_id    text,
  is_hidden    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);`}</pre>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="fca-body">
        {loading ? (
          <div className="fca-empty">
            <div className="fca-spinner-lg" />
            <p>Loading entries…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="fca-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <p>No featured entries yet.</p>
            <button className="fca-btn fca-btn--primary fca-btn--lg" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create your first entry
            </button>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="fca-stats">
              <span className="fca-stat">
                <span className="fca-stat-num">{items.length}</span> total
              </span>
              <span className="fca-stat-div" />
              <span className="fca-stat">
                <span className="fca-stat-num fca-stat-num--green">{items.filter((i) => !i.is_hidden).length}</span> visible
              </span>
              <span className="fca-stat-div" />
              <span className="fca-stat">
                <span className="fca-stat-num fca-stat-num--gray">{items.filter((i) => i.is_hidden).length}</span> hidden
              </span>
            </div>

            {/* Card grid */}
            <div className="fca-grid">
              {pageItems.map((item) => {
                const isLive = item.id === liveId;
                const tags   = item.tags ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                const fd     = formatDate(item.date);

                return (
                  <div
                    key={item.id}
                    className={`fca-card${item.is_hidden ? ' fca-card--hidden' : ''}${isLive ? ' fca-card--live' : ''}`}
                  >
                    {/* Live ribbon */}
                    {isLive && (
                      <span className="fca-live-ribbon">
                        <span className="fca-live-dot" />Live on site
                      </span>
                    )}

                    {/* 16:9 Image */}
                    <CardImage
                      src={item.image_url}
                      alt={item.title}
                      onClick={() => setImgEditItem(item)}
                    />

                    {/* Card body */}
                    <div className="fca-card-body">
                      <div className="fca-card-top">
                        {item.content_type && <span className="fca-type-pill">{item.content_type}</span>}
                        {item.is_hidden
                          ? <span className="fca-badge fca-badge--hidden">Hidden</span>
                          : isLive
                            ? <span className="fca-badge fca-badge--live">Showing on site</span>
                            : <span className="fca-badge fca-badge--queued">Queued</span>
                        }
                      </div>

                      <h3 className="fca-card-title">{item.title}</h3>

                      {item.summary && (
                        <p className="fca-card-summary">{item.summary}</p>
                      )}

                      <div className="fca-card-meta">
                        {fd && (
                          <span className="fca-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            {fd}
                          </span>
                        )}
                        {item.link_url && (
                          <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="fca-meta-item fca-meta-link">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            View link
                          </a>
                        )}
                      </div>

                      {tags.length > 0 && (
                        <div className="fca-card-tags">
                          {tags.slice(0, 4).map((t) => <span key={t} className="fca-tag">{t}</span>)}
                          {tags.length > 4 && <span className="fca-tag fca-tag--more">+{tags.length - 4}</span>}
                        </div>
                      )}
                    </div>

                    {/* Big action buttons */}
                    <div className="fca-card-actions">
                      <button
                        className={`fca-action-btn${item.is_hidden ? ' fca-action-btn--show' : ' fca-action-btn--hide'}`}
                        onClick={() => handleToggleHidden(item)}
                      >
                        {item.is_hidden ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                        {item.is_hidden ? 'Show' : 'Hide'}
                      </button>

                      <button className="fca-action-btn fca-action-btn--edit" onClick={() => openEdit(item)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>

                      {confirmId === item.id ? (
                        <div className="fca-confirm">
                          <span>Sure?</span>
                          <button className="fca-confirm-yes" onClick={() => handleDelete(item.id)}>Yes</button>
                          <button className="fca-confirm-no" onClick={() => setConfirmId(null)}>No</button>
                        </div>
                      ) : (
                        <button className="fca-action-btn fca-action-btn--delete" onClick={() => setConfirmId(item.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="fca-pagination">
                <button
                  className="fca-page-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Prev
                </button>

                <div className="fca-page-dots">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`fca-page-dot${i === page ? ' fca-page-dot--active' : ''}`}
                      onClick={() => setPage(i)}
                      aria-label={`Page ${i + 1}`}
                    />
                  ))}
                </div>

                <span className="fca-page-info">
                  Page {page + 1} of {totalPages} &nbsp;·&nbsp; {items.length} entries
                </span>

                <button
                  className="fca-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      <FormDrawer
        open={drawerOpen}
        item={editItem}
        onClose={closeDrawer}
        onSave={handleSave}
        saving={saving}
      />

      {/* Card-level quick image swap */}
      <FeaturedImageUpload
        isOpen={!!imgEditItem}
        onClose={() => setImgEditItem(null)}
        currentUrl={imgEditItem?.image_url}
        onSave={handleCardImageSaved}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default FeaturedContent;
