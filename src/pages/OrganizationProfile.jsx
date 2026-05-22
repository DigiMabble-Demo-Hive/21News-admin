import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import ImageEditor, { extractStorageFile } from '../components/ImageEditor';
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
        <span className="op-trust-panel__score-label">Authority Score</span>
        <span className="op-trust-panel__score-num">{trust.authorityScore || '—'}</span>
      </div>
    </div>
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

// ============ MAIN PAGE ============
const OrganizationProfile = () => {
  const { id } = useParams();
  const [profile,            setProfile]            = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [isEditing,          setIsEditing]          = useState(false);
  const [form,               setForm]               = useState({});
  const [saving,             setSaving]             = useState(false);
  const [saveError,          setSaveError]          = useState('');
  const [editingImageTarget, setEditingImageTarget] = useState(null);
  const [logoFullUrl,        setLogoFullUrl]        = useState(null);
  const [logoCroppedUrl,     setLogoCroppedUrl]     = useState(null);
  const [bannerFullUrl,      setBannerFullUrl]      = useState(null);
  const [bannerCroppedUrl,   setBannerCroppedUrl]   = useState(null);
  const { toasts, toast, dismiss } = useToast();

  const diffInputRef    = useRef(null);
  const trustedInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: orgData, error: orgError } = await supabase
      .from('master_organization_entities')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (orgError || !orgData) { setLoading(false); return; }

    const { data: detailsData } = await supabase
      .from('organization_details')
      .select('profile_picture_url, banner_picture_url, cropped_profile_picture_url, cropped_banner_picture_url, Status, subscription, email_id')
      .eq('user_id', orgData.user_id)
      .maybeSingle();

    setProfile({ ...orgData, details: detailsData || {} });
    setLogoFullUrl(detailsData?.profile_picture_url || null);
    setLogoCroppedUrl(detailsData?.cropped_profile_picture_url || null);
    setBannerFullUrl(detailsData?.banner_picture_url || null);
    setBannerCroppedUrl(detailsData?.cropped_banner_picture_url || null);
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
      leadership:    Array.isArray(profile.leadership)    ? profile.leadership.map((p) => ({ ...p }))    : [],
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
    const isLogo = editingImageTarget === 'logo';
    if (isLogo) {
      if (result.fullUrl)    setLogoFullUrl(result.fullUrl);
      if (result.croppedUrl) setLogoCroppedUrl(result.croppedUrl);
    } else {
      if (result.fullUrl)    setBannerFullUrl(result.fullUrl);
      if (result.croppedUrl) setBannerCroppedUrl(result.croppedUrl);
    }
    toast(`${isLogo ? 'Logo' : 'Banner'} image updated successfully`, 'success');
  };

  const handleImageDelete = async () => {
    const isLogo = editingImageTarget === 'logo';
    const urlsToDelete = isLogo ? [logoFullUrl, logoCroppedUrl] : [bannerFullUrl, bannerCroppedUrl];
    const files = urlsToDelete.filter(Boolean).map(extractStorageFile).filter(Boolean);
    const byBucket = files.reduce((acc, { bucket, filePath }) => {
      acc[bucket] = acc[bucket] || [];
      acc[bucket].push(filePath);
      return acc;
    }, {});
    for (const [bucket, filePaths] of Object.entries(byBucket)) {
      try { await supabase.storage.from(bucket).remove(filePaths); } catch (_) {}
    }
    if (isLogo) {
      await updateAdminProfile({ userId: profile.user_id, updateData: { profile_picture_url: null, cropped_profile_picture_url: null }, table: 'organization_details' });
      await updateAdminProfile({ userId: profile.user_id, updateData: { image_url: null }, table: 'master_organization_entities' });
      setLogoFullUrl(null); setLogoCroppedUrl(null);
    } else {
      await updateAdminProfile({ userId: profile.user_id, updateData: { banner_picture_url: null, cropped_banner_picture_url: null }, table: 'organization_details' });
      setBannerFullUrl(null); setBannerCroppedUrl(null);
    }
    setEditingImageTarget(null);
    toast(`${isLogo ? 'Logo' : 'Banner'} image removed`, 'info');
  };

  // ── Loading / not found ──
  if (loading) return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading profile...</div>;
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

  const leadership = (profile.leadership || []).map((person) => ({
    ...person,
    image:     person.image     || person.image_url || null,
    verified:  person.verified  !== undefined ? person.verified : true,
    score:     person.score     || person.authority_score || null,
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
            onClick={() => setEditingImageTarget('logo')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Edit Logo
          </button>
        </div>
      )}

      {/* ── Image Editor Modal ── */}
      {editingImageTarget && (
        <ImageEditor
          key={`${profile.user_id}-${editingImageTarget}`}
          isOpen={!!editingImageTarget}
          onClose={() => setEditingImageTarget(null)}
          currentImageUrl={editingImageTarget === 'logo' ? (logoCroppedUrl || logoFullUrl) : (bannerCroppedUrl || bannerFullUrl)}
          oldFullUrl={editingImageTarget === 'logo' ? logoFullUrl : bannerFullUrl}
          oldCroppedUrl={editingImageTarget === 'logo' ? logoCroppedUrl : bannerCroppedUrl}
          userId={profile.user_id}
          onSave={handleImageSave}
          onDelete={handleImageDelete}
          tableName="organization_details"
          columnName={editingImageTarget === 'logo' ? 'profile_picture_url' : 'banner_picture_url'}
          croppedColumnName={editingImageTarget === 'logo' ? 'cropped_profile_picture_url' : 'cropped_banner_picture_url'}
          cropMode={true}
          cropWidth={editingImageTarget === 'logo' ? 480 : 960}
          cropHeight={300}
          syncTableName={editingImageTarget === 'logo' ? 'master_organization_entities' : undefined}
          syncColumnName={editingImageTarget === 'logo' ? 'image_url' : undefined}
          title={editingImageTarget === 'logo' ? 'Edit Logo Image' : 'Edit Banner Image'}
          description={editingImageTarget === 'logo'
            ? 'Upload and crop the organization logo. Used in Lexicon cards and the profile header.'
            : 'Upload and crop the banner image. Maintains wide banner ratio.'
          }
        />
      )}

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
                    <div key={i} className="op-stat-card" style={{ animationDelay: `${i * 60}ms` }}>
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
          SECTION 3 — Trusted By (premium or editing)
          ════════════════════════════════════════════════ */}
      {(features.trustedOrganizations || isEditing) && (trustedOrganizations.length > 0 || isEditing) && (
        <section className={`op-section op-trusted-section op-reveal ${isEditing ? 'op-edit-section-wrap' : ''}`}>
          <div className="op-container">
            {isEditing ? (
              <>
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
              </>
            ) : (
              <>
                <h2 className="op-section-title">Trusted by Leading Organizations</h2>
                <div className="op-trusted-chips">
                  {trustedOrganizations.map((name, i) => <span key={i} className="op-trusted-chip">{name}</span>)}
                </div>
              </>
            )}
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
                <div className="op-story-content">
                  {org.story.mission && (
                    <div className="op-story-block">
                      <span className="op-story-label">Mission</span>
                      <p className="op-story-text">{org.story.mission}</p>
                    </div>
                  )}
                  {org.story.vision && (
                    <div className="op-story-block">
                      <span className="op-story-label">Vision</span>
                      <p className="op-story-text">{org.story.vision}</p>
                    </div>
                  )}
                  {org.story.marketPositioning && (
                    <div className="op-story-block">
                      <span className="op-story-label">Market Positioning</span>
                      <p className="op-story-text">{org.story.marketPositioning}</p>
                    </div>
                  )}
                  {org.story.differentiators.length > 0 && (
                    <div className="op-story-block">
                      <span className="op-story-label">Key Differentiators</span>
                      <ul className="op-story-diff-list">
                        {org.story.differentiators.map((d, i) => (
                          <li key={i} className="op-story-diff-item">
                            <span className="op-story-diff-icon"><Check size={13} /></span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
                  <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
                </div>
                <div className="op-edit-cards">
                  {(form.leadership || []).map((person, i) => (
                    <div key={i} className="op-edit-card">
                      <button className="op-edit-card-remove" onClick={() => sfRemove('leadership', i)}>&times;</button>
                      <div className="op-inline-grid">
                        <div className="op-inline-field">
                          <label className="op-inline-label">Name</label>
                          <input className="op-inline-input" value={person.name || ''} onChange={(e) => sfUpdateObj('leadership', i, 'name', e.target.value)} placeholder="e.g. Jane Smith" />
                        </div>
                        <div className="op-inline-field">
                          <label className="op-inline-label">Role / Title</label>
                          <input className="op-inline-input" value={person.role || ''} onChange={(e) => sfUpdateObj('leadership', i, 'role', e.target.value)} placeholder="e.g. Co-Founder & CEO" />
                        </div>
                        <div className="op-inline-field op-inline-grid--full">
                          <label className="op-inline-label">Expertise / Bio</label>
                          <input className="op-inline-input" value={person.expertise || ''} onChange={(e) => sfUpdateObj('leadership', i, 'expertise', e.target.value)} placeholder="e.g. 20 years in enterprise SaaS" />
                        </div>
                        <div className="op-inline-field">
                          <label className="op-inline-label">Photo URL</label>
                          <input className="op-inline-input" type="url" value={person.image || ''} onChange={(e) => sfUpdateObj('leadership', i, 'image', e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="op-inline-field">
                          <label className="op-inline-label">Authority Score</label>
                          <input className="op-inline-input" type="number" value={person.score || ''} onChange={(e) => sfUpdateObj('leadership', i, 'score', e.target.value)} placeholder="e.g. 78" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="op-edit-add-btn" onClick={() => sfAddObj('leadership', { name: '', role: '', expertise: '', image: '', score: '', verified: true })}>
                  + Add Person
                </button>
              </>
            ) : (
              <>
                <h2 className="op-section-title">Leadership &amp; Key People</h2>
                <p className="op-section-subtitle">Verified individuals connected to this organization</p>
                <div className="op-leadership-grid">
                  {org.leadership.map((person, i) => <ProfileCard key={i} person={person} />)}
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

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default OrganizationProfile;
