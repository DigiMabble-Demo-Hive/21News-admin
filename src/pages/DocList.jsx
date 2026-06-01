import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBlogPosts, deleteBlogPost } from '../lib/blogApi';
import ToastContainer, { useToast } from '../components/Toast';
import './DocList.css';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DIFFICULTY_ORDER  = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const CATEGORIES = [
  'Getting Started',
  'Verification & Trust',
  'Google Search Console',
  'AI Visibility',
  'Billing & Subscriptions',
  'Troubleshooting',
  'Reports & Analytics',
  'Profile Management',
];

const STATUS_META = {
  all:            { label: 'All',            cls: '',                    border: 'transparent' },
  draft:          { label: 'Draft',          cls: 'bll-badge--draft',    border: '#CBD5E1' },
  pending_review: { label: 'Pending Review', cls: 'bll-badge--pending',  border: '#818CF8' },
  approved:       { label: 'Approved',       cls: 'bll-badge--approved', border: '#FCD34D' },
  published:      { label: 'Published',      cls: 'bll-badge--published',border: '#4ADE80' },
};

const DIFFICULTY_COLORS = {
  Beginner:     { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  Intermediate: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Advanced:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`bll-badge ${m.cls}`}>
      {status === 'published' && <span className="bll-badge-dot" />}
      {m.label}
    </span>
  );
};

/* ── Sort Header ── */
const SortTh = ({ field, label, sortField, sortDir, onSort, align = 'center', width }) => {
  const active = sortField === field;
  const asc    = active && sortDir === 'asc';
  const desc   = active && sortDir === 'desc';
  return (
    <th
      className={`bll-sort-th${align === 'left' ? ' bll-th-left' : ''}${active ? ' bll-sort-th--active' : ''}`}
      style={width ? { width } : {}}
      onClick={() => onSort(field)}
      title={active ? (asc ? 'Sort descending' : 'Sort ascending') : `Sort by ${label}`}
    >
      <span className="bll-sort-th-inner">
        {label}
        <span className="bll-sort-icon">
          {active ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              {asc
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />}
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="bll-sort-icon--idle">
              <polyline points="18 8 12 2 6 8" />
              <polyline points="6 16 12 22 18 16" />
            </svg>
          )}
        </span>
      </span>
    </th>
  );
};

