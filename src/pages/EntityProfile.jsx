import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import { trackProfileEvent } from '../lib/profileAnalytics';
import ShareModal from '../components/ShareModal';
import ImageEditor, { extractStorageFile } from '../components/ImageEditor';
import ToastContainer, { useToast } from '../components/Toast';
import { generateJsonLd } from '../utils/jsonLdGenerator';
import './EntityProfile.css';

// ============ PREMIUM FEATURE CONFIG ============
const PREMIUM_MOCK_DATA = {
  featured_content: {
    title: 'The Future of AI Ethics in Corporate Governance',
    excerpt: 'Leading AI ethics consulting and framework development for enterprise organizations building responsible AI systems.',
    image_url: null,
    article_url: '#',
    highlight_quote: 'Only AI ethics consultancy led by Stanford PhD researchers with direct policy advisory experience',
    why_choose: 'We help organizations build AI systems that are not just powerful, but trustworthy and aligned with human values.',
    key_benefits: [
      'Industry-leading AI ethics frameworks',
      'Trusted by Fortune 500 companies',
      'Proven track record in compliance',
    ],
    publisher: 'Harvard Business Review',
    date: 'March 2026',
  },
  twitter_url: 'https://twitter.com',
  subscribe_url: '#',
};

const VerifiedBadge = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="profile-verified-icon">
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

const PencilIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const getInitials = (value) =>
  (value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'NA';

const SafeImage = ({ src, alt, className, fallbackClassName, fallbackText }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  if (!src || imageError) {
    return (
      <div className={fallbackClassName} aria-label={`${alt} fallback`}>
        <span>{fallbackText}</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setImageError(true)} />;
};

const getYouTubeThumbnail = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
  }
  return null;
};

const getEmbedUrl = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  if (url.includes('vimeo.com/')) return url.replace('vimeo.com/', 'player.vimeo.com/video/');
  return url;
};

const formatViews = (views) => {
  if (!views) return '0';
  if (typeof views === 'number') {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toLocaleString();
  }
  return views;
};

const isMissingSlugColumnError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('entity_slug') && message.includes('column');
};

const EntityProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const { toasts, toast, dismiss } = useToast();
  const [lexiconFullUrl, setLexiconFullUrl] = useState(null);
  const [lexiconCroppedUrl, setLexiconCroppedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggested, setSuggested] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingImageTarget, setEditingImageTarget] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const observedSectionsRef = useRef(new Set());
  const trustTagInputRef = useRef(null);
  const [inlineBenefitInput, setInlineBenefitInput] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (!profile) return;
    const jsonLd = generateJsonLd(profile);
    if (!jsonLd) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    script.id = 'profile-jsonld';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('profile-jsonld');
      if (existing) existing.remove();
    };
  }, [profile]);

  useEffect(() => {
    setSelectedPhoto(0);
  }, [lexiconFullUrl]);

  useEffect(() => {
    if (!profile?.user_id) return;
    trackProfileEvent({
      profileId: profile.user_id,
      eventType: 'profile_view',
      metadata: { entity_slug: profile.entity_slug || null },
    });
  }, [profile?.user_id, profile?.entity_slug]);

  useEffect(() => {
    if (!profile?.user_id) return;
    observedSectionsRef.current = new Set();
    const elements = document.querySelectorAll('[data-analytics-section]');
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
          const sectionKey = entry.target.getAttribute('data-analytics-section');
          if (!sectionKey || observedSectionsRef.current.has(sectionKey)) return;
          observedSectionsRef.current.add(sectionKey);
          trackProfileEvent({ profileId: profile.user_id, eventType: 'section_view', sectionKey });
        });
      },
      { threshold: [0.55] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [profile?.user_id]);

  const trackClick = (sectionKey, metadata = {}) => {
    if (!profile?.user_id) return;
    trackProfileEvent({ profileId: profile.user_id, eventType: 'click', sectionKey, metadata });
  };

  const fetchProfile = async () => {
    setLoading(true);

    let profileResult = await supabase
      .from('entities_master')
      .select('*')
      .or(`entity_slug.eq.${id},user_id.eq.${id}`)
      .single();

    if (profileResult.error && isMissingSlugColumnError(profileResult.error)) {
      profileResult = await supabase.from('entities_master').select('*').eq('user_id', id).single();
    }

    const { data, error } = profileResult;

    if (!error && data) {
      setProfile(data);
      const { data: userDetails } = await supabase
        .from('user_details')
        .select('photo_url, cropped_photo_url')
        .eq('user_id', data.user_id)
        .maybeSingle();

      setLexiconFullUrl(userDetails?.photo_url || null);
      setLexiconCroppedUrl(userDetails?.cropped_photo_url || null);

      if (data.entity_slug && id !== data.entity_slug) {
        navigate(`/entity/${data.entity_slug}`, { replace: true });
      }

      let suggestedResult = await supabase
        .from('entities_master')
        .select('user_id, entity_slug, name, role, authority_score, image_url')
        .neq('user_id', data.user_id)
        .limit(3);

      if (suggestedResult.error && isMissingSlugColumnError(suggestedResult.error)) {
        suggestedResult = await supabase
          .from('entities_master')
          .select('user_id, name, role, authority_score, image_url')
          .neq('user_id', data.user_id)
          .limit(3);
      }

      const { data: suggestedData } = suggestedResult;
      if (suggestedData) setSuggested(suggestedData);
    }

    setLoading(false);
  };

  // ── Edit helpers ──
  const sf = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const sfUpdateObj = (key, idx, field, val) =>
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...prev, [key]: arr };
    });

  const sfAddObj = (key, template) =>
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));

  const sfRemove = (key, idx) =>
    setForm((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));

  const sfUpdateAuthority = (key, value, max) => {
    let numValue = Number(value);
    if (isNaN(numValue)) numValue = 0;
    if (numValue < 0) numValue = 0;
    if (numValue > max) numValue = max;
    setForm((prev) => {
      const newForm = { ...prev, [key]: numValue };
      const linkedin     = key === 'linkedin_presence'       ? numValue : Number(prev.linkedin_presence       || 0);
      const media        = key === 'media_presence'          ? numValue : Number(prev.media_presence          || 0);
      const digital      = key === 'digital_presence'        ? numValue : Number(prev.digital_presence        || 0);
      const credibility  = key === 'professional_credibility'? numValue : Number(prev.professional_credibility|| 0);
      const content      = key === 'content_activity'        ? numValue : Number(prev.content_activity        || 0);
      newForm.authority_score = linkedin + media + digital + credibility + content;
      return newForm;
    });
  };

  const sfAddTag = () => {
    const val = trustTagInputRef.current?.value?.trim();
    if (!val) return;
    sf('trust_tags', [...(form.trust_tags || []), { name: val, type: 'outline-blue' }]);
    if (trustTagInputRef.current) trustTagInputRef.current.value = '';
  };

  const sfRemoveTag = (idx) =>
    sf('trust_tags', (form.trust_tags || []).filter((_, i) => i !== idx));

  const sfUpdateFeatured = (field, value) =>
    setForm((prev) => ({
      ...prev,
      featured_content: { ...(prev.featured_content || {}), [field]: value },
    }));

  const sfAddBenefit = () => {
    if (!inlineBenefitInput.trim()) return;
    const benefits = form.featured_content?.key_benefits || [];
    sfUpdateFeatured('key_benefits', [...benefits, inlineBenefitInput.trim()]);
    setInlineBenefitInput('');
  };

  const sfRemoveBenefit = (i) => {
    const benefits = [...(form.featured_content?.key_benefits || [])];
    benefits.splice(i, 1);
    sfUpdateFeatured('key_benefits', benefits);
  };

  const handleEditStart = () => {
    if (!profile) return;
    setForm({
      name:                   profile.name                   || '',
      role:                   profile.role                   || '',
      subtitle:               profile.subtitle               || '',
      bio:                    profile.bio                    || '',
      location:               profile.location               || '',
      sector:                 profile.sector                 || '',
      company:                profile.company                || '',
      status:                 profile.status                 || '',
      active_since:           profile.active_since           || '',
      linkedin_url:           profile.linkedin_url           || '',
      website_url:            profile.website_url            || '',
      trust_tags:             Array.isArray(profile.trust_tags)   ? profile.trust_tags.map((t) => ({ ...t })) : [],
      awards:                 Array.isArray(profile.awards)       ? profile.awards.map((a) => ({ ...a })) : [],
      videos:                 Array.isArray(profile.videos)       ? profile.videos.map((v) => ({ ...v })) : [],
      publications:           Array.isArray(profile.publications) ? profile.publications.map((p) => ({ ...p })) : [],
      quick_facts:            Array.isArray(profile.quick_facts)  ? profile.quick_facts.map((f) => ({ ...f })) : [],
      authority_score:        profile.authority_score        || 0,
      authority_percentile:   profile.authority_percentile   || '',
      linkedin_presence:      profile.linkedin_presence      || 0,
      media_presence:         profile.media_presence         || 0,
      digital_presence:       profile.digital_presence       || 0,
      professional_credibility: profile.professional_credibility || 0,
      content_activity:       profile.content_activity       || 0,
      featured_content: profile.featured_content
        ? {
            ...profile.featured_content,
            key_benefits: Array.isArray(profile.featured_content.key_benefits)
              ? [...profile.featured_content.key_benefits]
              : [],
          }
        : { excerpt: '', article_url: '', image_url: '', highlight_quote: '', why_choose: '', key_benefits: [] },
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
      const updateData = {
        name:                   form.name,
        role:                   form.role,
        subtitle:               form.subtitle,
        bio:                    form.bio,
        location:               form.location,
        sector:                 form.sector,
        company:                form.company,
        status:                 form.status,
        active_since:           form.active_since,
        linkedin_url:           form.linkedin_url,
        website_url:            form.website_url,
        trust_tags:             form.trust_tags,
        awards:                 form.awards,
        videos:                 form.videos,
        publications:           form.publications,
        quick_facts:            form.quick_facts,
        authority_score:        form.authority_score,
        authority_percentile:   form.authority_percentile,
        linkedin_presence:      form.linkedin_presence,
        media_presence:         form.media_presence,
        digital_presence:       form.digital_presence,
        professional_credibility: form.professional_credibility,
        content_activity:       form.content_activity,
        featured_content:       form.featured_content,
      };
      await updateAdminProfile({ userId: profile.user_id, updateData });
      setProfile((prev) => ({ ...prev, ...updateData }));
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
    if (editingImageTarget === 'profile') {
      setProfile((prev) => ({ ...prev, image_url: result }));
    } else if (editingImageTarget === 'hq') {
      const url = typeof result === 'string' ? result : (result.fullUrl || result.croppedUrl || result);
      setProfile((prev) => ({ ...prev, hq_image_url: url }));
    } else {
      if (result.fullUrl) {
        setLexiconFullUrl(result.fullUrl);
        setProfile((prev) => ({ ...prev, image_url: result.fullUrl }));
      }
      if (result.croppedUrl) setLexiconCroppedUrl(result.croppedUrl);
    }
    toast('Image updated successfully', 'success');
  };

  const handleImageDelete = async () => {
    try {
      let urlsToDelete = [];
      if (editingImageTarget === 'profile') {
        urlsToDelete = [profile?.image_url];
      } else if (editingImageTarget === 'hq') {
        urlsToDelete = [profile?.hq_image_url];
      } else {
        urlsToDelete = [lexiconFullUrl, lexiconCroppedUrl, profile?.image_url];
      }

      const files = urlsToDelete.filter(Boolean).map(extractStorageFile).filter(Boolean);
      const byBucket = files.reduce((acc, { bucket, filePath }) => {
        acc[bucket] = acc[bucket] || [];
        acc[bucket].push(filePath);
        return acc;
      }, {});

      for (const [bucket, filePaths] of Object.entries(byBucket)) {
        try { await supabase.storage.from(bucket).remove(filePaths); } catch (e) { console.warn(e.message); }
      }

      if (editingImageTarget === 'profile') {
        await updateAdminProfile({ userId: profile.user_id, updateData: { image_url: null }, table: 'entities_master' });
        setProfile((prev) => ({ ...prev, image_url: null }));
      } else if (editingImageTarget === 'hq') {
        await updateAdminProfile({ userId: profile.user_id, updateData: { hq_image_url: null }, table: 'entities_master' });
        setProfile((prev) => ({ ...prev, hq_image_url: null }));
      } else {
        await updateAdminProfile({ userId: profile.user_id, updateData: { photo_url: null, cropped_photo_url: null }, table: 'user_details' });
        await updateAdminProfile({ userId: profile.user_id, updateData: { image_url: null }, table: 'entities_master' });
        setLexiconFullUrl(null);
        setLexiconCroppedUrl(null);
        setProfile((prev) => ({ ...prev, image_url: null }));
      }
      setEditingImageTarget(null);
      toast('Image removed', 'info');
    } catch (err) {
      console.error('Failed to delete image:', err);
      toast(`Failed to remove image: ${err.message}`, 'error');
      throw err;
    }
  };

  if (loading) return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading profile...</div>;
  if (!profile) return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Profile not found.</div>;

  const trustTags   = isEditing ? (form.trust_tags   || []) : (profile.trust_tags   || []);
  const awards      = isEditing ? (form.awards        || []) : (profile.awards        || []);
  const videos      = isEditing ? (form.videos        || []) : (profile.videos        || []);
  const pubs        = isEditing ? (form.publications  || []) : (profile.publications  || []);
  const quickFacts  = isEditing ? (form.quick_facts   || []) : (profile.quick_facts   || []);

  const photos = [lexiconFullUrl].filter(Boolean);
  const lastUpdated = profile.updated_at
    ? new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const isPremium = !!profile.is_premium;
  const featuredContent = profile.featured_content || (isPremium ? PREMIUM_MOCK_DATA.featured_content : null);
  const twitterUrl = profile.twitter_url || (isPremium ? PREMIUM_MOCK_DATA.twitter_url : null);
  const subscribeUrl = profile.subscribe_url || (isPremium ? PREMIUM_MOCK_DATA.subscribe_url : null);

  return (
    <div className={`profile-page${isPremium ? ' profile-page--premium' : ''}`}>

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </button>
          <button
            className="admin-edit-btn"
            style={{ marginLeft: '12px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={() => setEditingImageTarget('card')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Edit Card Image
          </button>
        </div>
      )}

      {/* ── Image Editor Modal ── */}
      {editingImageTarget && (
        <ImageEditor
          key={`${profile.user_id}-${editingImageTarget}-${(
            editingImageTarget === 'profile' ? (profile.image_url || profile.hero_image_url || profile.hq_image_url) :
            editingImageTarget === 'hq'      ? profile.hq_image_url :
            (lexiconCroppedUrl || lexiconFullUrl || profile.image_url)
          ) || 'empty'}`}
          isOpen={!!editingImageTarget}
          onClose={() => setEditingImageTarget(null)}
          currentImageUrl={
            editingImageTarget === 'profile' ? (profile.image_url || profile.hero_image_url || profile.hq_image_url) :
            editingImageTarget === 'hq'      ? profile.hq_image_url :
            (lexiconCroppedUrl || lexiconFullUrl || profile.image_url)
          }
          oldFullUrl={
            editingImageTarget === 'profile' || editingImageTarget === 'hq'
              ? null
              : (lexiconFullUrl || profile.image_url)
          }
          oldCroppedUrl={
            editingImageTarget === 'profile' || editingImageTarget === 'hq'
              ? null
              : lexiconCroppedUrl
          }
          userId={profile.user_id}
          onSave={handleImageSave}
          onDelete={handleImageDelete}
          tableName={
            editingImageTarget === 'profile' || editingImageTarget === 'hq'
              ? 'entities_master'
              : 'user_details'
          }
          columnName={
            editingImageTarget === 'profile' ? 'image_url' :
            editingImageTarget === 'hq'      ? 'hq_image_url' :
            'photo_url'
          }
          title={
            editingImageTarget === 'profile' ? 'Upload Profile Image' :
            editingImageTarget === 'hq'      ? 'Upload Company HQ Image' :
            'Edit Card Image'
          }
          description={
            editingImageTarget === 'profile' ? 'Upload the main hero image for this entity profile.' :
            editingImageTarget === 'hq'      ? 'Upload a photo of the company headquarters or office. Shown in the Company Headquarters card on standard profiles.' :
            'Upload your photo. We will save both the full-resolution image and the cropped card version.'
          }
        />
      )}

      {/* ════════════════════════════════════════════════
          SECTION 1 — Hero
          ════════════════════════════════════════════════ */}
      <section className={`profile-hero ${isEditing ? 'op-edit-section-wrap' : ''}`} data-analytics-section="profile_header">

        {/* Left: profile image (always shown) */}
        <div className="profile-image-container">
          <SafeImage
            src={photos[selectedPhoto]}
            alt={profile.name}
            className="profile-hero-image"
            fallbackClassName="profile-image-fallback"
            fallbackText={getInitials(profile.name)}
          />

          <button
            className="profile-image-edit-fab"
            onClick={() => setEditingImageTarget('card')}
            aria-label="Edit Profile Photo"
            title="Edit Profile Photo"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {(profile.badge === 'verified' || profile.badge === 'claimed') && (
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
          {photos.length > 1 && (
            <div className="photo-indicators">
              {photos.map((_, i) => (
                <div key={i} className={`photo-indicator ${i === selectedPhoto ? 'active' : ''}`} onClick={() => setSelectedPhoto(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Right: profile info */}
        <div className="profile-info">
          {isEditing ? (
            <>
              <div className="op-section-edit-title-row" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Basic Information</span>
                <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
              </div>

              {/* Basic Info */}
              <div className="op-inline-grid" style={{ marginBottom: 14 }}>
                <div className="op-inline-field">
                  <label className="op-inline-label">Name</label>
                  <input className="op-inline-input" value={form.name || ''} onChange={(e) => sf('name', e.target.value)} placeholder="e.g. John Doe" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Role</label>
                  <input className="op-inline-input" value={form.role || ''} onChange={(e) => sf('role', e.target.value)} placeholder="e.g. Chief Executive Officer" />
                </div>
                <div className="op-inline-field op-inline-grid--full">
                  <label className="op-inline-label">Subtitle</label>
                  <input className="op-inline-input" value={form.subtitle || ''} onChange={(e) => sf('subtitle', e.target.value)} placeholder="e.g. Tech Visionary & Innovator" />
                </div>
                <div className="op-inline-field op-inline-grid--full">
                  <label className="op-inline-label">Biography</label>
                  <textarea className="op-inline-textarea" rows={4} value={form.bio || ''} onChange={(e) => sf('bio', e.target.value)} placeholder="e.g. An experienced leader..." />
                </div>
              </div>

              {/* Details */}
              <div className="op-section-edit-title-row" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Details</span>
              </div>
              <div className="op-inline-grid" style={{ marginBottom: 14 }}>
                <div className="op-inline-field">
                  <label className="op-inline-label">Location</label>
                  <input className="op-inline-input" value={form.location || ''} onChange={(e) => sf('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Sector</label>
                  <input className="op-inline-input" value={form.sector || ''} onChange={(e) => sf('sector', e.target.value)} placeholder="e.g. Technology" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Company</label>
                  <input className="op-inline-input" value={form.company || ''} onChange={(e) => sf('company', e.target.value)} placeholder="e.g. Acme Corp" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Status</label>
                  <input className="op-inline-input" value={form.status || ''} onChange={(e) => sf('status', e.target.value)} placeholder="e.g. Active" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Active Since</label>
                  <input className="op-inline-input" value={form.active_since || ''} onChange={(e) => sf('active_since', e.target.value)} placeholder="e.g. 2010" />
                </div>
              </div>

              {/* Social Links */}
              <div className="op-section-edit-title-row" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Social Links</span>
              </div>
              <div className="op-inline-grid" style={{ marginBottom: 14 }}>
                <div className="op-inline-field">
                  <label className="op-inline-label">LinkedIn URL</label>
                  <input className="op-inline-input" type="url" value={form.linkedin_url || ''} onChange={(e) => sf('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Website URL</label>
                  <input className="op-inline-input" type="url" value={form.website_url || ''} onChange={(e) => sf('website_url', e.target.value)} placeholder="https://..." />
                </div>
              </div>

              {/* Trust Tags */}
              <div className="op-section-edit-title-row" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Trust Tags</span>
              </div>
              <div className="op-trusted-edit-wrap" style={{ marginBottom: 8 }}>
                {(form.trust_tags || []).map((tag, i) => (
                  <span key={i} className="op-trusted-edit-chip">
                    {tag.name}
                    <button onClick={() => sfRemoveTag(i)}>&times;</button>
                  </span>
                ))}
              </div>
              <div className="op-trusted-add-row" style={{ marginBottom: 14 }}>
                <input
                  ref={trustTagInputRef}
                  placeholder="Type tag and press Enter or click + Add..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sfAddTag(); } }}
                />
                <button onClick={sfAddTag}>+ Add</button>
              </div>

              {/* Authority Intelligence */}
              <div className="op-section-edit-title-row" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Authority Intelligence</span>
              </div>
              <div className="op-inline-grid">
                <div className="op-inline-field">
                  <label className="op-inline-label">Authority Score (auto)</label>
                  <input className="op-inline-input ep-readonly-authority" type="number" value={form.authority_score || 0} readOnly title="Calculated automatically" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Authority Percentile</label>
                  <input className="op-inline-input" value={form.authority_percentile || ''} onChange={(e) => sf('authority_percentile', e.target.value)} placeholder="e.g. Top 1%" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">LinkedIn Presence (max 25)</label>
                  <input className="op-inline-input" type="number" value={form.linkedin_presence || 0} onChange={(e) => sfUpdateAuthority('linkedin_presence', e.target.value, 25)} min="0" max="25" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Media Presence (max 20)</label>
                  <input className="op-inline-input" type="number" value={form.media_presence || 0} onChange={(e) => sfUpdateAuthority('media_presence', e.target.value, 20)} min="0" max="20" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Digital Presence (max 15)</label>
                  <input className="op-inline-input" type="number" value={form.digital_presence || 0} onChange={(e) => sfUpdateAuthority('digital_presence', e.target.value, 15)} min="0" max="15" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Prof. Credibility (max 15)</label>
                  <input className="op-inline-input" type="number" value={form.professional_credibility || 0} onChange={(e) => sfUpdateAuthority('professional_credibility', e.target.value, 15)} min="0" max="15" />
                </div>
                <div className="op-inline-field">
                  <label className="op-inline-label">Content Activity (max 25)</label>
                  <input className="op-inline-input" type="number" value={form.content_activity || 0} onChange={(e) => sfUpdateAuthority('content_activity', e.target.value, 25)} min="0" max="25" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="profile-name-row">
                <h1 style={{ color: '#1E3A5F' }}>{profile.name}</h1>
                {(profile.badge === 'verified' || profile.badge === 'claimed') && <VerifiedBadge />}
                {profile.is_premium && (
                  <div className="profile-premium-badge" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(255,165,0,0.35)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Premium
                  </div>
                )}
                <button
                  className="profile-share-icon-btn"
                  onClick={() => { trackClick('profile_header', { action: 'open_share_modal' }); setShowShareModal(true); }}
                  aria-label="Share Profile"
                  title="Share Profile"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
              <div className="profile-role">{profile.role}</div>
              <div className="profile-subtitle">{profile.subtitle}</div>

              <div className="profile-trust-card" data-analytics-section="trust_verification">
                <div className="profile-section-label">Trust & Verification</div>
                <div className="profile-trust-tags">
                  {trustTags.map((tag, i) => (
                    <span key={i} className={`trust-tag ${tag.type === 'verified' ? 'verified' : tag.type === 'outline-blue' ? 'outline-blue' : tag.type === 'outline-cyan' ? 'outline-cyan' : ''}`}>
                      {tag.type === 'verified' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      )}
                      {tag.name}
                    </span>
                  ))}
                </div>
                <div className="profile-trust-details">
                  <div className="trust-detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    Sector: <span>{profile.sector}</span>
                  </div>
                  <div className="trust-detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="21.17" y1="8" x2="12" y2="8" /><line x1="3.95" y1="6.06" x2="8.54" y2="14" /><line x1="10.88" y1="21.94" x2="15.46" y2="14" /></svg>
                    Location: <span>{profile.location}</span>
                  </div>
                  <div className="trust-detail-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Last Updated: <span>{lastUpdated}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section-label">Biography</div>
              <div className="profile-bio" data-analytics-section="biography">
                <p>{profile.bio}</p>
              </div>

              <div className="profile-authority-card" data-analytics-section="authority_score">
                <div className="authority-header">
                  <div className="authority-header-left">
                    <div className="authority-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    </div>
                    <div>
                      <h3>Authority Intelligence</h3>
                      <p>Exceptional Authority &bull; {profile.authority_percentile} in {profile.sector}</p>
                    </div>
                  </div>
                  <div className="authority-score-big">
                    <div className="score-num">{profile.authority_score}</div>
                    <div className="score-label">Overall</div>
                  </div>
                </div>
                <div className="authority-bars">
                  {[
                    { label: 'LinkedIn Presence',       value: profile.linkedin_presence       || 0, max: 25 },
                    { label: 'Media Presence',           value: profile.media_presence          || 0, max: 20 },
                    { label: 'Digital Presence',         value: profile.digital_presence        || 0, max: 15 },
                    { label: 'Professional Credibility', value: profile.professional_credibility || 0, max: 15 },
                    { label: 'Content Activity',         value: profile.content_activity        || 0, max: 25 },
                  ].map((bar, i) => (
                    <div className="authority-bar-row" key={i}>
                      <span className="authority-bar-label">{bar.label}</span>
                      <div className="authority-bar-track"><div className="authority-bar-fill" style={{ width: `${(bar.value / bar.max) * 100}%` }}></div></div>
                      <span className="authority-bar-value">{bar.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connect & Follow */}
              <div className="cf-panel" data-analytics-section="connect_follow">
                <div className="cf-header">
                  <div>
                    <div className="cf-title">Connect &amp; Follow</div>
                    <div className="cf-subtitle">Verified links to official websites, social channels, and media platforms.</div>
                  </div>
                  <span className="cf-verified-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Verified Channels
                  </span>
                </div>
                <div className="cf-grid">
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--website" onClick={() => trackClick('connect_follow', { action: 'click', target: 'website' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      Website
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--linkedin" onClick={() => trackClick('connect_follow', { action: 'click', target: 'linkedin' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {profile.facebook_url && (
                    <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--facebook" onClick={() => trackClick('connect_follow', { action: 'click', target: 'facebook' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                      Facebook
                    </a>
                  )}
                  {profile.instagram_url && (
                    <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--instagram" onClick={() => trackClick('connect_follow', { action: 'click', target: 'instagram' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                      Instagram
                    </a>
                  )}
                  {twitterUrl && (
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--twitter" onClick={() => trackClick('connect_follow', { action: 'click', target: 'twitter' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      X
                    </a>
                  )}
                  {profile.youtube_url && (
                    <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--youtube" onClick={() => trackClick('connect_follow', { action: 'click', target: 'youtube' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                      YouTube
                    </a>
                  )}
                  {profile.medium_url && (
                    <a href={profile.medium_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--medium" onClick={() => trackClick('connect_follow', { action: 'click', target: 'medium' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                      Medium
                    </a>
                  )}
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--github" onClick={() => trackClick('connect_follow', { action: 'click', target: 'github' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                      GitHub
                    </a>
                  )}
                  {profile.wikipedia_url && (
                    <a href={profile.wikipedia_url} target="_blank" rel="noopener noreferrer" className="cf-pill cf-pill--wiki" onClick={() => trackClick('connect_follow', { action: 'click', target: 'wikipedia' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Wikipedia
                    </a>
                  )}
                  {isPremium && subscribeUrl && (
                    <a href={subscribeUrl} className="cf-pill cf-pill--podcast" onClick={() => trackClick('connect_follow', { action: 'click', target: 'podcast' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="11" r="3"/><path d="M12 1a9 9 0 0 1 9 9c0 3.87-2.57 8.07-7.72 12.4a.5.5 0 0 1-.56 0C7.57 18.07 3 13.87 3 10a9 9 0 0 1 9-9z"/></svg>
                      Podcast
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Share Modal ── */}
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} profile={profile} />

      {/* Last Updated Meta */}
      {!isEditing && lastUpdated && (
        <div className="profile-last-updated">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          By: {profile.name} &bull; Last updated: {lastUpdated} &bull; Profile ID: {profile.user_id?.slice(0, 8)}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 2 — Grid (Featured Service/HQ + Primary Entity) — display only
          ════════════════════════════════════════════════ */}
      {!isEditing && (
        <section className="profile-grid-2">
          {/* Left Column: Featured Service (premium) OR HQ (standard) */}
          {isPremium && featuredContent ? (
            <div className="profile-featured-service" data-analytics-section="featured_content">
              {/* PREMIUM SHOWCASE badge */}
              <div className="fs-showcase-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                PREMIUM SHOWCASE
              </div>

              {/* Section Title */}
              <div className="fs-title-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <h3 className="fs-title">Featured Service</h3>
              </div>

              {/* Two-column: Info card + Image */}
              <div className="fs-body">
                <div className="fs-info-card">
                  <div className="fs-company-name">{profile.company || profile.name}</div>
                  <div className="fs-meta-grid">
                    <div className="fs-meta-item"><span className="fs-meta-label">Sector:</span> <strong>{profile.sector}</strong></div>
                    <div className="fs-meta-item"><span className="fs-meta-label">Location:</span> <strong>{profile.location}</strong></div>
                    {profile.website_url && <div className="fs-meta-item"><span className="fs-meta-label">Website:</span> <a href={profile.website_url} className="fs-website-link" target="_blank" rel="noopener noreferrer">{profile.website_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}</a></div>}
                    <div className="fs-meta-item"><span className="fs-meta-label">Status:</span> <strong style={{textTransform:'capitalize'}}>{profile.status || 'Active'}</strong></div>
                  </div>
                  <p className="fs-description">{featuredContent.excerpt}</p>
                </div>
                <div className="fs-image-wrap">
                  <SafeImage
                    src={featuredContent.image_url || profile.hq_image_url}
                    alt="Featured service"
                    className="fs-image"
                    fallbackClassName="fs-image-fallback"
                    fallbackText={getInitials(profile.name)}
                  />
                  <div className="fs-img-overlay-top">Premium Showcase</div>
                  <div className="fs-img-overlay-bottom">
                    <span className="fs-img-badge fs-img-badge--verified">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Verified Business
                    </span>
                    <span className="fs-img-badge fs-img-badge--premium">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Premium Profile
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Benefits */}
              {featuredContent.key_benefits && featuredContent.key_benefits.length > 0 && (
                <div className="fs-benefits">
                  <div className="fs-benefits-label">KEY BENEFITS</div>
                  {featuredContent.key_benefits.map((b, i) => (
                    <span key={i} className="fs-benefit-pill">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Unique Differentiator */}
              {featuredContent.highlight_quote && (
                <div className="fs-differentiator">
                  <div className="fs-differentiator-label">UNIQUE DIFFERENTIATOR</div>
                  <p>{featuredContent.highlight_quote}</p>
                </div>
              )}

              {/* Why Choose */}
              {featuredContent.why_choose && (
                <div className="fs-why-choose">
                  <div className="fs-why-label">WHY CHOOSE THEM</div>
                  <p>{featuredContent.why_choose}</p>
                </div>
              )}

              {/* CTA */}
              <a href={featuredContent.article_url || '#'} className="fs-cta" onClick={() => trackClick('featured_content', { action: 'discover_service' })}>
                Discover the Service
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
              <div className="fs-footer-note">Displayed because this is a Premium Verified profile.</div>
            </div>
          ) : (
            <div className="profile-section-card std-hq-card" data-analytics-section="headquarters">
              <div className="profile-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
                  <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                  <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                  <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                  <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                </svg>
                <h3>Company Headquarters</h3>
                <button
                  className="hq-upload-btn"
                  onClick={() => setEditingImageTarget('hq')}
                  title="Upload Company HQ Image"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  {profile.hq_image_url ? 'Change Image' : 'Upload Image'}
                </button>
              </div>
              <img
                src={profile.hq_image_url || 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop'}
                alt={profile.hq_image_url ? 'Company HQ' : 'Company Headquarters Placeholder'}
                className="hq-image"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop'; }}
              />
            </div>
          )}

          <div className="profile-section-card" data-analytics-section="primary_entity">
            <div className="profile-section-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <h3>Primary Entity</h3>
            </div>
            <p className="primary-entity-desc">This profile represents a verified {profile.entity_type} entity with structured relationships to organizations, projects, and recognition systems.</p>
            <div className="pe-grid">
              <div className="pe-box"><div className="pe-box-label">Company</div><div className="pe-box-value">{profile.company}</div></div>
              <div className="pe-box"><div className="pe-box-label">Role</div><div className="pe-box-value">{profile.role}</div></div>
              <div className="pe-box"><div className="pe-box-label">Status</div><div className="pe-box-value" style={{ textTransform: 'capitalize' }}>{profile.status}</div></div>
              <div className="pe-box"><div className="pe-box-label">Since</div><div className="pe-box-value">{profile.active_since}</div></div>
            </div>
            <div className="pe-signals-title">Authority Signals</div>
            <div className="pe-signals-grid">
              <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg><span>{profile.verified_awards_count} verified awards</span></div>
              <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg><span>{profile.papers_count} papers</span></div>
              <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg><span>{profile.events_count} events</span></div>
              <div className="pe-signal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg><span>{profile.funding_raised || 'No funding data'}</span></div>
            </div>

            {/* HQ Image (premium: shown inside PE card, always editable) */}
            {isPremium && (
              <div className="pe-hq-inline">
                <div className="profile-section-header" style={{ marginBottom: '12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /></svg>
                  <h3 style={{ fontSize: '14px' }}>Company Headquarters</h3>
                  <button
                    className="hq-upload-btn"
                    style={{ fontSize: '11px', padding: '4px 10px', marginLeft: 'auto' }}
                    onClick={() => setEditingImageTarget('hq')}
                    title="Upload Company HQ Image"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    {profile.hq_image_url ? 'Change' : 'Upload'}
                  </button>
                </div>
                <SafeImage
                  src={profile.hq_image_url}
                  alt="Company HQ"
                  className="hq-image"
                  fallbackClassName="hq-image-fallback"
                  fallbackText={getInitials(profile.company || profile.name)}
                />
              </div>
            )}

            <div className="pe-seo-box">
              <strong>AI &amp; SEO Relevance:</strong> This structured entity data is optimized for AI assistants, search engines, and knowledge graph integration, ensuring maximum discoverability and authority verification.
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 2.5a — Company HQ Image (visible during edit, like hero photo)
          ════════════════════════════════════════════════ */}
      {isEditing && (
        <section className="profile-section-card op-edit-section-wrap hq-edit-section" style={{ marginBottom: '32px' }}>
          <div className="hq-edit-header">
            <div className="profile-section-header" style={{ marginBottom: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
                <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
              </svg>
              <div>
                <h3 style={{ marginBottom: 0 }}>Company Headquarters Image</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  Shown on standard profiles (left card) and inside the Primary Entity card on premium profiles.
                </span>
              </div>
            </div>
            <button
              className="hq-upload-btn"
              onClick={() => setEditingImageTarget('hq')}
              title="Upload Company HQ Image"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {profile.hq_image_url ? 'Change Image' : 'Upload Image'}
            </button>
          </div>
          <div className="hq-edit-preview">
            <SafeImage
              src={profile.hq_image_url}
              alt="Company HQ"
              className="hq-preview-img"
              fallbackClassName="hq-preview-fallback"
              fallbackText={getInitials(profile.company || profile.name)}
            />
            {profile.hq_image_url && (
              <div className="hq-preview-badge-wrap">
                <span className="hq-preview-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Image set
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 2.5 — Featured Content / CTA (premium edit only)
          ════════════════════════════════════════════════ */}
      {isEditing && profile.is_premium && (
        <section className="profile-section-card op-edit-section-wrap" style={{ marginBottom: '32px' }}>
          <div className="op-section-edit-title-row">
            <div className="profile-section-header" style={{ marginBottom: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <div>
                <h3 style={{ marginBottom: 0 }}>Featured Service &amp; CTA</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                  Premium showcase card content — shown only when this profile is premium.
                </span>
              </div>
            </div>
            <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
          </div>

          <div className="op-inline-grid" style={{ marginBottom: 14 }}>
            <div className="op-inline-field op-inline-grid--full">
              <label className="op-inline-label">Excerpt / Service Description</label>
              <textarea
                className="op-inline-textarea"
                rows={3}
                value={form.featured_content?.excerpt || ''}
                onChange={(e) => sfUpdateFeatured('excerpt', e.target.value)}
                placeholder="e.g. Leading AI ethics consulting and framework development for enterprise organizations..."
              />
            </div>
            <div className="op-inline-field">
              <label className="op-inline-label">CTA Button URL ("Discover the Service")</label>
              <input
                className="op-inline-input"
                type="url"
                value={form.featured_content?.article_url || ''}
                onChange={(e) => sfUpdateFeatured('article_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="op-inline-field">
              <label className="op-inline-label">Featured Image URL</label>
              <input
                className="op-inline-input"
                type="url"
                value={form.featured_content?.image_url || ''}
                onChange={(e) => sfUpdateFeatured('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="op-inline-field op-inline-grid--full">
              <label className="op-inline-label">Unique Differentiator (Highlight Quote)</label>
              <input
                className="op-inline-input"
                value={form.featured_content?.highlight_quote || ''}
                onChange={(e) => sfUpdateFeatured('highlight_quote', e.target.value)}
                placeholder="e.g. Only consultancy led by Stanford PhD researchers with direct policy advisory experience"
              />
            </div>
            <div className="op-inline-field op-inline-grid--full">
              <label className="op-inline-label">Why Choose Them</label>
              <textarea
                className="op-inline-textarea"
                rows={2}
                value={form.featured_content?.why_choose || ''}
                onChange={(e) => sfUpdateFeatured('why_choose', e.target.value)}
                placeholder="e.g. We help organizations build AI systems that are not just powerful, but trustworthy..."
              />
            </div>
          </div>

          {/* Key Benefits */}
          <div style={{ marginTop: 4 }}>
            <label className="op-inline-label" style={{ marginBottom: 8, display: 'block' }}>Key Benefits</label>
            <div className="op-trusted-edit-wrap" style={{ marginBottom: 8 }}>
              {(form.featured_content?.key_benefits || []).map((b, i) => (
                <span key={i} className="op-trusted-edit-chip" style={{ background: '#ECFDF5', color: '#065F46', borderColor: '#6EE7B7' }}>
                  {b}
                  <button onClick={() => sfRemoveBenefit(i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="op-trusted-add-row">
              <input
                value={inlineBenefitInput}
                onChange={(e) => setInlineBenefitInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sfAddBenefit(); } }}
                placeholder="Type a benefit and press Enter or click + Add"
              />
              <button onClick={sfAddBenefit}>+ Add</button>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 3 — Awards & Recognition
          ════════════════════════════════════════════════ */}
      {(awards.length > 0 || isEditing) && (
        <section className={`profile-section-card ${isEditing ? 'op-edit-section-wrap' : ''}`} style={{ marginBottom: '32px' }} data-analytics-section="awards">
          {isEditing ? (
            <>
              <div className="op-section-edit-title-row">
                <div className="profile-section-header" style={{ marginBottom: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
                  <h3 style={{ marginBottom: 0 }}>Awards &amp; Recognition</h3>
                </div>
                <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
              </div>
              <div className="op-edit-cards">
                {awards.map((award, i) => (
                  <div key={i} className="op-edit-card">
                    <button className="op-edit-card-remove" onClick={() => sfRemove('awards', i)}>&times;</button>
                    <div className="op-inline-grid">
                      <div className="op-inline-field"><label className="op-inline-label">Title</label><input className="op-inline-input" value={award.title || ''} onChange={(e) => sfUpdateObj('awards', i, 'title', e.target.value)} placeholder="e.g. Best Innovator" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Issuer</label><input className="op-inline-input" value={award.issuer || ''} onChange={(e) => sfUpdateObj('awards', i, 'issuer', e.target.value)} placeholder="e.g. Tech Magazine" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Year</label><input className="op-inline-input" value={award.year || ''} onChange={(e) => sfUpdateObj('awards', i, 'year', e.target.value)} placeholder="e.g. 2023" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Tag</label><input className="op-inline-input" value={award.tag || ''} onChange={(e) => sfUpdateObj('awards', i, 'tag', e.target.value)} placeholder="e.g. Winner" /></div>
                      <div className="op-inline-field op-inline-grid--full"><label className="op-inline-label">Description</label><textarea className="op-inline-textarea" rows={2} value={award.description || ''} onChange={(e) => sfUpdateObj('awards', i, 'description', e.target.value)} placeholder="e.g. Awarded for exceptional contribution..." /></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="op-edit-add-btn" onClick={() => sfAddObj('awards', { title: '', issuer: '', year: '', tag: '', description: '' })}>+ Add Award</button>
            </>
          ) : (
            <>
              <div className="profile-section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
                <div>
                  <h3 style={{ marginBottom: '0' }}>Awards &amp; Recognition</h3>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>{awards.length} verified awards and honors</span>
                </div>
              </div>
              <div className="awards-grid">
                {awards.map((award, i) => (
                  <div className="award-card" key={i}>
                    <div className="award-top">
                      <div className="award-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
                      <div className="award-year">{award.year}</div>
                    </div>
                    <h4>{award.title}</h4>
                    <div className="award-issuer">{award.issuer}</div>
                    <span className="award-tag">{award.tag}</span>
                    <p className="award-desc">{award.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 4 — Video Content
          ════════════════════════════════════════════════ */}
      {(videos.length > 0 || isEditing) && (
        <section className={`profile-section-card ${isEditing ? 'op-edit-section-wrap' : ''}`} style={{ marginBottom: '32px' }} data-analytics-section="videos">
          {isEditing ? (
            <>
              <div className="op-section-edit-title-row">
                <div className="profile-section-header" style={{ marginBottom: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>
                  <h3 style={{ marginBottom: 0 }}>Video Content</h3>
                </div>
                <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
              </div>
              <div className="op-edit-cards">
                {videos.map((vid, i) => (
                  <div key={i} className="op-edit-card">
                    <button className="op-edit-card-remove" onClick={() => sfRemove('videos', i)}>&times;</button>
                    <div className="op-inline-grid">
                      <div className="op-inline-field"><label className="op-inline-label">Title</label><input className="op-inline-input" value={vid.title || ''} onChange={(e) => sfUpdateObj('videos', i, 'title', e.target.value)} placeholder="e.g. Keynote Speech" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">URL</label><input className="op-inline-input" type="url" value={vid.url || ''} onChange={(e) => sfUpdateObj('videos', i, 'url', e.target.value)} placeholder="https://youtube.com/..." /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Type</label><input className="op-inline-input" value={vid.type || ''} onChange={(e) => sfUpdateObj('videos', i, 'type', e.target.value)} placeholder="e.g. Interview" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Date</label><input className="op-inline-input" value={vid.date || ''} onChange={(e) => sfUpdateObj('videos', i, 'date', e.target.value)} placeholder="e.g. 2023-10-15" /></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="op-edit-add-btn" onClick={() => sfAddObj('videos', { title: '', url: '', type: '', date: '', duration: '' })}>+ Add Video</button>
            </>
          ) : (
            <>
              <div className="profile-section-header-row">
                <div className="profile-section-header" style={{ marginBottom: '0' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>
                  <div>
                    <h3 style={{ marginBottom: '0' }}>Video Content</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>Featured videos, interviews, and presentations</span>
                  </div>
                </div>
                <button className="view-all-btn" onClick={() => trackClick('videos', { action: 'view_all_videos' })}>View All <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></button>
              </div>
              <div className="videos-grid">
                {videos.map((vid, i) => {
                  const destinationUrl = vid.url || vid.link || vid.href || vid.video_url;
                  const videoContent = (
                    <>
                      <div className="video-thumb">
                        <SafeImage src={vid.thumbnail_url || vid.image_url || vid.preview_image || getYouTubeThumbnail(destinationUrl)} alt={vid.title} className="video-thumbnail-image" fallbackClassName="video-thumbnail-fallback" fallbackText={vid.title ? getInitials(vid.title) : 'Video'} />
                        <div className="video-badge">{vid.type}</div>
                        <div className="video-play"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg></div>
                        {vid.duration && <div className="video-time">{vid.duration}</div>}
                      </div>
                      <h4>{vid.title}</h4>
                      <div className="video-meta">
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> {vid.date || 'Recent'}</span>
                        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> {formatViews(vid.views || vid.view_count)} views</span>
                      </div>
                    </>
                  );
                  return destinationUrl ? (
                    <div className="video-card" key={i} onClick={() => setPlayingVideo({ ...vid, destinationUrl })} style={{ cursor: 'pointer' }}>{videoContent}</div>
                  ) : (
                    <div className="video-card" key={i}>{videoContent}</div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 5 — AI-Readable Structure (display only)
          ════════════════════════════════════════════════ */}
      {!isEditing && (
        <section className="profile-section-card" style={{ marginBottom: '32px' }} data-analytics-section="ai_readable_structure">
          <div className="profile-section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            <h3>AI-Readable Structure</h3>
          </div>
          <p className="ai-readable-desc">This profile uses structured JSON-LD data to communicate entity relationships and attributes to AI systems and search engines.</p>
          <div className="ai-chips-list">
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg><span>Person</span></div>
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /></svg><span>Company</span></div>
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg><span>Institution</span></div>
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></svg><span>Project</span></div>
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg><span>Award</span></div>
            <div className="ai-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg><span>Publication</span></div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 6 — Publications
          ════════════════════════════════════════════════ */}
      {(pubs.length > 0 || isEditing) && (
        <section className={`profile-section-card ${isEditing ? 'op-edit-section-wrap' : ''}`} style={{ marginBottom: '32px' }} data-analytics-section="publications">
          {isEditing ? (
            <>
              <div className="op-section-edit-title-row">
                <div className="profile-section-header" style={{ marginBottom: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  <h3 style={{ marginBottom: 0 }}>Publications</h3>
                </div>
                <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
              </div>
              <div className="op-edit-cards">
                {pubs.map((pub, i) => (
                  <div key={i} className="op-edit-card">
                    <button className="op-edit-card-remove" onClick={() => sfRemove('publications', i)}>&times;</button>
                    <div className="op-inline-grid">
                      <div className="op-inline-field"><label className="op-inline-label">Title</label><input className="op-inline-input" value={pub.title || ''} onChange={(e) => sfUpdateObj('publications', i, 'title', e.target.value)} placeholder="e.g. The Future of AI" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Journal</label><input className="op-inline-input" value={pub.journal || ''} onChange={(e) => sfUpdateObj('publications', i, 'journal', e.target.value)} placeholder="e.g. Tech Journal" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Date</label><input className="op-inline-input" value={pub.date || ''} onChange={(e) => sfUpdateObj('publications', i, 'date', e.target.value)} placeholder="e.g. 2023-05-20" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Type</label><input className="op-inline-input" value={pub.type || ''} onChange={(e) => sfUpdateObj('publications', i, 'type', e.target.value)} placeholder="e.g. Article" /></div>
                      <div className="op-inline-field op-inline-grid--full"><label className="op-inline-label">URL</label><input className="op-inline-input" type="url" value={pub.url || ''} onChange={(e) => sfUpdateObj('publications', i, 'url', e.target.value)} placeholder="https://..." /></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="op-edit-add-btn" onClick={() => sfAddObj('publications', { title: '', journal: '', date: '', type: '', url: '' })}>+ Add Publication</button>
            </>
          ) : (
            <>
              <div className="profile-section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                <h3>Recent Publications</h3>
              </div>
              <div className="pubs-grid">
                {pubs.map((pub, i) => {
                  const destinationUrl = pub.url || pub.link || pub.href || pub.doi;
                  const pubContent = (
                    <>
                      <div className="pub-img">
                        <SafeImage src={pub.image_url || pub.thumbnail_url} alt={pub.title} className="pub-thumbnail-image" fallbackClassName="pub-thumbnail-fallback" fallbackText={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
                      </div>
                      <div className="pub-info">
                        <span className="pub-tag">{pub.type}</span>
                        <h4 className="pub-title">{pub.title}</h4>
                        <div className="pub-meta"><span>{pub.journal}</span><span>{pub.date}</span></div>
                      </div>
                    </>
                  );
                  return destinationUrl ? (
                    <a href={destinationUrl} target="_blank" rel="noopener noreferrer" className="pub-card" key={i} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>{pubContent}</a>
                  ) : (
                    <div className="pub-card" key={i}>{pubContent}</div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 7 — Quick Facts
          ════════════════════════════════════════════════ */}
      {(quickFacts.length > 0 || isEditing) && (
        <section className={isEditing ? 'profile-section-card op-edit-section-wrap' : ''} style={{ marginBottom: '32px' }} data-analytics-section="quick_facts">
          {isEditing ? (
            <>
              <div className="op-section-edit-title-row">
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E3A5F', margin: 0 }}>Quick Facts</h3>
                <span className="op-editing-badge"><PencilIcon size={10} />Editing</span>
              </div>
              <div className="op-edit-cards" style={{ marginTop: 12 }}>
                {quickFacts.map((fact, i) => (
                  <div key={i} className="op-edit-card">
                    <button className="op-edit-card-remove" onClick={() => sfRemove('quick_facts', i)}>&times;</button>
                    <div className="op-inline-grid">
                      <div className="op-inline-field"><label className="op-inline-label">Label</label><input className="op-inline-input" value={fact.label || ''} onChange={(e) => sfUpdateObj('quick_facts', i, 'label', e.target.value)} placeholder="e.g. Net Worth" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Value</label><input className="op-inline-input" value={fact.value || ''} onChange={(e) => sfUpdateObj('quick_facts', i, 'value', e.target.value)} placeholder="e.g. $1M+" /></div>
                      <div className="op-inline-field"><label className="op-inline-label">Verified Sources</label><input className="op-inline-input" type="number" value={fact.verified_sources || 0} onChange={(e) => sfUpdateObj('quick_facts', i, 'verified_sources', Number(e.target.value))} placeholder="e.g. 3" /></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="op-edit-add-btn" onClick={() => sfAddObj('quick_facts', { label: '', value: '', verified_sources: 0 })}>+ Add Fact</button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E3A5F', marginBottom: '16px' }}>Quick Facts</h3>
              <div className="qf-grid">
                {quickFacts.map((fact, i) => (
                  <div className={`qf-card${i === 1 ? ' col-span-2' : ''}`} key={i}>
                    <div className="qf-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /></svg>
                      {fact.label}
                    </div>
                    <div className="qf-value">{fact.value}</div>
                    <div className="qf-sources">{fact.verified_sources} verified sources</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 8 — Suggested Profiles (display only)
          ════════════════════════════════════════════════ */}
      {!isEditing && suggested.length > 0 && (
        <section className="suggested-section" data-analytics-section="suggested_profiles">
          <div className="suggested-header">
            <div className="suggested-title">
              <div className="suggested-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
              <div><h3>Suggested Profiles</h3><p>Based on sector, expertise, and network connections</p></div>
            </div>
            <Link to="/lexicon" className="view-all-btn">View More <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></Link>
          </div>
          <div className="suggested-grid">
            {suggested.map((s) => (
              <Link to={`/entity/${s.entity_slug || s.user_id}`} className="suggested-card" key={s.user_id} style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => trackClick('suggested_profiles', { action: 'open_suggested_profile', target_profile_id: s.user_id })}>
                <div className="suggested-avatar">
                  <SafeImage src={s.image_url} alt={s.name} className="suggested-avatar-image" fallbackClassName="suggested-avatar-fallback" fallbackText={getInitials(s.name)} />
                </div>
                <div className="suggested-name">{s.name}<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#0EA5E9" opacity="0.1"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.8 14.5l-3.5-3.5 1.41-1.41L10.2 13.67l6.59-6.59L18.2 8.5l-8 8z" fill="#0EA5E9"/></svg></div>
                <div className="suggested-role">{s.role}</div>
                <div className="suggested-score">Authority: {s.authority_score}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Claim CTA (display only) ── */}
      {!isEditing && (
        <section className="profile-claim-box">
          <h3>Is this your profile?</h3>
          <p>Claim this profile to manage your information, access analytics, download authority kits, and improve your discoverability to AI systems.</p>
          <Link to="/claim-entity">
            <button className="profile-claim-btn" onClick={() => trackClick('claim_profile', { action: 'claim_profile_cta' })}>Claim This Profile</button>
          </Link>
        </section>
      )}

      {/* ── Video Player Modal ── */}
      {playingVideo && (
        <div className="video-modal-overlay" onClick={() => setPlayingVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => setPlayingVideo(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="video-modal-player">
              <iframe src={getEmbedUrl(playingVideo.destinationUrl)} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={playingVideo.title}></iframe>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default EntityProfile;
