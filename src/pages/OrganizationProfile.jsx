import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EditableOrganizationProfile from '../components/EditableOrganizationProfile';
import ToastContainer, { useToast } from '../components/Toast';
import './OrganizationProfile.css';

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

// ============ SUB-COMPONENTS ============

const VerifiedBadge21 = () => (
  <span className="op-badge op-badge--verified">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
    21NEWS VERIFIED
  </span>
);

const HeroCover = ({ bannerUrl }) => (
  <div className="op-hero">
    {bannerUrl ? (
      <img src={bannerUrl} alt="Organization Cover" className="op-hero__img" />
    ) : (
      <div className="op-hero__img" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2C2F86 50%, #3730a3 100%)' }} />
    )}
    <div className="op-hero__overlay" />
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
        <span className="op-trust-panel__score-label">Authority Score</span>
        <span className="op-trust-panel__score-num">{trust.authorityScore || '—'}</span>
      </div>
    </div>
  );
};

const OrgHeader = ({ org }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section className="op-header-section">
      <div className="op-container">
        <div ref={ref} className={`op-header-card ${visible ? 'op-reveal' : ''}`}>
          <div className="op-header-left">
            <div className="op-header-logo-row">
              <div className="op-org-logo">
                {org.profilePicture ? (
                  <img
                    src={org.profilePicture}
                    alt={org.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <span style={{ display: org.profilePicture ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(org.name)}
                </span>
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
              </div>
            </div>

            <h1 className="op-org-name">{org.name}</h1>
            {org.tagline && <p className="op-org-tagline">{org.tagline}</p>}
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
          </div>
          <TrustPanel trust={org.trust} />
        </div>
      </div>
    </section>
  );
};

const CredibilitySnapshot = ({ stats }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section op-stats-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Company Credibility Snapshot</h2>
        <div className="op-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="op-stat-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="op-stat-card__icon">{s.icon}</div>
              <div className="op-stat-card__value">{s.value}</div>
              <div className="op-stat-card__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CoreServices = ({ services }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Core Services</h2>
        <div className="op-services-grid">
          {services.map((svc, i) => (
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
      </div>
    </section>
  );
};

const CompanyStory = ({ story }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section op-story-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Company Story</h2>
        <div className="op-story-content">
          {story.mission && (
            <div className="op-story-block">
              <span className="op-story-label">Mission</span>
              <p className="op-story-text">{story.mission}</p>
            </div>
          )}
          {story.vision && (
            <div className="op-story-block">
              <span className="op-story-label">Vision</span>
              <p className="op-story-text">{story.vision}</p>
            </div>
          )}
          {story.marketPositioning && (
            <div className="op-story-block">
              <span className="op-story-label">Market Positioning</span>
              <p className="op-story-text">{story.marketPositioning}</p>
            </div>
          )}
          {story.differentiators.length > 0 && (
            <div className="op-story-block">
              <span className="op-story-label">Key Differentiators</span>
              <ul className="op-story-diff-list">
                {story.differentiators.map((d, i) => (
                  <li key={i} className="op-story-diff-item">
                    <span className="op-story-diff-icon"><Check size={13} /></span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const ProfileCard = ({ person }) => {
  const initials = getInitials(person.name);
  const [imgError, setImgError] = useState(false);
  return (
    <div className="op-profile-card">
      <div className="op-profile-card__avatar-wrap">
        {person.image && !imgError ? (
          <img src={person.image} alt={person.name} className="op-profile-card__avatar" onError={() => setImgError(true)} />
        ) : (
          <div className="op-profile-card__avatar-fallback">{initials}</div>
        )}
      </div>
      {person.verified && <VerifiedBadge21 />}
      <h4 className="op-profile-card__name">{person.name}</h4>
      <p className="op-profile-card__role">{person.role}</p>
      {person.expertise && <p className="op-profile-card__expertise">{person.expertise}</p>}
      {person.score && (
        <div className="op-profile-card__score">
          <Star size={13} fill="currentColor" />{person.score}
        </div>
      )}
      <button className="op-profile-card__btn">View Profile</button>
    </div>
  );
};

const LeadershipGrid = ({ leadership }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Leadership &amp; Key People</h2>
        <p className="op-section-subtitle">Verified individuals connected to this organization</p>
        <div className="op-leadership-grid">
          {leadership.map((person, i) => <ProfileCard key={i} person={person} />)}
        </div>
        <div className="op-team-cta">
          <button className="op-team-cta__btn">Explore All Team Members <ChevronRight size={15} /></button>
        </div>
      </div>
    </section>
  );
};

const ConnectFollow = ({ socialLinks }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section ${visible ? 'op-reveal' : ''}`}>
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
            {socialLinks.map((link, i) => (
              <a key={i} href={link.url} className="op-social-pill" style={{ backgroundColor: link.bg }} target="_blank" rel="noopener noreferrer">
                <span className="op-social-pill__icon">{link.icon}</span>
                <span className="op-social-pill__label">{link.platform}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const TrustedOrganizations = ({ orgs }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section ref={ref} className={`op-section op-trusted-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Trusted by Leading Organizations</h2>
        <div className="op-trusted-chips">
          {orgs.map((name, i) => <span key={i} className="op-trusted-chip">{name}</span>)}
        </div>
      </div>
    </section>
  );
};

const VerifiedRelationships = ({ org }) => {
  const [ref, visible] = useScrollReveal();
  const { relationships } = org;
  const relItems = [
    { value: relationships.founders,     label: 'Founders',       icon: <Users size={20} /> },
    { value: relationships.executives,   label: 'Executives',     icon: <Building2 size={20} /> },
    { value: relationships.awards,       label: 'Awards',         icon: <Award size={20} /> },
    { value: relationships.clients,      label: 'Clients',        icon: <Users size={20} /> },
    { value: relationships.publications, label: 'Publications',   icon: <Newspaper size={20} /> },
    { value: relationships.mediaMentions,label: 'Media Mentions', icon: <TrendingUp size={20} /> },
  ];
  return (
    <section ref={ref} className={`op-section ${visible ? 'op-reveal' : ''}`}>
      <div className="op-container">
        <h2 className="op-section-title">Verified Relationships</h2>
        <div className="op-rel-panel">
          <div className="op-rel-center">
            <div className="op-rel-org-icon"><Building2 size={30} /></div>
            <div className="op-rel-org-name">{org.name}</div>
          </div>
          <div className="op-rel-grid">
            {relItems.map((item, i) => (
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
  );
};

// ============ MAIN PAGE ============
const OrganizationProfile = () => {
  const { id } = useParams();
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);

    // Admin view: no payment/approval gate — show all orgs
    const { data: orgData, error: orgError } = await supabase
      .from('master_organization_entities')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (orgError || !orgData) {
      setLoading(false);
      return;
    }

    const { data: detailsData } = await supabase
      .from('organization_details')
      .select('profile_picture_url, banner_picture_url, cropped_profile_picture_url, cropped_banner_picture_url, Status, subscription, email_id')
      .eq('user_id', orgData.user_id)
      .maybeSingle();

    setProfile({ ...orgData, details: detailsData || {} });
    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading profile...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Organization not found.</div>;
  }

  const details   = profile.details || {};
  const isPremium = !!profile.is_premium;
  const features  = isPremium ? PROFILE_FEATURES.premium : PROFILE_FEATURES.standard;

  const trustItems = [
    { label: 'Verified Business', icon: <CheckCircle size={15} /> },
    isPremium ? { label: 'Premium Profile', icon: <ShieldCheck size={15} /> } : null,
    { label: 'Active Company',    icon: <Zap size={15} /> },
    { label: 'Human Reviewed',   icon: <UserCheck size={15} /> },
  ].filter(Boolean);

  const badges = [
    { label: '21NEWS VERIFIED', type: 'verified' },
    isPremium ? { label: 'PREMIUM PROFILE', type: 'premium' } : null,
  ].filter(Boolean);

  const stats = [
    { raw: profile.years_in_business,    label: 'Years in Business',  icon: <Calendar size={22} /> },
    { raw: profile.key_clients_count,    label: 'Key Clients',        icon: <Users size={22} /> },
    { raw: profile.verified_reviews_count, label: 'Verified Reviews', icon: <Star size={22} /> },
    { raw: profile.awards_count,         label: 'Awards',             icon: <Award size={22} /> },
    { raw: profile.projects_delivered,   label: 'Projects Delivered', icon: <Briefcase size={22} /> },
    { raw: profile.media_mentions_count, label: 'Media Mentions',     icon: <Newspaper size={22} /> },
    { raw: profile.social_followers,     label: 'Social Followers',   icon: <TrendingUp size={22} /> },
  ].map((s) => ({ ...s, value: toStatValue(s.raw) })).filter((s) => s.value !== null);

  const leadership = (profile.leadership || []).map((person) => ({
    ...person,
    image:    person.image || person.image_url || null,
    verified: person.verified !== undefined ? person.verified : true,
    score:    person.score || person.authority_score || null,
    expertise: person.expertise || person.subtitle || person.title || '',
  }));

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
    founders:     leadership.filter((p) => (p.role || '').toLowerCase().includes('founder')).length,
    executives:   leadership.length,
    awards:       parseInt(profile.awards_count) || 0,
    clients:      parseInt(profile.key_clients_count) || 0,
    publications: parseInt(profile.publications_count) || 0,
    mediaMentions: parseInt(profile.media_mentions_count) || 0,
  };

  const org = {
    name:           profile.organization_name,
    tagline:        profile.tagline || '',
    description:    profile.description || '',
    sector:         profile.industry || '',
    location:       profile.location || '',
    founded:        profile.founded_year ? String(profile.founded_year) : '',
    teamSize:       profile.team_size || '',
    website:        profile.channel_website || profile.website_url || '',
    email:          details.email_id || '',
    profilePicture: details.cropped_profile_picture_url || details.profile_picture_url || null,
    bannerUrl:      details.cropped_banner_picture_url  || details.banner_picture_url  || null,
    badges,
    trust:          { items: trustItems, authorityScore: profile.authority_score || 0 },
    stats,
    services:       profile.core_services || [],
    story: { mission: profile.mission || '', vision: profile.vision || '', marketPositioning: profile.market_positioning || '', differentiators },
    leadership,
    trustedOrganizations,
    relationships,
    socialLinks,
  };

  const hasStory = org.story.mission || org.story.vision || org.story.marketPositioning || org.story.differentiators.length > 0;

  if (isEditing) {
    return (
      <div className="op-page">
        <EditableOrganizationProfile
          profile={profile}
          onSave={(updated) => {
            setProfile(updated);
            setIsEditing(false);
            toast('Organization profile saved successfully', 'success');
          }}
          onCancel={() => setIsEditing(false)}
        />
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </div>
    );
  }

  return (
    <div className="op-page">
      {/* Admin Edit Button */}
      <div className="admin-edit-bar">
        <button className="admin-edit-btn" onClick={() => setIsEditing(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Profile
        </button>
      </div>
      <HeroCover bannerUrl={org.bannerUrl} />
      <OrgHeader org={org} />
      {org.stats.length > 0 && <CredibilitySnapshot stats={org.stats} />}
      {features.trustedOrganizations && org.trustedOrganizations.length > 0 && <TrustedOrganizations orgs={org.trustedOrganizations} />}
      {org.services.length > 0 && <CoreServices services={org.services} />}
      {hasStory && <CompanyStory story={org.story} />}
      {org.leadership.length > 0 && <LeadershipGrid leadership={org.leadership} />}
      {features.verifiedRelationships && <VerifiedRelationships org={org} />}
      {org.socialLinks.length > 0 && <ConnectFollow socialLinks={org.socialLinks} />}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default OrganizationProfile;
