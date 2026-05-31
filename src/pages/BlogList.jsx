import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBlogPosts, deleteBlogPost, updateBlogPost } from '../lib/blogApi';
import ToastContainer, { useToast } from '../components/Toast';
import './BlogList.css';

const PAGE_SIZE = 10;

const STATUS_META = {
  all:            { label: 'All',            cls: '',                    border: 'transparent' },
  draft:          { label: 'Draft',          cls: 'bll-badge--draft',    border: '#CBD5E1' },
  pending_review: { label: 'Pending Review', cls: 'bll-badge--pending',  border: '#818CF8' },
  approved:       { label: 'Approved',       cls: 'bll-badge--approved', border: '#FCD34D' },
  published:      { label: 'Published',      cls: 'bll-badge--published',border: '#4ADE80' },
  scheduled:      { label: 'Scheduled',      cls: 'bll-badge--scheduled',border: '#A78BFA' },
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

const Pagination = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="bll-pagination">
      <button className="bll-page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>
        ← Prev
      </button>
      <div className="bll-page-numbers">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="bll-page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`bll-page-num${page === p ? ' bll-page-num--active' : ''}`}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button className="bll-page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
        Next →
      </button>
    </div>
  );
};

const BlogList = () => {
  const navigate = useNavigate();
  const { toasts, toast, dismiss } = useToast();

  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]           = useState(1);
  const [deleteId, setDeleteId]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const handleToggleFeatured = async (post) => {
    const wasFeatured = post.canonical_url === 'featured';
    const newCanonicalUrl = wasFeatured ? '' : 'featured';
    
    // 1. Optimistic UI update: instantly update local state so UI responds in 0ms!
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return { ...p, canonical_url: newCanonicalUrl };
        }
        if (!wasFeatured && p.canonical_url === 'featured') {
          return { ...p, canonical_url: '' };
        }
        return p;
      })
    );

    try {
      // 2. Only update the single clicked post (backend unfeatures other posts atomically)
      await updateBlogPost(post.id, {
        ...post,
        canonical_url: newCanonicalUrl
      });
      toast(wasFeatured ? 'Post removed from featured.' : 'Post set as featured!');
    } catch (err) {
      toast(err.message, 'error');
      // 3. Rollback on failure: refetch fresh list from server to ensure database integrity
      try {
        const data = await listBlogPosts();
        setPosts(data);
      } catch (refetchErr) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === post.id) {
              return { ...p, canonical_url: wasFeatured ? 'featured' : '' };
            }
            return p;
          })
        );
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listBlogPosts();
        setPosts(data);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filtered = posts.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countByStatus = Object.keys(STATUS_META).reduce((acc, k) => {
    acc[k] = k === 'all' ? posts.length : posts.filter(p => p.status === k).length;
    return acc;
  }, {});

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteBlogPost(deleteId);
      setPosts((prev) => prev.filter((p) => p.id !== deleteId));
      toast('Post deleted.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handlePage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="bll-page">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bll-header">
        <div className="bll-header-left">
          <h1 className="bll-title">Blog Posts</h1>
          <p className="bll-subtitle">Create and manage SEO-optimised articles</p>
        </div>
        <button className="bll-new-btn" onClick={() => navigate('/blog/new')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Post
        </button>
      </div>

      {/* ── Controls: search + status filter ────────────────────── */}
      <div className="bll-controls">
        {/* Search */}
        <div className="bll-search-wrap">
          <svg className="bll-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="bll-search"
            type="text"
            placeholder="Search title or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="bll-search-clear" onClick={() => setSearch('')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Status filter chips */}
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
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="bll-body">
        {/* Table skeleton load */}
        {loading ? (
          <div className="bll-table-wrap">
            <table className="bll-table">
              <thead>
                <tr>
                  <th className="bll-th-left" style={{ width: '38%' }}>Title</th>
                  <th>Slug</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bll-row bll-row--skeleton">
                    <td><div className="bll-skel bll-skel--title" /><div className="bll-skel bll-skel--sub" /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--slug" style={{ margin: '0 auto' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--star" style={{ margin: '0 auto', width: '20px', height: '20px', borderRadius: '50%', background: '#E2E8F0' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--badge" style={{ margin: '0 auto' }} /></td>
                    <td style={{ textAlign: 'center' }}><div className="bll-skel bll-skel--date" style={{ margin: '0 auto' }} /></td>
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
            <p className="bll-empty-title">{search || statusFilter !== 'all' ? 'No posts match your filters' : 'No posts yet'}</p>
            <p className="bll-empty-sub">{search || statusFilter !== 'all' ? 'Try adjusting the search or filter.' : 'Create your first blog post to get started.'}</p>
            {!search && statusFilter === 'all' && (
              <button className="bll-new-btn" style={{ marginTop: 4 }} onClick={() => navigate('/blog/new')}>Create First Post</button>
            )}
          </div>
        ) : (
          <div className="bll-table-wrap">

            {/* Pagination — top */}
            <div className="bll-table-toolbar">
              <span className="bll-result-count">
                {filtered.length} post{filtered.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' ? ` · ${STATUS_META[statusFilter]?.label}` : ''}
                {search ? ` · "${search}"` : ''}
              </span>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
            </div>

            {/* Table */}
            <table className="bll-table">
              <thead>
                <tr>
                  <th className="bll-th-left" style={{ width: '38%' }}>Title</th>
                  <th>Slug</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((post) => {
                  const m = STATUS_META[post.status] || STATUS_META.draft;
                  return (
                    <tr key={post.id} className="bll-row" style={{ borderLeft: `3px solid ${m.border}` }}>

                      {/* Title — left aligned */}
                      <td className="bll-td-title">
                        {post.featured_image_url && (
                          <img src={post.featured_image_url} alt="" className="bll-thumb" />
                        )}
                        <div className="bll-td-title-text">
                          <div className="bll-post-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {post.title || '(Untitled)'}
                            {post.canonical_url === 'featured' && (
                              <span className="bll-badge bll-badge--published" style={{ background: '#EFF6FF', color: '#0256d6', borderColor: '#BFDBFE', fontSize: '10px', padding: '2px 8px', fontWeight: 'bold', textTransform: 'capitalize', cursor: 'default' }}>
                                Featured
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

                      {/* Slug — centre */}
                      <td className="bll-td-center">
                        <code className="bll-slug">{post.slug || '—'}</code>
                      </td>

                      {/* Featured — centre star toggle */}
                      <td className="bll-td-center">
                        <button
                          onClick={() => handleToggleFeatured(post)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease, background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title={post.canonical_url === 'featured' ? 'Remove from Featured' : 'Mark as Featured'}
                        >
                          {post.canonical_url === 'featured' ? (
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ) : (
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          )}
                        </button>
                      </td>

                      {/* Status — centre */}
                      <td className="bll-td-center">
                        <StatusBadge status={post.status} />
                      </td>

                      {/* Date — centre */}
                      <td className="bll-td-center bll-td-date">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="bll-unpublished">—</span>}
                      </td>

                      {/* Actions — centre */}
                      <td className="bll-td-center">
                        <div className="bll-actions-inner">
                          <button className="bll-action-btn bll-action-btn--edit" onClick={() => navigate(`/blog/${post.id}`)}>
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
                              <path d="M10 11v6"/><path d="M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
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

            {/* Pagination — bottom */}
            <div className="bll-table-footer">
              <span className="bll-result-count">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
            </div>

          </div>
        )}
      </div>

      {/* ── Delete confirm ───────────────────────────────────────── */}
      {deleteId && (
        <div className="bll-confirm-overlay" onClick={() => !deleting && setDeleteId(null)}>
          <div className="bll-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bll-confirm-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="bll-confirm-title">Delete this post?</h3>
            <p className="bll-confirm-body">This cannot be undone. The post will be permanently removed.</p>
            <div className="bll-confirm-actions">
              <button className="bll-confirm-cancel" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="bll-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogList;
