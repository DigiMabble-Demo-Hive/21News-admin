import { useState, useEffect } from 'react';
import './Lexicon.css';
import EntityCard from '../components/EntityCard';
import ShareModal from '../components/ShareModal';
import { supabase } from '../lib/supabase';

const tabs = ['All', 'People', 'Organizations'];
const PAGE_SIZE = 8;

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
  const [page, setPage] = useState(1);

  // Share state
  const [shareEntity, setShareEntity] = useState(null);

  async function fetchEntities() {
    setLoading(true);
    const entitiesSelectWithSlug = 'user_id, entity_slug, name, role, location, badge, entity_type, authority_score, image_url, sector, company, is_premium, updated_at';
    const entitiesSelectFallback = 'user_id, name, role, location, badge, entity_type, authority_score, image_url, sector, company, is_premium, updated_at';

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

    const [
      { data: sourceRows,   error: sourcesError   },
      { data: cardPhotoRows, error: cardPhotosError },
      { data: orgRows,      error: orgError        },
      { data: orgPhotoRows, error: orgPhotosError  },
    ] = await Promise.all([
      supabase.from('google_search_sources').select('user_id'),
      supabase.from('user_details').select('user_id, cropped_photo_url'),
      supabase
        .from('master_organization_entities')
        .select('user_id, organization_name, industry, location, is_premium, authority_score, updated_at, tagline')
        .order('authority_score', { ascending: false }),
      supabase
        .from('organization_details')
        .select('user_id, entity_card_picture_url, cropped_profile_picture_url, profile_picture_url'),
    ]);

    const { data, error } = entitiesResult;

    console.log('Supabase response:', { data, error });
    if (error)          console.error('Supabase error:', error);
    if (sourcesError)   console.error('Supabase source count error:', sourcesError);
    if (cardPhotosError) console.error('Supabase card photo error:', cardPhotosError);
    if (orgError)       console.error('Supabase org error:', orgError);
    if (orgPhotosError) console.error('Supabase org photo error:', orgPhotosError);

    if (data) {
      const sourceCountByUserId = (sourceRows || []).reduce((counts, row) => {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        return counts;
      }, {});

      const cardPhotoByUserId = (cardPhotoRows || []).reduce((photos, row) => {
        photos[row.user_id] = row.cropped_photo_url || null;
        return photos;
      }, {});

      const orgPhotoByUserId = (orgPhotoRows || []).reduce((acc, row) => {
        acc[row.user_id] = row.entity_card_picture_url
                        || row.cropped_profile_picture_url
                        || row.profile_picture_url
                        || null;
        return acc;
      }, {});

      const personEntities = data.map((entity) => ({
        ...entity,
        card_photo_url: cardPhotoByUserId[entity.user_id] || null,
        source_count: sourceCountByUserId[entity.user_id] || 0,
      }));

      const orgEntities = (orgRows || []).map((org) => ({
        user_id:       org.user_id,
        entity_slug:   null,
        name:          org.organization_name,
        role:          org.tagline || '',
        location:      org.location || '',
        badge:         null,
        entity_type:   'organization',
        authority_score: org.authority_score,
        image_url:     null,
        sector:        org.industry || '',
        company:       org.organization_name,
        is_premium:    org.is_premium,
        updated_at:    org.updated_at,
        card_photo_url: orgPhotoByUserId[org.user_id] || null,
        source_count:  0,
      }));

      setEntities([...personEntities, ...orgEntities]);
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
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'People' && e.entity_type !== 'person') return false;
    if (activeTab === 'Organizations' && e.entity_type !== 'organization') return false;
    if (country !== 'All Countries') {
      const loc = e.location || '';
      if (!loc.toLowerCase().includes(country.toLowerCase())) return false;
    }
    if (statusFilter !== 'All Statuses') {
      if (e.badge !== statusFilter.toLowerCase()) return false;
    }
    return true;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, activeTab, country, statusFilter]);

  const totalPages   = Math.ceil(filteredEntities.length / PAGE_SIZE);
  const paginatedEntities = filteredEntities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <>
            <div className="lexicon-grid">
              {paginatedEntities.map((entity) => (
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
                    entityType={entity.entity_type}
                    sector={entity.sector}
                    updatedAt={entity.updated_at}
                    isPremium={entity.is_premium}
                    onShare={() => setShareEntity(entity)}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="lexicon-pagination">
                <button
                  className="lexicon-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`lexicon-page-btn${page === p ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="lexicon-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Lexicon;
