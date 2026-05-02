import { useState, useEffect } from 'react';
import './Lexicon.css';
import EntityCard from '../components/EntityCard';
import ShareModal from '../components/ShareModal';
import { supabase } from '../lib/supabase';

const tabs = ['All', 'People', 'Organizations'];

const isMissingSlugColumnError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('entity_slug') && message.includes('column');
};

const Lexicon = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Share state
  const [shareEntity, setShareEntity] = useState(null);

  async function fetchEntities() {
    setLoading(true);
    const entitiesSelectWithSlug = 'user_id, entity_slug, name, role, location, badge, entity_type, authority_score, image_url, subtitle, bio, sector, company, is_premium, verified_awards_count, awards';
    const entitiesSelectFallback = 'user_id, name, role, location, badge, entity_type, authority_score, image_url, subtitle, bio, sector, company, is_premium, verified_awards_count, awards';

    let entitiesResult = await supabase
      .from('entities_master')
      .select(entitiesSelectWithSlug)
      .order('authority_score', { ascending: false });

    if (entitiesResult.error && isMissingSlugColumnError(entitiesResult.error)) {
      entitiesResult = await supabase
        .from('entities_master')
        .select(entitiesSelectFallback)
        .order('authority_score', { ascending: false });
    }

    const { data: sourceRows, error: sourcesError } = await supabase
      .from('google_search_sources')
      .select('user_id');

    const { data: cardPhotoRows, error: cardPhotosError } = await supabase
      .from('user_details')
      .select('user_id, photo_url');

    const { data, error } = entitiesResult;

    console.log('Supabase response:', { data, error });
    if (error) {
      console.error('Supabase error:', error);
    }
    if (sourcesError) {
      console.error('Supabase source count error:', sourcesError);
    }
    if (cardPhotosError) {
      console.error('Supabase card photo error:', cardPhotosError);
    }
    if (data) {
      const sourceCountByUserId = (sourceRows || []).reduce((counts, row) => {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        return counts;
      }, {});

      const cardPhotoByUserId = (cardPhotoRows || []).reduce((photos, row) => {
        photos[row.user_id] = row.photo_url || null;
        return photos;
      }, {});

      setEntities(
        data.map((entity) => ({
          ...entity,
          card_photo_url: cardPhotoByUserId[entity.user_id] || null,
          source_count: sourceCountByUserId[entity.user_id] || 0,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEntities();
  }, []);

  // Get unique countries from data
  const countries = [...new Set(entities.map((e) => {
    const parts = e.location?.split(',') || [];
    return parts[parts.length - 1]?.trim();
  }).filter(Boolean))];

  const filteredEntities = entities.filter((e) => {
    // Search filter
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;

    // Tab filter
    if (activeTab === 'People' && e.entity_type !== 'person') return false;
    if (activeTab === 'Organizations' && e.entity_type !== 'organization') return false;

    // Country filter
    if (country !== 'All Countries') {
      const loc = e.location || '';
      if (!loc.toLowerCase().includes(country.toLowerCase())) return false;
    }

    // Status filter
    if (statusFilter !== 'All Statuses') {
      if (e.badge !== statusFilter.toLowerCase()) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="lexicon-header">
        <div className="lexicon-header-inner">
          <h1>Verified Entity Directory</h1>
          <p>
            Explore verified and claimed people and organizations structured for authority and discoverability.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="lexicon-filters">
        <div className="lexicon-search">
          <div className="lexicon-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="lexicon-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`lexicon-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="lexicon-dropdowns">
          <div className="lexicon-select-wrapper">
            <select
              className="lexicon-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option>All Countries</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="lexicon-select-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <div className="lexicon-select-wrapper">
            <select
              className="lexicon-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Statuses</option>
              <option>Verified</option>
              <option>Claimed</option>
            </select>
            <div className="lexicon-select-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <button className="lexicon-more-filters">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            More Filters
          </button>
        </div>
      </div>

      {/* Share Modal — reusable popup */}
      <ShareModal
        isOpen={!!shareEntity}
        onClose={() => setShareEntity(null)}
        profile={shareEntity || {}}
      />

      {/* Results Grid */}
      <div className="lexicon-results">
        {loading ? (
          <div className="lexicon-loading">Loading entities...</div>
        ) : filteredEntities.length === 0 ? (
          <div className="lexicon-loading">No entities found.</div>
        ) : (
          <div className="lexicon-grid">
            {filteredEntities.map((entity) => (
              <div key={entity.user_id} className="lexicon-entity-wrapper">
                <EntityCard
                  user_id={entity.user_id}
                  entitySlug={entity.entity_slug}
                  image={entity.card_photo_url || entity.image_url}
                  name={entity.name}
                  badge={entity.badge}
                  role={entity.role}
                  location={entity.location}
                  authorityScore={entity.authority_score}
                  company={entity.company}
                  sourceCount={entity.source_count}
                  onShare={() => setShareEntity(entity)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lexicon;
