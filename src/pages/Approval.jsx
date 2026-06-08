import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Approval.css';
import { supabase } from '../lib/supabase';
import { updateAdminProfile, fetchAdminOrgProfiles } from '../lib/adminProfileApi';
import ToastContainer, { useToast } from '../components/Toast';

const STATUS_CHIPS = ['All', 'Pending', 'Approved', 'Archived'];
const PAGE_SIZE = 8;
const STATUS_ORDER = { pending: 0, approved: 1, archived: 2 };

const getScoreLabel = (score) => {
  const s = Number(score || 0);
  if (s >= 90) return 'Exceptional';
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Strong';
  if (s >= 40) return 'Notable';
  if (s > 0)  return 'Emerging';
  return '';
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const isMissingColumnError = (error, ...columns) => {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return columns.some((col) => msg.includes(col.toLowerCase()) && msg.includes('column'));
};

/* ══════════════════════════════════════════════
   ApprovalCard — Person profiles
   ══════════════════════════════════════════════ */
const ApprovalCard = ({ entity, onStatusChange, onPaymentChange }) => {
  const [imageError, setImageError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  const approvalStatus   = entity.approval_status || 'pending';
  const paymentStatus    = (entity.Payment_status || '').toLowerCase() === 'paid' ? 'paid' : 'unpaid';
  const isPaid           = paymentStatus === 'paid';
  const isHiddenFromLexicon = approvalStatus === 'pending' || approvalStatus === 'archived';

  const isProfileBuilding = Number(entity.authority_score || 0) === 0 && !entity.company;
  const scoreLabel        = getScoreLabel(entity.authority_score);
  const tags              = entity.sector ? entity.sector.split(',').map(t => t.trim()).filter(Boolean) : [];
  const formattedDate     = formatDate(entity.updated_at);
  const initials          = (entity.name || '').split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const imgSrc            = entity.card_photo_url || entity.image_url;

  useEffect(() => { setImageError(false); }, [imgSrc]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdating(true);
    await onStatusChange(entity.user_id, newStatus);
    setUpdating(false);
  };

  const handlePaymentChange = async (e) => {
    const newPayment = e.target.value;
    setPaymentUpdating(true);
    await onPaymentChange(entity.user_id, newPayment);
    setPaymentUpdating(false);
  };

  return (
    <div className={`nc-card nc-card--${approvalStatus}`}>
      <div className="nc-image-wrap">
        {isProfileBuilding ? (
          <div className="nc-image-skeleton" aria-hidden="true" />
        ) : imgSrc && !imageError ? (
          <img src={imgSrc} alt={entity.name} className="nc-image" onError={() => setImageError(true)} />
        ) : (
          <div className="nc-image-fallback" aria-label={`${entity.name} initials`}>
            <span>{initials || 'NA'}</span>
          </div>
        )}

        {entity.is_premium && (
          <div className="nc-verified-overlay">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            21NEWS Verified
          </div>
        )}

        {!isProfileBuilding && scoreLabel && (
          <div className="nc-score-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span className="nc-score-num">{entity.authority_score}</span>
            <span className="nc-score-lbl">{scoreLabel}</span>
          </div>
        )}

        {isPaid && (
          <div className="nc-approval-tags">
            <span className="nc-tag nc-tag--paid">Paid</span>
          </div>
        )}
      </div>

      <div className="nc-body">
        <div className="nc-status-row">
          <div className={`nc-lexicon-status nc-lexicon-status--${approvalStatus}`}>
            {approvalStatus === 'approved' ? (
              <><span className="nc-live-dot" />Live on Lexicon</>
            ) : approvalStatus === 'archived' ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                Archived
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                Not visible
              </>
            )}
          </div>

          <div className={`nc-payment-inline${paymentUpdating ? ' nc-payment-inline--loading' : ''}`}>
            <select
              className={`nc-payment-select nc-payment-select--${paymentStatus}`}
              value={paymentStatus}
              onChange={handlePaymentChange}
              disabled={paymentUpdating}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
            <div className="nc-select-arrow">
              {paymentUpdating ? <div className="nc-spinner" /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {isProfileBuilding ? (
          <>
            <div className="nc-skeleton">
              <div className="nc-skeleton-line nc-skeleton-line--name" />
              <div className="nc-skeleton-line nc-skeleton-line--role" />
              <div className="nc-skeleton-line nc-skeleton-line--meta" />
            </div>
            <div className="nc-pending-status">
              Profile is under process and building. It may take some time to appear.
            </div>
          </>
        ) : (
          <>
            <h3 className="nc-name">{entity.name}</h3>
            <span className="nc-type-pill">Person</span>
            {entity.role && <p className="nc-role">{entity.role}</p>}

            {tags.length > 0 && (
              <div className="nc-tags">
                {tags.map(tag => (
                  <span key={tag} className="nc-tag-sector">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="nc-meta-row">
              {entity.location && (
                <div className="nc-meta-col">
                  <span className="nc-meta-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Location
                  </span>
                  <span className="nc-meta-val">{entity.location}</span>
                </div>
              )}
              {formatDate(entity.updated_at) && (
                <div className="nc-meta-col">
                  <span className="nc-meta-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Updated
                  </span>
                  <span className="nc-meta-val">{formatDate(entity.updated_at)}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="nc-status-wrap">
          <div className={`nc-select-wrapper${false ? ' nc-select-wrapper--loading' : ''}`}>
            <select
              className={`nc-status-select nc-status-select--${approvalStatus}`}
              value={approvalStatus}
              onChange={handleStatusChange}
              disabled={false}
            >
              <option value="pending">Pending — not visible in Lexicon</option>
              <option value="approved">Approved — live at Lexicon</option>
              <option value="archived">Archived — removed from Lexicon</option>
            </select>
            <div className="nc-select-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="nc-divider" />

        <div className="nc-actions">
          {isProfileBuilding ? (
            <span className="nc-cta nc-cta--disabled">Profile Pending</span>
          ) : (
            <Link to={`/entity/${entity.entity_slug || entity.user_id}`} className="nc-cta">
              <span>View Authority Profile</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   OrgApprovalCard — Organisation profiles
   ══════════════════════════════════════════════ */
const OrgApprovalCard = ({ entity, onStatusChange, onPaymentChange }) => {
  const [imageError, setImageError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  const approvalStatus = entity.approval_status || 'pending';
  const paymentStatus  = (entity.Payment_status || '').toLowerCase() === 'paid' ? 'paid' : 'unpaid';
  const isPaid         = paymentStatus === 'paid';

  const scoreLabel    = getScoreLabel(entity.authority_score);
  const tags          = entity.industry ? entity.industry.split(',').map(t => t.trim()).filter(Boolean) : [];
  const initials      = (entity.organization_name || '').split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const imgSrc        = entity.card_photo_url || entity.image_url;

  useEffect(() => { setImageError(false); }, [imgSrc]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdating(true);
    await onStatusChange(entity.user_id, newStatus);
    setUpdating(false);
  };

  const handlePaymentChange = async (e) => {
    const newPayment = e.target.value;
    setPaymentUpdating(true);
    await onPaymentChange(entity.user_id, newPayment);
    setPaymentUpdating(false);
  };

  return (
    <div className={`nc-card nc-card--${approvalStatus}`}>
      <div className="nc-image-wrap">
        {imgSrc && !imageError ? (
          <img src={imgSrc} alt={entity.organization_name} className="nc-image" onError={() => setImageError(true)} />
        ) : (
          <div className="nc-image-fallback" aria-label={`${entity.organization_name} initials`}>
            <span>{initials || 'ORG'}</span>
          </div>
        )}

        {entity.is_premium && (
          <div className="nc-verified-overlay">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            21NEWS Verified
          </div>
        )}

        {scoreLabel && (
          <div className="nc-score-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span className="nc-score-num">{entity.authority_score}</span>
            <span className="nc-score-lbl">{scoreLabel}</span>
          </div>
        )}

        {isPaid && (
          <div className="nc-approval-tags">
            <span className="nc-tag nc-tag--paid">Paid</span>
          </div>
        )}
      </div>

      <div className="nc-body">
        <div className="nc-status-row">
          <div className={`nc-lexicon-status nc-lexicon-status--${approvalStatus}`}>
            {approvalStatus === 'approved' ? (
              <><span className="nc-live-dot" />Live on Lexicon</>
            ) : approvalStatus === 'archived' ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                Archived
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                Not visible
              </>
            )}
          </div>

          <div className={`nc-payment-inline${paymentUpdating ? ' nc-payment-inline--loading' : ''}`}>
            <select
              className={`nc-payment-select nc-payment-select--${paymentStatus}`}
              value={paymentStatus}
              onChange={handlePaymentChange}
              disabled={paymentUpdating}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
            <div className="nc-select-arrow">
              {paymentUpdating ? <div className="nc-spinner" /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <h3 className="nc-name">{entity.organization_name}</h3>
        <span className="nc-type-pill">Organisation</span>

        {entity.tagline && <p className="nc-role">{entity.tagline}</p>}

        {tags.length > 0 && (
          <div className="nc-tags">
            {tags.map(tag => (
              <span key={tag} className="nc-tag-sector">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="nc-meta-row">
          {entity.location && (
            <div className="nc-meta-col">
              <span className="nc-meta-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Location
              </span>
              <span className="nc-meta-val">{entity.location}</span>
            </div>
          )}
          {formatDate(entity.updated_at) && (
            <div className="nc-meta-col">
              <span className="nc-meta-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Updated
              </span>
              <span className="nc-meta-val">{formatDate(entity.updated_at)}</span>
            </div>
          )}
        </div>

        <div className="nc-status-wrap">
          <div className={`nc-select-wrapper${updating ? ' nc-select-wrapper--loading' : ''}`}>
            <select
              className={`nc-status-select nc-status-select--${approvalStatus}`}
              value={approvalStatus}
              onChange={handleStatusChange}
              disabled={updating}
            >
              <option value="pending">Pending — not visible in Lexicon</option>
              <option value="approved">Approved — live at Lexicon</option>
              <option value="archived">Archived — removed from Lexicon</option>
            </select>
            <div className="nc-select-arrow">
              {updating ? <div className="nc-spinner" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </div>
          </div>
        </div>

        <div className="nc-divider" />

        <div className="nc-actions">
          <Link to={`/organization/${entity.entity_slug || entity.user_id}`} className="nc-cta">
            <span>View Organisation Profile</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   Approval Page
   ══════════════════════════════════════════════ */
const Approval = () => {
  const [persons, setPersons]           = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeType, setActiveType]     = useState('persons');
  const [search, setSearch]             = useState('');
  const [activeChip, setActiveChip]     = useState('All');
  const [page, setPage]                 = useState(1);
  const { toasts, toast, dismiss }      = useToast();

  /* ── fetch persons from entities_master ── */
  const fetchPersonsData = async () => {
    const coreSelect = 'user_id, name, role, location, badge, entity_type, authority_score, image_url, company, sector, updated_at, created_at, is_premium';

    let result = await supabase
      .from('entities_master')
      .select(`${coreSelect}, entity_slug, approval_status, Payment_status`)
      .order('name', { ascending: true });

    if (result.error && isMissingColumnError(result.error, 'entity_slug')) {
      result = await supabase
        .from('entities_master')
        .select(`${coreSelect}, approval_status, Payment_status`)
        .order('name', { ascending: true });
    }

    if (result.error && isMissingColumnError(result.error, 'approval_status', 'payment_status')) {
      result = await supabase
        .from('entities_master')
        .select(coreSelect)
        .order('name', { ascending: true });
      console.warn('approval_status / Payment_status columns not found in entities_master.');
    }

    const { data, error } = result;
    if (error) { console.error('Persons fetch error:', error); return []; }

    const [, cardPhotoResult] = await Promise.all([
      supabase.from('google_search_sources').select('user_id'),
      supabase.from('user_details').select('user_id, cropped_photo_url'),
    ]);

    const photoMap = (cardPhotoResult.data || []).reduce((acc, r) => {
      acc[r.user_id] = r.cropped_photo_url || null;
      return acc;
    }, {});

    return (data || []).map((e) => ({
      ...e,
      card_photo_url: photoMap[e.user_id] || null,
      approval_status: e.approval_status ? e.approval_status.toLowerCase() : undefined,
    }));
  };

  /* ── fetch organisations via admin API (bypasses RLS on master_organization_entities) ── */
  const fetchOrgsData = async () => {
    let data;
    try {
      data = await fetchAdminOrgProfiles();
    } catch (err) {
      console.error('Organisations fetch error:', err);
      return [];
    }

    const { data: orgPhotoRows } = await supabase
      .from('organization_details')
      .select('user_id, cropped_profile_picture_url, profile_picture_url');

    const photoMap = (orgPhotoRows || []).reduce((acc, r) => {
      acc[r.user_id] = r.cropped_profile_picture_url || r.profile_picture_url || null;
      return acc;
    }, {});

    return data.map((e) => ({
      ...e,
      card_photo_url: photoMap[e.user_id] || null,
      approval_status: e.approval_status ? e.approval_status.toLowerCase() : undefined,
    }));
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [personsData, orgsData] = await Promise.all([
      fetchPersonsData(),
      fetchOrgsData(),
    ]);
    setPersons(personsData);
    setOrganizations(orgsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── derived state based on active type ── */
  const activeEntities = activeType === 'persons' ? persons : organizations;
  const nameKey        = activeType === 'persons' ? 'name' : 'organization_name';

  const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', archived: 'Archived' };

  const handleStatusChange = async (userId, newStatus) => {
    const table = activeType === 'organizations' ? 'master_organization_entities' : undefined;
    try {
      await updateAdminProfile({ userId, updateData: { approval_status: newStatus }, table });
      const updater = (prev) => prev.map((e) => (e.user_id === userId ? { ...e, approval_status: newStatus } : e));
      activeType === 'persons' ? setPersons(updater) : setOrganizations(updater);
      toast(`Status set to "${STATUS_LABELS[newStatus] || newStatus}"`, 'success');
    } catch (err) {
      toast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handlePaymentChange = async (userId, newPayment) => {
    const table = activeType === 'organizations' ? 'master_organization_entities' : undefined;
    try {
      await updateAdminProfile({ userId, updateData: { Payment_status: newPayment }, table });
      const updater = (prev) => prev.map((e) => (e.user_id === userId ? { ...e, Payment_status: newPayment } : e));
      activeType === 'persons' ? setPersons(updater) : setOrganizations(updater);
      toast(`Payment set to "${newPayment === 'paid' ? 'Paid' : 'Unpaid'}"`, 'success');
    } catch (err) {
      toast(`Failed to update payment: ${err.message}`, 'error');
    }
  };

  const filtered = activeEntities
    .filter((e) => {
      if (search && !e[nameKey]?.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeChip !== 'All') {
        const entityStatus = e.approval_status || 'pending';
        if (entityStatus !== activeChip.toLowerCase()) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const sa = STATUS_ORDER[a.approval_status || 'pending'] ?? 0;
      const sb = STATUS_ORDER[b.approval_status || 'pending'] ?? 0;
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    All:      activeEntities.length,
    Pending:  activeEntities.filter((e) => (e.approval_status || 'pending') === 'pending').length,
    Approved: activeEntities.filter((e) => e.approval_status === 'approved').length,
    Archived: activeEntities.filter((e) => e.approval_status === 'archived').length,
  };

  const handleChipChange  = (chip) => { setActiveChip(chip); setPage(1); };
  const handleSearch      = (e)    => { setSearch(e.target.value); setPage(1); };
  const handleTypeChange  = (type) => { setActiveType(type); setActiveChip('All'); setSearch(''); setPage(1); };

  return (
    <div className="apv-page">
      <div className="apv-header">
        <div className="apv-header-inner">
          <h1>Profile Approvals</h1>
          <p>Manage profile visibility in the Lexicon directory. Approve, archive, or keep profiles pending.</p>
        </div>
      </div>

      <div className="apv-controls">
        {/* Search + type toggle on same row */}
        <div className="apv-search-row">
          <div className="apv-search">
            <div className="apv-search-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={activeType === 'persons' ? 'Search persons...' : 'Search organisations...'}
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="apv-type-toggle">
            <button
              className={`apv-type-btn${activeType === 'persons' ? ' active' : ''}`}
              onClick={() => handleTypeChange('persons')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              Persons
            </button>
            <button
              className={`apv-type-btn${activeType === 'organizations' ? ' active' : ''}`}
              onClick={() => handleTypeChange('organizations')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              Organisations
            </button>
          </div>
        </div>

        <div className="apv-chips">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`apv-chip apv-chip--${chip.toLowerCase()}${activeChip === chip ? ' active' : ''}`}
              onClick={() => handleChipChange(chip)}
            >
              {chip}
              <span className="apv-chip-count">{counts[chip]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="apv-results">
        {loading ? (
          <div className="apv-loading">Loading profiles...</div>
        ) : paginated.length === 0 ? (
          <div className="apv-loading">No profiles found.</div>
        ) : (
          <div className="apv-grid">
            {paginated.map((entity) =>
              activeType === 'organizations' ? (
                <OrgApprovalCard
                  key={entity.user_id}
                  entity={entity}
                  onStatusChange={handleStatusChange}
                  onPaymentChange={handlePaymentChange}
                />
              ) : (
                <ApprovalCard
                  key={entity.user_id}
                  entity={entity}
                  onStatusChange={handleStatusChange}
                  onPaymentChange={handlePaymentChange}
                />
              )
            )}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="apv-pagination">
            <button className="apv-page-btn apv-page-btn--nav" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`apv-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="apv-page-btn apv-page-btn--nav" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default Approval;
