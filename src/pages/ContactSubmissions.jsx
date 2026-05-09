import { useState, useEffect, useCallback } from 'react';
import './ContactSubmissions.css';
import { supabase } from '../lib/supabase';
import { updateSubmissionStatus, deleteContactSubmission } from '../lib/contactSubmissionsApi';
import ToastContainer, { useToast } from '../components/Toast';

const STATUS_CHIPS = ['All', 'New', 'Read', 'Resolved'];
const PAGE_SIZE = 10;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ status }) => (
  <span className={`cs-badge cs-badge--${status || 'new'}`}>
    {status === 'new' && <span className="cs-badge-dot" />}
    {(status || 'new').charAt(0).toUpperCase() + (status || 'new').slice(1)}
  </span>
);

/* ── Detail Panel ── */
const DetailPanel = ({ submission, onClose, onStatusChange, onDelete }) => {
  if (!submission) return null;

  const status = submission.status || 'new';
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatus = async (newStatus) => {
    setUpdating(true);
    await onStatusChange(submission.id, newStatus);
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeleting(true);
    await onDelete(submission.id);
    setDeleting(false);
  };

  return (
    <div className="cs-panel-overlay" onClick={onClose}>
      <div className="cs-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cs-panel-header">
          <div className="cs-panel-title-row">
            <h2 className="cs-panel-title">{submission.subject || submission.title || 'No Subject'}</h2>
            <StatusBadge status={status} />
          </div>
          <button className="cs-panel-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cs-panel-meta">
          <div className="cs-panel-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span>{submission.name || submission.full_name || '—'}</span>
          </div>
          <div className="cs-panel-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            <a href={`mailto:${submission.email}`} className="cs-panel-link">{submission.email || '—'}</a>
          </div>
          {(submission.phone || submission.mobile) && (
            <div className="cs-panel-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1.14h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{submission.phone || submission.mobile}</span>
            </div>
          )}
          <div className="cs-panel-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDate(submission.created_at || submission.submitted_at)}</span>
          </div>
        </div>

        <div className="cs-panel-message">
          <div className="cs-panel-message-label">Message</div>
          <div className="cs-panel-message-body">{submission.message || submission.body || '—'}</div>
        </div>

        {submission.notes && (
          <div className="cs-panel-message">
            <div className="cs-panel-message-label">Notes</div>
            <div className="cs-panel-message-body cs-panel-message-body--notes">{submission.notes}</div>
          </div>
        )}

        <div className="cs-panel-actions">
          <div className="cs-panel-status-wrap">
            <label className="cs-panel-status-label">Mark as</label>
            <div className="cs-panel-status-btns">
              {['new', 'read', 'resolved'].map((s) => (
                <button
                  key={s}
                  className={`cs-status-btn cs-status-btn--${s}${status === s ? ' active' : ''}`}
                  onClick={() => handleStatus(s)}
                  disabled={updating || status === s}
                >
                  {updating && status !== s ? '...' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button className="cs-delete-btn" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <span className="cs-spinner" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const ContactSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const { toasts, toast, dismiss } = useToast();

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);

    let result = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    // Retry without order if created_at column doesn't exist
    if (result.error?.message?.includes('created_at')) {
      result = await supabase.from('contact_submissions').select('*');
    }

    const { data, error } = result;

    if (error) {
      if (error.code === '42P01') {
        setTableNotFound(true);
      } else {
        toast(`Failed to load: ${error.message}`, 'error');
      }
      setSubmissions([]);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateSubmissionStatus(id, newStatus);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      if (selected?.id === id) setSelected((prev) => ({ ...prev, status: newStatus }));
      toast(`Marked as "${newStatus}"`, 'success');
    } catch (err) {
      toast(`Failed to update: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContactSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSelected(null);
      toast('Submission deleted', 'success');
    } catch (err) {
      toast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    if (q) {
      const name  = (s.name || s.full_name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const subj  = (s.subject || s.title || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !subj.includes(q)) return false;
    }
    if (activeChip !== 'All') {
      const st = s.status || 'new';
      if (st !== activeChip.toLowerCase()) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    All:      submissions.length,
    New:      submissions.filter((s) => (s.status || 'new') === 'new').length,
    Read:     submissions.filter((s) => s.status === 'read').length,
    Resolved: submissions.filter((s) => s.status === 'resolved').length,
  };

  const handleChipChange = (chip) => { setActiveChip(chip); setPage(1); };
  const handleSearch     = (e)    => { setSearch(e.target.value); setPage(1); };

  return (
    <div className="cs-page">
      <div className="cs-header">
        <div className="cs-header-inner">
          <div className="cs-header-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1>Contact Requests</h1>
            <p>Review and respond to messages submitted via the Contact Us form.</p>
          </div>
          {counts.New > 0 && (
            <div className="cs-header-new-badge">{counts.New} new</div>
          )}
        </div>
      </div>

      <div className="cs-controls">
        <div className="cs-search">
          <div className="cs-search-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input type="text" placeholder="Search by name, email or subject..." value={search} onChange={handleSearch} />
        </div>

        <div className="cs-chips">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`cs-chip cs-chip--${chip.toLowerCase()}${activeChip === chip ? ' active' : ''}`}
              onClick={() => handleChipChange(chip)}
            >
              {chip}
              <span className="cs-chip-count">{counts[chip]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cs-results">
        {loading ? (
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="cs-row cs-skeleton-row">
                    <td><div className="cs-skel cs-skel--badge" /></td>
                    <td><div className="cs-skel cs-skel--name" /></td>
                    <td><div className="cs-skel cs-skel--email" /></td>
                    <td>
                      <div className="cs-skel cs-skel--subject" />
                      <div className="cs-skel cs-skel--preview" />
                    </td>
                    <td><div className="cs-skel cs-skel--date" /></td>
                    <td><div className="cs-skel cs-skel--actions" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tableNotFound ? (
          <div className="cs-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="cs-empty-title">Table not found</p>
            <p className="cs-empty-sub">The <code>contact_submissions</code> table does not exist in your database yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cs-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="cs-empty-title">No submissions found</p>
            <p className="cs-empty-sub">{search ? 'Try a different search term.' : 'No contact requests yet.'}</p>
          </div>
        ) : (
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sub) => {
                  const status = sub.status || 'new';
                  return (
                    <tr
                      key={sub.id}
                      className={`cs-row cs-row--${status}`}
                      onClick={() => setSelected(sub)}
                    >
                      <td><StatusBadge status={status} /></td>
                      <td className="cs-cell-name">{sub.name || sub.full_name || '—'}</td>
                      <td className="cs-cell-email">{sub.email || '—'}</td>
                      <td className="cs-cell-subject">
                        <span className="cs-subject-text">{sub.subject || sub.title || '—'}</span>
                        {sub.message && (
                          <span className="cs-message-preview">
                            {sub.message.slice(0, 80)}{sub.message.length > 80 ? '…' : ''}
                          </span>
                        )}
                      </td>
                      <td className="cs-cell-date">{formatDate(sub.created_at || sub.submitted_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="cs-row-actions">
                          <button
                            className="cs-row-btn cs-row-btn--view"
                            onClick={() => setSelected(sub)}
                            title="View"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>
                          {status === 'new' && (
                            <button
                              className="cs-row-btn cs-row-btn--read"
                              onClick={() => handleStatusChange(sub.id, 'read')}
                              title="Mark as read"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                              Read
                            </button>
                          )}
                          {status !== 'resolved' && (
                            <button
                              className="cs-row-btn cs-row-btn--resolve"
                              onClick={() => handleStatusChange(sub.id, 'resolved')}
                              title="Mark as resolved"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="cs-pagination">
            <button className="cs-page-btn cs-page-btn--nav" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`cs-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="cs-page-btn cs-page-btn--nav" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
      </div>

      {selected && (
        <DetailPanel
          submission={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default ContactSubmissions;
