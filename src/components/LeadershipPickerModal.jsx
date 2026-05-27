import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './LeadershipPickerModal.css';

const getInitials = (name) =>
  (name || '').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'NA';

const LeadershipPickerModal = ({ currentIds = [], onAdd, onClose }) => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState({}); // { user_id: personObject }

  const search = useCallback(async (q) => {
    setLoading(true);
    const trimmed = q.trim();

    let req = supabase
      .from('entities_master')
      .select('user_id, name, role, sector, authority_score, entity_slug, entity_type')
      .eq('Payment_status', 'paid')
      .eq('approval_status', 'approved')
      .limit(24);

    if (trimmed) {
      req = req.ilike('name', `%${trimmed}%`);
    }

    const { data } = await req;
    const people = (data || []).filter(
      (p) => p.entity_type !== 'organization' && p.entity_type !== 'organisation'
    );

    if (people.length > 0) {
      const ids = people.map((p) => p.user_id);
      const { data: photoData } = await supabase
        .from('user_details')
        .select('user_id, cropped_photo_url, photo_url')
        .in('user_id', ids);

      const photoMap = {};
      (photoData || []).forEach((d) => {
        photoMap[d.user_id] = d.cropped_photo_url || d.photo_url || null;
      });

      setResults(people.map((p) => ({ ...p, image: photoMap[p.user_id] || null })));
    } else {
      setResults([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const toggle = (person) => {
    setSelected((prev) => {
      if (prev[person.user_id]) {
        const next = { ...prev };
        delete next[person.user_id];
        return next;
      }
      return { ...prev, [person.user_id]: person };
    });
  };

  const handleAdd = () => {
    const people = Object.values(selected).map((p) => ({
      user_id:         p.user_id,
      source:          'lexicon',
      name:            p.name        || '',
      role:            p.role        || '',
      sector:          p.sector      || '',
      authority_score: p.authority_score || 0,
      image:           p.image       || '',
      entity_slug:     p.entity_slug || '',
    }));
    onAdd(people);
    onClose();
  };

  const selectedCount  = Object.keys(selected).length;
  const isAlreadyAdded = (id) => currentIds.includes(id);

  return (
    <div className="lpm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lpm-modal">

        {/* Header */}
        <div className="lpm-header">
          <div>
            <h3 className="lpm-title">Pick from Lexicon</h3>
            <p className="lpm-subtitle">Search verified entity profiles and add them to Leadership</p>
          </div>
          <button className="lpm-close" onClick={onClose}>×</button>
        </div>

        {/* Search */}
        <div className="lpm-search-wrap">
          <svg className="lpm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="lpm-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            autoFocus
          />
          {query && (
            <button className="lpm-search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        {/* Results */}
        <div className="lpm-results">
          {loading && <div className="lpm-status">Searching...</div>}

          {!loading && results.length === 0 && (
            <div className="lpm-status">
              {query ? `No results for "${query}"` : 'Start typing to search people'}
            </div>
          )}

          {!loading && results.map((person) => {
            const already   = isAlreadyAdded(person.user_id);
            const isSel     = !!selected[person.user_id];
            const initials  = getInitials(person.name);

            return (
              <div
                key={person.user_id}
                className={[
                  'lpm-row',
                  isSel   ? 'lpm-row--selected' : '',
                  already ? 'lpm-row--added'    : '',
                ].join(' ')}
              >
                <div className="lpm-avatar">
                  {person.image
                    ? <img src={person.image} alt={person.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    : null}
                  <span style={{ display: person.image ? 'none' : 'flex' }}>{initials}</span>
                </div>

                <div className="lpm-info">
                  <span className="lpm-name">{person.name}</span>
                  {person.role   && <span className="lpm-role">{person.role}</span>}
                  {person.sector && <span className="lpm-sector">{person.sector}</span>}
                </div>

                {person.authority_score > 0 && (
                  <span className="lpm-score">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {person.authority_score}
                  </span>
                )}

                <button
                  className={[
                    'lpm-pick-btn',
                    already ? 'lpm-pick-btn--done'     : '',
                    isSel   ? 'lpm-pick-btn--selected' : '',
                  ].join(' ')}
                  onClick={() => !already && toggle(person)}
                  disabled={already}
                >
                  {already ? 'Added' : isSel ? '✓ Selected' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="lpm-footer">
          <span className="lpm-count">
            {selectedCount > 0 ? `${selectedCount} selected` : ''}
          </span>
          <div className="lpm-footer-btns">
            <button className="lpm-btn lpm-btn--cancel" onClick={onClose}>Cancel</button>
            <button
              className="lpm-btn lpm-btn--confirm"
              onClick={handleAdd}
              disabled={selectedCount === 0}
            >
              Add {selectedCount > 0 ? `(${selectedCount})` : ''} to Leadership
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadershipPickerModal;
