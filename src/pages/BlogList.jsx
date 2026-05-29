import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBlogPosts, deleteBlogPost } from '../lib/blogApi';
import ToastContainer, { useToast } from '../components/Toast';
import './BlogList.css';

const PAGE_SIZE = 10;

const STATUS_FILTERS = ['All', 'draft', 'pending_review', 'approved', 'published', 'scheduled'];

const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  published: 'Published',
  scheduled: 'Scheduled',
};

const STATUS_COLORS = {
  draft: { bg: '#f1f5f9', text: '#475569' },
  pending_review: { bg: '#eff6ff', text: '#2563eb' },
  approved: { bg: '#f0fdf4', text: '#16a34a' },
  published: { bg: '#dcfce7', text: '#15803d' },
  scheduled: { bg: '#fefce8', text: '#ca8a04' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span className="bl-status-badge" style={{ background: c.bg, color: c.text }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

const BlogList = () => {
  const navigate = useNavigate();
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const { toasts, toast: showToastMsg, dismiss } = useToast();

  const showToast = (msg, type = 'success') => showToastMsg(msg, type);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await listBlogPosts();
        setPosts(data);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = posts.filter((p) => {
    const matchStatus = filter === 'All' || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteBlogPost(deleteId);
      setPosts((prev) => prev.filter((p) => p.id !== deleteId));
      showToast('Post deleted.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const countsByStatus = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = posts.filter((p) => p.status === s).length;
    return acc;
  }, {});

  return (
    <div className="bl-page">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="bl-header">
        <div>
          <h1 className="bl-title">Blog</h1>
          <p className="bl-subtitle">Create and manage SEO-optimised articles</p>
        </div>
        <button className="bl-new-btn" onClick={() => navigate('/blog/new')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Post
        </button>
      </div>

      <div className="bl-controls">
        <div className="bl-search-wrap">
          <svg className="bl-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="bl-search"
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="bl-filters">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`bl-filter-btn${filter === s ? ' active' : ''}`}
              onClick={() => { setFilter(s); setPage(1); }}
            >
              {s === 'All' ? 'All' : STATUS_LABELS[s]}
              {s !== 'All' && countsByStatus[s] > 0 && (
                <span className="bl-filter-count">{countsByStatus[s]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bl-loading">
          <div className="bl-spinner" />
          <span>Loading posts…</span>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>{search || filter !== 'All' ? 'No posts match your filters.' : 'No posts yet. Create your first post.'}</p>
          {!search && filter === 'All' && (
            <button className="bl-new-btn" onClick={() => navigate('/blog/new')}>Create First Post</button>
          )}
        </div>
      ) : (
        <div className="bl-table-wrap">
          <table className="bl-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((post) => (
                <tr key={post.id} className="bl-row">
                  <td className="bl-td-title">
                    {post.featured_image_url && (
                      <img src={post.featured_image_url} alt="" className="bl-thumb" />
                    )}
                    <div className="bl-title-text">
                      <span className="bl-post-title">{post.title || '(Untitled)'}</span>
                      {post.excerpt && <span className="bl-post-excerpt">{post.excerpt.substring(0, 80)}{post.excerpt.length > 80 ? '…' : ''}</span>}
                    </div>
                  </td>
                  <td className="bl-td-slug">
                    <span className="bl-slug">{post.slug || '—'}</span>
                  </td>
                  <td>
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="bl-td-date">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="bl-td-actions">
                    <button className="bl-action-btn" onClick={() => navigate(`/blog/${post.id}`)} title="Edit">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="bl-action-btn bl-action-btn--delete" onClick={() => setDeleteId(post.id)} title="Delete">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="bl-pagination">
          <button className="bl-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            ← Prev
          </button>
          <span className="bl-page-info">Page {page} of {totalPages}</span>
          <button className="bl-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}

      {deleteId && (
        <div className="bl-confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="bl-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Post?</h3>
            <p>This action cannot be undone. The post will be permanently removed.</p>
            <div className="bl-confirm-actions">
              <button className="bl-confirm-cancel" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="bl-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogList;
