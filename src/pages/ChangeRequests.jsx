import { useState, useEffect, useCallback } from 'react';
import './EntityProfile.css';
import '../components/EntityCard.css';
import './ChangeRequests.css';
import './OrganizationProfile.css';
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
  ChevronLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  UserCheck,
  Star,
  Check,
  ExternalLink,
  Target,
  TrendingUp,
  Award,
  Database,
  Newspaper,
  Briefcase,
  Globe,
  Mail,
  Phone,
  BadgeDollarSign,
  BarChart2,
} from 'lucide-react';

const STATUS_CHIPS = ['Pending', 'Changes Requested', 'Rejected', 'All', 'Approved'];

/* ── Org profile field definitions ─────────────────────── */
const ORG_FIELDS = [
  { key: 'organization_name',  label: 'Organization Name' },
  { key: 'tagline',            label: 'Tagline' },
  { key: 'description',        label: 'Description' },
  { key: 'industry',           label: 'Industry' },
  { key: 'location',           label: 'Location' },
  { key: 'founded_year',       label: 'Founded Year' },
  { key: 'team_size',          label: 'Team Size' },
  { key: 'mission',            label: 'Mission' },
  { key: 'vision',             label: 'Vision' },
  { key: 'market_positioning', label: 'Market Positioning' },
  { key: 'channel_website',    label: 'Website' },
  { key: 'website_url',        label: 'Website URL' },
  { key: 'channel_linkedin',   label: 'LinkedIn' },
  { key: 'channel_x',          label: 'X (Twitter)' },
  { key: 'channel_youtube',    label: 'YouTube' },
  { key: 'channel_github',     label: 'GitHub' },
  { key: 'channel_crunchbase', label: 'Crunchbase' },
  { key: 'core_services',      label: 'Core Services' },
  { key: 'leadership',         label: 'Leadership' },
  { key: 'trusted_by',         label: 'Trusted By' },
  { key: 'key_differentiators',label: 'Key Differentiators' },
  { key: 'awards',             label: 'Awards' },
  { key: 'publications',       label: 'Publications' },
  { key: 'news_articles',      label: 'News Articles' },
  { key: 'reviews',            label: 'Reviews' },
  { key: 'specializations',    label: 'Specializations' },
  { key: 'products',           label: 'Products & Offerings' },
  { key: 'key_features',       label: 'Key Features' },
  { key: 'locations',          label: 'Office Locations' },
  { key: 'contact',            label: 'Contact & Presence' },
  { key: 'similar_orgs',       label: 'Similar Organizations' },
  { key: 'investor_sources',   label: 'Funding & Investor Intelligence' },
  { key: 'social_media',       label: 'Social Channels' },
  { key: 'tech_stack',         label: 'Tech Stack' },
  { key: 'media_and_press',    label: 'Press & Media' },
  { key: 'image_url',                    label: 'Display Logo (master)' },
  { key: 'profile_picture_url',          label: 'Organization Logo' },
  { key: 'cropped_profile_picture_url',  label: 'Cropped Logo' },
  { key: 'banner_picture_url',           label: 'Cover Banner' },
  { key: 'cropped_banner_picture_url',   label: 'Cropped Banner' },
];

const ORG_ARRAY_KEYS = new Set([
  'core_services', 'leadership', 'trusted_by', 'key_differentiators',
  'awards', 'publications', 'news_articles', 'reviews',
  'specializations', 'products', 'key_features', 'locations',
  'similar_orgs', 'investor_sources', 'tech_stack', 'media_and_press',
]);

const ORG_SAFE_FIELDS = [
  'organization_name', 'tagline', 'description', 'industry', 'location',
  'founded_year', 'team_size', 'mission', 'vision', 'market_positioning',
  'channel_website', 'website_url', 'channel_linkedin', 'channel_x',
  'channel_youtube', 'channel_github', 'channel_crunchbase',
  'core_services', 'leadership', 'trusted_by', 'key_differentiators',
  'awards', 'publications', 'news_articles', 'reviews',
  'specializations', 'products', 'key_features', 'locations',
  'contact', 'similar_orgs', 'investor_sources', 'social_media',
  'tech_stack', 'media_and_press', 'social_followers',
  'image_url',
  'profile_picture_url', 'cropped_profile_picture_url',
  'banner_picture_url', 'cropped_banner_picture_url',
  'approval_status',
];

const ORG_DETAILS_IMAGE_FIELDS = new Set([
  'profile_picture_url', 'cropped_profile_picture_url',
  'banner_picture_url',  'cropped_banner_picture_url',
]);

// Fields rendered inside the dark "Featured Service" showcase card — the "answered"
// highlight box needs light-on-dark colors here instead of the default light card style.
const DARK_CARD_FIELDS = new Set(['CTA_image_url', 'featured_content']);

const ORG_FIELD_LABELS = Object.fromEntries(ORG_FIELDS.map(f => [f.key, f.label]));
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

const parseFunding = (desc) => {
  if (!desc) return null;
  const amount = desc.match(/\$([\d.]+[BMK]?(?:\s*(?:[Bb]illion|[Mm]illion|[Tt]rillion))?)/)?.[0] || null;
  const rounds = desc.match(/(\d+)\s+rounds?/i)?.[1] || null;
  const investors = desc.match(/(\d+)\s+investors?/i)?.[1] || null;
  if (!amount && !rounds && !investors) return null;
  return { amount, rounds, investors };
};

