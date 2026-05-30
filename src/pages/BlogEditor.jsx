import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBlogPost, createBlogPost, updateBlogPost, generateSlug, checkSlugUnique,
} from '../lib/blogApi';
import { generateBlogJsonLd } from '../utils/blogJsonLdGenerator';
import { calcAiReadiness, readinessColor, readinessLabel } from '../utils/aiReadinessScore';
import TipTapEditor from '../components/blog/TipTapEditor';
import BlogImageUpload from '../components/blog/BlogImageUpload';
import ToastContainer, { useToast } from '../components/Toast';
import './BlogEditor.css';

const TABS = [
  { id: 'content',         label: 'Content' },
  { id: 'media',           label: 'Media' },
  { id: 'seo',             label: 'SEO' },
  { id: 'structured-data', label: 'Structured Data' },
  { id: 'ai',              label: 'AI Optimization' },
  { id: 'analytics',       label: 'Analytics' },
  { id: 'publishing',      label: 'Publishing' },
];

const BLANK_POST = {
  title: '', slug: '', content: '', excerpt: '',
  featured_image_url: '', featured_image_alt: '',
  meta_title: '', meta_description: '', focus_keyword: '',
  json_ld: null, status: 'draft', canonical_url: '',
  scheduled_publish_at: null, published_at: null,
  author: '', ai_readiness_score: 0,
  detected_entities: [], faq_pairs: [],
};

