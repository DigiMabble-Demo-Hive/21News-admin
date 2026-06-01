import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import ImageEditor, { extractStorageFile } from '../components/ImageEditor';
import ToastContainer, { useToast } from '../components/Toast';
import LeadershipPickerModal from '../components/LeadershipPickerModal';
import { Target, Eye, ExternalLink, Phone, BadgeDollarSign, BarChart2 } from 'lucide-react';
import './OrganizationProfile.css';
import '../components/LeadershipPickerModal.css';

// ============ INLINE ICONS ============
const Globe       = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const Mail        = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const MapPin      = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const Calendar    = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const Users       = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const Building2   = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><rect x="10" y="6" width="4" height="4"/><rect x="10" y="14" width="4" height="4"/></svg>;
const CheckCircle = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const ShieldCheck = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
const Zap         = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const UserCheck   = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const Star        = ({ size = 13, fill = 'none' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const Award       = ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
const Briefcase   = ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const Newspaper   = ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>;
const TrendingUp  = ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const ArrowRight  = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const Check       = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const Database    = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const ChevronRight = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const PencilIcon  = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

// ============ BRAND ICONS ============
const LinkedinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);
const TwitterXIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);
const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

// ============ PROFILE FEATURE FLAGS ============
const PROFILE_FEATURES = {
  standard: { trustedOrganizations: false, verifiedRelationships: false, premiumBadge: false },
  premium:  { trustedOrganizations: true,  verifiedRelationships: true,  premiumBadge: true  },
};

// ============ HELPERS ============
const getInitials = (name) =>
  (name || '').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'NA';

const toStatValue = (v) => {
  if (!v || typeof v === 'object') return null;
  return String(v).trim() || null;
};

const useScrollReveal = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(entry.target); } },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
};