const INVESTOR_PLATFORM_STYLE = {
  Crunchbase: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  Tracxn:     { bg: '#f3e8ff', color: '#7c3aed', border: '#e9d5ff' },
  Dealroom:   { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  Wellfound:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Y Combinator': { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
};

const SOCIAL_ICON_MAP = {
  linkedin:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  instagram: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  youtube:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>,
  github:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>,
  twitter_x: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
};

const SOCIAL_COLOR_MAP = {
  linkedin:  { bg: '#eff6ff', color: '#0a66c2' },
  instagram: { bg: '#fdf4ff', color: '#c026d3' },
  youtube:   { bg: '#fff1f2', color: '#dc2626' },
  github:    { bg: '#f9fafb', color: '#111827' },
  twitter_x: { bg: '#f8fafc', color: '#1d4ed8' },
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
  const [isOrgRequest, setIsOrgRequest] = useState(false);

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

  const PERSON_FIELDS = [
    { key: 'name',            label: 'Name' },
    { key: 'role',            label: 'Role' },
    { key: 'subtitle',        label: 'Subtitle' },
    { key: 'sector',          label: 'Sector' },
    { key: 'location',        label: 'Location' },
    { key: 'active_since',    label: 'Since Year' },
    { key: 'bio',             label: 'Biography' },
    { key: 'linkedin_url',    label: 'LinkedIn URL' },
    { key: 'website_url',     label: 'Website URL' },
    { key: 'company',         label: 'Company' },
    { key: 'status',          label: 'Status' },
    { key: 'trust_tags',      label: 'Trust Tags' },
    { key: 'awards',          label: 'Awards' },
    { key: 'videos',          label: 'Videos' },
    { key: 'publications',    label: 'Publications' },
    { key: 'quick_facts',     label: 'Quick Facts' },
    { key: 'twitter_url',     label: 'X (Twitter) URL' },
    { key: 'facebook_url',    label: 'Facebook URL' },
    { key: 'instagram_url',   label: 'Instagram URL' },
    { key: 'youtube_url',     label: 'YouTube URL' },
    { key: 'medium_url',      label: 'Medium URL' },
    { key: 'github_url',      label: 'GitHub URL' },
    { key: 'wikipedia_url',   label: 'Wikipedia URL' },
    { key: 'subscribe_url',   label: 'Subscribe / Podcast URL' },
    { key: 'hq_image_url',    label: 'HQ Image' },
    { key: 'CTA_image_url',   label: 'CTA Showcase Image' },
    { key: 'featured_content', label: 'Featured Service & CTA' },
  ];

  const getChangedFields = () => {
    if (!liveProfile || !editForm) return [];
    const fields = isOrgRequest ? ORG_FIELDS : PERSON_FIELDS;
    return fields.filter(f => isFieldChanged(f.key));
  };

  const getProposedFields = () => {
    if (!liveProfile || !submittedProposed) return [];
    const fields = isOrgRequest ? ORG_FIELDS : PERSON_FIELDS;
    return fields.filter(f => {
      const orig = liveProfile?.[f.key] ?? '';
      const prop = submittedProposed?.[f.key];
      if (prop === undefined) return false;
      if (Array.isArray(orig) || Array.isArray(prop) || (typeof orig === 'object' && orig !== null) || (typeof prop === 'object' && prop !== null)) {
        return JSON.stringify(orig) !== JSON.stringify(prop);
      }
      return String(orig) !== String(prop);
    });
  };

  const PERSON_ARRAY_KEYS = new Set(['trust_tags', 'awards', 'videos', 'publications', 'quick_facts']);
  const isComplexArrayField = (key) => PERSON_ARRAY_KEYS.has(key) || ORG_ARRAY_KEYS.has(key);

  const PERSON_IMAGE_FIELDS = new Set(['image_url', 'hq_image_url', 'CTA_image_url']);

  const renderFeaturedContentPreview = (val) => {
    if (!val || typeof val !== 'object') return <span className="cr-value-empty">None</span>;
    const textFields = ['title', 'excerpt', 'article_url', 'image_url', 'highlight_quote', 'why_choose'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {textFields.filter(k => val[k]).map(k => (
          <div key={k} style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, marginRight: 4 }}>
              {k.replace(/_/g, ' ')}:
            </span>
            <span>{String(val[k]).slice(0, 140)}{String(val[k]).length > 140 ? '…' : ''}</span>
          </div>
        ))}
        {Array.isArray(val.key_benefits) && val.key_benefits.length > 0 && (
          <div style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, marginRight: 4 }}>key benefits:</span>
            <span>{val.key_benefits.join(' · ')}</span>
          </div>
        )}
      </div>
    );
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
    // contact and social_media are objects, not arrays — render as key-value pairs
    if ((key === 'contact' || key === 'social_media') && !Array.isArray(arr) && typeof arr === 'object') {
      const otherObj = (typeof otherVal === 'string' ? (() => { try { return JSON.parse(otherVal); } catch { return {}; } })() : otherVal) || {};
      return (
        <div className="cr-compare-array-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', width: '100%' }}>
          {Object.entries(arr).map(([k, v]) => {
            const otherV = otherObj[k];
            const changed = JSON.stringify(v) !== JSON.stringify(otherV);
            return (
              <div key={k} className="cr-compare-array-preview-item" style={{ fontSize: '13px', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span className={changed ? (isDeleted ? 'cr-value-deleted' : 'cr-value-added') : ''} style={changed ? undefined : { color: '#334155', fontWeight: 500 }}>
                  {k.replace(/_/g, ' ')}: {Array.isArray(v) ? v.join(', ') || '—' : String(v || '—')}
                </span>
              </div>
            );
          })}
        </div>
      );
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
            text = `${item.year || 'Year'} - ${item.title || 'Title'} (${item.issuer || item.organization || 'Issuer'})${item.description ? ` — ${item.description}` : ''}`;
          } else if (key === 'videos') {
            text = `${item.title || 'Video'} [${item.type || 'Video'}]${item.duration ? ` (${item.duration})` : ''}${item.views ? ` — ${item.views} views` : ''}`;
          } else if (key === 'publications') {
            text = typeof item === 'string' ? item
              : (item.publication_title || item.title)
                ? `${item.publication_title || item.title}${item.publication_year || item.date ? ` (${item.publication_year || item.date})` : ''}`
                : JSON.stringify(item);
          } else if (key === 'trust_tags') {
            text = `${item.name || 'Tag'} [${item.type || 'Tag'}]`;
          } else if (key === 'news_articles') {
            text = `${item.title || 'Article'}${item.source ? ` — ${item.source}` : ''}`;
          } else if (key === 'reviews') {
            text = `${item.source_platform || 'Platform'}: ${item.rating || '?'}★ (${item.review_count || 0} reviews)${item.review_snippet ? ` — "${item.review_snippet}"` : ''}`;
          } else if (key === 'core_services') {
            text = typeof item === 'string' ? item : `${item.name || 'Service'}${item.description ? `: ${item.description}` : ''}`;
          } else if (key === 'leadership') {
            text = `${item.name || 'Person'} — ${item.role || 'Role'}`;
          } else if (key === 'trusted_by' || key === 'key_differentiators' || key === 'specializations' || key === 'key_features' || key === 'tech_stack' || key === 'media_and_press') {
            text = typeof item === 'string' ? item : JSON.stringify(item);
          } else if (key === 'products') {
            text = typeof item === 'string' ? item : `${item.name || 'Product'}${item.description ? `: ${item.description}` : ''}`;
          } else if (key === 'locations') {
            text = `${item.city || ''}${item.country ? `, ${item.country}` : ''}${item.headquarter ? ' (HQ)' : ''}`;
          } else if (key === 'similar_orgs') {
            text = item.name ? `${item.name}${item.followerCount ? ` (${Number(item.followerCount).toLocaleString()} followers)` : ''}` : JSON.stringify(item);
          } else if (key === 'investor_sources') {
            text = `${item.platform || 'Platform'}: ${item.url || ''}`;
          } else {
            text = typeof item === 'string' ? item : JSON.stringify(item);
          }

          const isIdentical = otherStrings.has(JSON.stringify(item));
          let itemClass = '';
          let itemStyle = { color: '#334155', fontWeight: 500 };

          if (!isIdentical) {
            itemStyle = undefined;
            itemClass = isDeleted ? 'cr-value-deleted' : 'cr-value-added';
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
      name: 'Name', role: 'Role', subtitle: 'Subtitle', sector: 'Sector',
      location: 'Location', active_since: 'Since Year', bio: 'Biography',
      linkedin_url: 'LinkedIn URL', website_url: 'Website URL',
      company: 'Company', status: 'Status', trust_tags: 'Trust Tags',
      awards: 'Awards', videos: 'Videos', publications: 'Publications',
      quick_facts: 'Quick Facts',
      ...ORG_FIELD_LABELS,
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
        const [profilesRes, orgEntitiesRes, orgDetailsRes, userDetailsRes] = await Promise.all([
          supabase
            .from('entities_master')
            .select('user_id, image_url')
            .in('user_id', userIds),
          supabase
            .from('master_organization_entities')
            .select('user_id, image_url, cropped_profile_picture_url, profile_picture_url')
            .in('user_id', userIds),
          supabase
            .from('organization_details')
            .select('user_id, cropped_profile_picture_url, profile_picture_url')
            .in('user_id', userIds),
          supabase
            .from('user_details')
            .select('user_id, photo_url, cropped_photo_url')
            .in('user_id', userIds)
        ]);

        const imageMap = {};
        if (!profilesRes.error && profilesRes.data) {
          profilesRes.data.forEach(p => {
            if (p.user_id && p.image_url) {
              imageMap[p.user_id] = p.image_url;
            }
          });
        }
        if (!orgEntitiesRes.error && orgEntitiesRes.data) {
          orgEntitiesRes.data.forEach(p => {
            if (p.user_id) {
              const logo = p.cropped_profile_picture_url || p.profile_picture_url || p.image_url;
              if (logo) {
                imageMap[p.user_id] = logo;
              }
            }
          });
        }
        if (!orgDetailsRes.error && orgDetailsRes.data) {
          orgDetailsRes.data.forEach(p => {
            if (p.user_id) {
              const logo = p.cropped_profile_picture_url || p.profile_picture_url;
              if (logo) {
                imageMap[p.user_id] = logo;
              }
            }
          });
        }
        // user_details is the real source of truth for a person's photo — apply last so
        // it always wins over the (possibly stale) entities_master.image_url mirror.
        if (!userDetailsRes.error && userDetailsRes.data) {
          userDetailsRes.data.forEach(p => {
            if (p.user_id) {
              const photo = p.cropped_photo_url || p.photo_url;
              if (photo) {
                imageMap[p.user_id] = photo;
              }
            }
          });
        }
        setProfileImages(imageMap);
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
      const payload = JSON.parse(req.message || '{}');
      const entityType = payload.entity_type || 'person';
      const isOrg = entityType === 'organization';
      setIsOrgRequest(isOrg);
      setSubmittedProposed(payload.proposed || {});
      setComment(payload.admin_comment || '');

      const table = isOrg ? 'master_organization_entities' : 'entities_master';
      const [profileRes, detailsRes] = await Promise.all([
        supabase
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        isOrg
          ? supabase
              .from('organization_details')
              .select('profile_picture_url, banner_picture_url, cropped_profile_picture_url, cropped_banner_picture_url')
              .eq('user_id', userId)
              .maybeSingle()
          : supabase
              .from('user_details')
              .select('photo_url, cropped_photo_url')
              .eq('user_id', userId)
              .maybeSingle()
      ]);

      if (profileRes.error) throw profileRes.error;
      const activeProfile = profileRes.data;
      const orgDetails = detailsRes.data;
      // user_details is the real source of truth for a person's photo — never trust
      // entities_master.image_url alone, it's just a mirror that can go stale.
      const personImage = !isOrg ? (orgDetails?.cropped_photo_url || orgDetails?.photo_url || null) : null;

      let enrichmentData = {};
      if (isOrg) {
        const orgId = activeProfile?.user_id || userId;
        const orgName = activeProfile?.organization_name || payload.original?.organization_name || payload.proposed?.organization_name || '';

        const [newsResult, reviewsResult, liResult, siteDumpResult, investorResult] = await Promise.all([
          supabase.from('org_news_articles').select('title, url, source, created_at').eq('user_id', orgId).order('created_at', { ascending: false }).limit(6),
          supabase.from('org_reviews').select('source_platform, rating, review_count, review_snippet, review_url').eq('user_id', orgId),
          supabase.from('org_linkedin_data').select('raw_data').eq('user_id', orgId).maybeSingle(),
          supabase.from('organization_site_dump').select('company_data').eq('user_id', orgId).maybeSingle(),
          supabase.from('org_investor_page').select('source_platform, scraped_data->metadata').eq('user_id', orgId),
        ]);

        let siteDump = siteDumpResult.data?.company_data || null;
        if (!siteDump && orgName) {
          const { data: sdFallback } = await supabase.from('organization_site_dump').select('company_data').ilike('company_name', `%${orgName}%`).limit(1).maybeSingle();
          siteDump = sdFallback?.company_data || null;
        }

        let { data: pubsData } = await supabase.from('org_publications').select('publication_title, publication_url, abstract_snippet, publication_year').eq('user_id', orgId).limit(6);
        if (!pubsData?.length && orgName) {
          const { data: fallback } = await supabase.from('org_publications').select('publication_title, publication_url, abstract_snippet, publication_year').ilike('organization_name', `%${orgName}%`).limit(6);
          pubsData = fallback || [];
        }

        let li = liResult.data?.raw_data;
        if (typeof li === 'string') { try { li = JSON.parse(li); } catch { li = null; } }

        const specializations = (li?.specialities || []).slice(0, 15);
        const locations       = (li?.locations || []).filter(l => l.city || l.parsed?.city);
        const similarOrgs     = (li?.similarOrganizations || []).filter(s => s.name).slice(0, 6);

        const offerings     = siteDump?.offerings || {};
        const products      = (offerings.products_services || []).filter(p => p.name);
        const keyFeatures   = (offerings.key_features || []).filter(Boolean).slice(0, 8);
        const pricingUrls   = (offerings.pricing_pages_urls || []).filter(Boolean);
        const techStack     = (siteDump?.technical_and_hiring?.tech_stack_mentions || []).filter(Boolean);
        const siteClients   = (siteDump?.authority_and_trust?.clients || []).filter(Boolean);
        const siteAwards    = (siteDump?.authority_and_trust?.awards_certifications || []).filter(Boolean);
        const sitePartners  = (siteDump?.authority_and_trust?.partners || []).filter(Boolean);
        const contactInfo   = siteDump?.presence_and_contact || null;
        const extLinks      = siteDump?.external_intelligence_links || {};
        const socialMedia   = extLinks.social_media || {};
        const mediaAndPress = (extLinks.media_and_press || []).filter(Boolean);
        const investorSources = (investorResult.data || []).map(row => ({
          platform: row.source_platform || 'Unknown',
          url:      row.metadata?.sourceURL || row.metadata?.url || row.metadata?.['og:url'] || null,
          desc:     row.metadata?.description || null,
          ogDesc:   row.metadata?.ogDescription || row.metadata?.['og:description'] || null,
        })).filter(s => s.url);

        enrichmentData = {
          specializations,
          locations,
          similar_orgs: similarOrgs,
          products,
          key_features: keyFeatures,
          tech_stack: techStack,
          awards: siteAwards.length > 0 ? siteAwards : undefined,
          contact: contactInfo,
          social_media: socialMedia,
          media_and_press: mediaAndPress,
          investor_sources: investorSources,
          reviews: reviewsResult.data || [],
          news_articles: newsResult.data || [],
          publications: pubsData || [],
        };
      }

      // For org requests, merge original snapshot into liveProfile so enrichment
      // fields (not stored in master table) are available for comparison.
      const mergedProfile = isOrg
        ? {
            ...(payload.original || {}),
            ...enrichmentData,
            ...(orgDetails || {}),
            ...(activeProfile || {}),
            specializations: activeProfile?.specializations || enrichmentData.specializations || payload.original?.specializations || [],
            locations: activeProfile?.locations || enrichmentData.locations || payload.original?.locations || [],
            similar_orgs: activeProfile?.similar_orgs || enrichmentData.similar_orgs || payload.original?.similar_orgs || [],
            products: activeProfile?.products || enrichmentData.products || payload.original?.products || [],
            key_features: activeProfile?.key_features || enrichmentData.key_features || payload.original?.key_features || [],
            tech_stack: activeProfile?.tech_stack || enrichmentData.tech_stack || payload.original?.tech_stack || [],
            awards: activeProfile?.awards || enrichmentData.awards || payload.original?.awards || [],
            contact: activeProfile?.contact || enrichmentData.contact || payload.original?.contact || null,
            social_media: activeProfile?.social_media || enrichmentData.social_media || payload.original?.social_media || {},
            media_and_press: activeProfile?.media_and_press || enrichmentData.media_and_press || payload.original?.media_and_press || [],
            investor_sources: activeProfile?.investor_sources || enrichmentData.investor_sources || payload.original?.investor_sources || [],
            reviews: activeProfile?.reviews || enrichmentData.reviews || payload.original?.reviews || [],
            news_articles: activeProfile?.news_articles || enrichmentData.news_articles || payload.original?.news_articles || [],
            publications: activeProfile?.publications || enrichmentData.publications || payload.original?.publications || [],
            social_followers: activeProfile?.social_followers || payload.original?.social_followers || '',
            // organization_details is the real source of truth for logo/banner images —
            // re-apply after the activeProfile spread so a stale master-table mirror can't win.
            profile_picture_url: orgDetails?.profile_picture_url || activeProfile?.profile_picture_url || null,
            cropped_profile_picture_url: orgDetails?.cropped_profile_picture_url || activeProfile?.cropped_profile_picture_url || null,
            banner_picture_url: orgDetails?.banner_picture_url || activeProfile?.banner_picture_url || null,
            cropped_banner_picture_url: orgDetails?.cropped_banner_picture_url || activeProfile?.cropped_banner_picture_url || null,
          }
        : (activeProfile ? { ...activeProfile, image_url: personImage || activeProfile.image_url || null } : null);
      setLiveProfile(mergedProfile);

      const initialForm = {};
      if (mergedProfile) {
        Object.keys(mergedProfile).forEach(key => { initialForm[key] = mergedProfile[key]; });
      }
      // Pre-populate editForm with proposed values so admin sees proposed by default
      Object.entries(payload.proposed || {}).forEach(([key, val]) => { initialForm[key] = val; });
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
    const userName = isOrgRequest
      ? (liveProfile?.organization_name || selected.name || userId)
      : (selected.name || userId);
    let payload = { original: {}, proposed: {}, admin_comment: '' };
    try { payload = JSON.parse(selected.message); } catch { /* keep default */ }

    const PERSON_SAFE_FIELDS = [
      'name', 'role', 'subtitle', 'bio', 'location', 'sector', 'company',
      'status', 'active_since', 'linkedin_url', 'website_url', 'trust_tags',
      'awards', 'videos', 'publications', 'quick_facts', 'image_url',
      'is_premium', 'badge',
      'twitter_url', 'facebook_url', 'instagram_url', 'youtube_url',
      'medium_url', 'github_url', 'wikipedia_url', 'subscribe_url',
      'hq_image_url', 'CTA_image_url', 'featured_content',
    ];
    const safeFields = isOrgRequest ? ORG_SAFE_FIELDS : PERSON_SAFE_FIELDS;
    const finalProposed = {};
    safeFields.forEach(field => {
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

    const profileTable = isOrgRequest ? 'master_organization_entities' : 'entities_master';

    // For org image fields, separate out what goes to organization_details vs master table
    let masterProposed = { ...finalProposed };
    const orgDetailsUpdate = {};
    if (isOrgRequest && statusType === 'approved') {
      Object.keys(finalProposed).forEach(f => {
        if (ORG_DETAILS_IMAGE_FIELDS.has(f)) {
          orgDetailsUpdate[f] = finalProposed[f];
          delete masterProposed[f];
        }
      });
      // Delete enrichment fields so they aren't written to master_organization_entities
      const enrichmentKeys = [
        'specializations', 'locations', 'similar_orgs', 'products', 'key_features',
        'tech_stack', 'awards', 'contact', 'social_media', 'media_and_press',
        'investor_sources', 'reviews', 'news_articles', 'publications'
      ];
      enrichmentKeys.forEach(k => {
        delete masterProposed[k];
      });
    }

    const profileUpdateData =
      statusType === 'approved'         ? { ...masterProposed, approval_status: 'approved' } :
      statusType === 'change_requested' ? { approval_status: 'change_requested' } :
      /* rejected */                      { approval_status: 'approved' };
    const profilePromise = updateAdminProfile({ userId, updateData: profileUpdateData, table: profileTable })
      .catch(err => {
        profileSyncError = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
        console.error('Profile sync failed error details:', err);
      });

    // Write image fields to organization_details if present
    if (Object.keys(orgDetailsUpdate).length > 0) {
      try {
        await supabase
          .from('organization_details')
          .upsert({ user_id: userId, ...orgDetailsUpdate }, { onConflict: 'user_id' });
      } catch (imgErr) {
        console.error('Failed to write image fields to organization_details:', imgErr);
      }
    }

    // Write organization enrichment data to their respective tables on approval
    if (isOrgRequest && statusType === 'approved') {
      const orgId = userId;
      // 1. Sync specializations & locations to org_linkedin_data
      if (editForm.specializations !== undefined || editForm.locations !== undefined) {
        try {
          const { data: liRow } = await supabase.from('org_linkedin_data').select('raw_data').eq('user_id', orgId).maybeSingle();
          let existingLi = liRow?.raw_data || {};
          if (typeof existingLi === 'string') { try { existingLi = JSON.parse(existingLi); } catch { existingLi = {}; } }
          
          const specs = editForm.specializations !== undefined ? editForm.specializations : (liveProfile?.specializations || []);
          const locs = editForm.locations !== undefined ? editForm.locations : (liveProfile?.locations || []);

          await supabase.from('org_linkedin_data').upsert({
            user_id: orgId,
            raw_data: {
              ...existingLi,
              specialities: Array.isArray(specs) ? specs.filter(Boolean) : [],
              locations: Array.isArray(locs) ? locs.filter(l => l.city || l.parsed?.city || l.country).map(l => ({
                city: l.city || l.parsed?.city, country: l.country || l.parsed?.countryFull || l.parsed?.country, headquarter: l.headquarter,
                parsed: { city: l.city || l.parsed?.city, country: l.country || l.parsed?.countryFull || l.parsed?.country, countryFull: l.country || l.parsed?.countryFull || l.parsed?.country },
              })) : [],
            },
          }, { onConflict: 'user_id' });
        } catch (err) {
          console.error('Failed to sync LinkedIn data:', err);
        }
      }

      // 2. Sync products, key_features, awards, contact, tech_stack to organization_site_dump
      if (editForm.products !== undefined || editForm.key_features !== undefined || editForm.awards !== undefined || editForm.contact !== undefined || editForm.tech_stack !== undefined) {
        try {
          const { data: sdRow } = await supabase.from('organization_site_dump').select('company_data').eq('user_id', orgId).maybeSingle();
          let existingSd = sdRow?.company_data || {};
          if (typeof existingSd === 'string') { try { existingSd = JSON.parse(existingSd); } catch { existingSd = {}; } }

          const prods = editForm.products !== undefined ? editForm.products : (liveProfile?.products || []);
          const feats = editForm.key_features !== undefined ? editForm.key_features : (liveProfile?.key_features || []);
          const awds = editForm.awards !== undefined ? editForm.awards : (liveProfile?.awards || []);
          const cont = editForm.contact !== undefined ? editForm.contact : (liveProfile?.contact || null);
          const tech = editForm.tech_stack !== undefined ? editForm.tech_stack : (liveProfile?.tech_stack || []);

          await supabase.from('organization_site_dump').upsert({
            user_id: orgId,
            company_name: masterProposed.organization_name || liveProfile?.organization_name,
            company_data: {
              ...existingSd,
              offerings: {
                ...(existingSd.offerings || {}),
                products_services: Array.isArray(prods) ? prods.filter(p => p.name) : [],
                key_features: Array.isArray(feats) ? feats.filter(Boolean) : []
              },
              technical_and_hiring: {
                ...(existingSd.technical_and_hiring || {}),
                tech_stack_mentions: Array.isArray(tech) ? tech.filter(Boolean) : []
              },
              authority_and_trust: {
                ...(existingSd.authority_and_trust || {}),
                awards_certifications: Array.isArray(awds) ? awds.filter(Boolean) : []
              },
              presence_and_contact: cont,
            },
          }, { onConflict: 'user_id' });
        } catch (err) {
          console.error('Failed to sync organization site dump:', err);
        }
      }

      // 3. Sync news_articles to org_news_articles
      if (editForm.news_articles !== undefined) {
        try {
          await supabase.from('org_news_articles').delete().eq('user_id', orgId);
          const validNews = (editForm.news_articles || []).filter(a => a.title && a.url);
          if (validNews.length > 0) {
            await supabase.from('org_news_articles').insert(validNews.map(a => ({
              user_id: orgId,
              title: a.title,
              url: a.url,
              source: a.source
            })));
          }
        } catch (err) {
          console.error('Failed to sync news articles:', err);
        }
      }

      // 4. Sync publications to org_publications
      if (editForm.publications !== undefined) {
        try {
          await supabase.from('org_publications').delete().eq('user_id', orgId);
          const validPubs = (editForm.publications || []).filter(p => p.publication_title || p.title);
          if (validPubs.length > 0) {
            await supabase.from('org_publications').insert(validPubs.map(p => ({
              user_id: orgId,
              publication_title: p.publication_title || p.title,
              publication_url: p.publication_url || p.url,
              abstract_snippet: p.abstract_snippet || p.abstract,
              publication_year: p.publication_year || p.year,
              organization_name: masterProposed.organization_name || liveProfile?.organization_name
            })));
          }
        } catch (err) {
          console.error('Failed to sync publications:', err);
        }
      }

      // 5. Sync reviews to org_reviews
      if (editForm.reviews !== undefined) {
        try {
          await supabase.from('org_reviews').delete().eq('user_id', orgId);
          const validReviews = (editForm.reviews || []).filter(r => r.source_platform && r.rating);
          if (validReviews.length > 0) {
            await supabase.from('org_reviews').insert(validReviews.map(r => ({
              user_id: orgId,
              source_platform: r.source_platform,
              rating: Number(r.rating) || 0,
              review_count: r.review_count ? Number(r.review_count) : null,
              review_snippet: r.review_snippet,
              review_url: r.review_url
            })));
          }
        } catch (err) {
          console.error('Failed to sync reviews:', err);
        }
      }
    }

    const submissionPromise = updateSubmissionStatus(selected.id, statusType, messagePayload)
      .catch(err => {
        submissionSyncError = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
        console.error('Submission status sync failed error details:', err);
      });

    await Promise.all([profilePromise, submissionPromise]);

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
    const displayName = isOrgRequest
      ? (liveProfile?.organization_name || selected.name || 'Organization')
      : (getPropVal('name') || selected.name || 'Profile');
    const proposedAvatarText = getInitials(displayName);
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
          style={isAnswered ? (
            DARK_CARD_FIELDS.has(key)
              ? { border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '12px', padding: '14px 18px', margin: '14px 0', backgroundColor: 'rgba(255, 255, 255, 0.06)', cursor: 'pointer' }
              : { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', margin: '14px 0', backgroundColor: '#f8fafc', cursor: 'pointer' }
          ) : undefined}
        >
          <div className="cr-field-content-block">
            {children}
          </div>
          {badgeElement}
        </div>
      );
    };

    /* ── Org preview computed values (safe when isOrgRequest is false) ── */
    const orgBannerUrl    = isOrgRequest ? (getPropVal('cropped_banner_picture_url') || getPropVal('banner_picture_url') || '') : '';
    const orgLogoUrl      = isOrgRequest ? (getPropVal('cropped_profile_picture_url') || getPropVal('profile_picture_url') || getPropVal('image_url') || '') : '';
    const orgScore        = isOrgRequest ? (Number(liveProfile?.authority_score) || 0) : 0;
    const _orgRingR       = 38;
    const _orgRingCirc    = 2 * Math.PI * _orgRingR;
    const _orgPct         = Math.min(100, Math.max(0, orgScore));
    const orgRingDash     = _orgRingCirc - (_orgPct / 100) * _orgRingCirc;
    const orgRingColor    = orgScore >= 80 ? '#1E3A8A' : orgScore >= 55 ? '#6366f1' : '#94a3b8';
    const orgCoreServices = isOrgRequest ? getArrayVal('core_services') : [];
    const orgLeadership   = isOrgRequest ? getArrayVal('leadership') : [];
    const orgTrustedBy    = isOrgRequest ? getArrayVal('trusted_by').map(x => typeof x === 'string' ? x : x.name || '').filter(Boolean) : [];
    const orgAwards       = isOrgRequest ? getArrayVal('awards') : [];
    const orgProducts     = isOrgRequest ? getArrayVal('products') : [];
    const orgSpecs        = isOrgRequest ? getArrayVal('specializations').map(x => typeof x === 'string' ? x : '').filter(Boolean) : [];
    const orgKeyFeats     = isOrgRequest ? getArrayVal('key_features').map(x => typeof x === 'string' ? x : '').filter(Boolean) : [];
    const orgLocations    = isOrgRequest ? getArrayVal('locations') : [];
    const orgDiffs        = isOrgRequest ? getArrayVal('key_differentiators').map(d => typeof d === 'string' ? d : d.title || d.text || d.description || '').filter(Boolean) : [];
    const orgHasStory     = isOrgRequest && !!(getPropVal('mission') || getPropVal('vision') || getPropVal('market_positioning') || orgDiffs.length > 0);
    const orgReviews      = isOrgRequest ? getArrayVal('reviews') : [];
    const orgNews         = isOrgRequest ? getArrayVal('news_articles') : [];
    const orgPublications = isOrgRequest ? getArrayVal('publications') : [];
    const orgContact      = isOrgRequest ? (liveProfile?.contact || null) : null;
    const orgTechStack    = isOrgRequest ? getArrayVal('tech_stack') : [];
    const orgSimilarOrgs  = isOrgRequest ? getArrayVal('similar_orgs') : [];
    const orgInvestorSources = isOrgRequest ? getArrayVal('investor_sources') : [];
    const orgMediaAndPress = isOrgRequest ? getArrayVal('media_and_press') : [];

    const tracxn = orgInvestorSources.find(s => s.platform === 'Tracxn');
    const funding = parseFunding(tracxn?.ogDesc || tracxn?.desc);

    const socialMedia = isOrgRequest ? (liveProfile?.social_media || {}) : {};
    const socialEntries = Object.entries(socialMedia).filter(([, url]) => url).map(([key, url]) => ({
      key,
      url,
      label: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const orgStats = isOrgRequest ? [
      { key: 'years_in_business',      raw: getPropVal('years_in_business'),      label: 'Years in Business',  icon: <Calendar size={22} /> },
      { key: 'key_clients_count',      raw: getPropVal('key_clients_count'),      label: 'Key Clients',        icon: <Users size={22} /> },
      { key: 'verified_reviews_count', raw: getPropVal('verified_reviews_count'), label: 'Verified Reviews',   icon: <Star size={22} /> },
      { key: 'awards_count',           raw: getPropVal('awards_count'),           label: 'Awards',             icon: <Award size={22} /> },
      { key: 'projects_delivered',     raw: getPropVal('projects_delivered'),     label: 'Projects Delivered', icon: <Briefcase size={22} /> },
      { key: 'media_mentions_count',   raw: getPropVal('media_mentions_count'),   label: 'Media Mentions',     icon: <Newspaper size={22} /> },
      { key: 'social_followers',       raw: getPropVal('social_followers'),       label: 'Social Followers',   icon: <TrendingUp size={22} /> },
    ].filter(s => s.raw !== null && s.raw !== undefined && s.raw !== '' && s.raw !== 0) : [];

    const orgSocialLinks  = isOrgRequest ? [
      (getPropVal('channel_website') || getPropVal('website_url')) ? { key: 'channel_website', label: 'Website',    url: getPropVal('channel_website') || getPropVal('website_url'), bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> } : null,
      getPropVal('channel_linkedin') ? { key: 'channel_linkedin', label: 'LinkedIn',   url: getPropVal('channel_linkedin'),   bg: '#dbeafe', color: '#0a66c2', border: '#93c5fd', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> } : null,
      getPropVal('channel_x')        ? { key: 'channel_x',        label: 'X',          url: getPropVal('channel_x'),          bg: '#f1f5f9', color: '#111827', border: '#cbd5e1', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> } : null,
      getPropVal('channel_youtube')  ? { key: 'channel_youtube',  label: 'YouTube',    url: getPropVal('channel_youtube'),    bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg> } : null,
      getPropVal('channel_github')   ? { key: 'channel_github',   label: 'GitHub',     url: getPropVal('channel_github'),     bg: '#f3f4f6', color: '#111827', border: '#d1d5db', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> } : null,
      getPropVal('channel_crunchbase')? { key: 'channel_crunchbase', label: 'Crunchbase', url: getPropVal('channel_crunchbase'), bg: '#dcfce7', color: '#16a34a', border: '#86efac', icon: <Database size={15} /> } : null,
    ].filter(Boolean) : [];

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
                    <img src={getPropVal('image_url') || liveProfile?.image_url} alt={displayName} />
                  ) : (
                    <span>{proposedAvatarText}</span>
                  )}
                </div>
                <div className="cr-mini-meta">
                  <div className="cr-mini-name">
                    <span>Reviewing {isOrgRequest ? 'Organization' : 'Profile'} Changes:</span>
                    <h3>{displayName}</h3>
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
                  {(() => {
                    const displayName = isOrgRequest
                      ? (liveProfile?.organization_name || selected?.name || 'the organization')
                      : (selected?.name || 'the user');
                    return isApprove
                      ? `This will apply all proposed changes to ${displayName}'s live profile immediately.`
                      : isRequest
                        ? `This will send feedback to ${displayName} and request adjustments.`
                        : `This will decline the proposed changes. The live profile will remain unchanged.`;
                  })()}
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

            {/* ── Org Profile Preview ───────────────────────── */}
            {isOrgRequest && (
              <div className="op-page cr-org-profile-preview" style={{ background: 'transparent', minHeight: 'auto' }}>

                {/* Hero Banner — rendered directly, no wrapper so CSS overlap works */}
                <div
                  className={`op-hero${isFieldChanged('banner_picture_url') || isFieldChanged('cropped_banner_picture_url') ? ' cr-field-changed-banner' : ''}`}
                  style={{ cursor: (isFieldChanged('banner_picture_url') || isFieldChanged('cropped_banner_picture_url')) ? 'pointer' : 'default' }}
                  onClick={() => { if (isFieldChanged('banner_picture_url') || isFieldChanged('cropped_banner_picture_url')) setActiveChangeField('banner_picture_url'); }}
                  title={(isFieldChanged('banner_picture_url') || isFieldChanged('cropped_banner_picture_url')) ? 'Click to compare cover banner change' : undefined}
                >
                  {orgBannerUrl
                    ? <img src={orgBannerUrl} alt="Organization Cover" className="op-hero__img" />
                    : <div className="op-hero__img" />}
                  <div className="op-hero__overlay" />
                  {(isFieldChanged('banner_picture_url') || isFieldChanged('cropped_banner_picture_url')) && (
                    <span className="cr-inline-change-badge" style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                      <RefreshCw size={10} style={{ marginRight: 4 }} />Compare &amp; Edit
                    </span>
                  )}
                </div>

                {/* Identity Header */}
                <section className="op-header-section">
                  <div className="op-container">
                    <div className="op-header-card">
                      <div className="op-header-left">

                        {/* Logo + badge */}
                        <div className="op-header-logo-row">
                          <div
                            className={`op-org-logo${isFieldChanged('profile_picture_url') || isFieldChanged('cropped_profile_picture_url') ? ' cr-field-changed-logo' : ''}`}
                            style={{ cursor: (isFieldChanged('profile_picture_url') || isFieldChanged('cropped_profile_picture_url')) ? 'pointer' : 'default' }}
                            onClick={() => { if (isFieldChanged('profile_picture_url') || isFieldChanged('cropped_profile_picture_url')) setActiveChangeField('profile_picture_url'); }}
                          >
                            {orgLogoUrl ? (
                              <img src={orgLogoUrl} alt={getPropVal('organization_name')}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                              />
                            ) : null}
                            <span style={{ display: orgLogoUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                              {proposedAvatarText}
                            </span>
                          </div>
                          <div className="op-header-badges">
                            <span className="op-badge op-badge--verified">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                              21NEWS VERIFIED
                            </span>
                          </div>
                        </div>

                        {renderClickableField('organization_name', 'Organization Name',
                          <h1 className="op-org-name">{getPropVal('organization_name') || '—'}</h1>
                        )}

                        {getPropVal('tagline') && renderClickableField('tagline', 'Tagline',
                          <p className="op-org-tagline">{getPropVal('tagline')}</p>
                        )}

                        {getPropVal('description') && renderClickableField('description', 'Description',
                          <div className="op-org-desc">
                            {renderBiographyWords(liveProfile?.description, getPropVal('description'), true)}
                          </div>
                        )}

                        <div className="op-meta-row">
                          {getPropVal('industry')    && renderClickableField('industry',     'Industry',     <span className="op-meta-item"><Building2 size={14} />{getPropVal('industry')}</span>)}
                          {getPropVal('location')    && renderClickableField('location',     'Location',     <span className="op-meta-item"><MapPin size={14} />{getPropVal('location')}</span>)}
                          {getPropVal('founded_year')&& renderClickableField('founded_year', 'Founded Year', <span className="op-meta-item"><Calendar size={14} />Founded {getPropVal('founded_year')}</span>)}
                          {getPropVal('team_size')   && renderClickableField('team_size',    'Team Size',    <span className="op-meta-item"><Users size={14} />Team {getPropVal('team_size')}</span>)}
                        </div>

                        {/* Social pills */}
                        {orgSocialLinks.length > 0 && (
                          <div className="op-social-links" style={{ marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                            {orgSocialLinks.map((link) => (
                              <div key={link.key}>
                                {renderClickableField(link.key, link.label,
                                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                                    className="op-social-pill"
                                    style={{ backgroundColor: link.bg, borderColor: link.border, color: link.color }}>
                                    <span className="op-social-pill__icon">{link.icon}</span>
                                    <span className="op-social-pill__label">{link.label}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Header action buttons */}
                        <div className="op-header-actions" style={{ marginTop: 14 }}>
                          {(getPropVal('channel_website') || getPropVal('website_url')) && (
                            <a href={getPropVal('channel_website') || getPropVal('website_url')} target="_blank" rel="noopener noreferrer" className="op-btn op-btn--secondary">
                              <Globe size={15} /> Visit Website
                            </a>
                          )}
                          {liveProfile?.email_id && (
                            <a href={`mailto:${liveProfile.email_id}`} className="op-btn op-btn--secondary">
                              <Mail size={15} /> Contact
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Trust Panel */}
                      <div className="op-trust-panel">
                        <div className="op-trust-panel__title">Trust &amp; Verification</div>
                        <ul className="op-trust-panel__list">
                          {[
                            { label: 'Verified Business', icon: <CheckCircle size={15} /> },
                            { label: 'Active Company',    icon: <Zap size={15} /> },
                            { label: 'Human Reviewed',   icon: <UserCheck size={15} /> },
                          ].map((item, i) => (
                            <li key={i} className="op-trust-panel__item">
                              <span className="op-trust-panel__icon">{item.icon}</span>
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="op-trust-panel__score-wrap">
                          <div className="op-authority-ring">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r={_orgRingR} fill="none" stroke="#e0e7ff" strokeWidth="8" />
                              <circle cx="50" cy="50" r={_orgRingR} fill="none"
                                stroke={orgRingColor} strokeWidth="8"
                                strokeDasharray={`${_orgRingCirc}`}
                                strokeDashoffset={orgRingDash}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                              />
                            </svg>
                            <div className="op-authority-ring__center">
                              <span className="op-authority-ring__score">{orgScore || '—'}</span>
                              <span className="op-authority-ring__sub">/ 100</span>
                            </div>
                          </div>
                          <span className="op-trust-panel__score-label">Authority Score</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Credibility Snapshot */}
                {orgStats.length > 0 && (
                  <section className="op-section op-stats-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Company Credibility Snapshot</h2>
                      <div className="op-stats-grid">
                        {orgStats.map((s, i) => (
                          <div key={i} className={`op-stat-card op-stat-card--${i % 5}`}>
                            {renderClickableField(s.key, s.label,
                              <>
                                <div className="op-stat-card__icon">{s.icon}</div>
                                <div className="op-stat-card__value">{s.raw}</div>
                                <div className="op-stat-card__label">{s.label}</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Company Story */}
                {orgHasStory && (
                  <section className="op-section op-story-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Company Story</h2>
                      <p className="op-section-subtitle">Purpose, vision and what makes this company unique</p>
                      {(getPropVal('mission') || getPropVal('vision')) && (
                        <div className="op-story-mv-row">
                          {getPropVal('mission') && renderClickableField('mission', 'Mission',
                            <div className="op-story-mv-card op-story-mv-card--mission">
                              <div className="op-story-mv-card__glow" />
                              <div className="op-story-mv-card__icon"><Target size={20} /></div>
                              <span className="op-story-mv-card__label">Mission</span>
                              <p className="op-story-mv-card__text">{getPropVal('mission')}</p>
                            </div>
                          )}
                          {getPropVal('vision') && renderClickableField('vision', 'Vision',
                            <div className="op-story-mv-card op-story-mv-card--vision">
                              <div className="op-story-mv-card__glow" />
                              <div className="op-story-mv-card__icon"><Eye size={20} /></div>
                              <span className="op-story-mv-card__label">Vision</span>
                              <p className="op-story-mv-card__text">{getPropVal('vision')}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {getPropVal('market_positioning') && renderClickableField('market_positioning', 'Market Positioning',
                        <div className="op-story-market">
                          <div className="op-story-market__bar" />
                          <div className="op-story-market__inner">
                            <span className="op-story-market__label"><TrendingUp size={13} />Market Positioning</span>
                            <p className="op-story-market__text">{getPropVal('market_positioning')}</p>
                          </div>
                        </div>
                      )}
                      {orgDiffs.length > 0 && renderClickableField('key_differentiators', 'Key Differentiators',
                        <div className="op-story-diff-section">
                          <span className="op-story-diff-section__title">Key Differentiators</span>
                          <div className="op-story-diff-grid">
                            {orgDiffs.map((d, i) => (
                              <div key={i} className="op-story-diff-card">
                                <div className="op-story-diff-card__num">{String(i + 1).padStart(2, '0')}</div>
                                <div className="op-story-diff-card__check"><Check size={11} /></div>
                                <p className="op-story-diff-card__text">{d}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Core Services */}
                {orgCoreServices.length > 0 && (
                  <section className="op-section op-services-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Core Services</h2>
                      <p className="op-section-subtitle">{orgCoreServices.length} service{orgCoreServices.length !== 1 ? 's' : ''} offered</p>
                      {renderClickableField('core_services', 'Core Services',
                        <div className="op-services-grid">
                          {orgCoreServices.map((svc, i) => (
                            <div key={i} className="op-service-card">
                              <div className="op-service-card__num">{String(i + 1).padStart(2, '0')}</div>
                              <h3 className="op-service-card__title">{svc.name || svc.title || svc}</h3>
                              <p className="op-service-card__desc">{svc.description || svc.desc || ''}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Products & Offerings */}
                {orgProducts.length > 0 && (
                  <section className="op-section op-products-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Products &amp; Offerings</h2>
                      <p className="op-section-subtitle">{orgProducts.length} product{orgProducts.length !== 1 ? 's' : ''} &amp; services</p>
                      {renderClickableField('products', 'Products & Offerings',
                        <div className="op-products-grid">
                          {orgProducts.map((p, i) => (
                            <div key={i} className="op-product-card">
                              <div className="op-product-card__index">{String(i + 1).padStart(2, '0')}</div>
                              <h3 className="op-product-card__name">{p.name || p}</h3>
                              <p className="op-product-card__desc">{p.description || ''}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {orgKeyFeats.length > 0 && renderClickableField('key_features', 'Key Features',
                        <div className="op-products-features" style={{ marginTop: 16 }}>
                          <span className="op-products-features__label">Key Features</span>
                          <div className="op-products-features__chips">
                            {orgKeyFeats.map((f, i) => (
                              <span key={i} className="op-products-feature-chip"><Check size={11} /> {f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {orgTechStack.length > 0 && renderClickableField('tech_stack', 'Tech Stack',
                        <div className="op-products-tech" style={{ marginTop: 16 }}>
                          <span className="op-products-features__label">Tech Stack</span>
                          <div className="op-products-features__chips">
                            {orgTechStack.map((t, i) => (
                              <span key={i} className="op-products-tech-chip">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Specializations */}
                {orgSpecs.length > 0 && (
                  <section className="op-section op-tags-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Specializations</h2>
                      <p className="op-section-subtitle">Core capabilities and areas of expertise</p>
                      {renderClickableField('specializations', 'Specializations',
                        <div className="op-tags-wrap">
                          {orgSpecs.map((t, i) => {
                            const palettes = [
                              { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
                              { bg: '#f0fdf4', color: '#065f46', border: '#bbf7d0' },
                              { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
                              { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
                              { bg: '#f0f9ff', color: '#0c4a6e', border: '#bae6fd' },
                              { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
                            ];
                            const pal = palettes[i % palettes.length];
                            return (
                              <span key={i} className="op-tag" style={{ background: pal.bg, color: pal.color, borderColor: pal.border }}>
                                <Check size={11} />{t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Leadership */}
                {orgLeadership.length > 0 && (
                  <section className="op-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Leadership &amp; Key People</h2>
                      <p className="op-section-subtitle">Verified individuals connected to this organization</p>
                      {renderClickableField('leadership', 'Leadership',
                        <div className="op-leadership-grid">
                          {orgLeadership.map((person, i) => {
                            const initials = (person.name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'NA';
                            return (
                              <div key={i} className="op-lcard">
                                <div className="op-lcard__img-wrap">
                                  {(person.cropped_photo_url || person.image_url || person.image) ? (
                                    <img src={person.cropped_photo_url || person.image_url || person.image} alt={person.name} className="op-lcard__img"
                                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }} />
                                  ) : null}
                                  <div className="op-lcard__img-fallback" style={{ display: (person.cropped_photo_url || person.image_url || person.image) ? 'none' : 'flex' }}>
                                    <span>{initials}</span>
                                  </div>
                                  <span className="op-lcard__verified">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                    21NEWS Verified
                                  </span>
                                </div>
                                <h3 className="op-lcard__name">{person.name}</h3>
                                {person.role      && <p className="op-lcard__role">{person.role}</p>}
                                {person.expertise && <p className="op-lcard__sector">{person.expertise}</p>}
                                {Number(person.score) > 0 && (
                                  <div className="op-lcard__score">
                                    <Star size={16} className="op-lcard__star" />
                                    <span>{person.score}</span>
                                  </div>
                                )}
                                <div className="op-lcard__footer">
                                  <span className="op-lcard__btn op-lcard__btn--disabled">Profile Preview</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Trusted By */}
                {orgTrustedBy.length > 0 && (
                  <section className="op-section op-trusted-parties-section">
                    <div className="op-container">
                      <div className="op-trusted-parties-heading">
                        <h2 className="op-section-title">Trusted By</h2>
                        <span className="op-trusted-parties-count"><ShieldCheck size={13} />{orgTrustedBy.length} verified organizations</span>
                      </div>
                      <p className="op-section-subtitle">Organizations, clients and partners that trust this company</p>
                      {renderClickableField('trusted_by', 'Trusted By',
                        <div className="op-trusted-parties-grid" style={{ gridTemplateColumns: `repeat(${Math.min(orgTrustedBy.length, 4)}, 1fr)` }}>
                          {orgTrustedBy.map((name, i) => (
                            <div key={i} className="op-trusted-party-card">
                              <div className="op-trusted-party-card__accent" />
                              <div className="op-trusted-party-card__icon"><Building2 size={16} /></div>
                              <span className="op-trusted-party-card__name">{name}</span>
                              <span className="op-trusted-party-card__check"><Check size={9} /></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Awards */}
                {orgAwards.length > 0 && (
                  <section className="op-section op-awards-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Awards &amp; Recognition</h2>
                      <p className="op-section-subtitle">Verified achievements and industry recognition</p>
                      {renderClickableField('awards', 'Awards',
                        <div className="op-awards-grid">
                          {orgAwards.map((item, i) => {
                            const text   = typeof item === 'string' ? item : `${item.title || ''}${item.year ? ` (${item.year})` : ''}${item.issuer || item.organization ? ` — ${item.issuer || item.organization}` : ''}`;
                            const yr     = typeof item === 'object' ? item.year : ((text.match(/\b(20\d{2}|19\d{2})\b/) || [])[0] || null);
                            const issuer = typeof item === 'object' ? (item.issuer || item.organization || null) : null;
                            return (
                              <div key={i} className="op-award-card">
                                <div className="op-award-card__icon"><Award size={20} /></div>
                                <div className="op-award-card__body">
                                  <p className="op-award-card__text">{text}</p>
                                  <div className="op-award-card__meta">
                                    {yr     && <span className="op-award-card__year">{yr}</span>}
                                    {issuer && <span className="op-award-card__platform">{issuer}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Office Locations */}
                {orgLocations.length > 0 && (
                  <section className="op-section op-locations-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Office Locations</h2>
                      {renderClickableField('locations', 'Office Locations',
                        <div className="op-locations-grid">
                          {[...orgLocations].sort((a, b) => {
                            const aHQ = a.headquarter === true || a.headquarter === 'true';
                            const bHQ = b.headquarter === true || b.headquarter === 'true';
                            return bHQ - aHQ;
                          }).map((loc, i) => {
                            const city    = loc.parsed?.city || loc.city || '';
                            const country = loc.parsed?.countryFull || loc.parsed?.country || loc.country || '';
                            const isHQ    = loc.headquarter === 'true' || loc.headquarter === true;
                            return (
                              <div key={i} className={`op-location-card${isHQ ? ' op-location-card--hq' : ''}`}>
                                {isHQ && <span className="op-location-card__hq">HQ</span>}
                                <MapPin size={20} className="op-location-card__pin" />
                                <div className="op-location-card__city">{city || country}</div>
                                {city && country && <div className="op-location-card__country">{country}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}



                {/* Reviews & Ratings */}
                {orgReviews.length > 0 && (
                  <section className="op-section op-reviews-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Reviews &amp; Ratings</h2>
                      <p className="op-section-subtitle">Aggregated from verified third-party review platforms</p>
                      {renderClickableField('reviews', 'Reviews',
                        <div className="op-reviews-grid">
                          {orgReviews.map((r, i) => {
                            const platformColor = { Glassdoor: '#0caa41', G2: '#ff492c', Trustpilot: '#00b67a', Google: '#4285f4' };
                            return (
                              <div key={i} className="op-review-card">
                                <div className="op-review-card__platform" style={{ color: platformColor[r.source_platform] || 'var(--primary-blue)' }}>
                                  {r.source_platform}
                                </div>
                                <div className="op-review-card__rating-row">
                                  <span className="op-review-card__score">{r.rating}</span>
                                  <div className="op-review-card__stars">
                                    {[...Array(5)].map((_, j) => (
                                      <Star key={j} size={13} fill={j < Math.round(Number(r.rating)) ? '#f59e0b' : 'none'} color="#f59e0b" />
                                    ))}
                                  </div>
                                </div>
                                {r.review_count && <div className="op-review-card__count">{Number(r.review_count).toLocaleString()} reviews</div>}
                                {r.review_snippet && <p className="op-review-card__snippet">{r.review_snippet.length > 110 ? r.review_snippet.slice(0, 110) + '…' : r.review_snippet}</p>}
                                {r.review_url && <span className="op-review-card__link">View on {r.source_platform} <ExternalLink size={11} /></span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* News & Press Coverage */}
                {orgNews.length > 0 && (
                  <section className="op-section op-news-section">
                    <div className="op-container">
                      <h2 className="op-section-title">News &amp; Press Coverage</h2>
                      {renderClickableField('news_articles', 'News Articles',
                        <div className="op-news-grid">
                          {orgNews.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="op-news-card">
                              <div className="op-news-card__source"><Newspaper size={12} />{a.source}</div>
                              <h3 className="op-news-card__title">{a.title}</h3>
                              <div className="op-news-card__footer">
                                <span className="op-news-card__read">Read article <ExternalLink size={11} /></span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Funding & Investor Intelligence */}
                {orgInvestorSources.length > 0 && (
                  <section className="op-section op-investor-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Funding &amp; Investor Intelligence</h2>
                      <p className="op-section-subtitle">Sourced from leading startup intelligence platforms</p>
                      {renderClickableField('investor_sources', 'Funding & Investor Intelligence',
                        <>
                          {funding && (
                            <div className="op-investor-summary" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
                              {funding.amount && <div className="op-investor-summary__stat" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BadgeDollarSign size={22} style={{ color: '#1e3a8a' }} /><div><div className="op-investor-summary__val" style={{ fontWeight: 700, fontSize: '18px' }}>{funding.amount}</div><div className="op-investor-summary__lbl" style={{ fontSize: '12px', color: '#64748b' }}>Total Raised</div></div></div>}
                              {funding.rounds && <div className="op-investor-summary__stat" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart2 size={22} style={{ color: '#1e3a8a' }} /><div><div className="op-investor-summary__val" style={{ fontWeight: 700, fontSize: '18px' }}>{funding.rounds}</div><div className="op-investor-summary__lbl" style={{ fontSize: '12px', color: '#64748b' }}>Funding Rounds</div></div></div>}
                              {funding.investors && <div className="op-investor-summary__stat" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={22} style={{ color: '#1e3a8a' }} /><div><div className="op-investor-summary__val" style={{ fontWeight: 700, fontSize: '18px' }}>{funding.investors}</div><div className="op-investor-summary__lbl" style={{ fontSize: '12px', color: '#64748b' }}>Investors</div></div></div>}
                            </div>
                          )}
                          <div className="op-investor-sources-grid">
                            {orgInvestorSources.map((src, i) => {
                              const style = INVESTOR_PLATFORM_STYLE[src.platform] || { bg: '#eef2ff', color: '#1E3A8A', border: '#bfdbfe' };
                              const desc = (src.ogDesc || src.desc || '').slice(0, 160);
                              return (
                                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="op-investor-source-card" style={{ '--inv-bg': style.bg, '--inv-color': style.color, '--inv-border': style.border }}>
                                  <div className="op-investor-source-card__platform">{src.platform}</div>
                                  {desc && <p className="op-investor-source-card__desc">{desc}{desc.length >= 160 ? '…' : ''}</p>}
                                  <span className="op-investor-source-card__cta">View on {src.platform} <ExternalLink size={11} /></span>
                                </a>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                )}

                {/* Publications & Resources */}
                {orgPublications.length > 0 && (
                  <section className="op-section op-pubs-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Publications &amp; Resources</h2>
                      {renderClickableField('publications', 'Publications',
                        <div className="op-pubs-list">
                          {orgPublications.map((p, i) => (
                            <a key={i} href={p.publication_url} target="_blank" rel="noopener noreferrer" className="op-pub-item">
                              <div className="op-pub-item__icon"><Database size={16} /></div>
                              <div className="op-pub-item__body">
                                <h3 className="op-pub-item__title">{p.publication_title}</h3>
                                {p.abstract_snippet && (
                                  <p className="op-pub-item__abstract">
                                    {p.abstract_snippet.length > 130 ? p.abstract_snippet.slice(0, 130) + '…' : p.abstract_snippet}
                                  </p>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Contact & Presence */}
                {((orgContact && (orgContact.headquarters || orgContact.phone_numbers?.length || orgContact.contact_emails?.length || orgContact.support_portal_url)) || orgMediaAndPress.length > 0) && (
                  <section className="op-section op-contact-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Contact &amp; Presence</h2>
                      <p className="op-section-subtitle">Official contact details and external presence</p>
                      {renderClickableField('contact', 'Contact & Presence',
                        <>
                          {orgContact && (orgContact.headquarters || orgContact.phone_numbers?.length || orgContact.contact_emails?.length || orgContact.support_portal_url) && (
                            <div className="op-contact-grid">
                              {orgContact.headquarters && (
                                <div className="op-contact-card op-contact-card--loc-border">
                                  <div className="op-contact-card__icon op-contact-card__icon--loc"><Building2 size={22} /></div>
                                  <div className="op-contact-card__body">
                                    <span className="op-contact-card__label">Headquarters</span>
                                    <span className="op-contact-card__value">{orgContact.headquarters}</span>
                                  </div>
                                </div>
                              )}
                              {orgContact.phone_numbers?.filter(Boolean).map((ph, i) => (
                                <a key={i} href={`tel:${ph}`} className="op-contact-card op-contact-card--link op-contact-card--phone-border">
                                  <div className="op-contact-card__icon op-contact-card__icon--phone"><Phone size={22} /></div>
                                  <div className="op-contact-card__body">
                                    <span className="op-contact-card__label">Phone</span>
                                    <span className="op-contact-card__value">{ph}</span>
                                  </div>
                                </a>
                              ))}
                              {orgContact.contact_emails?.filter(Boolean).map((em, i) => (
                                <a key={i} href={`mailto:${em}`} className="op-contact-card op-contact-card--link op-contact-card--mail-border">
                                  <div className="op-contact-card__icon op-contact-card__icon--mail"><Mail size={22} /></div>
                                  <div className="op-contact-card__body">
                                    <span className="op-contact-card__label">Email</span>
                                    <span className="op-contact-card__value">{em}</span>
                                  </div>
                                </a>
                              ))}
                              {orgContact.support_portal_url && (
                                <a href={orgContact.support_portal_url} target="_blank" rel="noopener noreferrer" className="op-contact-card op-contact-card--link op-contact-card--portal-border">
                                  <div className="op-contact-card__icon op-contact-card__icon--portal"><Globe size={22} /></div>
                                  <div className="op-contact-card__body">
                                    <span className="op-contact-card__label">Support Portal</span>
                                    <span className="op-contact-card__value op-contact-card__value--url">
                                      {orgContact.support_portal_url.replace(/^https?:\/\//, '').split('/')[0]}
                                      <ExternalLink size={11} />
                                    </span>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                          {orgMediaAndPress.length > 0 && (
                            <div className="op-contact-press" style={{ marginTop: 20 }}>
                              <span className="op-contact-press__label"><Newspaper size={13} />Press &amp; Media</span>
                              <div className="op-contact-press__links">
                                {orgMediaAndPress.map((url, i) => {
                                  const host = url.replace(/^https?:\/\//, '').split('/')[0];
                                  return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="op-contact-press__pill">{host} <ExternalLink size={10} /></a>;
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                )}

                {/* Connect & Follow */}
                {orgSocialLinks.length > 0 && (
                  <section className="op-section">
                    <div className="op-container">
                      <div className="op-social-panel">
                        <div className="op-social-panel__header">
                          <div>
                            <h3 className="op-social-panel__title">Connect &amp; Follow</h3>
                            <p className="op-social-panel__subtitle">Follow through official websites, social channels, and media platforms.</p>
                          </div>
                          <span className="op-social-panel__verified-badge"><CheckCircle size={13} />Verified Channels</span>
                        </div>
                        <div className="op-social-links">
                          {orgSocialLinks.map((link) => (
                            <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="op-social-pill"
                              style={{ backgroundColor: link.bg, borderColor: link.border, color: link.color }}>
                              <span className="op-social-pill__icon">{link.icon}</span>
                              <span className="op-social-pill__label">{link.label}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Social Channels / Social Media Section */}
                {socialEntries.length > 0 && (
                  <section className="op-section op-social-extra-section">
                    <div className="op-container">
                      <h2 className="op-section-title">Social Channels</h2>
                      <p className="op-section-subtitle">Verified social media presence across platforms</p>
                      {renderClickableField('social_media', 'Social Channels',
                        <div className="op-social-extra-grid">
                          {socialEntries.map(({ key, url, label }) => {
                            const col = SOCIAL_COLOR_MAP[key] || { bg: '#eef2ff', color: '#1E3A8A' };
                            return (
                              <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="op-social-extra-card" style={{ '--sc-bg': col.bg, '--sc-color': col.color }}>
                                <div className="op-social-extra-card__icon">{SOCIAL_ICON_MAP[key] || <Globe size={17} />}</div>
                                <div className="op-social-extra-card__info">
                                  <span className="op-social-extra-card__platform">{label}</span>
                                  <span className="op-social-extra-card__url">{url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 38)}</span>
                                </div>
                                <ExternalLink size={13} className="op-social-extra-card__ext" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

              </div>
            )}

            {/* ── Person Profile Preview ────────────────────── */}
            {!isOrgRequest && (
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

            {/* Primary Entity + Featured Service / HQ — mirrors dashboard two-column layout */}
            <section className="profile-grid-2">
              {/* LEFT: CTA showcase card (premium) or HQ card (standard) */}
              {isPremium ? (
                <div className="profile-featured-service">
                  {/* CTA image — own clickable zone so CTA_image_url change highlights here */}
                  {renderClickableField('CTA_image_url', 'CTA Showcase Image', (
                    <div className="fs-image-wrap">
                      {(getPropVal('CTA_image_url') || liveProfile?.CTA_image_url || liveProfile?.hq_image_url) ? (
                        <img
                          src={getPropVal('CTA_image_url') || liveProfile?.CTA_image_url || liveProfile?.hq_image_url}
                          alt="Featured service"
                          className="fs-image"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="fs-image-avatar">
                          <span>{proposedAvatarText}</span>
                        </div>
                      )}
                      <div className="fs-image-gradient" />
                      <div className="fs-image-badges">
                        <span className="fs-showcase-badge">PREMIUM SHOWCASE</span>
                      </div>
                    </div>
                  ))}
                  {/* Featured content text — own clickable zone so featured_content change highlights here */}
                  {renderClickableField('featured_content', 'Featured Service & CTA', (
                    <div className="fs-body">
                      <div className="fs-content">
                        <div className="fs-section-eyebrow">Featured Service</div>
                        {(getPropVal('featured_content')?.title || liveProfile?.featured_content?.title)
                          ? <h3 className="fs-headline">{getPropVal('featured_content')?.title || liveProfile?.featured_content?.title}</h3>
                          : <p className="fs-description" style={{ opacity: 0.45, fontStyle: 'italic' }}>No featured content yet.</p>
                        }
                        {(getPropVal('featured_content')?.excerpt || liveProfile?.featured_content?.excerpt) && (
                          <p className="fs-description">{getPropVal('featured_content')?.excerpt || liveProfile?.featured_content?.excerpt}</p>
                        )}
                      </div>
                      {(() => {
                        const benefits = getPropVal('featured_content')?.key_benefits || liveProfile?.featured_content?.key_benefits || [];
                        return Array.isArray(benefits) && benefits.length > 0 ? (
                          <div className="fs-benefits">
                            <div className="fs-benefits-label">Key Benefits</div>
                            {benefits.map((b, i) => (
                              <div key={i} className="fs-benefit-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      {(getPropVal('featured_content')?.article_url || liveProfile?.featured_content?.article_url) && (
                        <div className="fs-cta">
                          <a href={getPropVal('featured_content')?.article_url || liveProfile?.featured_content?.article_url} target="_blank" rel="noopener noreferrer" className="fs-cta-btn" onClick={e => e.stopPropagation()}>
                            Discover the Service
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="profile-section-card hq-card">
                  <div className="profile-section-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1L9 4"/><path d="M15 1L15 4"/><path d="M9 20L9 23"/><path d="M15 20L15 23"/><path d="M20 9L23 9"/><path d="M20 14L23 14"/><path d="M1 9L4 9"/><path d="M1 14L4 14"/></svg>
                    <h3>Company Headquarters</h3>
                  </div>
                  {renderClickableField('hq_image_url', 'HQ Image',
                    <SafeImage
                      src={getPropVal('hq_image_url') || liveProfile?.hq_image_url}
                      alt="Company HQ"
                      className="hq-image"
                      fallbackClassName="hq-image-fallback"
                      fallbackText={proposedAvatarText}
                    />
                  )}
                </div>
              )}

              {/* RIGHT: Primary Entity; inline HQ section for premium */}
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
                {isPremium && (
                  <div className="pe-hq-inline">
                    <h3>Company Headquarters</h3>
                    {renderClickableField('hq_image_url', 'HQ Image',
                      <SafeImage
                        src={getPropVal('hq_image_url') || liveProfile?.hq_image_url}
                        alt="Company HQ"
                        className="hq-image"
                        fallbackClassName="hq-image-fallback"
                        fallbackText={proposedAvatarText}
                      />
                    )}
                  </div>
                )}
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
            )} {/* end !isOrgRequest person preview */}

          </div> {/* end cr-profile-preview-pane */}

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
                        activeChangeField === 'featured_content'
                          ? renderFeaturedContentPreview(liveProfile[activeChangeField])
                          : ORG_DETAILS_IMAGE_FIELDS.has(activeChangeField) || PERSON_IMAGE_FIELDS.has(activeChangeField)
                            ? <img src={liveProfile[activeChangeField]} alt="current" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'cover' }} />
                            : ['bio', 'description', 'mission', 'vision', 'market_positioning'].includes(activeChangeField)
                              ? renderBiographyWords(liveProfile?.[activeChangeField], getPropVal(activeChangeField), false)
                              : isComplexArrayField(activeChangeField)
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
                        activeChangeField === 'featured_content'
                          ? renderFeaturedContentPreview(submittedProposed[activeChangeField])
                          : ORG_DETAILS_IMAGE_FIELDS.has(activeChangeField) || PERSON_IMAGE_FIELDS.has(activeChangeField)
                            ? <img src={submittedProposed[activeChangeField]} alt="proposed" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'cover', outline: '2px solid #22c55e' }} />
                            : ['bio', 'description', 'mission', 'vision', 'market_positioning'].includes(activeChangeField)
                              ? renderBiographyWords(liveProfile?.[activeChangeField], submittedProposed?.[activeChangeField], true)
                              : isComplexArrayField(activeChangeField)
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
                  {activeChangeField === 'featured_content' ? (
                    <div className="cr-visual-array-editor">
                      <div className="cr-array-item-card">
                        <div className="cr-array-item-header"><span>Featured Service Fields</span></div>
                        <div className="cr-array-item-grid">
                          {['title', 'excerpt', 'article_url', 'image_url', 'highlight_quote', 'why_choose'].map(subKey => (
                            <div key={subKey} className={`cr-array-subfield${['excerpt', 'why_choose'].includes(subKey) ? ' cr-array-subfield--full' : ''}`}>
                              <label className="cr-array-subfield-label">{subKey.replace(/_/g, ' ')}</label>
                              <input
                                type="text"
                                className="cr-array-subfield-input"
                                value={(editForm.featured_content?.[subKey]) || ''}
                                onChange={e => handleFieldChange('featured_content', { ...(editForm.featured_content || {}), [subKey]: e.target.value })}
                              />
                            </div>
                          ))}
                          <div className="cr-array-subfield cr-array-subfield--full">
                            <label className="cr-array-subfield-label">key benefits</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {((editForm.featured_content?.key_benefits) || []).map((benefit, bIdx) => (
                                <div key={bIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="cr-array-subfield-input"
                                    value={benefit}
                                    onChange={e => {
                                      const benefits = [...(editForm.featured_content?.key_benefits || [])];
                                      benefits[bIdx] = e.target.value;
                                      handleFieldChange('featured_content', { ...(editForm.featured_content || {}), key_benefits: benefits });
                                    }}
                                    placeholder={`Benefit #${bIdx + 1}`}
                                  />
                                  <button
                                    type="button"
                                    className="cr-array-item-remove"
                                    onClick={() => {
                                      const benefits = [...(editForm.featured_content?.key_benefits || [])];
                                      benefits.splice(bIdx, 1);
                                      handleFieldChange('featured_content', { ...(editForm.featured_content || {}), key_benefits: benefits });
                                    }}
                                  >
                                    &times; Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="cr-array-add-btn"
                              style={{ marginTop: 8 }}
                              onClick={() => {
                                const benefits = [...(editForm.featured_content?.key_benefits || []), ''];
                                handleFieldChange('featured_content', { ...(editForm.featured_content || {}), key_benefits: benefits });
                              }}
                            >
                              + Add Key Benefit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isComplexArrayField(activeChangeField) ? (
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
                            defaultTemplate = { year: new Date().getFullYear().toString(), title: '', issuer: '', description: '' };
                          } else if (activeChangeField === 'videos') {
                            defaultTemplate = { title: '', url: '', type: 'Interview', duration: '', views: 0, date: '' };
                          } else if (activeChangeField === 'publications') {
                            defaultTemplate = { publication_title: '', publication_url: '', abstract_snippet: '', publication_year: '' };
                          } else if (activeChangeField === 'trust_tags') {
                            defaultTemplate = { name: '', type: 'outline-blue' };
                          } else if (activeChangeField === 'news_articles') {
                            defaultTemplate = { title: '', url: '', source: '' };
                          } else if (activeChangeField === 'reviews') {
                            defaultTemplate = { source_platform: '', rating: '', review_count: '', review_snippet: '', review_url: '' };
                          } else if (activeChangeField === 'core_services') {
                            defaultTemplate = { name: '', description: '' };
                          } else if (activeChangeField === 'leadership') {
                            defaultTemplate = { name: '', role: '', expertise: '', image: '', score: '', entity_slug: '' };
                          } else if (activeChangeField === 'products') {
                            defaultTemplate = { name: '', description: '' };
                          } else if (activeChangeField === 'locations') {
                            defaultTemplate = { city: '', country: '', headquarter: false };
                          }
                          arr.push(defaultTemplate);
                          handleFieldChange(activeChangeField, arr);
                        }}
                      >
                        + Add New {getFieldLabel(activeChangeField).slice(0, -1) || 'Item'}
                      </button>
                    </div>
                  ) : ORG_DETAILS_IMAGE_FIELDS.has(activeChangeField) || PERSON_IMAGE_FIELDS.has(activeChangeField) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {getPropVal(activeChangeField) && (
                        <img src={getPropVal(activeChangeField)} alt="proposed" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover' }} />
                      )}
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Image URL is set by the uploaded file and cannot be edited here. Use Accept Proposed or Revert to Live below.</span>
                    </div>
                  ) : ['bio', 'description', 'mission', 'vision', 'market_positioning'].includes(activeChangeField) ? (
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
              const isOrg = parsedMessage.entity_type === 'organization';
              const proposedRole = isOrg
                ? (parsedMessage.proposed?.industry || parsedMessage.original?.industry || 'Organization')
                : (parsedMessage.proposed?.role || 'User');
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
                    entityType={isOrg ? 'organization' : 'person'}
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
