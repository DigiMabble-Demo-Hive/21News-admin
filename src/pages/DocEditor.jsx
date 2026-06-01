import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBlogPost, createBlogPost, updateBlogPost, generateSlug, checkSlugUnique,
} from '../lib/blogApi';
import TipTapEditor from '../components/blog/TipTapEditor';
import BlogImageUpload from '../components/blog/BlogImageUpload';
import ToastContainer, { useToast } from '../components/Toast';
import './DocEditor.css';

const TABS = [
  { id: 'content',         label: 'Content' },
  { id: 'media',           label: 'Media' },
  { id: 'seo',             label: 'SEO' },
  { id: 'structured-data', label: 'Structured Data' },
  { id: 'ai',              label: 'AI Optimization' },
  { id: 'publishing',      label: 'Publishing' },
];

const CATEGORIES = [
  'Getting Started',
  'Verification & Trust',
  'Google Search Console',
  'AI Visibility',
  'Billing & Subscriptions',
  'Troubleshooting',
  'Reports & Analytics',
  'Profile Management'
];

const BLANK_DOC = {
  title: '', slug: '', content: '', excerpt: '',
  featured_image_url: '', featured_image_alt: '',
  meta_title: '', meta_description: '', focus_keyword: '',
  json_ld: null, status: 'draft', canonical_url: '',
  scheduled_publish_at: null, published_at: null,
  author: '21 News Lexicon Support', ai_readiness_score: 0,
  detected_entities: [], faq_pairs: [],
};

