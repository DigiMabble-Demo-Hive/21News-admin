import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './EntityCard.css';

const EntityCard = ({ user_id, entitySlug, image, name, badge, role, location, authorityScore, company, sourceCount, onShare }) => {
  const [imageError, setImageError] = useState(false);
  const displaySourceCount = (sourceCount || 0) + 3;
  const isProfileBuilding = Number(authorityScore || 0) === 0 && !company;
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    setImageError(false);
  }, [image]);

  return (
    <div className="entity-card">
      {isProfileBuilding ? (
        <div className="entity-card-image-skeleton" aria-hidden="true" />
      ) : image && !imageError ? (
        <img src={image} alt={name} className="entity-card-image" onError={() => setImageError(true)} />
      ) : (
        <div className="entity-card-image-fallback" aria-label={`${name} initials`}>
          <span>{initials || 'NA'}</span>
        </div>
      )}
      <div className="entity-card-body">
        <h3 className="entity-card-name">{name}</h3>
        {badge === 'verified' ? (
          <span className="entity-badge verified">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            21NEWS Verified
          </span>
        ) : (
          <span className="entity-badge claimed">Claimed</span>
        )}
        {isProfileBuilding ? (
          <div className="entity-card-skeleton" aria-hidden="true">
            <div className="entity-skeleton-line entity-skeleton-line--role" />
            <div className="entity-skeleton-line entity-skeleton-line--meta" />
          </div>
        ) : (
          <p className="entity-card-role">{role}</p>
        )}

        {isProfileBuilding && (
          <div className="entity-pending-status">
            Profile is under process and building. It may take some time to appear.
          </div>
        )}
        {isProfileBuilding ? (
          <div className="entity-card-skeleton" aria-hidden="true">
            <div className="entity-skeleton-line entity-skeleton-line--location" />
            <div className="entity-skeleton-stats">
              <div className="entity-skeleton-stat" />
              <div className="entity-skeleton-stat" />
            </div>
          </div>
        ) : (
          <>
            <div className="entity-card-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </div>
            <div className="entity-card-stats">
              <div className="entity-stat">
                <span className="entity-stat-label">Authority Score</span>
                <span className="entity-stat-value">{authorityScore}</span>
              </div>
              <div className="entity-stat">
                <span className="entity-stat-label">Sources</span>
                <div className="entity-stat-source-value">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span className="entity-stat-source-count">{displaySourceCount}</span>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="entity-card-actions">
          {isProfileBuilding ? (
            <button className="entity-card-btn entity-card-btn--disabled" disabled>
              Profile Pending
            </button>
          ) : (
            <Link to={`/entity/${entitySlug || user_id}`} className="entity-card-btn">
              View Profile
            </Link>
          )}
          {onShare && (
            <button className="entity-card-share-btn" onClick={onShare} title="Share Profile" aria-label="Share Profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
