import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import { trackProfileEvent } from '../lib/profileAnalytics';
import ShareModal from '../components/ShareModal';
import EditableProfile from '../components/EditableProfile';
import ImageEditor, { extractStorageFile } from '../components/ImageEditor';
import ToastContainer, { useToast } from '../components/Toast';
import { generateJsonLd } from '../utils/jsonLdGenerator';
import './EntityProfile.css';

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
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('watch?v=', 'embed/');
  }
  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/');
  }
  if (url.includes('vimeo.com/')) {
    return url.replace('vimeo.com/', 'player.vimeo.com/video/');
  }
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
  const observedSectionsRef = useRef(new Set());

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
    // Only the actively managed photo is used in the hero — no need for a slideshow timer
    setSelectedPhoto(0);
  }, [lexiconFullUrl]);

  useEffect(() => {
    if (!profile?.user_id) return;

    trackProfileEvent({
      profileId: profile.user_id,
      eventType: 'profile_view',
      metadata: {
        entity_slug: profile.entity_slug || null,
      },
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
          trackProfileEvent({
            profileId: profile.user_id,
            eventType: 'section_view',
            sectionKey,
          });
        });
      },
      {
        threshold: [0.55],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [profile?.user_id]);

  const trackClick = (sectionKey, metadata = {}) => {
    if (!profile?.user_id) return;
    trackProfileEvent({
      profileId: profile.user_id,
      eventType: 'click',
      sectionKey,
      metadata,
    });
  };

  const fetchProfile = async () => {
    setLoading(true);

    let profileResult = await supabase
      .from('entities_master')
      .select('*')
      .or(`entity_slug.eq.${id},user_id.eq.${id}`)
      .single();

    if (profileResult.error && isMissingSlugColumnError(profileResult.error)) {
      profileResult = await supabase
        .from('entities_master')
        .select('*')
        .eq('user_id', id)
        .single();
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

      // Fetch suggested profiles (same sector, excluding current)
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

  if (loading) {
    return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading profile...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Profile not found.</div>;
  }

  const trustTags = profile.trust_tags || [];
  const awards = profile.awards || [];
  const videos = profile.videos || [];
  const pubs = profile.publications || [];
  const quickFacts = profile.quick_facts || [];
  // Only show the actively managed photo in the hero — hero_image_url/hq_image_url are not
  // cleared on delete, so they must not be used as fallbacks here.
  const photos = [lexiconFullUrl].filter(Boolean);
  const lastUpdated = profile.updated_at
    ? new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // Handle save from edit mode
  const handleEditSave = (updatedProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    toast('Profile saved successfully', 'success');
  };

  // Handle image save
  const handleImageSave = (result) => {
    if (editingImageTarget === 'profile') {
      setProfile(prev => ({ ...prev, image_url: result }));
    } else {
      if (result.fullUrl) {
        setLexiconFullUrl(result.fullUrl);
        setProfile(prev => ({ ...prev, image_url: result.fullUrl }));
      }
      if (result.croppedUrl) setLexiconCroppedUrl(result.croppedUrl);
    }
    toast('Image updated successfully', 'success');
  };

  // Handle image delete (called from inside ImageEditor)
  const handleImageDelete = async () => {
    try {
      const isProfile = editingImageTarget === 'profile';
      // When deleting the card image, also delete the old profile.image_url so it doesn't fall back to it
      const urlsToDelete = isProfile 
        ? [profile?.image_url] 
        : [lexiconFullUrl, lexiconCroppedUrl, profile?.image_url];

      // Remove files from Supabase Storage using shared utility
      const files = urlsToDelete.filter(Boolean).map(extractStorageFile).filter(Boolean);
      const byBucket = files.reduce((acc, { bucket, filePath }) => {
        acc[bucket] = acc[bucket] || [];
        acc[bucket].push(filePath);
        return acc;
      }, {});

      for (const [bucket, filePaths] of Object.entries(byBucket)) {
        try {
          await supabase.storage.from(bucket).remove(filePaths);
        } catch (cleanupErr) {
          console.warn('Storage cleanup warning:', cleanupErr.message);
        }
      }

      if (isProfile) {
        await updateAdminProfile({
          userId: profile.user_id,
          updateData: { image_url: null },
          table: 'entities_master',
        });
        setProfile(prev => ({ ...prev, image_url: null }));
      } else {
        // Clear user_details photos
        await updateAdminProfile({
          userId: profile.user_id,
          updateData: { photo_url: null, cropped_photo_url: null },
          table: 'user_details',
        });
        // Clear entities_master image_url so the old fallback doesn't appear
        await updateAdminProfile({
          userId: profile.user_id,
          updateData: { image_url: null },
          table: 'entities_master',
        });
        setLexiconFullUrl(null);
        setLexiconCroppedUrl(null);
        setProfile(prev => ({ ...prev, image_url: null }));
      }
      setEditingImageTarget(null);
      toast('Image removed', 'info');
    } catch (err) {
      console.error('Failed to delete image:', err);
      toast(`Failed to remove image: ${err.message}`, 'error');
      throw err;
    }
  };

  // If in edit mode, show EditableProfile
  if (isEditing) {
    return (
      <div className="profile-page">
        <EditableProfile
          profile={profile}
          onSave={handleEditSave}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Admin Edit Button */}
      <div className="admin-edit-bar">
        <button className="admin-edit-btn" onClick={() => setIsEditing(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Profile
        </button>
        <button className="admin-edit-btn" style={{ marginLeft: '12px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setEditingImageTarget('card')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Edit Card Image
        </button>
      </div>

      {/* Image Editor Modal */}
      {editingImageTarget && (
        <ImageEditor
          key={`${profile.user_id}-${editingImageTarget}-${(editingImageTarget === 'profile' ? (profile.image_url || profile.hero_image_url || profile.hq_image_url) : (lexiconCroppedUrl || lexiconFullUrl || profile.image_url)) || 'empty'}`}
          isOpen={!!editingImageTarget}
          onClose={() => setEditingImageTarget(null)}
          currentImageUrl={editingImageTarget === 'profile'
            ? (profile.image_url || profile.hero_image_url || profile.hq_image_url)
            : (lexiconCroppedUrl || lexiconFullUrl || profile.image_url)
          }
          oldFullUrl={editingImageTarget === 'profile' ? null : (lexiconFullUrl || profile.image_url)}
          oldCroppedUrl={editingImageTarget === 'profile' ? null : lexiconCroppedUrl}
          userId={profile.user_id}
          onSave={handleImageSave}
          onDelete={handleImageDelete}
          tableName={editingImageTarget === 'profile' ? 'entities_master' : 'user_details'}
          columnName={editingImageTarget === 'profile' ? 'image_url' : 'photo_url'}
          title={editingImageTarget === 'profile' ? 'Upload Profile Image' : 'Edit Card Image'}
          description={editingImageTarget === 'profile' ? 'Upload the main hero image for this entity profile.' : 'Upload your photo. We will save both the full-resolution image and the cropped card version.'}
        />
      )}

      {/* Hero Section */}
      <section className="profile-hero" data-analytics-section="profile_header">
        <div className="profile-image-container">
          <SafeImage
            src={photos[selectedPhoto]}
            alt={profile.name}
            className="profile-hero-image"
            fallbackClassName="profile-image-fallback"
            fallbackText={getInitials(profile.name)}
          />

          {/* Edit image icon — top right of profile picture */}
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

        <div className="profile-info">
          <div className="profile-name-row">
            <h1 style={{ color: '#1E3A5F' }}>{profile.name}</h1>
            {(profile.badge === 'verified' || profile.badge === 'claimed') && <VerifiedBadge />}
            {profile.is_premium && (
              <div className="profile-premium-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Premium
              </div>
            )}
            
            {/* Share Icon Button */}
            <button
              className="profile-share-icon-btn"
              onClick={() => {
                trackClick('profile_header', { action: 'open_share_modal' });
                setShowShareModal(true);
              }}
              aria-label="Share Profile"
              title="Share Profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
          <div className="profile-role">{profile.role}</div>
          <div className="profile-subtitle">{profile.subtitle}</div>



          {/* Trust & Verification */}
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

          {/* Biography */}
          <div className="profile-section-label">Biography</div>
          <div className="profile-bio" data-analytics-section="biography">
            <p>{profile.bio}</p>
          </div>

          {/* Authority Intelligence Box */}
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
                { label: 'LinkedIn Presence', value: profile.linkedin_presence || 0, max: 25 },
                { label: 'Media Presence', value: profile.media_presence || 0, max: 20 },
                { label: 'Digital Presence', value: profile.digital_presence || 0, max: 15 },
                { label: 'Professional Credibility', value: profile.professional_credibility || 0, max: 15 },
                { label: 'Content Activity', value: profile.content_activity || 0, max: 25 },
              ].map((bar, i) => (
                <div className="authority-bar-row" key={i}>
                  <span className="authority-bar-label">{bar.label}</span>
                  <div className="authority-bar-track"><div className="authority-bar-fill" style={{ width: `${(bar.value / bar.max) * 100}%` }}></div></div>
                  <span className="authority-bar-value">{bar.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="profile-links">
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-link-btn"
                onClick={() => trackClick('profile_header', { action: 'outbound_link', target: 'linkedin' })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                LinkedIn
              </a>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-link-btn"
                onClick={() => trackClick('profile_header', { action: 'outbound_link', target: 'website' })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                Website
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ============ SHARE MODAL ============ */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        profile={profile}
      />

      {/* Grid Middle Sections */}
      <section className="profile-grid-2">
        {profile.hq_image_url && (
          <div className="profile-section-card" data-analytics-section="headquarters">
            <div className="profile-section-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
              <h3>Company Headquarters</h3>
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

        <div className="profile-section-card" data-analytics-section="primary_entity">
          <div className="profile-section-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            <h3>Primary Entity</h3>
          </div>
          <p className="primary-entity-desc">This profile represents a verified {profile.entity_type} entity with structured relationships to organizations, projects, and recognition systems.</p>

          <div className="pe-grid">
            <div className="pe-box">
              <div className="pe-box-label">Company</div>
              <div className="pe-box-value">{profile.company}</div>
            </div>
            <div className="pe-box">
              <div className="pe-box-label">Role</div>
              <div className="pe-box-value">{profile.role}</div>
            </div>
            <div className="pe-box">
              <div className="pe-box-label">Status</div>
              <div className="pe-box-value" style={{ textTransform: 'capitalize' }}>{profile.status}</div>
            </div>
            <div className="pe-box">
              <div className="pe-box-label">Since</div>
              <div className="pe-box-value">{profile.active_since}</div>
            </div>
          </div>

          <div className="pe-signals-title">Authority Signals</div>
          <div className="pe-signals-grid">
            <div className="pe-signal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span>{profile.verified_awards_count} verified awards</span>
            </div>
            <div className="pe-signal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              <span>{profile.papers_count} papers</span>
            </div>
            <div className="pe-signal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span>{profile.events_count} events</span>
            </div>
            <div className="pe-signal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
              <span>{profile.funding_raised || 'No funding data'}</span>
            </div>
          </div>

          <div className="pe-seo-box">
            <strong>AI &amp; SEO Relevance:</strong> This structured entity data is optimized for AI assistants, search engines, and knowledge graph integration, ensuring maximum discoverability and authority verification.
          </div>
        </div>
      </section>

      {/* Awards Section */}
      {awards.length > 0 && (
        <section className="profile-section-card" style={{ marginBottom: '32px' }} data-analytics-section="awards">
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
        </section>
      )}

      {/* Video Content Section */}
      {videos.length > 0 && (
        <section className="profile-section-card" style={{ marginBottom: '32px' }} data-analytics-section="videos">
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
                    <SafeImage
                      src={vid.thumbnail_url || vid.image_url || vid.preview_image || getYouTubeThumbnail(destinationUrl)}
                      alt={vid.title}
                      className="video-thumbnail-image"
                      fallbackClassName="video-thumbnail-fallback"
                      fallbackText={vid.title ? getInitials(vid.title) : 'Video'}
                    />
                    <div className="video-badge">{vid.type}</div>
                    <div className="video-play">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
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
                <div className="video-card" key={i} onClick={() => setPlayingVideo({ ...vid, destinationUrl })} style={{ cursor: 'pointer' }}>
                  {videoContent}
                </div>
              ) : (
                <div className="video-card" key={i} onClick={() => console.log('Video clicked but no URL found:', vid)}>
                  {videoContent}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI-Readable Structure */}
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

      {/* Recent Publications */}
      {pubs.length > 0 && (
        <section className="profile-section-card" style={{ marginBottom: '32px' }} data-analytics-section="publications">
          <div className="profile-section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            <h3>Recent Publications</h3>
          </div>

          <div className="pubs-grid">
            {pubs.map((pub, i) => {
              const pubContent = (
                <>
                  <div className="pub-img">
                    <SafeImage
                      src={pub.image_url || pub.thumbnail_url}
                      alt={pub.title}
                      className="pub-thumbnail-image"
                      fallbackClassName="pub-thumbnail-fallback"
                      fallbackText={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      }
                    />
                  </div>
                  <div className="pub-info">
                    <span className="pub-tag">{pub.type}</span>
                    <h4 className="pub-title">{pub.title}</h4>
                    <div className="pub-meta">
                      <span>{pub.journal}</span>
                      <span>{pub.date}</span>
                    </div>
                  </div>
                </>
              );

              const destinationUrl = pub.url || pub.link || pub.href || pub.doi;

              return destinationUrl ? (
                <a href={destinationUrl} target="_blank" rel="noopener noreferrer" className="pub-card" key={i} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  {pubContent}
                </a>
              ) : (
                <div className="pub-card" key={i}>
                  {pubContent}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Facts */}
      {quickFacts.length > 0 && (
        <section style={{ marginBottom: '32px' }} data-analytics-section="quick_facts">
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
        </section>
      )}

      {/* Suggested Profiles */}
      {suggested.length > 0 && (
        <section className="suggested-section" data-analytics-section="suggested_profiles">
          <div className="suggested-header">
            <div className="suggested-title">
              <div className="suggested-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <div>
                <h3>Suggested Profiles</h3>
                <p>Based on sector, expertise, and network connections</p>
              </div>
            </div>
            <Link to="/lexicon" className="view-all-btn">View More <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></Link>
          </div>

          <div className="suggested-grid">
            {suggested.map((s) => (
              <Link
                to={`/entity/${s.entity_slug || s.user_id}`}
                className="suggested-card"
                key={s.user_id}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => trackClick('suggested_profiles', { action: 'open_suggested_profile', target_profile_id: s.user_id })}
              >
                <div className="suggested-avatar">
                  <SafeImage
                    src={s.image_url}
                    alt={s.name}
                    className="suggested-avatar-image"
                    fallbackClassName="suggested-avatar-fallback"
                    fallbackText={getInitials(s.name)}
                  />
                </div>
                <div className="suggested-name">
                  {s.name}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#0EA5E9" opacity="0.1"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.8 14.5l-3.5-3.5 1.41-1.41L10.2 13.67l6.59-6.59L18.2 8.5l-8 8z" fill="#0EA5E9"/></svg>
                </div>
                <div className="suggested-role">{s.role}</div>
                <div className="suggested-score">Authority: {s.authority_score}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Claim CTA */}
      <section className="profile-claim-box">
        <h3>Is this your profile?</h3>
        <p>Claim this profile to manage your information, access analytics, download authority kits, and improve your discoverability to AI systems.</p>
        <Link to="/claim-entity">
          <button className="profile-claim-btn" onClick={() => trackClick('claim_profile', { action: 'claim_profile_cta' })}>Claim This Profile</button>
        </Link>
      </section>

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="video-modal-overlay" onClick={() => setPlayingVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => setPlayingVideo(null)}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="video-modal-player">
              <iframe
                src={getEmbedUrl(playingVideo.destinationUrl)}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={playingVideo.title}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default EntityProfile;