const DocEditor = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew    = !id;

  const [post, setPost]                     = useState(BLANK_DOC);
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

  // Docs Specific Fields
  const [difficulty, setDifficulty]         = useState('Beginner');
  const [category, setCategory]             = useState('Getting Started');
  const [isTroubleshooting, setIsTroubleshooting] = useState(false);
  const [helpfulCount, setHelpfulCount]     = useState(0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(0);

  const autoSaveTimer = useRef(null);
  const slugTimer     = useRef(null);

  const showToast = (msg, type = 'success') => showToastMsg(msg, type);

  const set = useCallback((key, value) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  }, []);

  const unpackMetadata = (jsonLd) => {
    if (!jsonLd) return;
    let meta = {};
    if (typeof jsonLd === 'object') {
      meta = jsonLd;
    } else {
      try { meta = JSON.parse(jsonLd || '{}'); } catch (e) { return; }
    }
    if (meta.difficulty) setDifficulty(meta.difficulty);
    if (meta.category) setCategory(meta.category);
    if (meta.is_troubleshooting !== undefined) setIsTroubleshooting(meta.is_troubleshooting);
    if (meta.helpful_count !== undefined) setHelpfulCount(meta.helpful_count);
    if (meta.not_helpful_count !== undefined) setNotHelpfulCount(meta.not_helpful_count);
  };

  /* Load existing post */
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const data = await getBlogPost(id);
        setPost({ ...BLANK_DOC, ...data });
        setPostId(id);
        unpackMetadata(data.json_ld);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  const packMetadata = (currentPost) => {
    // Generate automatic reading time calculation scientifically (Math.ceil(wordCount / 200) min)
    const rawText = (currentPost.content || '').replace(/<[^>]*>/g, ' ').trim();
    const wordCountVal = rawText.split(/\s+/).filter(Boolean).length;
    const readTimeMin = Math.max(1, Math.ceil(wordCountVal / 200));

    const meta = {
      post_type: 'documentation',
      difficulty,
      category,
      is_troubleshooting: isTroubleshooting,
      helpful_count: helpfulCount,
      not_helpful_count: notHelpfulCount,
      reading_time: `${readTimeMin} min read`,
      schema: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": currentPost.title,
        "description": currentPost.meta_description || currentPost.excerpt,
        "proficiencyLevel": difficulty,
        "articleSection": category,
        "inLanguage": "en",
        "author": {
          "@type": "Organization",
          "name": "21 News Lexicon Support"
        }
      }
    };
    return meta;
  };

  /* Auto-save: draft every 30s after any change */
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!postId) return;
      setSaveStatus('saving');
      try {
        const toSave = { ...post };
        toSave.json_ld = packMetadata(toSave);
        await updateBlogPost(postId, toSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2500);
      } catch {
        setSaveStatus('');
      }
    }, 30000);
  }, [postId, post, difficulty, category, isTroubleshooting, helpfulCount, notHelpfulCount]);

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
      if (!toSave.meta_description) {
        showToast('Add a meta description before publishing.', 'error');
        setActiveTab('seo');
        return;
      }
    }

    toSave.json_ld = packMetadata(toSave);

    // Postgres rejects empty strings for timestamp fields — coerce to null
    ['scheduled_publish_at', 'published_at'].forEach((f) => {
      if (toSave[f] === '') toSave[f] = null;
    });

    try {
      setSaving(true);
      if (isNew && !postId) {
        const created = await createBlogPost(toSave);
        setPostId(created.id);
        setPost({ ...BLANK_DOC, ...created });
        unpackMetadata(created.json_ld);
        navigate(`/docs/${created.id}`, { replace: true });
        showToast('Document created.');
      } else {
        const updated = await updateBlogPost(postId, toSave);
        setPost({ ...BLANK_DOC, ...updated });
        unpackMetadata(updated.json_ld);
        showToast(overrideStatus === 'published' ? 'Document published!' : 'Document saved.');
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
      if (!res.ok) throw new Error(json.error || `Request failed with status ${res.status}`);

      setPost((prev) => ({
        ...prev,
        meta_title: json.metaTitle || prev.meta_title,
        meta_description: json.metaDescription || prev.meta_description,
        focus_keyword: json.focusKeyword || prev.focus_keyword,
      }));
      showToast('Meta generated successfully!');
    } catch (err) {
      showToast(err.message || 'AI request failed.', 'error');
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
      if (!res.ok) throw new Error(json.error || `Request failed with status ${res.status}`);

      if (json.faqs) set('faq_pairs', json.faqs);
      showToast('FAQ generated successfully!');
    } catch (err) {
      showToast(err.message || 'AI request failed.', 'error');
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
      if (!res.ok) throw new Error(json.error || `Request failed with status ${res.status}`);

      setSummaryResult(json.summary || '');
      showToast('Summary generated successfully!');
    } catch (err) {
      showToast(err.message || 'AI request failed.', 'error');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="be-loading">
        <div className="be-spinner" />
        <span>Loading document…</span>
      </div>
    );
  }

  const wordCountVal = (post.content || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCountVal / 200));

  return (
    <div className="be-page">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Top bar */}
      <div className="be-topbar">
        <button className="be-back-btn" onClick={() => navigate('/docs')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Guides
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
                <span className="be-slug-prefix">/docs/</span>
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

            {/* Docs metadata selectors */}
            <div className="de-meta-grid">
              <div className="be-field" style={{ marginBottom: 0 }}>
                <label className="be-label">Category</label>
                <select
                  className="be-select de-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="be-field" style={{ marginBottom: 0 }}>
                <label className="be-label">Difficulty Level</label>
                <div className="de-difficulty-row">
                  {['Beginner', 'Intermediate', 'Advanced'].map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`de-diff-btn de-diff-btn--${d.toLowerCase()}${difficulty === d ? ' de-diff-btn--active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d === 'Beginner' && <span className="de-diff-dot" style={{ background: '#3B82F6' }} />}
                      {d === 'Intermediate' && <span className="de-diff-dot" style={{ background: '#F59E0B' }} />}
                      {d === 'Advanced' && <span className="de-diff-dot" style={{ background: '#EF4444' }} />}
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="be-field" style={{ marginBottom: 0 }}>
                <label className="be-label">Guide Type</label>
                <button
                  type="button"
                  className={`de-toggle-row${isTroubleshooting ? ' de-toggle-row--on' : ''}`}
                  onClick={() => setIsTroubleshooting(v => !v)}
                >
                  <div className="de-toggle-track">
                    <div className="de-toggle-thumb" />
                  </div>
                  <span className="de-toggle-label">
                    {isTroubleshooting ? 'Troubleshooting Guide' : 'Standard Guide'}
                  </span>
                </button>
              </div>
            </div>

            <div className="be-field">
              <label className="be-label">Content</label>
              <TipTapEditor key={post.id || 'new'} content={post.content} onChange={(html) => set('content', html)} />
            </div>

            <div className="be-field">
              <label className="be-label">Excerpt <span className="be-label-hint">(short summary shown in browse categories)</span></label>
              <textarea
                className="be-textarea"
                rows={3}
                placeholder="Short summary of the guide…"
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
                <span className="be-label-hint"> — optional for documentation</span>
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
              <label className="be-label">Alt Text</label>
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
            </div>

            <div className="be-field">
              <label className="be-label">Focus Keyword</label>
              <input
                className="be-input"
                type="text"
                placeholder="e.g. support guide"
                value={post.focus_keyword}
                onChange={(e) => set('focus_keyword', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Structured Data ─────────────────────────────────────────────── */}
        {activeTab === 'structured-data' && (
          <div className="be-tab-content">
            <div className="be-sd-header">
              <div>
                <h3 className="be-sd-title">JSON-LD Structured Data</h3>
                <p className="be-sd-subtitle">Documentation metadata and schema.</p>
              </div>
              <span className="be-sd-badge">TechArticle Schema</span>
            </div>
            <pre className="be-sd-preview">
              {JSON.stringify(packMetadata(post), null, 2)}
            </pre>
          </div>
        )}

        {/* ── AI Optimization ─────────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="be-tab-content">
            {/* FAQ Generator */}
            <div className="be-ai-section">
              <div className="be-ai-section-header">
                <div>
                  <h4 className="be-ai-section-title">FAQ Generator</h4>
                  <p className="be-ai-section-desc">Generates 5 Q&A pairs from your content — saved directly as structured data schema.</p>
                </div>
                <button
                  className="be-ai-btn"
                  onClick={generateFaq}
                  disabled={aiFaqLoading || !post.content}
                >
                  {aiFaqLoading ? <><div className="be-mini-spinner" />Generating…</> : 'Generate FAQ'}
                </button>
              </div>
              
              <div className="be-faq-list">
                {post.faq_pairs?.map((faq, i) => (
                  <div key={i} className="be-faq-edit-card">
                    <div className="be-faq-card-header">
                      <span className="be-faq-number">FAQ #{i + 1}</span>
                      <button
                        type="button"
                        className="be-faq-delete-btn"
                        onClick={() => {
                          const updated = post.faq_pairs.filter((_, idx) => idx !== i);
                          set('faq_pairs', updated);
                          showToast('FAQ pair removed.');
                        }}
                        title="Remove FAQ pair"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="be-field" style={{ gap: '4px' }}>
                      <label className="be-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>Question</label>
                      <input
                        type="text"
                        className="be-input"
                        value={faq.question || ''}
                        onChange={(e) => {
                          const updated = [...post.faq_pairs];
                          updated[i] = { ...updated[i], question: e.target.value };
                          set('faq_pairs', updated);
                        }}
                      />
                    </div>
                    <div className="be-field" style={{ gap: '4px' }}>
                      <label className="be-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>Answer</label>
                      <textarea
                        className="be-textarea"
                        rows={2}
                        value={faq.answer || ''}
                        onChange={(e) => {
                          const updated = [...post.faq_pairs];
                          updated[i] = { ...updated[i], answer: e.target.value };
                          set('faq_pairs', updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  className="be-ai-btn"
                  style={{ marginTop: '8px', background: '#F1F5F9', color: '#475569', border: '1.5px solid #E2E8F0', boxShadow: 'none' }}
                  onClick={() => {
                    const updated = [...(post.faq_pairs || []), { question: '', answer: '' }];
                    set('faq_pairs', updated);
                  }}
                >
                  + Add FAQ Pair
                </button>
              </div>
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
              {summaryResult !== '' && (
                <div className="be-summary-result" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    className="be-textarea"
                    rows={3}
                    value={summaryResult}
                    onChange={(e) => setSummaryResult(e.target.value)}
                  />
                  <button
                    className="be-use-excerpt-btn"
                    onClick={() => { set('excerpt', summaryResult); setSummaryResult(''); showToast('Excerpt updated.'); }}
                  >
                    Use as Excerpt
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Publishing ──────────────────────────────────────────────────── */}
        {activeTab === 'publishing' && (
          <div className="be-tab-content">

            {/* Status — visual radio cards */}
            <div className="be-field">
              <label className="be-label">Document Status</label>
              <div className="de-status-grid">
                {[
                  { value: 'draft',          label: 'Draft',          desc: 'Private — not visible',        icon: '✏️',  color: '#64748B', bg: '#F8FAFC',  border: '#CBD5E1' },
                  { value: 'pending_review', label: 'Pending Review', desc: 'Waiting for editor approval',  icon: '🕐', color: '#7C3AED', bg: '#FAF5FF',  border: '#C4B5FD' },
                  { value: 'approved',       label: 'Approved',       desc: 'Ready — not yet live',         icon: '✅',  color: '#D97706', bg: '#FFFBEB',  border: '#FCD34D' },
                  { value: 'published',      label: 'Published',      desc: 'Live and visible to readers',  icon: '🌐',  color: '#059669', bg: '#ECFDF5',  border: '#6EE7B7' },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`de-status-card${post.status === s.value ? ' de-status-card--active' : ''}`}
                    style={post.status === s.value ? { background: s.bg, borderColor: s.border } : {}}
                    onClick={() => set('status', s.value)}
                  >
                    <span className="de-status-card-icon">{s.icon}</span>
                    <span className="de-status-card-label" style={post.status === s.value ? { color: s.color } : {}}>
                      {s.label}
                    </span>
                    <span className="de-status-card-desc">{s.desc}</span>
                    {post.status === s.value && (
                      <span className="de-status-card-check" style={{ background: s.color }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Author */}
            <div className="be-field">
              <label className="be-label">Author</label>
              <div className="de-author-wrap">
                <div className="de-author-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  className="be-input de-author-input"
                  type="text"
                  placeholder="Author name or team"
                  value={post.author}
                  onChange={(e) => set('author', e.target.value)}
                />
              </div>
            </div>

            {/* Calculated Stats panel */}
            <div className="de-stats-panel">
              <div className="de-stats-panel-header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Content Stats
              </div>
              <div className="de-stats-grid">
                <div className="de-stat-item">
                  <span className="de-stat-label">Word Count</span>
                  <span className="de-stat-value">{wordCountVal.toLocaleString()}</span>
                </div>
                <div className="de-stat-item">
                  <span className="de-stat-label">Reading Time</span>
                  <span className="de-stat-value de-stat-value--accent">{readTimeMin} min</span>
                </div>
                <div className="de-stat-item">
                  <span className="de-stat-label">Difficulty</span>
                  <span className={`de-stat-badge de-stat-badge--${difficulty.toLowerCase()}`}>{difficulty}</span>
                </div>
                <div className="de-stat-item">
                  <span className="de-stat-label">Category</span>
                  <span className="de-stat-category" title={category}>{category}</span>
                </div>
              </div>
            </div>

            <div className="be-publish-actions" style={{ marginTop: '24px' }}>
              <button className="be-draft-btn" onClick={() => savePost('draft')} disabled={saving}>
                Save as Draft
              </button>
              <button className="be-publish-btn" onClick={() => savePost('published')} disabled={saving}>
                {saving ? 'Publishing…' : 'Publish Guide'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DocEditor;
