import { useState } from 'react';
import ShareProfileCard from './ShareProfileCard';
import './SharePreview.css';

const FORMAT_INFO = {
  square: { label: 'Square', ratio: '1:1', platforms: 'Instagram, LinkedIn' },
  vertical: { label: 'Vertical', ratio: '9:16', platforms: 'Instagram Stories' },
  horizontal: { label: 'Horizontal', ratio: '16:9', platforms: 'LinkedIn, X, Facebook' },
};

const PLATFORM_TO_FORMAT = {
  linkedin: 'horizontal',
  instagram: 'square',
  facebook: 'horizontal',
  whatsapp: 'square',
  telegram: 'square',
  x: 'horizontal',
};

const SharePreview = ({ profile, selectedPlatform }) => {
  const [activeFormat, setActiveFormat] = useState(null);

  // Determine format: manual override or platform-driven
  const format = activeFormat || PLATFORM_TO_FORMAT[selectedPlatform] || 'square';
  const info = FORMAT_INFO[format];

  return (
    <div className="share-preview">
      {/* Format Switcher */}
      <div className="share-preview__formats-header">
        <h3 className="share-preview__title">The Same Visual Adapts Automatically</h3>
        <p className="share-preview__subtitle">
          Your verified profile card automatically adjusts to each platform's format —
          square, vertical, or horizontal.
        </p>
      </div>

      <div className="share-preview__format-cards">
        {Object.entries(FORMAT_INFO).map(([key, val]) => (
          <button
            key={key}
            className={`share-format-card ${format === key ? 'share-format-card--active' : ''}`}
            onClick={() => setActiveFormat(key)}
          >
            <div className={`share-format-card__icon share-format-card__icon--${key}`}>
              {key === 'square' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <rect x="7" y="7" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="13" y="7" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="7" y="13" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="13" y="13" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
                </svg>
              )}
              {key === 'vertical' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                  <rect x="9" y="6" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" />
                  <line x1="9" y1="15" x2="15" y2="15" strokeOpacity="0.5" />
                  <line x1="9" y1="18" x2="13" y2="18" strokeOpacity="0.5" />
                </svg>
              )}
              {key === 'horizontal' && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <rect x="5" y="8" width="6" height="5" rx="1" fill="currentColor" opacity="0.3" />
                  <line x1="13" y1="9" x2="19" y2="9" strokeOpacity="0.5" />
                  <line x1="13" y1="12" x2="17" y2="12" strokeOpacity="0.5" />
                </svg>
              )}
            </div>
            <span className="share-format-card__label">{val.label}</span>
            <span className="share-format-card__platforms">{val.platforms}</span>
          </button>
        ))}
      </div>

      {/* Live Preview */}
      <div className="share-preview__live">
        <div className="share-preview__live-header">
          <div className="share-preview__live-dot" />
          <span>Live Preview</span>
          <span className="share-preview__live-badge">{info.ratio}</span>
        </div>

        <div className="share-preview__live-canvas">
          <div className="share-preview__card-wrapper" key={format}>
            <ShareProfileCard profile={profile} format={format} />
          </div>
        </div>

        <p className="share-preview__live-note">
          {format === 'vertical' ? 'Mobile Preview' : format === 'horizontal' ? 'Desktop Preview' : 'Square Preview'}
        </p>
      </div>
    </div>
  );
};

export default SharePreview;
