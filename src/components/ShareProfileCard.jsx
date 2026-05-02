import { forwardRef, useState, useEffect } from 'react';
import './ShareProfileCard.css';

const ShareProfileCard = forwardRef(({ profile, format = 'horizontal' }, ref) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profile?.image_url]);
  const initials = (profile.name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const awardsCount = profile.verified_awards_count || profile.awards?.length || 0;

  // Ghost Mode: Normalize bio text — ensure proper word spacing & clean truncation
  const rawBio =
    profile.subtitle ||
    profile.bio ||
    `${profile.role} with expertise in ${profile.sector || 'their field'}.`;
  const shortBio = rawBio.length > 120
    ? rawBio.slice(0, 120).replace(/\s+\S*$/, '') + '…'
    : rawBio;

  return (
    <div className={`spc spc--${format}`} ref={ref}>
      {/* Top Badges */}
        <div className="spc__topbar">
          <span className="spc__badge spc__badge--verified">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            21NEWS VERIFIED
          </span>
          {profile.is_premium && (
            <span className="spc__badge spc__badge--premium">
              PREMIUM PROFILE
            </span>
          )}
        </div>

        <div className="spc__content">
          {/* Main Photo — uses <img> tag for Ghost Mode compatibility */}
          <div className="spc__photo">
            {profile.image_url && !imageError ? (
              <img
                className="spc__photo-img"
                src={profile.image_url}
                alt={profile.name}
                crossOrigin="anonymous"
                loading="eager"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="spc__photo-fallback">
                <span>{initials}</span>
              </div>
            )}
          </div>

          <div className="spc__details">
            <h3 className="spc__name">{profile.name}</h3>
            <p className="spc__role">{profile.role}</p>
            <p className="spc__bio">{shortBio}</p>

            <div className="spc__stats">
              <div className="spc__stat-box">
                <div className="spc__stat-value spc__stat-value--yellow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <span>{profile.authority_score || 0}</span>
                </div>
                <div className="spc__stat-label">Authority Score</div>
              </div>

              <div className="spc__stat-box">
                <div className="spc__stat-value spc__stat-value--orange">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                  <span>{awardsCount}</span>
                </div>
                <div className="spc__stat-label">Awards</div>
              </div>
            </div>
        </div>
      </div>

      <div className="spc__footer">
        21NEWS VERIFIED AUTHORITY
      </div>
    </div>
  );
});

ShareProfileCard.displayName = 'ShareProfileCard';
export default ShareProfileCard;