const TAG_PALETTES = [
  { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
  { bg: '#f0fdf4', color: '#065f46', border: '#bbf7d0' },
  { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  { bg: '#f0f9ff', color: '#0c4a6e', border: '#bae6fd' },
  { bg: '#fef9c3', color: '#713f12', border: '#fde68a' },
  { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
  { bg: '#f0fdfa', color: '#134e4a', border: '#99f6e4' },
];

const SOCIAL_ICON_MAP = {
  linkedin:  <LinkedinIcon />,
  instagram: <InstagramIcon />,
  youtube:   <YoutubeIcon />,
  github:    <GithubIcon />,
  twitter_x: <TwitterXIcon />,
};
const SOCIAL_COLOR_MAP = {
  linkedin:  { bg: '#eff6ff', color: '#0a66c2' },
  instagram: { bg: '#fdf4ff', color: '#c026d3' },
  youtube:   { bg: '#fff1f2', color: '#dc2626' },
  github:    { bg: '#f9fafb', color: '#111827' },
  twitter_x: { bg: '#f8fafc', color: '#1d4ed8' },
};

// ============ AUTHORITY RING ============
const AuthorityRing = ({ score }) => {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  const ringColor = pct >= 80 ? '#1E3A8A' : pct >= 55 ? '#6366f1' : '#94a3b8';
  return (
    <div className="op-authority-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e0e7ff" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={ringColor} strokeWidth="8"
          strokeDasharray={`${circ}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.9s ease' }}
        />
      </svg>
      <div className="op-authority-ring__center">
        <span className="op-authority-ring__score">{score || '—'}</span>
        <span className="op-authority-ring__sub">/ 100</span>
      </div>
    </div>
  );
};

// ============ SKELETON ============
const SkeletonBox = ({ className }) => (
  <div className={`op-skeleton-shimmer ${className || ''}`} />
);

const ProfileSkeleton = () => (
  <div className="op-page">
    <div className="op-skeleton-shimmer op-skeleton-hero" />
    <div className="op-header-section">
      <div className="op-container">
        <div className="op-skeleton-card">
          <div className="op-skeleton-left">
            <div className="op-skeleton-logo-row">
              <SkeletonBox className="op-skeleton-logo" />
              <div className="op-skeleton-badges">
                <SkeletonBox className="op-skeleton-badge" />
                <SkeletonBox className="op-skeleton-badge" />
              </div>
            </div>
            <SkeletonBox className="op-skeleton-title" />
            <SkeletonBox className="op-skeleton-line" />
            <SkeletonBox className="op-skeleton-line op-skeleton-line--short" />
            <div className="op-skeleton-meta">
              {[...Array(4)].map((_, i) => <SkeletonBox key={i} className="op-skeleton-meta-item" />)}
            </div>
          </div>
          <SkeletonBox className="op-skeleton-trust" />
        </div>
      </div>
    </div>
    <div className="op-section" style={{ opacity: 1 }}>
      <div className="op-container">
        <SkeletonBox className="op-skeleton-section-title" />
        <div className="op-skeleton-stats-grid">
          {[...Array(5)].map((_, i) => <SkeletonBox key={i} className="op-skeleton-stat" />)}
        </div>
      </div>
    </div>
  </div>
);

// ============ SUB-COMPONENTS (display only) ============

const VerifiedBadge21 = () => (
  <span className="op-badge op-badge--verified">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
    21NEWS VERIFIED
  </span>
);

const HeroCover = ({ bannerUrl, onEditBanner }) => (
  <div className="op-hero">
    {bannerUrl ? (
      <img src={bannerUrl} alt="Organization Cover" className="op-hero__img" />
    ) : (
      <div className="op-hero__img" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2C2F86 50%, #3730a3 100%)' }} />
    )}
    <div className="op-hero__overlay" />
    {onEditBanner && (
      <button className="op-img-edit-fab op-banner-edit-fab" onClick={onEditBanner} aria-label="Edit Banner Image" title="Edit Banner Image">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    )}
  </div>
);

const TrustPanel = ({ trust }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className={`op-trust-panel ${visible ? 'op-reveal' : ''}`}>
      <div className="op-trust-panel__title">Trust & Verification</div>
      <ul className="op-trust-panel__list">
        {trust.items.map((item, i) => (
          <li key={i} className="op-trust-panel__item">
            <span className="op-trust-panel__icon">{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="op-trust-panel__score-wrap">
        <AuthorityRing score={trust.authorityScore} />
        <span className="op-trust-panel__score-label">Authority Score</span>
      </div>
    </div>
  );
};

const LeadershipCard = ({ user_id, entitySlug, name, role, sector, authorityScore, image }) => {
  const [imgError, setImgError] = useState(false);
  const profilePath = `/entity/${entitySlug || user_id}`;
  const canNavigate = !!(entitySlug || user_id);
  const initials = (name || '').split(/\s+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'NA';
  return (
    <div className="op-lcard">
      <div className="op-lcard__img-wrap">
        {image && !imgError ? (
          <img src={image} alt={name} className="op-lcard__img" onError={() => setImgError(true)} />
        ) : (
          <div className="op-lcard__img-fallback"><span>{initials}</span></div>
        )}
        <span className="op-lcard__verified">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          21NEWS Verified
        </span>
      </div>
      <h3 className="op-lcard__name">{name}</h3>
      {role && <p className="op-lcard__role">{role}</p>}
      {sector && <p className="op-lcard__sector">{sector}</p>}
      {authorityScore > 0 && (
        <div className="op-lcard__score">
          <Star size={16} fill="#f59e0b" stroke="none" className="op-lcard__star" />
          <span>{authorityScore}</span>
        </div>
      )}
      <div className="op-lcard__footer">
        {canNavigate ? (
          <a href={profilePath} className="op-lcard__btn">View Profile</a>
        ) : (
          <span className="op-lcard__btn op-lcard__btn--disabled">Profile Not Listed</span>
        )}
      </div>
    </div>
  );
};

// ============ NEW DISPLAY-ONLY SECTIONS ============

const SpecializationTags = ({ tags }) => {
  const [ref, visible] = useScrollReveal();
  if (!tags.length) return null;
  return (
    <section ref={ref} className={`op-section op-tags-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Specializations</h2>
        <p className="op-section-subtitle">Core capabilities and areas of expertise</p>
        <div className="op-tags-meta-row">
          <span className="op-tags-count-badge">
            <CheckCircle size={12} />
            {tags.length} verified specializations
          </span>
        </div>
        <div className="op-tags-wrap">
          {tags.map((t, i) => {
            const p = TAG_PALETTES[i % TAG_PALETTES.length];
            return (
              <span key={i} className="op-tag" style={{ background: p.bg, color: p.color, borderColor: p.border, animationDelay: `${i * 35}ms` }}>
                <Check size={11} />{t}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const TrustedPartiesSection = ({ trustedBy, clients, partners }) => {
  const [ref, visible] = useScrollReveal();
  const seen = new Set();
  const allParties = [...trustedBy, ...clients, ...partners].filter((name) => {
    const key = (name || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!allParties.length) return null;
  const n = allParties.length;
  const cols = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 2 : n === 5 ? 5 : n <= 9 ? 3 : n <= 12 ? 4 : 5;
  return (
    <section ref={ref} className={`op-section op-trusted-parties-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <div className="op-trusted-parties-heading">
          <h2 className="op-section-title">Trusted By</h2>
          <span className="op-trusted-parties-count"><ShieldCheck size={13} />{allParties.length} verified organizations</span>
        </div>
        <p className="op-section-subtitle">Organizations, clients and partners that trust this company</p>
        <div className="op-trusted-parties-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {allParties.map((name, i) => (
            <div key={i} className="op-trusted-party-card" style={{ animationDelay: `${i * 45}ms` }}>
              <div className="op-trusted-party-card__accent" />
              <div className="op-trusted-party-card__icon"><Building2 size={16} /></div>
              <span className="op-trusted-party-card__name">{name}</span>
              <span className="op-trusted-party-card__check"><Check size={9} /></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const NewsAndPress = ({ articles }) => {
  const [ref, visible] = useScrollReveal();
  const fmt = (d) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };
  if (!articles.length) return null;
  return (
    <section ref={ref} className={`op-section op-news-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">News &amp; Press Coverage</h2>
        <div className="op-news-grid">
          {articles.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="op-news-card">
              <div className="op-news-card__source"><Newspaper size={12} />{a.source}</div>
              <h3 className="op-news-card__title">{a.title}</h3>
              <div className="op-news-card__footer">
                <span className="op-news-card__date">{fmt(a.created_at)}</span>
                <span className="op-news-card__read">Read article <ExternalLink size={11} /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const ReviewsAndRatings = ({ reviews }) => {
  const [ref, visible] = useScrollReveal();
  const platformColor = { Glassdoor: '#0caa41', G2: '#ff492c', Trustpilot: '#00b67a', Google: '#4285f4' };
  if (!reviews.length) return null;
  return (
    <section ref={ref} className={`op-section op-reviews-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Reviews &amp; Ratings</h2>
        <p className="op-section-subtitle">Aggregated from verified third-party review platforms</p>
        <div className="op-reviews-grid">
          {reviews.map((r, i) => (
            <a key={i} href={r.review_url} target="_blank" rel="noopener noreferrer" className="op-review-card">
              <div className="op-review-card__platform" style={{ color: platformColor[r.source_platform] || '#1E3A8A' }}>{r.source_platform}</div>
              <div className="op-review-card__rating-row">
                <span className="op-review-card__score">{r.rating}</span>
                <div className="op-review-card__stars">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13} fill={j < Math.round(Number(r.rating)) ? '#f59e0b' : 'none'} />
                  ))}
                </div>
              </div>
              {r.review_count && <div className="op-review-card__count">{Number(r.review_count).toLocaleString()} reviews</div>}
              {r.review_snippet && <p className="op-review-card__snippet">{r.review_snippet.length > 110 ? r.review_snippet.slice(0, 110) + '…' : r.review_snippet}</p>}
              <span className="op-review-card__link">View on {r.source_platform} <ExternalLink size={11} /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const parseAwardMeta = (text) => {
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? yearMatch[0] : null;
  const platformMatch = text.match(/\bon\s+([A-Za-z][A-Za-z0-9.\s]{1,25}?)(?:\s*[,.]|$)/i);
  const platform = platformMatch ? platformMatch[1].trim() : null;
  return { year, platform };
};

const AwardsSection = ({ awards }) => {
  const [ref, visible] = useScrollReveal();
  if (!awards.length) return null;
  return (
    <section ref={ref} className={`op-section op-awards-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Awards &amp; Recognition</h2>
        <p className="op-section-subtitle">Verified achievements and industry recognition</p>
        <div className="op-awards-grid">
          {awards.map((text, i) => {
            const { year, platform } = parseAwardMeta(text);
            return (
              <div key={i} className="op-award-card">
                <div className="op-award-card__icon"><Award size={20} /></div>
                <div className="op-award-card__body">
                  <p className="op-award-card__text">{text}</p>
                  <div className="op-award-card__meta">
                    {year && <span className="op-award-card__year">{year}</span>}
                    {platform && <span className="op-award-card__platform">{platform}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
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

const InvestorIntelligenceSection = ({ sources }) => {
  const [ref, visible] = useScrollReveal();
  if (!sources?.length) return null;
  const tracxn = sources.find(s => s.platform === 'Tracxn');
  const funding = parseFunding(tracxn?.ogDesc || tracxn?.desc);
  return (
    <section ref={ref} className={`op-section op-investor-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Funding &amp; Investor Intelligence</h2>
        <p className="op-section-subtitle">Sourced from leading startup intelligence platforms</p>
        {funding && (
          <div className="op-investor-summary">
            {funding.amount && <div className="op-investor-summary__stat"><BadgeDollarSign size={22} /><div><div className="op-investor-summary__val">{funding.amount}</div><div className="op-investor-summary__lbl">Total Raised</div></div></div>}
            {funding.rounds && <div className="op-investor-summary__stat"><BarChart2 size={22} /><div><div className="op-investor-summary__val">{funding.rounds}</div><div className="op-investor-summary__lbl">Funding Rounds</div></div></div>}
            {funding.investors && <div className="op-investor-summary__stat"><Users size={22} /><div><div className="op-investor-summary__val">{funding.investors}</div><div className="op-investor-summary__lbl">Investors</div></div></div>}
          </div>
        )}
        <div className="op-investor-sources-grid">
          {sources.map((src, i) => {
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
      </div>
    </section>
  );
};

const PublicationsSection = ({ pubs }) => {
  const [ref, visible] = useScrollReveal();
  if (!pubs.length) return null;
  return (
    <section ref={ref} className={`op-section op-pubs-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Publications &amp; Resources</h2>
        <div className="op-pubs-list">
          {pubs.map((p, i) => (
            <a key={i} href={p.publication_url} target="_blank" rel="noopener noreferrer" className="op-pub-item">
              <div className="op-pub-item__icon"><Database size={16} /></div>
              <div className="op-pub-item__body">
                <h3 className="op-pub-item__title">{p.publication_title}</h3>
                {p.abstract_snippet && <p className="op-pub-item__abstract">{p.abstract_snippet.length > 130 ? p.abstract_snippet.slice(0, 130) + '…' : p.abstract_snippet}</p>}
              </div>
              <div className="op-pub-item__meta">
                {p.publication_year && <span className="op-pub-item__year">{p.publication_year}</span>}
                <ExternalLink size={14} className="op-pub-item__ext" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const ContactInfoSection = ({ contactInfo, mediaAndPress }) => {
  const [ref, visible] = useScrollReveal();
  const hasContent = contactInfo?.headquarters || contactInfo?.phone_numbers?.length || contactInfo?.contact_emails?.length || contactInfo?.support_portal_url || mediaAndPress?.length;
  if (!hasContent) return null;
  return (
    <section ref={ref} className={`op-section op-contact-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Contact &amp; Presence</h2>
        <p className="op-section-subtitle">Official contact details and external presence</p>
        <div className="op-contact-grid">
          {contactInfo?.headquarters && (
            <div className="op-contact-card op-contact-card--loc-border">
              <div className="op-contact-card__icon op-contact-card__icon--loc"><Building2 size={22} /></div>
              <div className="op-contact-card__body"><span className="op-contact-card__label">Headquarters</span><span className="op-contact-card__value">{contactInfo.headquarters}</span></div>
            </div>
          )}
          {contactInfo?.phone_numbers?.filter(Boolean).map((ph, i) => (
            <a key={i} href={`tel:${ph}`} className="op-contact-card op-contact-card--link op-contact-card--phone-border">
              <div className="op-contact-card__icon op-contact-card__icon--phone"><Phone size={22} /></div>
              <div className="op-contact-card__body"><span className="op-contact-card__label">Phone</span><span className="op-contact-card__value">{ph}</span></div>
              <ChevronRight size={16} className="op-contact-card__arrow" />
            </a>
          ))}
          {contactInfo?.contact_emails?.filter(Boolean).map((em, i) => (
            <a key={i} href={`mailto:${em}`} className="op-contact-card op-contact-card--link op-contact-card--mail-border">
              <div className="op-contact-card__icon op-contact-card__icon--mail"><Mail size={15} /></div>
              <div className="op-contact-card__body"><span className="op-contact-card__label">Email</span><span className="op-contact-card__value">{em}</span></div>
              <ChevronRight size={16} className="op-contact-card__arrow" />
            </a>
          ))}
          {contactInfo?.support_portal_url && (
            <a href={contactInfo.support_portal_url} target="_blank" rel="noopener noreferrer" className="op-contact-card op-contact-card--link op-contact-card--portal-border">
              <div className="op-contact-card__icon op-contact-card__icon--portal"><Globe size={15} /></div>
              <div className="op-contact-card__body"><span className="op-contact-card__label">Support Portal</span><span className="op-contact-card__value op-contact-card__value--url">{contactInfo.support_portal_url.replace(/^https?:\/\//, '').split('/')[0]}<ExternalLink size={11} /></span></div>
              <ChevronRight size={16} className="op-contact-card__arrow" />
            </a>
          )}
        </div>
        {mediaAndPress?.length > 0 && (
          <div className="op-contact-press">
            <span className="op-contact-press__label"><Newspaper size={13} />Press &amp; Media</span>
            <div className="op-contact-press__links">
              {mediaAndPress.map((url, i) => {
                const host = url.replace(/^https?:\/\//, '').split('/')[0];
                return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="op-contact-press__pill">{host} <ExternalLink size={10} /></a>;
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const OfficeLocations = ({ locations }) => {
  const [ref, visible] = useScrollReveal();
  const [expanded, setExpanded] = useState(false);
  const SHOW_COUNT = 3;
  const hasMore = locations.length > 4;
  const visibleLocations = hasMore && !expanded ? locations.slice(0, SHOW_COUNT) : locations;
  const hiddenCount = locations.length - SHOW_COUNT;
  if (!locations.length) return null;
  return (
    <section ref={ref} className={`op-section op-locations-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Office Locations</h2>
        <div className="op-locations-grid">
          {visibleLocations.map((loc, i) => {
            const city = loc.parsed?.city || loc.city || '';
            const country = loc.parsed?.countryFull || loc.parsed?.country || loc.country || '';
            const isHQ = loc.headquarter === 'true' || loc.headquarter === true;
            return (
              <div key={i} className={`op-location-card ${isHQ ? 'op-location-card--hq' : ''}`}>
                {isHQ && <span className="op-location-card__hq">HQ</span>}
                <MapPin size={20} className="op-location-card__pin" />
                <div className="op-location-card__city">{city || country}</div>
                {city && country && <div className="op-location-card__country">{country}</div>}
              </div>
            );
          })}
          {hasMore && !expanded && (
            <div className="op-location-card op-location-card--more" onClick={() => setExpanded(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}>
              <div className="op-location-card__more-inner">
                <span className="op-location-card__more-count">+{hiddenCount}</span>
                <span className="op-location-card__more-label">more offices</span>
                <span className="op-location-card__more-cta">View all <ChevronRight size={12} /></span>
              </div>
            </div>
          )}
        </div>
        {hasMore && expanded && (
          <button className="op-locations-collapse" onClick={() => setExpanded(false)}>
            <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />Show less
          </button>
        )}
      </div>
    </section>
  );
};

const ProductsSection = ({ products, keyFeatures, pricingUrls, techStack }) => {
  const [ref, visible] = useScrollReveal();
  if (!products.length) return null;
  const firstPricingUrl = pricingUrls.find(Boolean) || null;
  return (
    <section ref={ref} className={`op-section op-products-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Products &amp; Offerings</h2>
        <p className="op-section-subtitle">{products.length} product{products.length !== 1 ? 's' : ''} &amp; services</p>
        {firstPricingUrl && (
          <div className="op-products-pricing-wrap">
            <a href={firstPricingUrl} target="_blank" rel="noopener noreferrer" className="op-btn op-btn--primary">View Pricing <ExternalLink size={14} /></a>
          </div>
        )}
        <div className="op-products-grid">
          {products.map((p, i) => {
            const productUrl = pricingUrls[i] || firstPricingUrl;
            const Wrap = productUrl ? 'a' : 'div';
            const wrapProps = productUrl ? { href: productUrl, target: '_blank', rel: 'noopener noreferrer' } : {};
            return (
              <Wrap key={i} className="op-product-card" {...wrapProps}>
                <div className="op-product-card__index">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="op-product-card__name">{p.name}</h3>
                <p className="op-product-card__desc">{p.description}</p>
                {productUrl && <span className="op-product-card__link">Learn more <ExternalLink size={11} /></span>}
              </Wrap>
            );
          })}
        </div>
        {keyFeatures.length > 0 && (
          <div className="op-products-features">
            <span className="op-products-features__label">Key Features</span>
            <div className="op-products-features__chips">
              {keyFeatures.map((f, i) => <span key={i} className="op-products-feature-chip"><Check size={11} /> {f}</span>)}
            </div>
          </div>
        )}
        {techStack.length > 0 && (
          <div className="op-products-tech">
            <span className="op-products-features__label">Tech Stack</span>
            <div className="op-products-features__chips">
              {techStack.map((t, i) => <span key={i} className="op-products-tech-chip">{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const SimilarOrganizations = ({ orgs }) => {
  const [ref, visible] = useScrollReveal();
  if (!orgs.length) return null;
  return (
    <section ref={ref} className={`op-section op-similar-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Similar Organizations</h2>
        <div className="op-similar-grid">
          {orgs.map((o, i) => {
            const initials = (o.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={i} className="op-similar-card">
                <div className="op-similar-card__logo-wrap">
                  {o.logo ? <img src={o.logo} alt={o.name} className="op-similar-card__logo" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} /> : null}
                  <div className="op-similar-card__logo-fallback" style={{ display: o.logo ? 'none' : 'flex' }}>{initials}</div>
                </div>
                <div className="op-similar-card__info">
                  <div className="op-similar-card__name">{o.name}</div>
                  {o.employeeCountRange?.start && <div className="op-similar-card__meta"><Users size={11} />{o.employeeCountRange.start}–{o.employeeCountRange.end}</div>}
                  {o.followerCount && <div className="op-similar-card__meta"><TrendingUp size={11} />{Number(o.followerCount).toLocaleString()} followers</div>}
                </div>
                {o.linkedinUrl && (
                  <a href={o.linkedinUrl} target="_blank" rel="noopener noreferrer" className="op-similar-card__li" onClick={(e) => e.stopPropagation()}>
                    <LinkedinIcon />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const SocialMediaSection = ({ socialMedia }) => {
  const [ref, visible] = useScrollReveal();
  const entries = Object.entries(socialMedia || {}).filter(([, url]) => url).map(([key, url]) => ({ key, url, label: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  if (entries.length === 0) return null;
  return (
    <section ref={ref} className={`op-section op-social-extra-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Social Channels</h2>
        <p className="op-section-subtitle">Verified social media presence across platforms</p>
        <div className="op-social-extra-grid">
          {entries.map(({ key, url, label }) => {
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
      </div>
    </section>
  );
};

// ============ MAIN PAGE ============
const OrganizationProfile = () => {
  const { id } = useParams();
  const [profile,            setProfile]            = useState(null);
  const [livePersons,        setLivePersons]        = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [isEditing,          setIsEditing]          = useState(false);
  const [form,               setForm]               = useState({});
  const [saving,             setSaving]             = useState(false);
  const [saveError,          setSaveError]          = useState('');
  const [pickerOpen,         setPickerOpen]         = useState(false);
  const [editingImageTarget, setEditingImageTarget] = useState(null);
  const [logoFullUrl,        setLogoFullUrl]        = useState(null);
  const [logoCroppedUrl,     setLogoCroppedUrl]     = useState(null);
  const [bannerFullUrl,      setBannerFullUrl]      = useState(null);
  const [bannerCroppedUrl,   setBannerCroppedUrl]   = useState(null);
  const [entityCardUrl,      setEntityCardUrl]      = useState(null);
  const [enrichedData,       setEnrichedData]       = useState({
    news: [], reviews: [], publications: [],
    specializations: [], locations: [], similarOrgs: [],
    products: [], keyFeatures: [], pricingUrls: [],
    techStack: [], siteClients: [], siteAwards: [], sitePartners: [],
    contactInfo: null, mediaAndPress: [], socialMedia: {}, investorSources: [],
  });
  const { toasts, toast, dismiss } = useToast();

  const diffInputRef    = useRef(null);
  const trustedInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    setLivePersons([]);

    const { data: orgData, error: orgError } = await supabase
      .from('master_organization_entities')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (orgError || !orgData) { setLoading(false); return; }

    const { data: detailsData } = await supabase
      .from('organization_details')
      .select('profile_picture_url, banner_picture_url, cropped_profile_picture_url, cropped_banner_picture_url, entity_card_picture_url, Status, subscription, email_id')
      .eq('user_id', orgData.user_id)
      .maybeSingle();

    const orgName        = (orgData.organization_name || '').trim();
    const orgNameCompact = orgName.replace(/\s+/g, '');
    const jsonbLeadership = orgData.leadership || [];

    // ── Strategy 1: company name match ──
    const nameFilters = orgName ? [`company.ilike.%${orgName}%`] : [];
    if (orgNameCompact && orgNameCompact !== orgName) {
      nameFilters.push(`company.ilike.%${orgNameCompact}%`);
    }
    const { data: companyPersons } = nameFilters.length > 0
      ? await supabase
          .from('entities_master')
          .select('*')
          .or(nameFilters.join(','))
          .eq('Payment_status', 'paid')
          .eq('approval_status', 'approved')
      : { data: [] };

    // ── Strategy 2: JSONB user_ids (supplemental) ──
    const fetchedIds  = new Set((companyPersons || []).map((p) => p.user_id));
    const missingIds  = jsonbLeadership
      .map((p) => p.user_id)
      .filter((uid) => uid && !fetchedIds.has(uid));

    let supplementalPersons = [];
    if (missingIds.length > 0) {
      const { data: sup } = await supabase
        .from('entities_master')
        .select('*')
        .in('user_id', missingIds)
        .eq('Payment_status', 'paid')
        .eq('approval_status', 'approved');
      supplementalPersons = sup || [];
    }

    // ── Strategy 3: name search for JSONB entries with no user_id ──
    const jsonbNoId = jsonbLeadership.filter((p) => !p.user_id && p.name);
    let nameMatchedPersons = [];
    if (jsonbNoId.length > 0) {
      const nameMatchIds = new Set([...fetchedIds, ...supplementalPersons.map((p) => p.user_id)]);
      for (const person of jsonbNoId) {
        const cleaned = (person.name || '').replace(/\[.*?\]/g, '').trim();
        const words   = cleaned.split(/\s+/).filter((w) => w.length > 2);
        if (!words.length) continue;
        const surname = words[words.length - 1];
        const { data: found } = await supabase
          .from('entities_master')
          .select('*')
          .ilike('name', `%${surname}%`)
          .eq('Payment_status', 'paid')
          .eq('approval_status', 'approved')
          .limit(1);
        if (found?.length > 0 && !nameMatchIds.has(found[0].user_id)) {
          nameMatchedPersons.push(found[0]);
          nameMatchIds.add(found[0].user_id);
        }
      }
    }

    const allPersons = [
      ...(companyPersons || []),
      ...supplementalPersons,
      ...nameMatchedPersons,
    ];

    // Deduplicate by user_id
    const seen = new Set();
    const uniquePersons = allPersons.filter((p) => {
      if (seen.has(p.user_id)) return false;
      seen.add(p.user_id);
      return true;
    });

    if (uniquePersons.length > 0) {
      const allIds = uniquePersons.map((p) => p.user_id);
      const { data: personDetails } = await supabase
        .from('user_details')
        .select('user_id, cropped_photo_url, photo_url')
        .in('user_id', allIds);

      const photoMap = {};
      (personDetails || []).forEach((d) => {
        photoMap[d.user_id] = {
          cropped:  d.cropped_photo_url || null,
          original: d.photo_url         || null,
        };
      });

      setLivePersons(
        uniquePersons.map((p) => ({
          ...p,
          company:           p.company || orgName,
          cropped_photo_url: photoMap[p.user_id]?.cropped || photoMap[p.user_id]?.original || null,
        }))
      );
    }

    // ── Parallel enrichment fetch ──
    const [newsResult, reviewsResult, liResult, siteDumpResult, investorResult] = await Promise.all([
      supabase.from('org_news_articles').select('title, url, source, created_at').eq('user_id', orgData.user_id).order('created_at', { ascending: false }).limit(6),
      supabase.from('org_reviews').select('source_platform, rating, review_count, review_snippet, review_url').eq('user_id', orgData.user_id),
      supabase.from('org_linkedin_data').select('raw_data').eq('user_id', orgData.user_id).maybeSingle(),
      supabase.from('organization_site_dump').select('company_data').eq('user_id', orgData.user_id).maybeSingle(),
      supabase.from('org_investor_page').select('source_platform, scraped_data->metadata').eq('user_id', orgData.user_id),
    ]);

    let siteDump = siteDumpResult.data?.company_data || null;
    if (!siteDump && orgName) {
      const { data: sdFallback } = await supabase.from('organization_site_dump').select('company_data').ilike('company_name', `%${orgName}%`).limit(1).maybeSingle();
      siteDump = sdFallback?.company_data || null;
    }

    let { data: pubsData } = await supabase.from('org_publications').select('publication_title, publication_url, abstract_snippet, publication_year').eq('user_id', orgData.user_id).limit(6);
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

    setEnrichedData({ news: newsResult.data || [], reviews: reviewsResult.data || [], publications: pubsData || [], specializations, locations, similarOrgs, products, keyFeatures, pricingUrls, techStack, siteClients, siteAwards, sitePartners, contactInfo, mediaAndPress, socialMedia, investorSources });

    setProfile({ ...orgData, details: detailsData || {} });
    setLogoFullUrl(detailsData?.profile_picture_url || null);
    setLogoCroppedUrl(detailsData?.cropped_profile_picture_url || null);
    setBannerFullUrl(detailsData?.banner_picture_url || null);
    setBannerCroppedUrl(detailsData?.cropped_banner_picture_url || null);
    setEntityCardUrl(detailsData?.entity_card_picture_url || null);
    setLoading(false);
  };

  // ── Edit helpers ──
  const sf = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const sfAddStr = (key, ref) => {
    const val = ref.current?.value?.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), val] }));
    if (ref.current) ref.current.value = '';
  };

  const sfRemove = (key, idx) =>
    setForm((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));

  const sfUpdateStr = (key, idx, val) =>
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = val;
      return { ...prev, [key]: arr };
    });

  const sfAddObj = (key, template) =>
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));

  const sfUpdateObj = (key, idx, field, val) =>
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...prev, [key]: arr };
    });

  const addLexiconPeople = (people) => {
    const existingIds = new Set(
      (form.leadership || []).filter((p) => p.user_id).map((p) => p.user_id)
    );
    const newPeople = people.filter((p) => !existingIds.has(p.user_id));
    setForm((prev) => ({ ...prev, leadership: [...(prev.leadership || []), ...newPeople] }));
  };

  const handleEditStart = () => {
    if (!profile) return;
    setForm({
      organization_name:      profile.organization_name      || '',
      tagline:                profile.tagline                || '',
      description:            profile.description            || '',
      industry:               profile.industry               || '',
      location:               profile.location               || '',
      founded_year:           profile.founded_year           || '',
      team_size:              profile.team_size              || '',
      channel_website:        profile.channel_website        || '',
      website_url:            profile.website_url            || '',
      channel_linkedin:       profile.channel_linkedin       || '',
      channel_x:              profile.channel_x              || '',
      channel_youtube:        profile.channel_youtube        || '',
      channel_github:         profile.channel_github         || '',
      channel_crunchbase:     profile.channel_crunchbase     || '',
      email_id:               profile.details?.email_id      || '',
      authority_score:        profile.authority_score        || 0,
      years_in_business:      profile.years_in_business      || '',
      key_clients_count:      profile.key_clients_count      || '',
      verified_reviews_count: profile.verified_reviews_count || '',
      awards_count:           profile.awards_count           || '',
      projects_delivered:     profile.projects_delivered     || '',
      media_mentions_count:   profile.media_mentions_count   || '',
      social_followers:       profile.social_followers       || '',
      publications_count:     profile.publications_count     || '',
      mission:                profile.mission                || '',
      vision:                 profile.vision                 || '',
      market_positioning:     profile.market_positioning     || '',
      key_differentiators: Array.isArray(profile.key_differentiators)
        ? profile.key_differentiators.map((d) => (typeof d === 'string' ? d : d.title || d.text || d.description || ''))
        : [],
      trusted_by: Array.isArray(profile.trusted_by)
        ? profile.trusted_by.map((d) => (typeof d === 'string' ? d : d.name || ''))
        : [],
      core_services: Array.isArray(profile.core_services) ? profile.core_services.map((s) => ({ ...s })) : [],
      leadership: (() => {
        const jsonb = Array.isArray(profile.leadership) ? profile.leadership.map((p) => ({ ...p })) : [];
        const jsonbIds = new Set(jsonb.filter((p) => p.user_id).map((p) => p.user_id));
        const live = livePersons
          .filter((p) => p.user_id && !jsonbIds.has(p.user_id))
          .map((p) => ({
            user_id:     p.user_id,
            name:        p.name        || '',
            role:        p.role        || '',
            expertise:   p.sector      || '',
            image:       p.cropped_photo_url || p.image_url || '',
            score:       p.authority_score  || '',
            source:      'live',
            entity_slug: p.entity_slug || '',
          }));
        return [...jsonb, ...live];
      })(),
    });
    setSaveError('');
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm({});
    setSaveError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const orgFields = {
        organization_name:      form.organization_name,
        tagline:                form.tagline,
        description:            form.description,
        industry:               form.industry,
        location:               form.location,
        founded_year:           form.founded_year || null,
        team_size:              form.team_size,
        channel_website:        form.channel_website,
        website_url:            form.website_url || form.channel_website,
        channel_linkedin:       form.channel_linkedin,
        channel_x:              form.channel_x,
        channel_youtube:        form.channel_youtube,
        channel_github:         form.channel_github,
        channel_crunchbase:     form.channel_crunchbase,
        authority_score:        Number(form.authority_score) || 0,
        years_in_business:      form.years_in_business      || null,
        key_clients_count:      form.key_clients_count      || null,
        verified_reviews_count: form.verified_reviews_count || null,
        awards_count:           form.awards_count           || null,
        projects_delivered:     form.projects_delivered     || null,
        media_mentions_count:   form.media_mentions_count   || null,
        social_followers:       form.social_followers       || null,
        publications_count:     form.publications_count     || null,
        mission:                form.mission,
        vision:                 form.vision,
        market_positioning:     form.market_positioning,
        key_differentiators:    form.key_differentiators.filter(Boolean),
        trusted_by:             form.trusted_by.filter(Boolean),
        core_services:          form.core_services,
        leadership:             form.leadership,
      };

      await updateAdminProfile({
        userId:     profile.user_id,
        updateData: orgFields,
        table:      'master_organization_entities',
      });
      await updateAdminProfile({
        userId:     profile.user_id,
        updateData: { email_id: form.email_id },
        table:      'organization_details',
      });

      setProfile((prev) => ({
        ...prev,
        ...orgFields,
        details: { ...(prev.details || {}), email_id: form.email_id },
      }));
      setIsEditing(false);
      setForm({});
      toast('Profile updated successfully', 'success');
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── Image callbacks ──
  const handleImageSave = (result) => {
    if (editingImageTarget === 'logo') {
      if (result.fullUrl)    setLogoFullUrl(result.fullUrl);
      if (result.croppedUrl) setLogoCroppedUrl(result.croppedUrl);
      toast('Logo image updated successfully', 'success');
    } else if (editingImageTarget === 'banner') {
      if (result.fullUrl)    setBannerFullUrl(result.fullUrl);
      if (result.croppedUrl) setBannerCroppedUrl(result.croppedUrl);
      toast('Banner image updated successfully', 'success');
    } else if (editingImageTarget === 'card') {
      if (result.croppedUrl) setEntityCardUrl(result.croppedUrl);
      toast('Entity card image updated successfully', 'success');
    }
  };

  const handleImageDelete = async () => {
    const target = editingImageTarget;
    let urlsToDelete = [];
    if (target === 'logo')   urlsToDelete = [logoFullUrl, logoCroppedUrl];
    if (target === 'banner') urlsToDelete = [bannerFullUrl, bannerCroppedUrl];
    if (target === 'card')   urlsToDelete = [entityCardUrl];

    const files = urlsToDelete.filter(Boolean).map(extractStorageFile).filter(Boolean);
    const byBucket = files.reduce((acc, { bucket, filePath }) => {
      acc[bucket] = acc[bucket] || [];
      acc[bucket].push(filePath);
      return acc;
    }, {});
    for (const [bucket, filePaths] of Object.entries(byBucket)) {
      try { await supabase.storage.from(bucket).remove(filePaths); } catch (_) {}
    }

    if (target === 'logo') {
      await updateAdminProfile({ userId: profile.user_id, updateData: { profile_picture_url: null, cropped_profile_picture_url: null }, table: 'organization_details' });
      await updateAdminProfile({ userId: profile.user_id, updateData: { image_url: null }, table: 'master_organization_entities' });
      setLogoFullUrl(null); setLogoCroppedUrl(null);
    } else if (target === 'banner') {
      await updateAdminProfile({ userId: profile.user_id, updateData: { banner_picture_url: null, cropped_banner_picture_url: null }, table: 'organization_details' });
      setBannerFullUrl(null); setBannerCroppedUrl(null);
    } else if (target === 'card') {
      await updateAdminProfile({ userId: profile.user_id, updateData: { entity_card_picture_url: null }, table: 'organization_details' });
      setEntityCardUrl(null);
    }

    setEditingImageTarget(null);
    const label = target === 'logo' ? 'Logo' : target === 'banner' ? 'Banner' : 'Card';
    toast(`${label} image removed`, 'info');
  };

  // ── Loading / not found ──
  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Organization not found.</div>;

  // ── Derived display data ──
  const details   = profile.details || {};
  const isPremium = !!profile.is_premium;
  const features  = isPremium ? PROFILE_FEATURES.premium : PROFILE_FEATURES.standard;

  const trustItems = [
    { label: 'Verified Business', icon: <CheckCircle size={15} /> },
    isPremium ? { label: 'Premium Profile', icon: <ShieldCheck size={15} /> } : null,
    { label: 'Active Company',    icon: <Zap size={15} /> },
    { label: 'Human Reviewed',    icon: <UserCheck size={15} /> },
  ].filter(Boolean);

  const badges = [
    { label: '21NEWS VERIFIED', type: 'verified' },
    isPremium ? { label: 'PREMIUM PROFILE', type: 'premium' } : null,
  ].filter(Boolean);

  const stats = [
    { raw: profile.years_in_business,      label: 'Years in Business',  icon: <Calendar size={22} />, key: 'years_in_business'      },
    { raw: profile.key_clients_count,      label: 'Key Clients',        icon: <Users size={22} />,    key: 'key_clients_count'      },
    { raw: profile.verified_reviews_count, label: 'Verified Reviews',   icon: <Star size={22} />,     key: 'verified_reviews_count' },
    { raw: profile.awards_count,           label: 'Awards',             icon: <Award size={22} />,    key: 'awards_count'           },
    { raw: profile.projects_delivered,     label: 'Projects Delivered', icon: <Briefcase size={22} />,key: 'projects_delivered'     },
    { raw: profile.media_mentions_count,   label: 'Media Mentions',     icon: <Newspaper size={22} />,key: 'media_mentions_count'   },
    { raw: profile.social_followers,       label: 'Social Followers',   icon: <TrendingUp size={22} />,key: 'social_followers'      },
  ].map((s) => ({ ...s, value: toStatValue(s.raw) }));

  const statsForDisplay = stats.filter((s) => s.value !== null);

  // Live persons from entities_master (same 4-strategy fetch as main website)
  const leadership = livePersons;

  const trustedOrganizations = (profile.trusted_by || [])
    .map((item) => (typeof item === 'string' ? item : item.name || ''))
    .filter(Boolean);

  const differentiators = (profile.key_differentiators || [])
    .map((d) => (typeof d === 'string' ? d : d.title || d.text || d.description || ''))
    .filter(Boolean);

  const socialLinks = [
    (profile.channel_website || profile.website_url) ? { platform: 'Website',    icon: <Globe size={15} />,     bg: '#f1f5f9', url: profile.channel_website || profile.website_url } : null,
    profile.channel_linkedin  ? { platform: 'LinkedIn',   icon: <LinkedinIcon />,  bg: '#eff6ff', url: profile.channel_linkedin  } : null,
    profile.channel_x         ? { platform: 'X',          icon: <TwitterXIcon />,  bg: '#f8fafc', url: profile.channel_x         } : null,
    profile.channel_youtube   ? { platform: 'YouTube',    icon: <YoutubeIcon />,   bg: '#fff1f2', url: profile.channel_youtube   } : null,
    profile.channel_github    ? { platform: 'GitHub',     icon: <GithubIcon />,    bg: '#f9fafb', url: profile.channel_github    } : null,
    profile.channel_crunchbase? { platform: 'Crunchbase', icon: <Database size={15} />, bg: '#f0fdf4', url: profile.channel_crunchbase } : null,
  ].filter(Boolean);

  const relationships = {
    founders:      leadership.filter((p) => (p.role || '').toLowerCase().includes('founder')).length,
    executives:    leadership.length,
    awards:        parseInt(profile.awards_count)       || 0,
    clients:       parseInt(profile.key_clients_count)  || 0,
    publications:  parseInt(profile.publications_count) || 0,
    mediaMentions: parseInt(profile.media_mentions_count) || 0,
  };

  const org = {
    name:           profile.organization_name,
    tagline:        profile.tagline        || '',
    description:    profile.description   || '',
    sector:         profile.industry      || '',
    location:       profile.location      || '',
    founded:        profile.founded_year  ? String(profile.founded_year) : '',
    teamSize:       profile.team_size     || '',
    website:        profile.channel_website || profile.website_url || '',
    email:          details.email_id      || '',
    profilePicture: logoCroppedUrl || logoFullUrl || null,
    bannerUrl:      bannerCroppedUrl || bannerFullUrl || null,
    badges,
    trust:          { items: trustItems, authorityScore: profile.authority_score || 0 },
    services:       profile.core_services || [],
    story: { mission: profile.mission || '', vision: profile.vision || '', marketPositioning: profile.market_positioning || '', differentiators },
    leadership,
    trustedOrganizations,
    relationships,
    socialLinks,
  };

  const hasStory = org.story.mission || org.story.vision || org.story.marketPositioning || org.story.differentiators.length > 0;

  // ── Social channel definitions for edit ──
  const socialChannels = [
    { key: 'channel_website',    label: 'Website',    icon: <Globe size={18} />,       bg: '#f1f5f9', placeholder: 'https://yourwebsite.com' },
    { key: 'channel_linkedin',   label: 'LinkedIn',   icon: <LinkedinIcon />,          bg: '#eff6ff', placeholder: 'https://linkedin.com/company/...' },
    { key: 'channel_x',          label: 'X (Twitter)',icon: <TwitterXIcon />,          bg: '#f8fafc', placeholder: 'https://x.com/...' },
    { key: 'channel_youtube',    label: 'YouTube',    icon: <YoutubeIcon />,           bg: '#fff1f2', placeholder: 'https://youtube.com/...' },
    { key: 'channel_github',     label: 'GitHub',     icon: <GithubIcon />,            bg: '#f9fafb', placeholder: 'https://github.com/...' },
    { key: 'channel_crunchbase', label: 'Crunchbase', icon: <Database size={18} />,    bg: '#f0fdf4', placeholder: 'https://crunchbase.com/organization/...' },
  ];

  const allStatsForEdit = [
    { key: 'years_in_business',      label: 'Years in Business',  icon: <Calendar size={22} />   },
    { key: 'key_clients_count',      label: 'Key Clients',        icon: <Users size={22} />      },
    { key: 'verified_reviews_count', label: 'Verified Reviews',   icon: <Star size={22} />       },
    { key: 'awards_count',           label: 'Awards',             icon: <Award size={22} />      },
    { key: 'projects_delivered',     label: 'Projects Delivered', icon: <Briefcase size={22} />  },
    { key: 'media_mentions_count',   label: 'Media Mentions',     icon: <Newspaper size={22} />  },
    { key: 'social_followers',       label: 'Social Followers',   icon: <TrendingUp size={22} /> },
    { key: 'publications_count',     label: 'Publications',       icon: <Newspaper size={22} />  },
    { key: 'authority_score',        label: 'Authority Score',    icon: <Star size={22} />       },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="op-page">

      {/* ── Sticky Edit Bar (visible while editing) ── */}
      {isEditing && (
        <div className="op-sticky-edit-bar">
          <div className="op-sticky-edit-bar__left">
            <PencilIcon size={16} />
            <div>
              <span>Editing Profile</span>
              <small>Scroll through all sections and fill in your changes</small>
            </div>
          </div>
          <div className="op-sticky-edit-bar__right">
            {saveError && <span className="op-save-error">{saveError}</span>}
            <button className="op-cancel-btn" onClick={handleCancel}>Cancel</button>
            <button className="op-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="op-save-spinner" />Saving...</> : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Admin bar (visible when not editing) ── */}
      {!isEditing && (
        <div className="admin-edit-bar">
          <button className="admin-edit-btn" onClick={handleEditStart}>
            <PencilIcon size={15} />
            Edit Profile
          </button>
          <button
            className="admin-edit-btn"
            style={{ marginLeft: 12, background: 'var(--surface-color,#fff)', color: 'var(--text-primary,#0f172a)', border: '1px solid var(--border-color,#e2e8f0)' }}
            onClick={() => setEditingImageTarget('card')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            Edit Card Image
          </button>
        </div>
      )}

      {/* ── Image Editor Modal ── */}
      {editingImageTarget && (() => {
        const isCard   = editingImageTarget === 'card';
        const isLogo   = editingImageTarget === 'logo';
        const isBanner = editingImageTarget === 'banner';
        return (
          <ImageEditor
            key={`${profile.user_id}-${editingImageTarget}`}
            isOpen={!!editingImageTarget}
            onClose={() => setEditingImageTarget(null)}
            currentImageUrl={
              isLogo   ? (logoCroppedUrl || logoFullUrl) :
              isBanner ? (bannerCroppedUrl || bannerFullUrl) :
                         (entityCardUrl || logoCroppedUrl || logoFullUrl)
            }
            oldFullUrl={
              isLogo   ? logoFullUrl :
              isBanner ? bannerFullUrl :
                         null
            }
            oldCroppedUrl={
              isLogo   ? logoCroppedUrl :
              isBanner ? bannerCroppedUrl :
                         entityCardUrl
            }
            userId={profile.user_id}
            onSave={handleImageSave}
            onDelete={handleImageDelete}
            tableName="organization_details"
            columnName={
              isLogo   ? 'profile_picture_url' :
              isBanner ? 'banner_picture_url' :
                         'entity_card_picture_url'
            }
            croppedColumnName={
              isLogo   ? 'cropped_profile_picture_url' :
              isBanner ? 'cropped_banner_picture_url' :
                         'entity_card_picture_url'
            }
            cropMode={true}
            cropWidth={isBanner ? 960 : 480}
            cropHeight={300}
            syncTableName={isLogo ? 'master_organization_entities' : undefined}
            syncColumnName={isLogo ? 'image_url' : undefined}
            title={
              isLogo   ? 'Edit Logo Image' :
              isBanner ? 'Edit Banner Image' :
                         'Edit Entity Card Image'
            }
            description={
              isLogo   ? 'Upload and crop the organization logo. Displayed in the profile header.' :
              isBanner ? 'Upload and crop the banner/cover image.' :
                         'Crop the image shown in Lexicon entity cards on both websites. Saved separately from the logo.'
            }
          />
        );
      })()}

      {/* ── Hero Cover ── */}
      <HeroCover bannerUrl={org.bannerUrl} onEditBanner={() => setEditingImageTarget('banner')} />

      {/* ════════════════════════════════════════════════
          SECTION 1 — Organization Header
          ════════════════════════════════════════════════ */}
      <section className={`op-header-section ${isEditing ? 'op-edit-section-wrap' : ''}`}>
        <div className="op-container">
          <div className="op-header-card op-reveal">
            <div className="op-header-left">
              {/* Logo row — always shown */}
              <div className="op-header-logo-row">
                <div className="op-org-logo" style={{ position: 'relative' }}>
                  {org.profilePicture ? (
                    <img src={org.profilePicture} alt={org.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <span style={{ display: org.profilePicture ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    {getInitials(org.name)}
                  </span>
                  <button className="op-img-edit-fab op-logo-edit-fab" onClick={() => setEditingImageTarget('logo')} aria-label="Edit Logo">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
                <div className="op-header-badges">
                  {org.badges.map((b, i) => (
                    <span key={i} className={`op-badge ${b.type === 'verified' ? 'op-badge--verified' : b.type === 'premium' ? 'op-badge--premium' : 'op-badge--standard'}`}>
                      {b.type === 'verified' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      )}
                      {b.label}
                    </span>
                  ))}
                  {isEditing && <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>}
                </div>
              </div>

              {/* ── EDIT MODE: header fields ── */}
              {isEditing ? (
                <div className="op-header-edit-grid">
                  <div className="op-inline-field op-header-edit-full">
                    <label className="op-inline-label">Organization Name</label>
                    <input className="op-inline-input" value={form.organization_name || ''} onChange={(e) => sf('organization_name', e.target.value)} placeholder="e.g. Acme Corporation" />
                  </div>
                  <div className="op-inline-field op-header-edit-full">
                    <label className="op-inline-label">Tagline</label>
                    <input className="op-inline-input" value={form.tagline || ''} onChange={(e) => sf('tagline', e.target.value)} placeholder="e.g. Building the future of technology" />
                  </div>
                  <div className="op-inline-field op-header-edit-full">
                    <label className="op-inline-label">Description</label>
                    <textarea className="op-inline-textarea" rows={4} value={form.description || ''} onChange={(e) => sf('description', e.target.value)} placeholder="Brief description of the organization..." />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Industry / Sector</label>
                    <input className="op-inline-input" value={form.industry || ''} onChange={(e) => sf('industry', e.target.value)} placeholder="e.g. Technology" />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Location</label>
                    <input className="op-inline-input" value={form.location || ''} onChange={(e) => sf('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Founded Year</label>
                    <input className="op-inline-input" type="number" value={form.founded_year || ''} onChange={(e) => sf('founded_year', e.target.value)} placeholder="e.g. 2010" />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Team Size</label>
                    <input className="op-inline-input" value={form.team_size || ''} onChange={(e) => sf('team_size', e.target.value)} placeholder="e.g. 51–200" />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Contact Email</label>
                    <input className="op-inline-input" type="email" value={form.email_id || ''} onChange={(e) => sf('email_id', e.target.value)} placeholder="contact@company.com" />
                  </div>
                </div>
              ) : (
                /* ── DISPLAY MODE ── */
                <>
                  <h1 className="op-org-name">{org.name}</h1>
                  {org.tagline    && <p className="op-org-tagline">{org.tagline}</p>}
                  {org.description && <p className="op-org-desc">{org.description}</p>}
                  <div className="op-meta-row">
                    {org.sector   && <span className="op-meta-item"><Building2 size={14} />{org.sector}</span>}
                    {org.location && <span className="op-meta-item"><MapPin size={14} />{org.location}</span>}
                    {org.founded  && <span className="op-meta-item"><Calendar size={14} />Founded {org.founded}</span>}
                    {org.teamSize && <span className="op-meta-item"><Users size={14} />Team {org.teamSize}</span>}
                  </div>
                  <div className="op-header-actions">
                    {org.website && (
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="op-btn op-btn--primary">
                        <Globe size={15} />Visit Website
                      </a>
                    )}
                    {org.email && (
                      <a href={`mailto:${org.email}`} className="op-btn op-btn--secondary">
                        <Mail size={15} />Contact Company
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
            <TrustPanel trust={org.trust} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SECTION 2 — Credibility Stats
          ════════════════════════════════════════════════ */}
      {(statsForDisplay.length > 0 || isEditing) && (
        <section className={`op-section op-stats-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            {isEditing ? (
              <>
                <div className="op-section-edit-title-row">
                  <h2 className="op-section-title" style={{ marginBottom: 0 }}>Credibility Stats</h2>
                  <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
                </div>
                <div className="op-stats-grid">
                  {allStatsForEdit.map(({ key, label, icon }) => (
                    <div key={key} className="op-stat-card">
                      <div className="op-stat-card__icon">{icon}</div>
                      <input
                        className="op-stat-edit-input"
                        value={form[key] || ''}
                        onChange={(e) => sf(key, e.target.value)}
                        placeholder="—"
                      />
                      <div className="op-stat-card__label">{label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="op-section-title">Company Credibility Snapshot</h2>
                <div className="op-stats-grid">
                  {statsForDisplay.map((s, i) => (
                    <div key={i} className={`op-stat-card op-stat-card--${i % 5}`} style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="op-stat-card__icon">{s.icon}</div>
                      <div className="op-stat-card__value">{s.value}</div>
                      <div className="op-stat-card__label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Specialization Tags
          ════════════════════════════════════════════════ */}
      {!isEditing && <SpecializationTags tags={enrichedData.specializations} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Trusted Parties (consolidated)
          ════════════════════════════════════════════════ */}
      {!isEditing && (
        <TrustedPartiesSection
          trustedBy={trustedOrganizations}
          clients={enrichedData.siteClients}
          partners={enrichedData.sitePartners}
        />
      )}

      {/* ════════════════════════════════════════════════
          SECTION 3 — Trusted By editable (edit mode only)
          ════════════════════════════════════════════════ */}
      {isEditing && (
        <section className="op-section op-trusted-section op-reveal op-edit-section-wrap">
          <div className="op-container">
            <div className="op-section-edit-title-row">
              <h2 className="op-section-title" style={{ marginBottom: 0 }}>Trusted By</h2>
              <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
            </div>
            <div className="op-trusted-edit-wrap">
              {(form.trusted_by || []).map((name, i) => (
                <span key={i} className="op-trusted-edit-chip">
                  {name}
                  <button onClick={() => sfRemove('trusted_by', i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="op-trusted-add-row">
              <input ref={trustedInputRef} placeholder="Type organization name..." onKeyDown={(e) => { if (e.key === 'Enter') sfAddStr('trusted_by', trustedInputRef); }} />
              <button onClick={() => sfAddStr('trusted_by', trustedInputRef)}>+ Add</button>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 4 — Core Services
          ════════════════════════════════════════════════ */}
      {(org.services.length > 0 || isEditing) && (
        <section className={`op-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            {isEditing ? (
              <>
                <div className="op-section-edit-title-row">
                  <h2 className="op-section-title" style={{ marginBottom: 0 }}>Core Services</h2>
                  <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
                </div>
                <div className="op-edit-cards">
                  {(form.core_services || []).map((svc, i) => (
                    <div key={i} className="op-edit-card">
                      <button className="op-edit-card-remove" onClick={() => sfRemove('core_services', i)}>&times;</button>
                      <div className="op-inline-grid">
                        <div className="op-inline-field op-inline-grid--full">
                          <label className="op-inline-label">Service Title</label>
                          <input className="op-inline-input" value={svc.title || ''} onChange={(e) => sfUpdateObj('core_services', i, 'title', e.target.value)} placeholder="e.g. AI Consulting" />
                        </div>
                        <div className="op-inline-field op-inline-grid--full">
                          <label className="op-inline-label">Description</label>
                          <textarea className="op-inline-textarea" rows={2} value={svc.description || ''} onChange={(e) => sfUpdateObj('core_services', i, 'description', e.target.value)} placeholder="What this service does..." />
                        </div>
                        <div className="op-inline-field op-inline-grid--full">
                          <label className="op-inline-label">Outcomes</label>
                          <textarea className="op-inline-textarea" rows={2} value={svc.outcomes || ''} onChange={(e) => sfUpdateObj('core_services', i, 'outcomes', e.target.value)} placeholder="Expected results or benefits..." />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="op-edit-add-btn" onClick={() => sfAddObj('core_services', { title: '', description: '', outcomes: '' })}>
                  + Add Service
                </button>
              </>
            ) : (
              <>
                <h2 className="op-section-title">Core Services</h2>
                <div className="op-services-grid">
                  {org.services.map((svc, i) => (
                    <div key={i} className="op-service-card">
                      <h3 className="op-service-card__title">{svc.title}</h3>
                      <p className="op-service-card__desc">{svc.description}</p>
                      {svc.outcomes && (
                        <div className="op-service-card__outcomes-wrap">
                          <span className="op-service-card__outcomes-label">Outcomes</span>
                          <p className="op-service-card__outcomes">{svc.outcomes}</p>
                        </div>
                      )}
                      <button className="op-service-card__cta">Learn More <ArrowRight size={13} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Products & Offerings
          ════════════════════════════════════════════════ */}
      {!isEditing && (
        <ProductsSection
          products={enrichedData.products}
          keyFeatures={enrichedData.keyFeatures}
          pricingUrls={enrichedData.pricingUrls}
          techStack={enrichedData.techStack}
        />
      )}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — News & Press
          ════════════════════════════════════════════════ */}
      {!isEditing && <NewsAndPress articles={enrichedData.news} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Reviews & Ratings
          ════════════════════════════════════════════════ */}
      {!isEditing && <ReviewsAndRatings reviews={enrichedData.reviews} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Awards & Recognition
          ════════════════════════════════════════════════ */}
      {!isEditing && <AwardsSection awards={enrichedData.siteAwards} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Investor Intelligence
          ════════════════════════════════════════════════ */}
      {!isEditing && <InvestorIntelligenceSection sources={enrichedData.investorSources} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Publications
          ════════════════════════════════════════════════ */}
      {!isEditing && <PublicationsSection pubs={enrichedData.publications} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Contact & Presence
          ════════════════════════════════════════════════ */}
      {!isEditing && <ContactInfoSection contactInfo={enrichedData.contactInfo} mediaAndPress={enrichedData.mediaAndPress} />}

      {/* ════════════════════════════════════════════════
          SECTION 5 — Company Story
          ════════════════════════════════════════════════ */}
      {(hasStory || isEditing) && (
        <section className={`op-section op-story-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            {isEditing ? (
              <>
                <div className="op-section-edit-title-row">
                  <h2 className="op-section-title" style={{ marginBottom: 0 }}>Company Story</h2>
                  <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Mission</label>
                    <textarea className="op-inline-textarea" rows={3} value={form.mission || ''} onChange={(e) => sf('mission', e.target.value)} placeholder="Our mission is to..." />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Vision</label>
                    <textarea className="op-inline-textarea" rows={3} value={form.vision || ''} onChange={(e) => sf('vision', e.target.value)} placeholder="We envision a world where..." />
                  </div>
                  <div className="op-inline-field">
                    <label className="op-inline-label">Market Positioning</label>
                    <textarea className="op-inline-textarea" rows={3} value={form.market_positioning || ''} onChange={(e) => sf('market_positioning', e.target.value)} placeholder="We differentiate ourselves by..." />
                  </div>
                  <div>
                    <label className="op-inline-label" style={{ display: 'block', marginBottom: 8 }}>Key Differentiators</label>
                    <div className="op-edit-cards">
                      {(form.key_differentiators || []).map((item, i) => (
                        <div key={i} className="op-edit-card" style={{ padding: '10px 44px 10px 14px' }}>
                          <button className="op-edit-card-remove" onClick={() => sfRemove('key_differentiators', i)}>&times;</button>
                          <input className="op-inline-input" value={item} onChange={(e) => sfUpdateStr('key_differentiators', i, e.target.value)} placeholder="e.g. First-mover in AI-powered logistics" />
                        </div>
                      ))}
                    </div>
                    <div className="op-trusted-add-row">
                      <input ref={diffInputRef} placeholder="Type a differentiator..." onKeyDown={(e) => { if (e.key === 'Enter') sfAddStr('key_differentiators', diffInputRef); }} />
                      <button onClick={() => sfAddStr('key_differentiators', diffInputRef)}>+ Add</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="op-section-title">Company Story</h2>
                <p className="op-section-subtitle">Purpose, vision and what makes this company unique</p>
                {(org.story.mission || org.story.vision) && (
                  <div className="op-story-mv-row">
                    {org.story.mission && (
                      <div className="op-story-mv-card op-story-mv-card--mission">
                        <div className="op-story-mv-card__glow" />
                        <div className="op-story-mv-card__icon"><Target size={20} /></div>
                        <span className="op-story-mv-card__label">Mission</span>
                        <p className="op-story-mv-card__text">{org.story.mission}</p>
                      </div>
                    )}
                    {org.story.vision && (
                      <div className="op-story-mv-card op-story-mv-card--vision">
                        <div className="op-story-mv-card__glow" />
                        <div className="op-story-mv-card__icon"><Eye size={20} /></div>
                        <span className="op-story-mv-card__label">Vision</span>
                        <p className="op-story-mv-card__text">{org.story.vision}</p>
                      </div>
                    )}
                  </div>
                )}
                {org.story.marketPositioning && (
                  <div className="op-story-market">
                    <div className="op-story-market__bar" />
                    <div className="op-story-market__inner">
                      <span className="op-story-market__label"><TrendingUp size={13} />Market Positioning</span>
                      <p className="op-story-market__text">{org.story.marketPositioning}</p>
                    </div>
                  </div>
                )}
                {org.story.differentiators.length > 0 && (
                  <div className="op-story-diff-section">
                    <span className="op-story-diff-section__title">Key Differentiators</span>
                    <div className="op-story-diff-grid">
                      {org.story.differentiators.map((d, i) => (
                        <div key={i} className="op-story-diff-card" style={{ animationDelay: `${i * 70}ms` }}>
                          <div className="op-story-diff-card__num">{String(i + 1).padStart(2, '0')}</div>
                          <div className="op-story-diff-card__check"><Check size={11} /></div>
                          <p className="op-story-diff-card__text">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 6 — Leadership & Key People
          ════════════════════════════════════════════════ */}
      {(org.leadership.length > 0 || isEditing) && (
        <section className={`op-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            {isEditing ? (
              <>
                <div className="op-section-edit-title-row">
                  <h2 className="op-section-title" style={{ marginBottom: 0 }}>Leadership &amp; Key People</h2>
                  <button className="op-edit-add-btn ep-add-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1E3A8A', color: '#fff', border: 'none' }} onClick={() => setPickerOpen(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Pick from Lexicon
                  </button>
                </div>

                {(form.leadership || []).length > 0 ? (
                  <div className="lp-lexicon-grid">
                    {(form.leadership || []).map((person, realIdx) => {
                      const initials = (person.name || '').split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'NA';
                      const badgeLabel = person.source === 'live' ? 'Live' : person.source === 'manual' ? 'Manual' : 'Lexicon';
                      return (
                        <div key={person.user_id || realIdx} className="lp-mini-card">
                          <div className="lp-mini-avatar">
                            {person.image
                              ? <img src={person.image} alt={person.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                              : null}
                            <span style={{ display: person.image ? 'none' : 'flex' }}>{initials}</span>
                          </div>
                          <div className="lp-mini-info">
                            <span className="lp-mini-name">{person.name || '—'}</span>
                            {person.role && <span className="lp-mini-role">{person.role}</span>}
                          </div>
                          <span className="lp-mini-badge">{badgeLabel}</span>
                          <button className="lp-mini-remove" onClick={() => sfRemove('leadership', realIdx)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '12px 0 4px' }}>
                    No leadership members yet. Pick from the Lexicon to add people.
                  </p>
                )}

              </>
            ) : (
              <>
                <h2 className="op-section-title">Leadership &amp; Key People</h2>
                <p className="op-section-subtitle">Verified individuals connected to this organization</p>
                <div className="op-leadership-grid">
                  {org.leadership.map((person, i) => (
                    <LeadershipCard
                      key={person.user_id || i}
                      user_id={person.user_id}
                      entitySlug={person.entity_slug}
                      name={person.name}
                      role={person.role}
                      sector={person.sector}
                      authorityScore={person.authority_score}
                      image={person.cropped_photo_url || person.image_url || null}
                    />
                  ))}
                </div>
                <div className="op-team-cta">
                  <button className="op-team-cta__btn">Explore All Team Members <ChevronRight size={15} /></button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Office Locations
          ════════════════════════════════════════════════ */}
      {!isEditing && <OfficeLocations locations={enrichedData.locations} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Similar Organizations
          ════════════════════════════════════════════════ */}
      {!isEditing && <SimilarOrganizations orgs={enrichedData.similarOrgs} />}

      {/* ════════════════════════════════════════════════
          ENRICHMENT — Social Media Channels
          ════════════════════════════════════════════════ */}
      {!isEditing && <SocialMediaSection socialMedia={enrichedData.socialMedia} />}

      {/* ════════════════════════════════════════════════
          SECTION 7 — Verified Relationships (premium, display only)
          ════════════════════════════════════════════════ */}
      {features.verifiedRelationships && !isEditing && (
        <section className="op-section op-reveal">
          <div className="op-container">
            <h2 className="op-section-title">Verified Relationships</h2>
            <div className="op-rel-panel">
              <div className="op-rel-center">
                <div className="op-rel-org-icon"><Building2 size={30} /></div>
                <div className="op-rel-org-name">{org.name}</div>
              </div>
              <div className="op-rel-grid">
                {[
                  { value: relationships.founders,      label: 'Founders',       icon: <Users size={20} />      },
                  { value: relationships.executives,    label: 'Executives',     icon: <Building2 size={20} />  },
                  { value: relationships.awards,        label: 'Awards',         icon: <Award size={20} />      },
                  { value: relationships.clients,       label: 'Clients',        icon: <Users size={20} />      },
                  { value: relationships.publications,  label: 'Publications',   icon: <Newspaper size={20} />  },
                  { value: relationships.mediaMentions, label: 'Media Mentions', icon: <TrendingUp size={20} /> },
                ].map((item, i) => (
                  <div key={i} className="op-rel-card">
                    <div className="op-rel-card__icon">{item.icon}</div>
                    <div className="op-rel-card__value">{item.value}</div>
                    <div className="op-rel-card__label">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="op-rel-footer">
                <Zap size={13} />
                AI-readable entity connections demonstrating verified authority ecosystem
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 8 — Connect & Follow (Social Channels)
          ════════════════════════════════════════════════ */}
      {(org.socialLinks.length > 0 || isEditing) && (
        <section className={`op-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            <div className="op-social-panel">
              {isEditing ? (
                <>
                  <div className="op-section-edit-title-row" style={{ marginBottom: 20 }}>
                    <div>
                      <h3 className="op-social-panel__title">Connect &amp; Follow</h3>
                      <p className="op-social-panel__subtitle">Enter the official URLs for each channel.</p>
                    </div>
                    <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
                  </div>
                  <div className="op-social-edit-rows">
                    {socialChannels.map(({ key, label, icon, bg, placeholder }) => (
                      <div key={key} className="op-social-edit-row">
                        <div className="op-social-edit-pill" style={{ backgroundColor: bg }}>
                          <span style={{ color: '#1E3A8A', display: 'flex' }}>{icon}</span>
                          <span>{label}</span>
                        </div>
                        <input
                          type="url"
                          className="op-social-edit-input"
                          value={form[key] || ''}
                          onChange={(e) => sf(key, e.target.value)}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="op-social-panel__header">
                    <div>
                      <h3 className="op-social-panel__title">Connect &amp; Follow</h3>
                      <p className="op-social-panel__subtitle">Follow through official websites, social channels, and media platforms.</p>
                    </div>
                    <span className="op-social-panel__verified-badge"><CheckCircle size={13} />Verified Channels</span>
                  </div>
                  <div className="op-social-links">
                    {org.socialLinks.map((link, i) => (
                      <a key={i} href={link.url} className="op-social-pill" style={{ backgroundColor: link.bg }} target="_blank" rel="noopener noreferrer">
                        <span className="op-social-pill__icon">{link.icon}</span>
                        <span className="op-social-pill__label">{link.platform}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {pickerOpen && (
        <LeadershipPickerModal
          currentIds={(form.leadership || []).filter((p) => p.user_id).map((p) => p.user_id)}
          onAdd={addLexiconPeople}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default OrganizationProfile;