const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="bll-pagination">
      <button className="bll-page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>← Prev</button>
      <div className="bll-page-numbers">
        {pages.map((p, i) =>
          p === '…' ? <span key={`e${i}`} className="bll-page-ellipsis">…</span> : (
            <button key={p} className={`bll-page-num${page === p ? ' bll-page-num--active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )
        )}
      </div>
      <button className="bll-page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>Next →</button>
    </div>
  );
};

const getDocMeta = (post) => {
  if (!post.json_ld) return {};
  if (typeof post.json_ld === 'object') return (!Array.isArray(post.json_ld)) ? post.json_ld : {};
  try {
    const parsed = JSON.parse(post.json_ld);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch { return {}; }
};

const DocList = () => {
  const navigate = useNavigate();
  const { toasts, toast, dismiss } = useToast();

  const [posts, setPosts]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField]           = useState('created_at');
  const [sortDir, setSortDir]               = useState('desc');
  const [deleteId, setDeleteId]             = useState(null);
  const [deleting, setDeleting]             = useState(false);

  const handleSort = useCallback((field) => {
    setSortField(prev => {
      if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return field; }
      setSortDir('asc');
      return field;
    });
    setPage(1);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listBlogPosts();
        const docs = (data || []).filter(p => {
          if (!p.json_ld) return false;
          let meta = {};
          if (typeof p.json_ld === 'object') meta = p.json_ld;
          else { try { meta = JSON.parse(p.json_ld || '{}'); } catch { return false; } }
          return meta && typeof meta === 'object' && !Array.isArray(meta) && meta.post_type === 'documentation';
        });
        setPosts(docs);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Reset page when any filter changes */
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, difficultyFilter, sortField, sortDir, pageSize]);

  const filtered = posts.filter(p => {
    const meta = getDocMeta(p);
    const matchStatus     = statusFilter === 'all'     || p.status === statusFilter;
    const matchCategory   = categoryFilter === 'all'   || meta.category === categoryFilter;
    const matchDifficulty = difficultyFilter === 'all' || meta.difficulty === difficultyFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q);
    return matchStatus && matchCategory && matchDifficulty && matchSearch;
  });

  /* Sort */
  const sorted = [...filtered].sort((a, b) => {
    const ma = getDocMeta(a);
    const mb = getDocMeta(b);
    let va, vb;
    switch (sortField) {
      case 'title':
        va = (a.title || '').toLowerCase(); vb = (b.title || '').toLowerCase(); break;
      case 'category':
        va = (ma.category || '').toLowerCase(); vb = (mb.category || '').toLowerCase(); break;
      case 'difficulty':
        va = DIFFICULTY_ORDER[ma.difficulty] ?? 99; vb = DIFFICULTY_ORDER[mb.difficulty] ?? 99; break;
      case 'rating': {
        const ta = (ma.helpful_count || 0) + (ma.not_helpful_count || 0);
        const tb = (mb.helpful_count || 0) + (mb.not_helpful_count || 0);
        va = ta > 0 ? (ma.helpful_count || 0) / ta : -1;
        vb = tb > 0 ? (mb.helpful_count || 0) / tb : -1;
        break;
      }
      case 'status':
        va = a.status || ''; vb = b.status || ''; break;
      default: // created_at
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const countByStatus = Object.keys(STATUS_META).reduce((acc, k) => {
    acc[k] = k === 'all' ? posts.length : posts.filter(p => p.status === k).length;
    return acc;
  }, {});

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteBlogPost(deleteId);
      setPosts(prev => prev.filter(p => p.id !== deleteId));
      toast('Document deleted.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handlePage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const hasActiveFilters = search || statusFilter !== 'all' || categoryFilter !== 'all' || difficultyFilter !== 'all';

  const sortProps = { sortField, sortDir, onSort: handleSort };

  return (
    <div className="bll-page">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bll-header">
        <div className="bll-header-left">
          <h1 className="bll-title">Documentation Articles</h1>
          <p className="bll-subtitle">Create and manage internal &amp; external support guides</p>
        </div>
        <button className="bll-new-btn" onClick={() => navigate('/docs/new')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Document
        </button>
      </div>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="bll-controls">
        {/* Search */}
        <div className="bll-search-wrap">
          <svg className="bll-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="bll-search"
            type="text"
            placeholder="Search guides…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="bll-search-clear" onClick={() => setSearch('')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Category dropdown */}
        <div className="bll-filter-select-wrap">
          <svg className="bll-filter-select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4"/>
          </svg>
          <select
            className="bll-filter-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Difficulty dropdown */}
        <div className="bll-filter-select-wrap">
          <svg className="bll-filter-select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <select
            className="bll-filter-select"
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        {/* Status chips */}
        <div className="bll-filter-chips">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              className={`bll-chip${statusFilter === key ? ' bll-chip--active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {meta.label}
              {countByStatus[key] > 0 && (
                <span className={`bll-chip-count${statusFilter === key ? ' bll-chip-count--active' : ''}`}>
                  {countByStatus[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Rows per page */}
        <div className="bll-page-size-wrap">
          <label className="bll-page-size-label">Rows</label>
          <select
            className="bll-page-size-select"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            className="bll-clear-filters-btn"
            onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setDifficultyFilter('all'); }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="bll-body">
        {loading ? (
          <div className="bll-table-wrap">
            <table className="bll-table">
              <thead>
                <tr>
                  <th className="bll-th-left" style={{ width: '32%' }}>Title</th>
                  <th>Category</th><th>Difficulty</th><th>Feedback</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bll-row bll-row--skeleton">
                    <td><div className="bll-skel bll-skel--title" /><div className="bll-skel bll-skel--sub" /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--slug" style={{ margin: '0 auto', width: '90px' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--slug" style={{ margin: '0 auto', width: '70px' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--slug" style={{ margin: '0 auto', width: '80px' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--badge" style={{ margin: '0 auto' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--actions" style={{ margin: '0 auto' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : paginated.length === 0 ? (
          <div className="bll-empty">
            <div className="bll-empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="bll-empty-title">{hasActiveFilters ? 'No guides match your filters' : 'No guides yet'}</p>
            <p className="bll-empty-sub">{hasActiveFilters ? 'Try adjusting the search or filters.' : 'Create your first documentation guide to get started.'}</p>
            {!hasActiveFilters && (
              <button className="bll-new-btn" style={{ marginTop: 4 }} onClick={() => navigate('/docs/new')}>Create First Guide</button>
            )}
            {hasActiveFilters && (
              <button
                className="bll-clear-filters-btn"
                style={{ marginTop: 8 }}
                onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setDifficultyFilter('all'); }}
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bll-table-wrap">
            {/* Toolbar — top */}
            <div className="bll-table-toolbar">
              <span className="bll-result-count">
                {sorted.length} guide{sorted.length !== 1 ? 's' : ''}
                {categoryFilter !== 'all' ? ` · ${categoryFilter}` : ''}
                {difficultyFilter !== 'all' ? ` · ${difficultyFilter}` : ''}
                {statusFilter !== 'all' ? ` · ${STATUS_META[statusFilter]?.label}` : ''}
                {search ? ` · "${search}"` : ''}
              </span>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
            </div>

            {/* Table */}
            <table className="bll-table">
              <thead>
                <tr>
                  <SortTh field="title"      label="Title"      align="left" width="32%" {...sortProps} />
                  <SortTh field="category"   label="Category"   {...sortProps} />
                  <SortTh field="difficulty" label="Difficulty" {...sortProps} />
                  <SortTh field="rating"     label="Feedback"   {...sortProps} />
                  <SortTh field="status"     label="Status"     {...sortProps} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(post => {
                  const m = STATUS_META[post.status] || STATUS_META.draft;
                  const meta = getDocMeta(post);
                  const diffColor = DIFFICULTY_COLORS[meta.difficulty] || DIFFICULTY_COLORS.Beginner;
                  const helpfulVal   = meta.helpful_count     || 0;
                  const unhelpfulVal = meta.not_helpful_count || 0;
                  const totalFeedback = helpfulVal + unhelpfulVal;
                  const percentHelpful = totalFeedback > 0 ? Math.round((helpfulVal / totalFeedback) * 100) : 0;

                  return (
                    <tr key={post.id} className="bll-row" style={{ borderLeft: `3px solid ${m.border}` }}>

                      {/* Title */}
                      <td className="bll-td-title">
                        {post.featured_image_url && (
                          <img src={post.featured_image_url} alt="" className="bll-thumb" />
                        )}
                        <div className="bll-td-title-text">
                          <div className="bll-post-title" style={{ fontWeight: '600' }}>
                            {post.title || '(Untitled Document)'}
                            {meta.is_troubleshooting && (
                              <span className="bll-badge" style={{ background: '#FEF2F2', color: '#EF4444', borderColor: '#FCA5A5', fontSize: '9px', padding: '1px 5px', fontWeight: 'bold', marginLeft: '8px' }}>
                                Troubleshooting
                              </span>
                            )}
                          </div>
                          {post.excerpt && (
                            <div className="bll-post-excerpt">
                              {post.excerpt.length > 80 ? post.excerpt.slice(0, 80) + '…' : post.excerpt}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="bll-td-center">
                        <span className="bll-badge" style={{ background: '#F1F5F9', color: '#475569', borderColor: '#E2E8F0', textTransform: 'capitalize' }}>
                          {meta.category || 'General'}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="bll-td-center">
                        <span className="bll-badge" style={{ background: diffColor.bg, color: diffColor.text, borderColor: diffColor.border, fontWeight: '700' }}>
                          {meta.difficulty || 'Beginner'}
                        </span>
                      </td>

                      {/* Feedback */}
                      <td className="bll-td-center">
                        {totalFeedback > 0 ? (
                          <div className="dl-feedback-cell">
                            <div className="dl-feedback-bar-wrap">
                              <div
                                className="dl-feedback-bar-fill"
                                style={{
                                  width: `${percentHelpful}%`,
                                  background: percentHelpful >= 70 ? '#22C55E' : percentHelpful >= 40 ? '#F59E0B' : '#EF4444',
                                }}
                              />
                            </div>
                            <div className="dl-feedback-meta">
                              <span
                                className="dl-feedback-pct"
                                style={{ color: percentHelpful >= 70 ? '#15803D' : percentHelpful >= 40 ? '#B45309' : '#B91C1C' }}
                              >
                                {percentHelpful}%
                              </span>
                              <span className="dl-feedback-votes">{totalFeedback} votes</span>
                            </div>
                          </div>
                        ) : (
                          <span className="dl-feedback-empty">No feedback yet</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="bll-td-center"><StatusBadge status={post.status} /></td>

                      {/* Actions */}
                      <td className="bll-td-center">
                        <div className="bll-actions-inner">
                          <button className="bll-action-btn bll-action-btn--edit" onClick={() => navigate(`/docs/${post.id}`)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button className="bll-action-btn bll-action-btn--delete" onClick={() => setDeleteId(post.id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="bll-table-footer">
              <span className="bll-result-count">
                {sorted.length > 0
                  ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sorted.length)} of ${sorted.length}`
                  : '0 results'}
              </span>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm ─────────────────────────────────────────── */}
      {deleteId && (
        <div className="bll-confirm-overlay" onClick={() => !deleting && setDeleteId(null)}>
          <div className="bll-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="bll-confirm-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="bll-confirm-title">Delete this document?</h3>
            <p className="bll-confirm-body">This cannot be undone. The document will be permanently removed.</p>
            <div className="bll-confirm-actions">
              <button className="bll-confirm-cancel" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="bll-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocList;
