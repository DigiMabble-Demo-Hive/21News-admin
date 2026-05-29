import { useState, useEffect, useCallback } from 'react';
import './EntityProfile.css';
import '../components/EntityCard.css';
import './ChangeRequests.css';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import { updateSubmissionStatus } from '../lib/contactSubmissionsApi';
import ToastContainer, { useToast } from '../components/Toast';
import EntityCard from '../components/EntityCard';
import {
  CheckCircle,
  MessageSquare,
  RefreshCw,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Search,
  Eye,
  FileText,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';

const STATUS_CHIPS = ['Pending', 'Changes Requested', 'Rejected', 'All', 'Approved'];
const PAGE_SIZE = 8;

const STATUS_FILTER_MAP = {
  'Pending': 'pending',
  'Changes Requested': 'change_requested',
  'Rejected': 'rejected',
  'Approved': 'approved',
  'All': 'all',
};

const STATUS_META = {
  pending:           { label: 'Pending Review',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  change_requested:  { label: 'Changes Requested',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  rejected:          { label: 'Rejected',             color: '#DC2626', bg: '#FFF1F2', border: '#FECACA', dot: '#EF4444' },
  approved:          { label: 'Approved',             color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
};

const ACTION_META = {
  approved:         { label: 'Approve & Publish Changes', color: '#059669', icon: 'check' },
  change_requested: { label: 'Request Adjustments',       color: '#D97706', icon: 'alert' },
  rejected:         { label: 'Reject Edits',              color: '#DC2626', icon: 'x' },
};

const VerifiedBadge = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="profile-verified-icon" style={{ verticalAlign: 'middle', marginLeft: '6px' }}>
    <circle cx="16" cy="16" r="3.5" fill="#0EA5E9"/>
    <circle cx="16" cy="16" r="3.5" fill="#0EA5E9" transform="rotate(45 16 16)"/>
    <circle cx="16" cy="16" r="3.5" fill="#0EA5E9" transform="rotate(90 16 16)"/>
    <circle cx="16" cy="16" r="3.5" fill="#0EA5E9" transform="rotate(135 16 16)"/>
    <circle cx="16" cy="7" r="3.5" fill="#0EA5E9"/>
    <circle cx="25" cy="16" r="3.5" fill="#0EA5E9"/>
    <circle cx="16" cy="25" r="3.5" fill="#0EA5E9"/>
    <circle cx="7" cy="16" r="3.5" fill="#0EA5E9"/>
    <circle cx="22" cy="10" r="3.5" fill="#0EA5E9"/>
    <circle cx="22" cy="22" r="3.5" fill="#0EA5E9"/>
    <circle cx="10" cy="22" r="3.5" fill="#0EA5E9"/>
    <circle cx="10" cy="10" r="3.5" fill="#0EA5E9"/>
    <circle cx="16" cy="16" r="10" fill="#0EA5E9"/>
    <path d="M11 16L14.5 19.5L21 13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SafeImage = ({ src, alt, className, fallbackClassName, fallbackText }) => {
  const [err, setErr] = useState(false);
  if (!src || err)
    return <div className={fallbackClassName} aria-label={`${alt} fallback`}><span>{fallbackText}</span></div>;
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />;
};

const getYouTubeThumbnail = (url) => {
  if (!url) return null;
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? `https://img.youtube.com/vi/${m[2]}/maxresdefault.jpg` : null;
};

const formatViews = (v) => {
  if (!v) return '0';
  if (typeof v === 'number') {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toLocaleString();
  }
  return v;
};

export default function ChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('Pending');
  const [page, setPage] = useState(1);
  
  // Selection represents the request we are viewing in full page
  const [selected, setSelected] = useState(null);
  const [liveProfile, setLiveProfile] = useState(null);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [editForm, setEditForm] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  
  const { toasts, toast, dismiss } = useToast();

  const [activeChangeField, setActiveChangeField] = useState(null);
  const [submittedProposed, setSubmittedProposed] = useState({});
  const [profileImages, setProfileImages] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [answeredFields, setAnsweredFields] = useState({});

  // Confirm + success modal state
  const [actionConfirm, setActionConfirm] = useState(null); // { type: 'approved'|'change_requested'|'rejected' }
  const [actionSuccess, setActionSuccess] = useState(null); // { type, name }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeChangeField) {
          setActiveChangeField(null);
        } else if (selected) {
          handleCloseReview();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, activeChangeField]);

  // Toggle sidebar collapse class on body during review mode
  useEffect(() => {
    if (selected) {
      document.body.classList.add('cr-review-active');
    } else {
      document.body.classList.remove('cr-review-active');
    }
    return () => {
      document.body.classList.remove('cr-review-active');
    };
  }, [selected]);

  const getChangedFields = () => {
    if (!liveProfile || !editForm) return [];
    const fields = [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'sector', label: 'Sector' },
      { key: 'location', label: 'Location' },
      { key: 'active_since', label: 'Since Year' },
      { key: 'bio', label: 'Biography' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'website_url', label: 'Website URL' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status' },
      { key: 'trust_tags', label: 'Trust Tags' },
      { key: 'awards', label: 'Awards' },
      { key: 'videos', label: 'Videos' },
      { key: 'publications', label: 'Publications' },
      { key: 'quick_facts', label: 'Quick Facts' }
    ];
    return fields.filter(f => isFieldChanged(f.key));
  };

  const getProposedFields = () => {
    if (!liveProfile || !submittedProposed) return [];
    const fields = [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'sector', label: 'Sector' },
      { key: 'location', label: 'Location' },
      { key: 'active_since', label: 'Since Year' },
      { key: 'bio', label: 'Biography' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'website_url', label: 'Website URL' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status' },
      { key: 'trust_tags', label: 'Trust Tags' },
      { key: 'awards', label: 'Awards' },
      { key: 'videos', label: 'Videos' },
      { key: 'publications', label: 'Publications' },
      { key: 'quick_facts', label: 'Quick Facts' }
    ];
    return fields.filter(f => {
      const orig = liveProfile?.[f.key] || '';
      const prop = submittedProposed?.[f.key];
      if (prop === undefined) return false;
      if (Array.isArray(orig) || Array.isArray(prop)) {
        return JSON.stringify(orig) !== JSON.stringify(prop);
      }
      return String(orig) !== String(prop);
    });
  };

  const getArrayVal = (key) => {
    const val = editForm[key] !== undefined ? editForm[key] : (liveProfile?.[key] || []);
    if (Array.isArray(val)) return val;
    try {
      if (typeof val === 'string') {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  const renderArrayValuePreview = (key, val, otherVal, isDeleted) => {
    if (!val) return <span className="cr-value-empty">None</span>;
    let arr = val;
    if (typeof val === 'string') {
      try { arr = JSON.parse(val); } catch { arr = []; }
    }
    let otherArr = otherVal || [];
    if (typeof otherVal === 'string') {
      try { otherArr = JSON.parse(otherVal); } catch { otherArr = []; }
    }
    if (!Array.isArray(otherArr)) otherArr = [];

    if (!Array.isArray(arr) || arr.length === 0) {
      return <span className="cr-value-empty">None (Cleared)</span>;
    }
    
    const otherStrings = new Set(otherArr.map(item => JSON.stringify(item)));

    return (
      <div className="cr-compare-array-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', width: '100%' }}>
        {arr.map((item, idx) => {
          let text = '';
          if (key === 'quick_facts') {
            text = `${item.label || 'Fact'}: "${item.value || '—'}" (${item.verified_sources || 0} sources)`;
          } else if (key === 'awards') {
            text = `${item.year || 'Year'} - ${item.title || 'Title'} (${item.issuer || 'Issuer'}) [${item.tag || 'Verified'}]${item.description ? ` — ${item.description}` : ''}`;
          } else if (key === 'videos') {
            text = `${item.title || 'Video'} [${item.type || 'Video'}]${item.duration ? ` (${item.duration})` : ''}${item.views ? ` — ${item.views} views` : ''}`;
          } else if (key === 'publications') {
            text = `[${item.type || 'Publication'}] ${item.title || 'Title'} in ${item.journal || 'Journal'} (${item.date || 'Date'})`;
          } else if (key === 'trust_tags') {
            text = `${item.name || 'Tag'} [${item.type || 'Tag'}]`;
          } else {
            text = JSON.stringify(item);
          }

          const isIdentical = otherStrings.has(JSON.stringify(item));
          let itemClass = '';
          let itemStyle = { color: '#334155', fontWeight: 500 };

          if (!isIdentical) {
            itemStyle = undefined;
            if (isDeleted) {
              itemClass = 'cr-value-deleted';
            } else {
              itemClass = 'cr-value-added';
            }
          }

          return (
            <div key={idx} className="cr-compare-array-preview-item" style={{ fontSize: '13px', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ color: isIdentical ? '#cbd5e1' : '#94a3b8' }}>•</span>
              <span className={itemClass} style={itemStyle}>{text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const scrollToAndHighlightField = (key) => {
    const el = document.getElementById(`cr-field-container-proposed-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('cr-highlight-pulse');
      setTimeout(() => {
        el.classList.remove('cr-highlight-pulse');
      }, 2000);
    }
  };

  const getFieldLabel = (key) => {
    const labels = {
      name: 'Name',
      role: 'Role',
      subtitle: 'Subtitle',
      sector: 'Sector',
      location: 'Location',
      active_since: 'Since Year',
      bio: 'Biography'
    };
    return labels[key] || key;
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('company', 'profile_change_request')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fetchedRequests = data || [];
      setRequests(fetchedRequests);

      // Extract unique userIds from submissions
      const userIds = [...new Set(fetchedRequests.map(r => r.email?.split('@')[0]))].filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('entities_master')
          .select('user_id, image_url')
          .in('user_id', userIds);
        
        if (!profileError && profiles) {
          const imageMap = {};
          profiles.forEach(p => {
            if (p.user_id && p.image_url) {
              imageMap[p.user_id] = p.image_url;
            }
          });
          setProfileImages(imageMap);
        }
      }
    } catch (err) {
      toast(`Failed to load requests: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  const loadLiveProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('entities_master')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setLiveProfile(data);
    } catch (err) {
      console.error('Failed to load active profile:', err);
    }
  };

  const handleReview = async (req) => {
    setSelected(req);
    setComment('');
    setLiveProfile(null);
    setSidebarCollapsed(false);
    setAnsweredFields({});
    
    const userId = req.email.split('@')[0];
    try {
      const { data: activeProfile, error } = await supabase
        .from('entities_master')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setLiveProfile(activeProfile || null);

      const payload = JSON.parse(req.message || '{}');
      setSubmittedProposed(payload.proposed || {});
      setComment(payload.admin_comment || '');

      const initialForm = {};
      if (activeProfile) {
        Object.keys(activeProfile).forEach(key => {
          initialForm[key] = activeProfile[key];
        });
      }
      setEditForm(initialForm);
    } catch (err) {
      console.error('Error loading request review:', err);
      setEditForm({});
      setSubmittedProposed({});
    }
  };

  function handleCloseReview() {
    setSelected(null);
    setLiveProfile(null);
  }

  const handleFieldChange = (key, val) => {
    setEditForm(prev => ({ ...prev, [key]: val }));
  };

  // Step 1: open confirm modal
  const requestAction = (type) => {
    setActionConfirm({ type });
  };

  // Step 2: confirmed — execute
  const handleAction = async () => {
    if (!selected || !actionConfirm) return;
    const statusType = actionConfirm.type;
    setActionLoading(true);

    const userId = selected.email.split('@')[0];
    const userName = selected.name || userId;
    let payload = { original: {}, proposed: {}, admin_comment: '' };
    try { payload = JSON.parse(selected.message); } catch { /* keep default */ }

    const SAFE_FIELDS = [
      'name', 'role', 'subtitle', 'bio', 'location', 'sector', 'company',
      'status', 'active_since', 'linkedin_url', 'website_url', 'trust_tags',
      'awards', 'videos', 'publications', 'quick_facts', 'image_url',
      'is_premium', 'badge'
    ];
    const finalProposed = {};
    SAFE_FIELDS.forEach(field => {
      if (editForm[field] !== undefined) {
        finalProposed[field] = editForm[field];
      }
    });
    // Filter original and proposed to ONLY include the audited/changed fields to fit under the CHECK constraint "message_length" limit
    const filteredOriginal = {};
    const filteredProposed = {};
    const proposedFieldsList = getProposedFields();
    
    proposedFieldsList.forEach(field => {
      const key = field.key;
      // Extract original live value
      if (liveProfile && liveProfile[key] !== undefined) {
        filteredOriginal[key] = liveProfile[key];
      } else if (payload.original && payload.original[key] !== undefined) {
        filteredOriginal[key] = payload.original[key];
      } else {
        filteredOriginal[key] = '';
      }

      // Extract the audited proposed value
      if (editForm[key] !== undefined) {
        filteredProposed[key] = editForm[key];
      } else if (submittedProposed[key] !== undefined) {
        filteredProposed[key] = submittedProposed[key];
      } else {
        filteredProposed[key] = '';
      }
    });

    const finalComment = comment ||
      (statusType === 'approved'         ? 'Your profile changes have been approved and published.' :
       statusType === 'change_requested' ? 'Please make the requested profile adjustments.' :
       'Proposed changes have been declined by the admin.');
    const messagePayload = JSON.stringify({
      original:      filteredOriginal,
      proposed:      filteredProposed,
      admin_comment: finalComment,
      reviewer_name: reviewerName || '21News Admin',
      reviewed_at:   new Date().toISOString(),
    });

    let profileSyncError = null;
    let submissionSyncError = null;

    // --- entities_master update ---
    const profileUpdateData =
      statusType === 'approved'         ? { ...finalProposed, approval_status: 'approved' } :
      statusType === 'change_requested' ? { approval_status: 'change_requested' } :
      /* rejected */                      { approval_status: 'approved' }; // keep live profile untouched
    try {
      await updateAdminProfile({ userId, updateData: profileUpdateData, table: 'entities_master' });
    } catch (err) {
      profileSyncError = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Profile sync failed error details:', err);
    }

    // --- contact_submissions status update ---
    try {
      await updateSubmissionStatus(selected.id, statusType, messagePayload);
    } catch (err) {
      submissionSyncError = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Submission status sync failed error details:', err);
    }

    setActionLoading(false);

    if (profileSyncError && submissionSyncError) {
      toast(`Action failed: ${profileSyncError}`, 'error');
      return;
    }
    if (profileSyncError) {
      toast(`Status updated, but profile sync incomplete: ${profileSyncError}`, 'error');
    }
    if (submissionSyncError) {
      toast(`Profile updated, but submission status sync failed: ${submissionSyncError}`, 'error');
    }

    setActionConfirm(null);
    setActionSuccess({ type: statusType, name: userName });
    await fetchRequests();
  };

  // Biography Difference Word Highlighter
  const renderBiographyWords = (oldText, newText, isProposedSide) => {
    const oVal = oldText || '';
    const nVal = newText || '';
    const punctuationRegex = new RegExp("[.,/#!$%^&*;:{}=\\-_`~()]", "g");

    if (!isProposedSide) {
      // Current side: Highlight deletions in red strikethrough
      if (oVal === nVal) return <p>{oVal}</p>;
      const oldWords = oVal.split(/\s+/);
      const newWords = nVal.split(/\s+/);
      const newSet = new Set(newWords.map(w => w.toLowerCase().replace(punctuationRegex, "")));

      return (
        <p>
          {oldWords.map((word, i) => {
            const clean = word.toLowerCase().replace(punctuationRegex, "");
            const isDeleted = !newSet.has(clean);
            return (
              <span
                key={i}
                className={isDeleted ? 'cr-word-deleted' : ''}
                style={isDeleted ? { marginRight: '4px' } : { marginRight: '4px' }}
              >
                {word}
              </span>
            );
          })}
        </p>
      );
    } else {
      // Proposed side: Highlight additions in bold green background
      if (oVal === nVal) return <p>{nVal}</p>;
      const oldWords = oVal.split(/\s+/);
      const newWords = nVal.split(/\s+/);
      const oldSet = new Set(oldWords.map(w => w.toLowerCase().replace(punctuationRegex, "")));

      return (
        <p>
          {newWords.map((word, i) => {
            const clean = word.toLowerCase().replace(punctuationRegex, "");
            const isAdded = !oldSet.has(clean);
            return (
              <span
                key={i}
                className={isAdded ? 'cr-word-added' : ''}
                style={isAdded ? { marginRight: '4px' } : { marginRight: '4px' }}
              >
                {word}
              </span>
            );
          })}
        </p>
      );
    }
  };

  // Compare helpers
  const getPropVal = (key) => {
    const val = editForm[key] !== undefined ? editForm[key] : (liveProfile?.[key] || '');
    if (Array.isArray(val)) {
      return JSON.stringify(val, null, 2);
    }
    return val || '';
  };

  const isFieldChanged = (key) => {
    const orig = liveProfile?.[key] || '';
    const prop = editForm[key] !== undefined ? editForm[key] : (liveProfile?.[key] || '');
    if (Array.isArray(orig) || Array.isArray(prop)) {
      let parsedOrig = orig;
      let parsedProp = prop;
      try {
        if (typeof orig === 'string') parsedOrig = JSON.parse(orig);
      } catch {
        // use default
      }
      try {
        if (typeof prop === 'string') parsedProp = JSON.parse(prop);
      } catch {
        // use default
      }
      return JSON.stringify(parsedOrig) !== JSON.stringify(parsedProp);
    }
    return String(orig) !== String(prop);
  };

  // Filter & pagination
  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q)) return false;
    if (activeChip !== 'All') {
      const targetStatus = STATUS_FILTER_MAP[activeChip];
      if (r.status !== targetStatus) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    All:                requests.length,
    Pending:            requests.filter((r) => r.status === 'pending').length,
    Approved:           requests.filter((r) => r.status === 'approved').length,
    'Changes Requested':requests.filter((r) => r.status === 'change_requested').length,
    Rejected:           requests.filter((r) => r.status === 'rejected').length,
  };

  const handleChipChange = (chip) => { setActiveChip(chip); setPage(1); };
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  /* ────────────────────────────────────────────────────── */
  if (selected) {
    const userId = selected.email.split('@')[0];
    const proposedAvatarText = getInitials(getPropVal('name'));
    const isPremium = liveProfile?.is_premium;
    const badge = liveProfile?.badge;

    const lastUpdatedDate = liveProfile?.updated_at
      ? new Date(liveProfile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    const currentIndex = filtered.findIndex(r => r.id === selected.id);
    const totalRequests = filtered.length;
    const changedFields = getChangedFields();

    const proposedFields = getProposedFields();
    const totalProposed = proposedFields.length;
    const answeredCount = proposedFields.filter(f => answeredFields[f.key] !== undefined).length;
    const allAnswered = totalProposed > 0 ? answeredCount === totalProposed : true;

    const handlePrevRequest = () => {
      if (currentIndex > 0) {
        handleReview(filtered[currentIndex - 1]);
      }
    };

    const handleNextRequest = () => {
      if (currentIndex < totalRequests - 1) {
        handleReview(filtered[currentIndex + 1]);
      }
    };

    // Unified field wrapper to handle click comparison & glow highlighting
    const renderClickableField = (key, label, children) => {
      const isChanged = isFieldChanged(key);
      const isAnswered = answeredFields[key] !== undefined;
      const shouldHighlight = isChanged && !isAnswered;

      let badgeElement = null;
      if (isChanged) {
        if (isAnswered) {
          const status = answeredFields[key];
          if (status === 'accepted') {
            badgeElement = (
              <span className="cr-inline-change-badge" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={10} style={{ marginRight: '4px' }} />
                Accepted
              </span>
            );
          } else if (status === 'reverted') {
            badgeElement = (
              <span className="cr-inline-change-badge" style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', boxShadow: '0 4px 6px rgba(100, 116, 139, 0.2)' }}>
                <XCircle size={10} style={{ marginRight: '4px' }} />
                Reverted
              </span>
            );
          } else if (status === 'custom') {
            badgeElement = (
              <span className="cr-inline-change-badge" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 6px rgba(249, 115, 22, 0.2)' }}>
                <RefreshCw size={10} style={{ marginRight: '4px' }} />
                Custom Override
              </span>
            );
          }
        } else {
          badgeElement = (
            <span className="cr-inline-change-badge">
              <RefreshCw size={10} style={{ marginRight: '4px' }} />
              Compare &amp; Edit
            </span>
          );
        }
      }

      return (
        <div 
          id={`cr-field-container-proposed-${key}`}
          className={`cr-clickable-field-wrapper ${shouldHighlight ? 'has-change' : ''}`}
          onClick={() => {
            if (isChanged) {
              scrollToAndHighlightField(key);
              setActiveChangeField(key);
            }
          }}
          title={isChanged ? `Click to compare and edit change for ${label}` : undefined}
          style={isAnswered ? { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', margin: '14px 0', backgroundColor: '#f8fafc', cursor: 'pointer' } : undefined}
        >
          <div className="cr-field-content-block">
            {children}
          </div>
          {badgeElement}
        </div>
      );
    };

    return (
      <div className="cr-page review-mode single-profile-mode animate-fade-in">
        {/* Sticky Header & Action Controls Container */}
        <div className="cr-review-sticky-header">
          
          {/* Header Controls */}
          <div className="cr-review-header">
            <div className="cr-header-left">
              <button className="btn-back-queue" onClick={handleCloseReview} title="Back to requests list (Esc)">
                <ArrowLeft size={16} />
                <span>Back to Queue</span>
              </button>
              <div className="cr-header-divider" />
              <div className="cr-header-profile-snippet">
                <div className="cr-mini-avatar">
                  {getPropVal('image_url') || liveProfile?.image_url ? (
                    <img src={getPropVal('image_url') || liveProfile?.image_url} alt={getPropVal('name')} />
                  ) : (
                    <span>{proposedAvatarText}</span>
                  )}
                </div>
                <div className="cr-mini-meta">
                  <div className="cr-mini-name">
                    <span>Reviewing Profile Changes:</span>
                    <h3>{getPropVal('name') || selected.name}</h3>
                  </div>
                  <div className="cr-mini-subtext">
                    <span className="cr-mini-userid">ID: <strong>{userId}</strong></span>
                    <span className="cr-mini-bullet">&bull;</span>
                    <span className="cr-mini-time">Submitted: <strong>{new Date(selected.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="cr-header-right">
              <div className="cr-queue-navigation">
                <button 
                  className="btn-queue-nav btn-queue-nav--prev" 
                  onClick={handlePrevRequest} 
                  disabled={currentIndex <= 0}
                  title="Previous change request"
                >
                  <ChevronLeft size={15} />
                  <span>Prev</span>
                </button>
                <span className="queue-nav-status">
                  Request <strong>{currentIndex + 1}</strong> of <strong>{totalRequests}</strong>
                </span>
                <button 
                  className="btn-queue-nav btn-queue-nav--next" 
                  onClick={handleNextRequest} 
                  disabled={currentIndex >= totalRequests - 1}
                  title="Next change request"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Actions Bar */}
          <div className="cr-review-actions-bar animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {(() => {
              if (totalProposed === 0) return null;
              if (!allAnswered) {
                return (
                  <div className="cr-audit-alert-banner pending animate-fade-in" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}>
                    <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                    <span>Pending Audit: Please review and answer all proposed changes before finalizing ({answeredCount} of {totalProposed} answered)</span>
                  </div>
                );
              } else {
                return (
                  <div className="cr-audit-alert-banner complete animate-fade-in" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}>
                    <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>Audit Complete: All proposed changes have been reviewed and answered. Action buttons unlocked.</span>
                  </div>
                );
              }
            })()}

            <div className="cr-action-btns">
              <button
                className="cr-btn cr-btn--deny"
                onClick={() => requestAction('rejected')}
                disabled={actionLoading || !allAnswered}
              >
                <XCircle size={15} />
                <span>Reject Edits</span>
              </button>
              <button
                className="cr-btn cr-btn--request"
                onClick={() => requestAction('change_requested')}
                disabled={actionLoading || !allAnswered}
              >
                <AlertTriangle size={15} />
                <span>Request Adjustments</span>
              </button>
              <button
                className="cr-btn cr-btn--approve"
                onClick={() => requestAction('approved')}
                disabled={actionLoading || !allAnswered}
              >
                <CheckCircle size={15} />
                <span>Approve &amp; Publish Changes</span>
              </button>
            </div>
          </div>

        </div>



        {/* ── Action Confirmation Modal ── */}
        {actionConfirm && (() => {
          const meta = ACTION_META[actionConfirm.type];
          const isApprove = actionConfirm.type === 'approved';
          const isRequest = actionConfirm.type === 'change_requested';
          const isFormInvalid = (!isApprove) && (!reviewerName.trim() || !comment.trim());
          return (
            <div className="cr-modal-overlay" onClick={() => !actionLoading && setActionConfirm(null)}>
              <div className="cr-action-confirm-modal" onClick={e => e.stopPropagation()}>
                <div className={`cr-acm-icon cr-acm-icon--${actionConfirm.type}`}>
                  {isApprove
                    ? <CheckCircle size={28} />
                    : isRequest
                      ? <AlertTriangle size={28} />
                      : <XCircle size={28} />}
                </div>
                <h3 className="cr-acm-title">{meta.label}</h3>
                <p className="cr-acm-desc">
                  {isApprove
                    ? `This will apply all proposed changes to ${selected?.name || 'the user'}'s live profile immediately.`
                    : isRequest
                      ? `This will send feedback to ${selected?.name || 'the user'} and request adjustments.`
                      : `This will decline the proposed changes. The live profile will remain unchanged.`}
                </p>

                {/* Form fields inside modal */}
                <div className="cr-acm-form">
                  <div className="cr-acm-input-group">
                    <label className="cr-acm-label">
                      Reviewer Name {!isApprove && <span className="cr-required">*</span>}
                    </label>
                    <div className="cr-acm-input-wrapper">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cr-acm-input-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <input
                        type="text"
                        placeholder="Your name (e.g. Sarah Johnson)"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        className="cr-acm-input"
                        disabled={actionLoading}
                      />
                    </div>
                  </div>

                  <div className="cr-acm-input-group">
                    <label className="cr-acm-label">
                      Reviewer Notes / Feedback {!isApprove && <span className="cr-required">*</span>}
                    </label>
                    <div className="cr-acm-input-wrapper">
                      <MessageSquare size={14} className="cr-acm-input-icon cr-acm-input-icon--top" />
                      <textarea
                        placeholder={isApprove ? "Optional notes about the approval…" : "Feedback explaining what adjustments are needed (mandatory)…"}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="cr-acm-textarea"
                        rows={3}
                        disabled={actionLoading}
                      />
                    </div>
                  </div>
                </div>

                {isFormInvalid && (
                  <div className="cr-acm-warning">
                    Reviewer Name and Feedback notes are required for adjustments or rejections so the user knows what to correct.
                  </div>
                )}

                <div className="cr-acm-footer">
                  <button className="cr-acm-btn cr-acm-btn--cancel" onClick={() => setActionConfirm(null)} disabled={actionLoading}>Cancel</button>
                  <button
                    className={`cr-acm-btn cr-acm-btn--confirm cr-acm-btn--${actionConfirm.type}`}
                    onClick={handleAction}
                    disabled={actionLoading || isFormInvalid}
                  >
                    {actionLoading
                      ? <><div className="cr-acm-spinner" /> Processing…</>
                      : <>{isApprove ? <CheckCircle size={14}/> : isRequest ? <AlertTriangle size={14}/> : <XCircle size={14}/>} Confirm</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Action Success Modal ── */}
        {actionSuccess && (
          <div className="cr-modal-overlay" onClick={() => { setActionSuccess(null); handleCloseReview(); }}>
            <div className="cr-action-success-modal" onClick={e => e.stopPropagation()}>
              <div className={`cr-asm-icon cr-asm-icon--${actionSuccess.type}`}>
                {actionSuccess.type === 'approved'
                  ? <CheckCircle size={32} />
                  : actionSuccess.type === 'change_requested'
                    ? <AlertTriangle size={32} />
                    : <XCircle size={32} />}
              </div>
              <h3 className="cr-asm-title">
                {actionSuccess.type === 'approved' ? 'Changes Published!' :
                 actionSuccess.type === 'change_requested' ? 'Adjustments Requested' :
                 'Request Declined'}
              </h3>
              <p className="cr-asm-desc">
                {actionSuccess.type === 'approved'
                  ? `${actionSuccess.name}'s profile has been updated and is now live.`
                  : actionSuccess.type === 'change_requested'
                    ? `Feedback has been sent to ${actionSuccess.name}. They will be notified to make adjustments.`
                    : `The submission from ${actionSuccess.name} has been declined. Their live profile remains unchanged.`}
              </p>
              <button className="cr-asm-close-btn" onClick={() => { setActionSuccess(null); handleCloseReview(); }}>Back to Queue</button>
            </div>
          </div>
        )}

        {/* ── Split Layout Workspace: Left Preview Pane vs Right Audit Sidebar ── */}
        <div className="cr-review-workspace-split animate-fade-in">
          
          {/* Profile Preview Pane (Left side) */}
          <div className="cr-profile-preview-pane">
            <div className="cr-single-profile-workspace">
              <div className="profile-page" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '0 0 40px' }}>
            <section className="profile-hero">
              
              {/* Left Side: Avatar */}
              <div className="profile-image-container">
                <SafeImage
                  src={getPropVal('image_url') || liveProfile?.image_url}
                  alt={getPropVal('name')}
                  className="profile-hero-image"
                  fallbackClassName="profile-image-fallback"
                  fallbackText={proposedAvatarText}
                />
                {(badge === 'verified' || badge === 'claimed') && (
                  <div className="profile-image-badge">
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="3.5" fill="white"/>
                      <circle cx="16" cy="16" r="3.5" fill="white" transform="rotate(45 16 16)"/>
                      <circle cx="16" cy="16" r="3.5" fill="white" transform="rotate(90 16 16)"/>
                      <circle cx="16" cy="16" r="3.5" fill="white" transform="rotate(135 16 16)"/>
                      <circle cx="16" cy="7" r="3.5" fill="white"/>
                      <circle cx="25" cy="16" r="3.5" fill="white"/>
                      <circle cx="16" cy="25" r="3.5" fill="white"/>
                      <circle cx="7" cy="16" r="3.5" fill="white"/>
                      <circle cx="22" cy="10" r="3.5" fill="white"/>
                      <circle cx="22" cy="22" r="3.5" fill="white"/>
                      <circle cx="10" cy="22" r="3.5" fill="white"/>
                      <circle cx="10" cy="10" r="3.5" fill="white"/>
                      <circle cx="16" cy="16" r="10" fill="white"/>
                      <path d="M11 16L14.5 19.5L21 13" stroke="#1E3A5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    21 NEWS VERIFIED
                  </div>
                )}
              </div>

              {/* Right Side: Details */}
              <div className="profile-info">
                {/* Name Row */}
                {renderClickableField('name', 'Name', 
                  <div className="profile-name-row">
                    <h1 style={{ color: '#1E3A5F' }}>{getPropVal('name') || '—'}</h1>
                    {(badge === 'verified' || badge === 'claimed') && <VerifiedBadge />}
                    {isPremium && (
                      <div className="profile-premium-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Premium
                      </div>
                    )}
                  </div>
                )}

                {/* Role */}
                {renderClickableField('role', 'Role', 
                  <div className="profile-role">{getPropVal('role') || '—'}</div>
                )}

                {/* Subtitle */}
                {renderClickableField('subtitle', 'Subtitle', 
                  <div className="profile-subtitle">{getPropVal('subtitle') || '—'}</div>
                )}

                {/* Trust & Verification */}
                <div className="profile-trust-card">
                  <div className="profile-section-label">Trust &amp; Verification</div>
                  {(() => {
                    const trustTags = (() => {
                      try {
                        const val = editForm.trust_tags !== undefined ? editForm.trust_tags : (liveProfile?.trust_tags || []);
                        return Array.isArray(val) ? val : [];
                      } catch {
                        return [];
                      }
                    })();
                    return renderClickableField('trust_tags', 'Trust Tags', 
                      <div className="profile-trust-tags">
                        {trustTags.map((tag, i) => (
                          <span key={i} className={`trust-tag ${tag.type === 'verified' ? 'verified' : tag.type === 'outline-blue' ? 'outline-blue' : tag.type === 'outline-cyan' ? 'outline-cyan' : ''}`}>
                            {tag.type === 'verified' && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                            )}
                            {tag.name}
                          </span>
                        ))}
                        {trustTags.length === 0 && <span className="trust-tag">Pending Verification</span>}
                      </div>
                    );
                  })()}
                  <div className="profile-trust-details">
                    {renderClickableField('sector', 'Sector', 
                      <div className="trust-detail-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Sector: <span>{getPropVal('sector') || '—'}</span>
                      </div>
                    )}
                    {renderClickableField('location', 'Location', 
                      <div className="trust-detail-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M21.17 8L12 8"/><path d="M3.95 6.06L8.54 14"/><path d="M10.88 21.94L15.46 14"/></svg>
                        Location: <span>{getPropVal('location') || '—'}</span>
                      </div>
                    )}
                    <div className="trust-detail-row">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2L16 6"/><path d="M8 2L8 6"/><path d="M3 10L21 10"/></svg>
                      Last Updated: <span>{lastUpdatedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Biography */}
                <div className="profile-section-label">Biography</div>
                {renderClickableField('bio', 'Biography', 
                  <div className="profile-bio">
                    {renderBiographyWords(liveProfile?.bio, getPropVal('bio'), true)}
                  </div>
                )}

                {/* Authority Intelligence */}
                <div className="profile-authority-card">
                  <div className="authority-header">
                    <div className="authority-header-left">
                      <div className="authority-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      </div>
                      <div>
                        <h3>Authority Intelligence</h3>
                        <p>Exceptional Authority &bull; {liveProfile?.authority_percentile || 'Top Tier'} in {getPropVal('sector') || 'Industry'}</p>
                      </div>
                    </div>
                    <div className="authority-score-big">
                      <div className="score-num">{liveProfile?.authority_score ?? '—'}</div>
                      <div className="score-label">Overall</div>
                    </div>
                  </div>
                  <div className="authority-bars">
                    {[
                      { label: 'LinkedIn Presence',       value: liveProfile?.linkedin_presence        || 0, max: 25 },
                      { label: 'Media Presence',           value: liveProfile?.media_presence           || 0, max: 20 },
                      { label: 'Digital Presence',         value: liveProfile?.digital_presence         || 0, max: 15 },
                      { label: 'Professional Credibility', value: liveProfile?.professional_credibility || 0, max: 15 },
                      { label: 'Content Activity',         value: liveProfile?.content_activity         || 0, max: 25 },
                    ].map((bar, i) => (
                      <div className="authority-bar-row" key={i}>
                        <span className="authority-bar-label">{bar.label}</span>
                        <div className="authority-bar-track">
                          <div className="authority-bar-fill" style={{ width: `${(bar.value / bar.max) * 100}%` }} />
                        </div>
                        <span className="authority-bar-value">{bar.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Links */}
                <div className="profile-links">
                  {renderClickableField('linkedin_url', 'LinkedIn URL', 
                    getPropVal('linkedin_url') ? (
                      <a href={getPropVal('linkedin_url')} target="_blank" rel="noopener noreferrer" className="profile-link-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                        LinkedIn
                      </a>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No LinkedIn Linked</span>
                    )
                  )}
                  {renderClickableField('website_url', 'Website URL', 
                    getPropVal('website_url') ? (
                      <a href={getPropVal('website_url')} target="_blank" rel="noopener noreferrer" className="profile-link-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12L22 12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        Website
                      </a>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No Website Linked</span>
                    )
                  )}
                </div>

              </div>
            </section>

            {/* Primary Entity & HQ Company details */}
            <section className="profile-grid-2">
              {liveProfile?.hq_image_url && (
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1L9 4"/><path d="M15 1L15 4"/><path d="M9 20L9 23"/><path d="M15 20L15 23"/><path d="M20 9L23 9"/><path d="M20 14L23 14"/><path d="M1 9L4 9"/><path d="M1 14L4 14"/></svg>
                    <h3>Company Headquarters</h3>
                  </div>
                  <SafeImage src={liveProfile.hq_image_url} alt="Company HQ" className="hq-image" fallbackClassName="hq-image-fallback" fallbackText={proposedAvatarText} />
                </div>
              )}

              <div className="profile-section-card">
                <div className="profile-section-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  <h3>Primary Entity</h3>
                </div>
                <p className="primary-entity-desc">This profile represents a verified {liveProfile?.entity_type || 'entity'} with structured relationships to organisations, projects, and recognition systems.</p>
                <div className="pe-grid">
                  {renderClickableField('company', 'Company', 
                    <div className="pe-box">
                      <div className="pe-box-label">Company</div>
                      <div className="pe-box-value">{getPropVal('company') || '—'}</div>
                    </div>
                  )}
                  {renderClickableField('role', 'Role', 
                    <div className="pe-box">
                      <div className="pe-box-label">Role</div>
                      <div className="pe-box-value">{getPropVal('role') || '—'}</div>
                    </div>
                  )}
                  {renderClickableField('status', 'Status', 
                    <div className="pe-box">
                      <div className="pe-box-label">Status</div>
                      <div className="pe-box-value" style={{ textTransform: 'capitalize' }}>{getPropVal('status') || '—'}</div>
                    </div>
                  )}
                  {renderClickableField('active_since', 'Since Year', 
                    <div className="pe-box">
                      <div className="pe-box-label">Since</div>
                      <div className="pe-box-value">{getPropVal('active_since') || '—'}</div>
                    </div>
                  )}
                </div>
                <div className="pe-signals-title">Authority Signals</div>
                <div className="pe-signals-grid">
                  <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>{liveProfile?.verified_awards_count ?? 0} verified awards</span></div>
                  <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span>{liveProfile?.papers_count ?? 0} papers</span></div>
                  <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>{liveProfile?.events_count ?? 0} events</span></div>
                  <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg><span>{liveProfile?.funding_raised || 'No funding data'}</span></div>
                </div>
                <div className="pe-seo-box">
                  <strong>AI &amp; SEO Relevance:</strong> This structured entity data is optimised for AI assistants, search engines, and knowledge graph integration.
                </div>
              </div>
            </section>

            {/* Awards & Recognition */}
            {(() => {
              const awardsArray = (() => {
                try {
                  const val = editForm.awards !== undefined ? editForm.awards : (liveProfile?.awards || []);
                  return Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
                } catch {
                  return [];
                }
              })();

              if (!isFieldChanged('awards') && awardsArray.length === 0 && (!liveProfile?.awards || liveProfile.awards.length === 0)) return null;

              return (
                <section className="profile-section-card" style={{ marginTop: '32px' }}>
                  <div className="profile-section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                    <div>
                      <h3 style={{ marginBottom: 0 }}>Awards &amp; Recognition</h3>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400 }}>{awardsArray.length} verified awards and honours</span>
                    </div>
                  </div>
                  {renderClickableField('awards', 'Awards', 
                    <div className="awards-grid">
                      {awardsArray.map((award, i) => (
                        <div className="award-card" key={i}>
                          <div className="award-top">
                            <div className="award-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                            <div className="award-year">{award.year}</div>
                          </div>
                          <h4>{award.title}</h4>
                          <div className="award-issuer">{award.issuer}</div>
                          <span className="award-tag">{award.tag}</span>
                          <p className="award-desc">{award.description}</p>
                        </div>
                      ))}
                      {awardsArray.length === 0 && <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>No awards proposed (cleared)</p>}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Video Content */}
            {(() => {
              const videosArray = (() => {
                try {
                  const val = editForm.videos !== undefined ? editForm.videos : (liveProfile?.videos || []);
                  return Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
                } catch {
                  return [];
                }
              })();

              const ytVideosList = videosArray.filter((v) => {
                const u = v.url || v.link || v.href || v.video_url || '';
                return u.includes('youtube.com') || u.includes('youtu.be');
              });

              if (!isFieldChanged('videos') && ytVideosList.length === 0 && (!liveProfile?.videos || liveProfile.videos.length === 0)) return null;

              return (
                <section className="profile-section-card" style={{ marginTop: '32px' }}>
                  <div className="profile-section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2L7 22"/><path d="M17 2L17 22"/><path d="M2 12L22 12"/><path d="M2 7L7 7"/><path d="M2 17L7 17"/><path d="M17 17L22 17"/><path d="M17 7L22 7"/></svg>
                    <div>
                      <h3 style={{ marginBottom: 0 }}>Video Content</h3>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400 }}>Featured videos, interviews, and presentations</span>
                    </div>
                  </div>
                  {renderClickableField('videos', 'Videos', 
                    <div className="videos-grid">
                      {ytVideosList.map((vid, i) => {
                        const url = vid.url || vid.link || vid.href || vid.video_url;
                        return (
                          <div className="video-card" key={i}>
                            <div className="video-thumb">
                              <SafeImage src={vid.thumbnail_url || vid.image_url || getYouTubeThumbnail(url)} alt={vid.title} className="video-thumbnail-image" fallbackClassName="video-thumbnail-fallback" fallbackText={proposedAvatarText} />
                              <div className="video-badge">{vid.type}</div>
                              <div className="video-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                              {vid.duration && <div className="video-time">{vid.duration}</div>}
                            </div>
                            <h4>{vid.title}</h4>
                            <div className="video-meta">
                              <span>{vid.date || 'Recent'}</span>
                              <span>{formatViews(vid.views || vid.view_count)} views</span>
                            </div>
                          </div>
                        );
                      })}
                      {ytVideosList.length === 0 && <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>No videos proposed (cleared)</p>}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* AI-Readable Structure */}
            <section className="profile-section-card" style={{ marginTop: '32px' }}>
              <div className="profile-section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51L15.42 17.49"/><path d="M15.41 6.51L8.59 10.49"/></svg>
                <h3>AI-Readable Structure</h3>
              </div>
              <p className="ai-readable-desc">This profile uses structured JSON-LD data to communicate entity relationships and attributes to AI systems and search engines.</p>
              <div className="ai-chips-list">
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Person</span></div>
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg><span>Company</span></div>
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg><span>Institution</span></div>
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg><span>Project</span></div>
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Award</span></div>
                <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span>Publication</span></div>
              </div>
            </section>

            {/* Publications */}
            {(() => {
              const pubsArray = (() => {
                try {
                  const val = editForm.publications !== undefined ? editForm.publications : (liveProfile?.publications || []);
                  return Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
                } catch {
                  return [];
                }
              })();

              if (!isFieldChanged('publications') && pubsArray.length === 0 && (!liveProfile?.publications || liveProfile.publications.length === 0)) return null;

              return (
                <section className="profile-section-card" style={{ marginTop: '32px' }}>
                  <div className="profile-section-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <h3>Recent Publications</h3>
                  </div>
                  {renderClickableField('publications', 'Publications', 
                    <div className="pubs-grid">
                      {pubsArray.map((pub, i) => {
                        const url = pub.url || pub.link || pub.href || pub.doi;
                        const content = (
                          <>
                            <div className="pub-img">
                              <SafeImage src={pub.image_url || pub.thumbnail_url} alt={pub.title} className="pub-thumbnail-image" fallbackClassName="pub-thumbnail-fallback" fallbackText={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
                            </div>
                            <div className="pub-info">
                              <span className="pub-tag">{pub.type}</span>
                              <h4 className="pub-title">{pub.title}</h4>
                              <div className="pub-meta"><span>{pub.journal}</span><span>{pub.date}</span></div>
                            </div>
                          </>
                        );
                        return url
                          ? <a href={url} target="_blank" rel="noopener noreferrer" className="pub-card" key={i} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</a>
                          : <div className="pub-card" key={i}>{content}</div>;
                      })}
                      {pubsArray.length === 0 && <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>No publications proposed (cleared)</p>}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Quick Facts */}
            {(() => {
              const qfArray = (() => {
                try {
                  const val = editForm.quick_facts !== undefined ? editForm.quick_facts : (liveProfile?.quick_facts || []);
                  return Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val) : []);
                } catch {
                  return [];
                }
              })();

              if (!isFieldChanged('quick_facts') && qfArray.length === 0 && (!liveProfile?.quick_facts || liveProfile.quick_facts.length === 0)) return null;

              return (
                <section className="profile-section-card" style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E3A5F', marginBottom: '16px', margin: 0 }}>Quick Facts</h3>
                  {renderClickableField('quick_facts', 'Quick Facts', 
                    <div className="qf-grid">
                      {qfArray.map((fact, i) => (
                        <div className={`qf-card${i === 1 ? ' col-span-2' : ''}`} key={i}>
                          <div className="qf-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>{fact.label}</div>
                          <div className="qf-value">{fact.value}</div>
                          <div className="qf-sources">{fact.verified_sources} verified sources</div>
                        </div>
                      ))}
                      {qfArray.length === 0 && <p style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0 }}>No quick facts proposed (cleared)</p>}
                    </div>
                  )}
                </section>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Audit & Changes Index Sidebar (Right side) */}
      <div className={`cr-audit-index-sidebar ${sidebarCollapsed ? 'cr-audit-index-sidebar--collapsed' : ''}`}>
        <div className="cr-sidebar-index-header">
          <div className="cr-sidebar-title-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1E3A5F' }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <h4>Audit Summary</h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="cr-sidebar-count">{getProposedFields().length}</span>
            <button 
              className="cr-sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse Sidebar"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="cr-sidebar-index-body">
          <p className="cr-sidebar-index-tip">
            Click on any highlighted field below to compare the proposed change with the live site, inspect details, or make inline corrections.
          </p>
          {getProposedFields().length === 0 ? (
            <p className="cr-sidebar-empty">No changes proposed in this request.</p>
          ) : (
            <ul className="cr-sidebar-index-list">
              {getProposedFields().map((field, idx) => {
                const isAnswered = answeredFields[field.key] !== undefined;
                
                let badgeLabel = 'Needs Review';
                let badgeBg = '#fffbeb';
                let badgeColor = '#b45309';
                let badgeBorder = '#fde68a';
                let numberBg = '#d97706';

                if (isAnswered) {
                  const status = answeredFields[field.key];
                  if (status === 'accepted') {
                    badgeLabel = 'Accepted';
                    badgeBg = '#ecfdf5';
                    badgeColor = '#047857';
                    badgeBorder = '#a7f3d0';
                    numberBg = '#10b981';
                  } else if (status === 'reverted') {
                    badgeLabel = 'Reverted';
                    badgeBg = '#f1f5f9';
                    badgeColor = '#475569';
                    badgeBorder = '#cbd5e1';
                    numberBg = '#64748b';
                  } else if (status === 'custom') {
                    badgeLabel = 'Custom';
                    badgeBg = '#fff7ed';
                    badgeColor = '#c2410c';
                    badgeBorder = '#fed7aa';
                    numberBg = '#f97316';
                  }
                }

                return (
                  <li 
                    key={field.key}
                    className={`cr-sidebar-index-item ${activeChangeField === field.key ? 'active' : ''}`}
                    onClick={() => {
                      scrollToAndHighlightField(field.key);
                      setActiveChangeField(field.key);
                    }}
                  >
                    <span className="cr-sidebar-item-number" style={{ background: numberBg }}>{idx + 1}</span>
                    <span className="cr-sidebar-item-label">{field.label}</span>
                    <span className="cr-sidebar-item-badge" style={{ background: badgeBg, color: badgeColor, borderColor: badgeBorder }}>
                      {badgeLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Floating Sidebar Expand Trigger */}
      {sidebarCollapsed && (
        <button 
          className="cr-sidebar-expand-trigger" 
          onClick={() => setSidebarCollapsed(false)}
          title="Expand Audit Summary Sidebar"
        >
          <ChevronLeft size={14} style={{ marginBottom: '6px' }} />
          <span>Audit Summary ({getProposedFields().length})</span>
        </button>
      )}

    </div>

        {/* Actions and notes have been moved to the sticky sub-header control bar at the top */}

        {/* HIGH FIDELITY COMPARISON & INLINE EDITING MODAL */}
        {activeChangeField && (
          <div className="cr-modal-overlay" onClick={() => setActiveChangeField(null)}>
            <div className="cr-modal-content" onClick={e => e.stopPropagation()}>
              <div className="cr-modal-header">
                <h3>Compare &amp; Edit: {getFieldLabel(activeChangeField)}</h3>
                <button className="cr-modal-close" onClick={() => setActiveChangeField(null)}>&times;</button>
              </div>
              <div className="cr-modal-body">
                <div className="cr-compare-box">
                  
                  {/* Current Active Pane */}
                  <div className="cr-compare-pane old">
                    <span className="cr-compare-label">Current Live on Site</span>
                    <div className="cr-compare-value">
                      {liveProfile?.[activeChangeField] !== undefined && liveProfile?.[activeChangeField] !== null ? (
                        activeChangeField === 'bio'
                          ? renderBiographyWords(liveProfile?.bio, getPropVal(activeChangeField), false)
                          : ['trust_tags', 'awards', 'videos', 'publications', 'quick_facts'].includes(activeChangeField)
                            ? renderArrayValuePreview(activeChangeField, liveProfile[activeChangeField], submittedProposed[activeChangeField], true)
                            : <span className="cr-value-deleted">{String(liveProfile[activeChangeField])}</span>
                      ) : (
                        <span className="cr-value-empty">None (Not set)</span>
                      )}
                    </div>
                  </div>

                  {/* Submitted Proposed Pane */}
                  <div className="cr-compare-pane new">
                    <span className="cr-compare-label">User's Proposed Change</span>
                    <div className="cr-compare-value">
                      {submittedProposed?.[activeChangeField] !== undefined && submittedProposed?.[activeChangeField] !== null ? (
                        activeChangeField === 'bio'
                          ? renderBiographyWords(liveProfile?.bio, submittedProposed?.[activeChangeField], true)
                          : ['trust_tags', 'awards', 'videos', 'publications', 'quick_facts'].includes(activeChangeField)
                            ? renderArrayValuePreview(activeChangeField, submittedProposed[activeChangeField], liveProfile[activeChangeField], false)
                            : <span className="cr-value-added">{String(submittedProposed[activeChangeField])}</span>
                      ) : (
                        <span className="cr-value-empty">None (Cleared)</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Inline Editing Pane */}
                <div className="cr-edit-pane">
                  <label htmlFor={`cr-input-${activeChangeField}`} className="cr-edit-label" style={{ marginBottom: '8px', display: 'block' }}>
                    Modify Proposed Value (Make adjustments below before applying)
                  </label>
                  {['trust_tags', 'awards', 'videos', 'publications', 'quick_facts'].includes(activeChangeField) ? (
                    <div className="cr-visual-array-editor">
                      {getArrayVal(activeChangeField).map((item, idx) => (
                        <div key={idx} className="cr-array-item-card">
                          <div className="cr-array-item-header">
                            <span>Item #{idx + 1}</span>
                            <button 
                              className="cr-array-item-remove"
                              onClick={() => {
                                const arr = [...getArrayVal(activeChangeField)];
                                arr.splice(idx, 1);
                                handleFieldChange(activeChangeField, arr);
                              }}
                            >
                              &times; Remove
                            </button>
                          </div>
                          <div className="cr-array-item-grid">
                            {Object.keys(item).map(subKey => (
                              <div key={subKey} className="cr-array-subfield">
                                <label className="cr-array-subfield-label">{subKey.replace(/_/g, ' ')}</label>
                                <input
                                  type="text"
                                  className="cr-array-subfield-input"
                                  value={item[subKey] !== undefined ? item[subKey] : ''}
                                  onChange={e => {
                                    const arr = [...getArrayVal(activeChangeField)];
                                    const updatedItem = { ...arr[idx] };
                                    updatedItem[subKey] = subKey === 'verified_sources' ? Number(e.target.value) || 0 : e.target.value;
                                    arr[idx] = updatedItem;
                                    handleFieldChange(activeChangeField, arr);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <button 
                        className="cr-array-add-btn"
                        onClick={() => {
                          const arr = [...getArrayVal(activeChangeField)];
                          let defaultTemplate = {};
                          if (activeChangeField === 'quick_facts') {
                            defaultTemplate = { icon: 'info', label: '', value: '', verified_sources: 1 };
                          } else if (activeChangeField === 'awards') {
                            defaultTemplate = { year: new Date().getFullYear().toString(), title: '', issuer: '', tag: 'Verified', description: '' };
                          } else if (activeChangeField === 'videos') {
                            defaultTemplate = { title: '', url: '', type: 'Interview', duration: '', views: 0, date: '' };
                          } else if (activeChangeField === 'publications') {
                            defaultTemplate = { title: '', type: 'Journal', journal: '', date: '', url: '', image_url: '' };
                          } else if (activeChangeField === 'trust_tags') {
                            defaultTemplate = { name: '', type: 'outline-blue' };
                          }
                          arr.push(defaultTemplate);
                          handleFieldChange(activeChangeField, arr);
                        }}
                      >
                        + Add New {getFieldLabel(activeChangeField).slice(0, -1) || 'Item'}
                      </button>
                    </div>
                  ) : activeChangeField === 'bio' ? (
                    <textarea
                      id={`cr-input-${activeChangeField}`}
                      className="cr-edit-textarea"
                      rows={6}
                      value={getPropVal(activeChangeField)}
                      onChange={e => handleFieldChange(activeChangeField, e.target.value)}
                    />
                  ) : (
                    <input
                      id={`cr-input-${activeChangeField}`}
                      type="text"
                      className="cr-edit-input"
                      value={getPropVal(activeChangeField)}
                      onChange={e => handleFieldChange(activeChangeField, e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div className="cr-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {/* Left Side: Discard/Approve quick actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="cr-btn" 
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                      const liveVal = liveProfile?.[activeChangeField] !== undefined ? liveProfile[activeChangeField] : '';
                      setEditForm(prev => ({ ...prev, [activeChangeField]: liveVal }));
                      setAnsweredFields(prev => ({ ...prev, [activeChangeField]: 'reverted' }));
                      toast(`Reverted ${getFieldLabel(activeChangeField)} to live site value!`, 'info');
                      setActiveChangeField(null);
                    }}
                  >
                    Revert to Live
                  </button>
                  <button 
                    className="cr-btn" 
                    style={{ background: '#e6fbf1', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                      const proposedVal = submittedProposed?.[activeChangeField] !== undefined ? submittedProposed[activeChangeField] : '';
                      setEditForm(prev => ({ ...prev, [activeChangeField]: proposedVal }));
                      setAnsweredFields(prev => ({ ...prev, [activeChangeField]: 'accepted' }));
                      toast(`Approved proposed ${getFieldLabel(activeChangeField)} as submitted!`, 'success');
                      setActiveChangeField(null);
                    }}
                  >
                    Accept Proposed
                  </button>
                </div>
                
                {/* Right Side: Apply custom edits & Close */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="cr-btn cr-btn-modal-cancel" onClick={() => setActiveChangeField(null)}>Close</button>
                  <button className="cr-btn cr-btn-modal-save" onClick={() => {
                    const isArrayField = Array.isArray(liveProfile?.[activeChangeField]) || Array.isArray(submittedProposed?.[activeChangeField]);
                    if (isArrayField) {
                      try {
                        const rawVal = editForm[activeChangeField];
                        if (typeof rawVal === 'string') {
                          const parsed = JSON.parse(rawVal);
                          setEditForm(prev => ({ ...prev, [activeChangeField]: parsed }));
                        }
                      } catch {
                        toast('Invalid JSON format. Please ensure brackets and syntax are valid.', 'error');
                        return;
                      }
                    }
                    setAnsweredFields(prev => ({ ...prev, [activeChangeField]: 'custom' }));
                    toast(`Applied manual correction for ${getFieldLabel(activeChangeField)}!`, 'success');
                    setActiveChangeField(null);
                  }}>
                    Apply Custom Override
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────
     RENDER CHANGE REQUESTS LIST QUEUE
     ──────────────────────────────────────────────────────── */
  return (
    <div className="cr-page animate-fade-in">
      <div className="cr-header">
        <div className="cr-header-inner">
          <h1>Profile Change Requests</h1>
          <p>Review and manage user profile updates. Compare changes side-by-side, edit before publishing, or request modifications.</p>
        </div>
      </div>

      <div className="cr-controls">
        <div className="cr-search-row">
          <div className="cr-search">
            <div className="cr-search-icon"><Search size={18} /></div>
            <input
              type="text"
              placeholder="Search requests by name or user ID..."
              value={search}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="cr-chips">
          {STATUS_CHIPS.map(chip => {
            const chipClassMap = {
              'Pending': 'pending',
              'Changes Requested': 'change-requested',
              'Rejected': 'rejected',
              'Approved': 'approved',
              'All': 'all',
            };
            const chipClass = chipClassMap[chip] || 'all';
            return (
              <button
                key={chip}
                data-chip={chip}
                className={`cr-chip cr-chip--${chipClass}${activeChip === chip ? ' active' : ''}`}
                onClick={() => handleChipChange(chip)}
              >
                {chip}
                <span className="cr-chip-count">{counts[chip]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="cr-results">
        {loading ? (
          <div className="cr-loading-state">
            <div className="admin-loading-spinner" />
            <span>Loading submissions…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="cr-empty-state">
            <div className="cr-empty-state__icon">
              <FileText size={36} />
            </div>
            <h3 className="cr-empty-state__title">
              {activeChip === 'Pending' ? 'No Active Requests' :
               activeChip === 'Changes Requested' ? 'No Pending Adjustments' :
               activeChip === 'Rejected' ? 'No Rejected Requests' :
               activeChip === 'Approved' ? 'No Approved Requests Yet' :
               'No Requests Found'}
            </h3>
            <p className="cr-empty-state__desc">
              {activeChip === 'Pending'
                ? 'There are no pending profile change requests right now. New submissions will appear here as users make changes.'
                : activeChip === 'Changes Requested'
                  ? 'No requests are currently awaiting user adjustments.'
                  : activeChip === 'Rejected'
                    ? 'No submissions have been declined.'
                    : activeChip === 'Approved'
                      ? 'No change requests have been approved yet.'
                      : 'No requests match your current search or filter.'}
            </p>
          </div>
        ) : (
          <div className="cr-grid">
            {paginated.map((req) => {
              const reqStatus = req.status || 'pending';
              const reqMeta = STATUS_META[reqStatus] || STATUS_META.pending;
              const reqDate = new Date(req.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              let parsedMessage = {};
              try { parsedMessage = JSON.parse(req.message); } catch { /* ignore */ }
              const proposedRole = parsedMessage.proposed?.role || 'User';
              const userId = req.email.split('@')[0];
              const changeCount = Object.keys(parsedMessage.proposed && typeof parsedMessage.proposed === 'object' ? parsedMessage.proposed : {}).length;

              return (
                <div key={req.id} className={`cr-card-wrapper cr-card-wrapper--${reqStatus}`}>
                  <EntityCard
                    user_id={userId}
                    image={profileImages[userId]}
                    name={req.name}
                    badge={reqStatus === 'approved' ? 'verified' : undefined}
                    role={proposedRole}
                    ctaText="Review Changes"
                    onCtaClick={() => handleReview(req)}
                    isBuilding={false}
                  >
                    <div className="cr-card-meta">
                      <span className="cr-card-status-pill" style={{ background: reqMeta.bg, color: reqMeta.color, border: `1px solid ${reqMeta.border}` }}>
                        <span className="cr-card-status-dot" style={{ background: reqMeta.dot }} />
                        {reqMeta.label}
                      </span>
                      {changeCount > 0 && (
                        <span className="cr-card-change-count">{changeCount} field{changeCount !== 1 ? 's' : ''} changed</span>
                      )}
                    </div>
                    <div className="cr-card-body-details">
                      <span className="cr-card-userid">ID: {userId}</span>
                      {parsedMessage.admin_comment && (
                        <p className="cr-card-admin-comment">"{parsedMessage.admin_comment}"</p>
                      )}
                      <span className="cr-card-date">Submitted {reqDate}</span>
                    </div>
                  </EntityCard>
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="apv-pagination" style={{ marginTop: '32px' }}>
            <button className="apv-page-btn apv-page-btn--nav" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              &larr;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`apv-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="apv-page-btn apv-page-btn--nav" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              &rarr;
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