const BlogEditor = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew    = !id;

  const [post, setPost]                     = useState(BLANK_POST);
  const [activeTab, setActiveTab]           = useState('content');
  const [loading, setLoading]               = useState(!isNew);
  const [saving, setSaving]                 = useState(false);
  const [saveStatus, setSaveStatus]         = useState('');
  const [slugWarning, setSlugWarning]       = useState('');
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [aiFaqLoading, setAiFaqLoading]     = useState(false);
  const [aiMetaLoading, setAiMetaLoading]   = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult]   = useState('');
  const { toasts, toast: showToastMsg, dismiss } = useToast();
  const [postId, setPostId]                 = useState(id || null);

  const autoSaveTimer = useRef(null);
  const slugTimer     = useRef(null);

  const showToast = (msg, type = 'success') => showToastMsg(msg, type);

  const set = useCallback((key, value) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* Load existing post */
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const data = await getBlogPost(id);
        setPost({ ...BLANK_POST, ...data });
        setPostId(id);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  /* Auto-save: draft every 30s after any change */
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!postId) return;
      setSaveStatus('saving');
      try {
        await updateBlogPost(postId, post);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2500);
      } catch {
        setSaveStatus('');
      }
    }, 30000);
  }, [postId, post]);

  useEffect(() => {
    if (postId) triggerAutoSave();
    return () => clearTimeout(autoSaveTimer.current);
  }, [post, postId, triggerAutoSave]);

  /* Slug uniqueness check (debounced) */
  const checkSlug = useCallback((slug) => {
    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (!slug) { setSlugWarning(''); return; }
    slugTimer.current = setTimeout(async () => {
      try {
        const unique = await checkSlugUnique(slug, postId);
        setSlugWarning(unique ? '' : 'This slug is already taken.');
      } catch {
        setSlugWarning('');
      }
    }, 600);
  }, [postId]);

  /* Auto-generate slug from title */
  const handleTitleChange = (title) => {
    setPost((prev) => {
      const newSlug = !prev.slug || prev.slug === generateSlug(prev.title)
        ? generateSlug(title)
        : prev.slug;
      checkSlug(newSlug);
      return { ...prev, title, slug: newSlug };
    });
  };

  const handleSlugChange = (slug) => {
    set('slug', slug);
    checkSlug(slug);
  };

  /* Save (create or update) */
  const savePost = async (overrideStatus) => {
    const toSave = { ...post };
    if (overrideStatus) toSave.status = overrideStatus;

    if (toSave.status === 'published') {
      if (!toSave.featured_image_url) {
        showToast('Add a featured image before publishing.', 'error');
        setActiveTab('media');
        return;
      }
      if (!toSave.meta_description) {
        showToast('Add a meta description before publishing.', 'error');
        setActiveTab('seo');
        return;
      }
    }

    toSave.ai_readiness_score = calcAiReadiness(toSave);
    toSave.json_ld = generateBlogJsonLd(toSave);

    // Postgres rejects empty strings for timestamp fields — coerce to null
    ['scheduled_publish_at', 'published_at'].forEach((f) => {
      if (toSave[f] === '') toSave[f] = null;
    });

    try {
      setSaving(true);
      if (isNew && !postId) {
        const created = await createBlogPost(toSave);
        setPostId(created.id);
        setPost({ ...BLANK_POST, ...created });
        navigate(`/blog/${created.id}`, { replace: true });
        showToast('Post created.');
      } else {
        const updated = await updateBlogPost(postId, toSave);
        setPost({ ...BLANK_POST, ...updated });
        showToast(overrideStatus === 'published' ? 'Post published!' : 'Post saved.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* AI helpers */
  const generateMeta = async () => {
    if (!post.title && !post.content) return;
    setAiMetaLoading(true);
    try {
      const res = await fetch('/api/ai/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: post.title, content: post.content }),
      });
      const json = await res.json();
      setPost((prev) => ({
        ...prev,
        meta_title: json.metaTitle || prev.meta_title,
        meta_description: json.metaDescription || prev.meta_description,
      }));
      showToast('Meta generated!');
    } catch {
      showToast('AI request failed.', 'error');
    } finally {
      setAiMetaLoading(false);
    }
  };

  const generateFaq = async () => {
    if (!post.content) return;
    setAiFaqLoading(true);
    try {
      const res = await fetch('/api/ai/generate-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: post.content }),
      });
      const json = await res.json();
      if (json.faqs) set('faq_pairs', json.faqs);
      showToast('FAQ generated!');
    } catch {
      showToast('AI request failed.', 'error');
    } finally {
      setAiFaqLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!post.content) return;
    setAiSummaryLoading(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: post.content }),
      });
      const json = await res.json();
      setSummaryResult(json.summary || '');
    } catch {
      showToast('AI request failed.', 'error');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const score     = calcAiReadiness(post);
  const scoreColor = readinessColor(score);
  const scoreLabel = readinessLabel(score);

  if (loading) {
    return (
      <div className="be-loading">
        <div className="be-spinner" />
        <span>Loading post…</span>
      </div>
    );
  }

  return (
    <div className="be-page">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Top bar */}
      <div className="be-topbar">
        <button className="be-back-btn" onClick={() => navigate('/blog')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Blog
        </button>
        <div className="be-topbar-title">{post.title || '(Untitled)'}</div>
        <div className="be-topbar-actions">
          {saveStatus === 'saving' && <span className="be-save-status be-save-status--saving">Saving…</span>}
          {saveStatus === 'saved'  && <span className="be-save-status be-save-status--saved">Saved</span>}
          <button className="be-draft-btn" onClick={() => savePost('draft')} disabled={saving}>
            Save Draft
          </button>
          <button className="be-publish-btn" onClick={() => savePost('published')} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="be-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`be-tab${activeTab === tab.id ? ' be-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="be-body">

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="be-tab-content">
            <div className="be-field">
              <label className="be-label">Title</label>
              <input
                className="be-input be-input--lg"
                type="text"
                placeholder="Post title…"
                value={post.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
            <div className="be-field">
              <label className="be-label">Slug</label>
              <div className="be-slug-row">
                <span className="be-slug-prefix">/blog/</span>
                <input
                  className={`be-input be-input--slug${slugWarning ? ' be-input--error' : ''}`}
                  type="text"
                  placeholder="post-slug"
                  value={post.slug}
                  onChange={(e) => handleSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                />
              </div>
              {slugWarning && <span className="be-slug-warning">{slugWarning}</span>}
            </div>
            <div className="be-field">
              <label className="be-label">Content</label>
              <TipTapEditor content={post.content} onChange={(html) => set('content', html)} />
            </div>
            <div className="be-field">
              <label className="be-label">Excerpt <span className="be-label-hint">(shown on blog listing)</span></label>
              <textarea
                className="be-textarea"
                rows={3}
                placeholder="Short summary of the post…"
                value={post.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Media ───────────────────────────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="be-tab-content">
            <div className="be-field">
              <label className="be-label">
                Featured Image
                <span className="be-label-required"> *</span>
                <span className="be-label-hint"> — 1200×630 recommended (OG, Twitter card)</span>
              </label>
              {post.featured_image_url ? (
                <div className="be-img-preview-wrap">
                  <img src={post.featured_image_url} alt={post.featured_image_alt} className="be-img-preview" />
                  <button className="be-img-change-btn" onClick={() => setImageUploadOpen(true)}>
                    Change Image
                  </button>
                </div>
              ) : (
                <button className="be-img-placeholder" onClick={() => setImageUploadOpen(true)}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Click to upload featured image</span>
                  <span className="be-img-placeholder-hint">1200×630 · JPG · PNG · WebP · Max 8 MB</span>
                </button>
              )}
            </div>
            <div className="be-field">
              <label className="be-label">
                Alt Text
                <span className="be-label-hint"> — describes the image for accessibility &amp; SEO</span>
              </label>
              <input
                className="be-input"
                type="text"
                placeholder="Describe the image…"
                value={post.featured_image_alt}
                onChange={(e) => set('featured_image_alt', e.target.value)}
              />
            </div>
            <BlogImageUpload
              isOpen={imageUploadOpen}
              onClose={() => setImageUploadOpen(false)}
              currentUrl={post.featured_image_url}
              onSave={(url) => set('featured_image_url', url)}
            />
          </div>
        )}

        {/* ── SEO ─────────────────────────────────────────────────────────── */}
        {activeTab === 'seo' && (
          <div className="be-tab-content">
            <div className="be-seo-ai-bar">
              <p className="be-seo-ai-hint">Auto-fill SEO fields using AI</p>
              <button
                className="be-ai-btn"
                onClick={generateMeta}
                disabled={aiMetaLoading || (!post.title && !post.content)}
              >
                {aiMetaLoading ? (
                  <><div className="be-mini-spinner" />Generating…</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>Generate with AI</>
                )}
              </button>
            </div>

            <div className="be-field">
              <div className="be-label-row">
                <label className="be-label">Meta Title</label>
                <span className={`be-char-count${post.meta_title.length > 60 ? ' be-char-count--over' : ''}`}>
                  {post.meta_title.length} / 60
                </span>
              </div>
              <input
                className="be-input"
                type="text"
                placeholder="SEO title (shown in search results)…"
                value={post.meta_title}
                onChange={(e) => set('meta_title', e.target.value)}
              />
              {post.meta_title.length > 60 && (
                <span className="be-field-warning">Title is too long — search engines may truncate it.</span>
              )}
            </div>

            <div className="be-field">
              <div className="be-label-row">
                <label className="be-label">Meta Description <span className="be-label-required">*</span></label>
                <span className={`be-char-count${post.meta_description.length > 160 ? ' be-char-count--over' : ''}`}>
                  {post.meta_description.length} / 160
                </span>
              </div>
              <textarea
                className="be-textarea"
                rows={3}
                placeholder="Brief summary for search results (required to publish)…"
                value={post.meta_description}
                onChange={(e) => set('meta_description', e.target.value)}
              />
              {post.meta_description.length > 160 && (
                <span className="be-field-warning">Description is too long — search engines may truncate it.</span>
              )}
            </div>

            <div className="be-field">
              <label className="be-label">Focus Keyword</label>
              <input
                className="be-input"
                type="text"
                placeholder="e.g. artificial intelligence news"
                value={post.focus_keyword}
                onChange={(e) => set('focus_keyword', e.target.value)}
              />
              <span className="be-field-hint">The primary keyword this post should rank for.</span>
            </div>

            {/* SERP preview */}
            {(post.meta_title || post.title) && (
              <div className="be-serp-preview">
                <div className="be-serp-label">SERP Preview</div>
                <div className="be-serp-box">
                  <div className="be-serp-url">21news.in › blog › {post.slug || 'post-slug'}</div>
                  <div className="be-serp-title">{post.meta_title || post.title}</div>
                  <div className="be-serp-desc">{post.meta_description || 'No meta description set.'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Structured Data ─────────────────────────────────────────────── */}
        {activeTab === 'structured-data' && (
          <div className="be-tab-content">
            <div className="be-sd-header">
              <div>
                <h3 className="be-sd-title">JSON-LD Structured Data</h3>
                <p className="be-sd-subtitle">Auto-generated from your post fields. Read-only — update fields in other tabs to refine.</p>
              </div>
              <span className="be-sd-badge">BlogPosting Schema</span>
            </div>
            <pre className="be-sd-preview">
              {JSON.stringify(generateBlogJsonLd(post), null, 2)}
            </pre>
          </div>
        )}

        {/* ── AI Optimization ─────────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="be-tab-content">
            {/* Readiness score */}
            <div className="be-ai-score-card">
              <div className="be-ai-score-ring" style={{ '--score-color': scoreColor }}>
                <svg viewBox="0 0 80 80" className="be-ai-score-svg">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7"/>
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={scoreColor} strokeWidth="7"
                    strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div className="be-ai-score-text">
                  <span className="be-ai-score-num" style={{ color: scoreColor }}>{score}</span>
                  <span className="be-ai-score-of">/100</span>
                </div>
              </div>
              <div className="be-ai-score-info">
                <div className="be-ai-score-label" style={{ color: scoreColor }}>{scoreLabel}</div>
                <div className="be-ai-score-breakdown">
                  <ScoreRow label="Meta title" done={!!post.meta_title?.trim()} pts={10} />
                  <ScoreRow label="Meta description" done={!!post.meta_description?.trim()} pts={20} />
                  <ScoreRow label="Focus keyword" done={!!post.focus_keyword?.trim()} pts={10} />
                  <ScoreRow label="Content ≥ 300 words" done={wordCount(post.content) >= 300} pts={20} />
                  <ScoreRow label="Featured image + alt text" done={!!post.featured_image_url?.trim() && !!post.featured_image_alt?.trim()} pts={20} />
                  <ScoreRow label="FAQ section" done={post.faq_pairs?.length > 0} pts={20} />
                </div>
              </div>
            </div>

            {/* FAQ Generator */}
            <div className="be-ai-section">
              <div className="be-ai-section-header">
                <div>
                  <h4 className="be-ai-section-title">FAQ Generator</h4>
                  <p className="be-ai-section-desc">Generates 5 Q&A pairs from your content — appended as FAQPage JSON-LD.</p>
                </div>
                <button
                  className="be-ai-btn"
                  onClick={generateFaq}
                  disabled={aiFaqLoading || !post.content}
                >
                  {aiFaqLoading ? <><div className="be-mini-spinner" />Generating…</> : 'Generate FAQ'}
                </button>
              </div>
              {post.faq_pairs?.length > 0 && (
                <div className="be-faq-list">
                  {post.faq_pairs.map((faq, i) => (
                    <div key={i} className="be-faq-item">
                      <div className="be-faq-q">{faq.question}</div>
                      <div className="be-faq-a">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summarize */}
            <div className="be-ai-section">
              <div className="be-ai-section-header">
                <div>
                  <h4 className="be-ai-section-title">AI Summary</h4>
                  <p className="be-ai-section-desc">2-sentence summary of your post.</p>
                </div>
                <button
                  className="be-ai-btn"
                  onClick={generateSummary}
                  disabled={aiSummaryLoading || !post.content}
                >
                  {aiSummaryLoading ? <><div className="be-mini-spinner" />Summarizing…</> : 'Summarize'}
                </button>
              </div>
              {summaryResult && (
                <div className="be-summary-result">
                  <p>{summaryResult}</p>
                  <button
                    className="be-use-excerpt-btn"
                    onClick={() => { set('excerpt', summaryResult); setSummaryResult(''); showToast('Excerpt updated.'); }}
                  >
                    Use as Excerpt
                  </button>
                </div>
              )}
            </div>

            {/* Entity detection placeholder */}
            <div className="be-ai-section">
              <div className="be-ai-section-header">
                <div>
                  <h4 className="be-ai-section-title">Entity Detection</h4>
                  <p className="be-ai-section-desc">Named entities found in your content (people, organisations, locations).</p>
                </div>
              </div>
              <div className="be-entity-placeholder">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Entity detection coming soon. Write or paste your content to analyse.
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="be-tab-content">
            <div className="be-analytics-placeholder">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
              <h3>Analytics available after publishing</h3>
              <p>Views and Google Search Console data (impressions, clicks, average position) will appear here once the post is published and indexed.</p>
            </div>
          </div>
        )}

        {/* ── Publishing ──────────────────────────────────────────────────── */}
        {activeTab === 'publishing' && (
          <div className="be-tab-content">
            <div className="be-field">
              <label className="be-label">Status</label>
              <select
                className="be-select"
                value={post.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {post.status === 'scheduled' && (
              <div className="be-field">
                <label className="be-label">Scheduled Publish Date</label>
                <input
                  className="be-input"
                  type="datetime-local"
                  value={post.scheduled_publish_at ? post.scheduled_publish_at.slice(0, 16) : ''}
                  onChange={(e) => set('scheduled_publish_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
            )}

            {post.published_at && (
              <div className="be-field">
                <label className="be-label">Published At</label>
                <input
                  className="be-input"
                  type="text"
                  readOnly
                  value={new Date(post.published_at).toLocaleString('en-IN')}
                />
              </div>
            )}

            <div className="be-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', marginTop: '16px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="be-featured-toggle"
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                checked={post.canonical_url === 'featured'}
                onChange={(e) => set('canonical_url', e.target.checked ? 'featured' : '')}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="be-featured-toggle" style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', cursor: 'pointer', margin: 0 }}>
                  Promote to Featured Post
                </label>
                <span style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
                  Display this article at the very top of the public blog page with a prominent horizontal layout
                </span>
              </div>
            </div>

            <div className="be-field">
              <label className="be-label">Canonical URL <span className="be-label-hint">(leave blank to use default)</span></label>
              <input
                className="be-input"
                type="url"
                placeholder="https://21news.in/blog/post-slug"
                value={post.canonical_url === 'featured' ? '' : post.canonical_url}
                onChange={(e) => set('canonical_url', e.target.value)}
                disabled={post.canonical_url === 'featured'}
              />
            </div>

            <div className="be-field">
              <label className="be-label">Author</label>
              <input
                className="be-input"
                type="text"
                placeholder="Author name"
                value={post.author}
                onChange={(e) => set('author', e.target.value)}
              />
            </div>

            <div className="be-publish-checklist">
              <div className="be-checklist-title">Publish Checklist</div>
              <ChecklistItem ok={!!post.featured_image_url} label="Featured image uploaded" required />
              <ChecklistItem ok={!!post.meta_description} label="Meta description filled" required />
              <ChecklistItem ok={!!post.meta_title} label="Meta title filled" />
              <ChecklistItem ok={!!post.focus_keyword} label="Focus keyword set" />
              <ChecklistItem ok={wordCount(post.content) >= 300} label="Content ≥ 300 words" />
              <ChecklistItem ok={post.faq_pairs?.length > 0} label="FAQ section generated" />
            </div>

            <div className="be-publish-actions">
              <button className="be-draft-btn" onClick={() => savePost('draft')} disabled={saving}>
                Save as Draft
              </button>
              <button className="be-publish-btn" onClick={() => savePost('published')} disabled={saving}>
                {saving ? 'Publishing…' : 'Publish Now'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* Helper sub-components */
const wordCount = (html) =>
  (html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

const ScoreRow = ({ label, done, pts }) => (
  <div className="be-score-row">
    <span className={`be-score-check${done ? ' done' : ''}`}>
      {done
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      }
    </span>
    <span className="be-score-label">{label}</span>
    <span className="be-score-pts">+{pts}</span>
  </div>
);

const ChecklistItem = ({ ok, label, required }) => (
  <div className={`be-checklist-item${ok ? ' ok' : required ? ' missing-required' : ' missing'}`}>
    {ok
      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={required ? '#dc2626' : '#f59e0b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    }
    <span>{label}</span>
    {required && !ok && <span className="be-required-tag">Required</span>}
  </div>
);

export default BlogEditor;
