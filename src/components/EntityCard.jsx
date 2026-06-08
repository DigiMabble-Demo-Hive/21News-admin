import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './EntityCard.css';

const getScoreLabel = (score) => {
  const s = Number(score || 0);
  if (s >= 90) return 'Exceptional';
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Strong';
  if (s >= 40) return 'Notable';
  if (s > 0)  return 'Emerging';
  return '';
};

const getEntityTypeLabel = (type) => {
  if (!type) return null;
  if (type === 'person') return 'Person';
  if (type === 'organization' || type === 'organisation') return 'Organisation';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const EntityCard = ({
  user_id, entitySlug, image, name, badge, role, location,
  authorityScore, company, onShare, entityType, sector, updatedAt, isPremium,
  ctaText, ctaLink, onCtaClick, isBuilding, children
}) => {
  const [imageError, setImageError] = useState(false);
  const isProfileBuilding = isBuilding !== undefined ? isBuilding : (Number(authorityScore || 0) === 0 && !company);
  const scoreLabel  = getScoreLabel(authorityScore);
  const typeLabel   = getEntityTypeLabel(entityType);
  const tags        = sector ? sector.split(',').map(t => t.trim()).filter(Boolean) : [];
  const formattedDate = formatDate(updatedAt);
  const initials    = (name || '').split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => { setImageError(false); }, [image]);

  return (
    <div className="entity-card">

      {/* ── Image section ── */}
      <div className="entity-card-image-wrap">
        {isProfileBuilding ? (
          <div className="entity-card-image-skeleton" aria-hidden="true" />
        ) : image && !imageError ? (
          <img src={image} alt={name} className="entity-card-image" onError={() => setImageError(true)} />
        ) : (
          <div className="entity-card-image-fallback" aria-label={`${name} initials`}>
            <span>{initials || 'NA'}</span>
          </div>
        )}

        {/* 21NEWS Verified — top right, premium only */}
        {isPremium && (
          <div className="entity-verified-overlay">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            21NEWS Verified
          </div>
        )}

        {/* Score — bottom left */}
        {!isProfileBuilding && scoreLabel && (
          <div className="entity-score-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span className="entity-score-num">{authorityScore}</span>
            <span className="entity-score-lbl">{scoreLabel}</span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="entity-card-body">
        {isProfileBuilding ? (
          <>
            <div className="entity-card-skeleton">
              <div className="entity-skeleton-line entity-skeleton-line--name" />
              <div className="entity-skeleton-line entity-skeleton-line--role" />
              <div className="entity-skeleton-line entity-skeleton-line--meta" />
            </div>
            <div className="entity-pending-status">
              Profile is under process and building. It may take some time to appear.
            </div>
          </>
        ) : (
          <>
            <h3 className="entity-card-name">{name}</h3>

            {typeLabel && <span className="entity-type-pill">{typeLabel}</span>}

            {role && <p className="entity-card-role">{role}</p>}

            {tags.length > 0 && (
              <div className="entity-card-tags">
                {tags.map(tag => (
                  <span key={tag} className="entity-tag">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="entity-card-meta-row">
              {location && (
                <div className="entity-meta-col">
                  <span className="entity-meta-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Location
                  </span>
                  <span className="entity-meta-val">{location}</span>
                </div>
              )}
              {formattedDate && (
                <div className="entity-meta-col">
                  <span className="entity-meta-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Updated
                  </span>
                  <span className="entity-meta-val">{formattedDate}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Render children for custom body content overlays */}
        {children}

        {/* Divider */}
        <div className="entity-card-divider" />

        {/* CTA row */}
        <div className="entity-card-actions">
          {isProfileBuilding ? (
            <span className="entity-card-cta entity-card-cta--disabled">
              Profile Pending
            </span>
          ) : onCtaClick ? (
            <button onClick={onCtaClick} className="entity-card-cta" style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <span>{ctaText || 'View Profile'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          ) : (
            <Link to={ctaLink || (entityType === 'organization' ? `/organization/${entitySlug || user_id}` : `/entity/${entitySlug || user_id}`)} className="entity-card-cta">
              <span>{ctaText || 'View Profile'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
          {onShare && (
            <button className="entity-card-share-btn" onClick={onShare} title="Share Profile" aria-label="Share Profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityCard;
