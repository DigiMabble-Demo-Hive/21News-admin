import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import LeadershipPickerModal from './LeadershipPickerModal';
import './EditableProfile.css';
import './LeadershipPickerModal.css';

// ─── small helpers ─────────────────────────────────────────────────────────
const addStr = (setter, ref) => {
  const val = ref.current?.value?.trim();
  if (!val) return;
  setter(prev => [...prev, val]);
  if (ref.current) ref.current.value = '';
};
const removeAt = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i));
const updateAt  = (setter, i, patch) =>
  setter(prev => { const a = [...prev]; a[i] = typeof patch === 'function' ? patch(a[i]) : { ...a[i], ...patch }; return a; });

// ─── component ─────────────────────────────────────────────────────────────
const EditableOrganizationProfile = ({
  profile,
  onSave,
  onCancel,
  livePersons = [],
  enrichedData = {},
}) => {

  // ── Merge live persons into leadership ──
  const _mergedLeadership = (() => {
    const jsonb    = Array.isArray(profile.leadership) ? profile.leadership : [];
    const jsonbIds = new Set(jsonb.filter(p => p.user_id).map(p => p.user_id));
    const live     = livePersons
      .filter(p => p.user_id && !jsonbIds.has(p.user_id))
      .map(p => ({
        user_id:     p.user_id,
        name:        p.name             || '',
        role:        p.role             || '',
        expertise:   p.sector          || '',
        image:       p.cropped_photo_url || p.image_url || '',
        score:       p.authority_score  || '',
        source:      'live',
        entity_slug: p.entity_slug     || '',
      }));
    return [...jsonb, ...live];
  })();

  // ── Main org form ──
  const [form, setForm] = useState({
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
      ? profile.key_differentiators.map(d => (typeof d === 'string' ? d : d.title || d.text || d.description || ''))
      : [],
    trusted_by: Array.isArray(profile.trusted_by)
      ? profile.trusted_by.map(d => (typeof d === 'string' ? d : d.name || ''))
      : [],
    core_services: Array.isArray(profile.core_services) ? profile.core_services : [],
    leadership:    _mergedLeadership,
  });

  // ── Enrichment form states ──
  const [specForm,      setSpecForm]      = useState([...(enrichedData.specializations || [])]);
  const [productsForm,  setProductsForm]  = useState(
    (enrichedData.products || []).map(p => ({ name: p.name || '', description: p.description || '' }))
  );
  const [keyFeatForm,   setKeyFeatForm]   = useState([...(enrichedData.keyFeatures || [])]);
  const [awardsForm,    setAwardsForm]    = useState([...(enrichedData.siteAwards || [])]);
  const [pubsForm,      setPubsForm]      = useState(
    (enrichedData.publications || []).map(p => ({
      publication_title: p.publication_title || '',
      publication_url:   p.publication_url   || '',
      abstract_snippet:  p.abstract_snippet  || '',
      publication_year:  p.publication_year  || '',
    }))
  );
  const [newsForm,      setNewsForm]      = useState(
    (enrichedData.news || []).map(a => ({ title: a.title || '', url: a.url || '', source: a.source || '' }))
  );
  const [reviewsForm,   setReviewsForm]   = useState(
    (enrichedData.reviews || []).map(r => ({
      source_platform: r.source_platform || '',
      rating:          String(r.rating || ''),
      review_count:    String(r.review_count || ''),
      review_snippet:  r.review_snippet  || '',
      review_url:      r.review_url      || '',
    }))
  );
  const [locsForm,      setLocsForm]      = useState(
    (enrichedData.locations || []).map(l => ({
      city:        l.parsed?.city         || l.city        || '',
      country:     l.parsed?.countryFull  || l.parsed?.country || l.country || '',
      headquarter: l.headquarter === true || l.headquarter === 'true',
    }))
  );
  const [contactForm,   setContactForm]   = useState({
    headquarters:       enrichedData.contactInfo?.headquarters       || '',
    support_portal_url: enrichedData.contactInfo?.support_portal_url || '',
    phone_numbers:  [...(enrichedData.contactInfo?.phone_numbers   || [])],
    contact_emails: [...(enrichedData.contactInfo?.contact_emails  || [])],
  });

  // ── Misc state ──
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Helpers — main form ──
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const updateNestedArray = (key, index, field, value) =>
    setForm(prev => {
      const arr = [...(prev[key] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });

  const addArrayItem   = (key, template) => setForm(prev => ({ ...prev, [key]: [...(prev[key] || []), template] }));
  const removeArrayItem = (key, index)   => setForm(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));

  const addStringItem = (key, ref) => {
    const val = ref.current?.value?.trim();
    if (!val) return;
    setForm(prev => ({ ...prev, [key]: [...(prev[key] || []), val] }));
    if (ref.current) ref.current.value = '';
  };

  const updateStringItem = (key, index, value) =>
    setForm(prev => {
      const arr = [...(prev[key] || [])];
      arr[index] = value;
      return { ...prev, [key]: arr };
    });

  const addLexiconPeople = (people) => {
    const existingIds = new Set((form.leadership || []).filter(p => p.user_id).map(p => p.user_id));
    const newPeople   = people.filter(p => !existingIds.has(p.user_id));
    setForm(prev => ({ ...prev, leadership: [...(prev.leadership || []), ...newPeople] }));
  };

  // ── Refs ──
  const diffInputRef    = useRef(null);
  const trustedInputRef = useRef(null);
  const specInputRef    = useRef(null);
  const keyFeatInputRef = useRef(null);
  const awardsInputRef  = useRef(null);
  const phoneInputRef   = useRef(null);
  const emailInputRef   = useRef(null);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // 1 ── Main org fields
      const orgFields = {
        organization_name:      form.organization_name,
        tagline:                form.tagline,
        description:            form.description,
        industry:               form.industry,
        location:               form.location,
        founded_year:           form.founded_year           || null,
        team_size:              form.team_size,
        channel_website:        form.channel_website,
        website_url:            form.website_url,
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

      await updateAdminProfile({ userId: profile.user_id, updateData: orgFields, table: 'master_organization_entities' });
      await updateAdminProfile({ userId: profile.user_id, updateData: { email_id: form.email_id }, table: 'organization_details' });

      // 2 ── Specializations + Locations → org_linkedin_data
      const { data: liRow } = await supabase
        .from('org_linkedin_data').select('raw_data').eq('user_id', profile.user_id).maybeSingle();
      let existingLi = liRow?.raw_data || {};
      if (typeof existingLi === 'string') { try { existingLi = JSON.parse(existingLi); } catch { existingLi = {}; } }
      await supabase.from('org_linkedin_data').upsert(
        {
          user_id:  profile.user_id,
          raw_data: {
            ...existingLi,
            specialities: specForm.filter(Boolean),
            locations: locsForm.filter(l => l.city || l.country).map(l => ({
              city:        l.city,
              country:     l.country,
              headquarter: l.headquarter,
              parsed:      { city: l.city, country: l.country, countryFull: l.country },
            })),
          },
        },
        { onConflict: 'user_id' }
      );

      // 3 ── Products + Key Features + Awards + Contact → organization_site_dump
      const { data: sdRow } = await supabase
        .from('organization_site_dump').select('company_data').eq('user_id', profile.user_id).maybeSingle();
      const existingSd = sdRow?.company_data || {};
      await supabase.from('organization_site_dump').upsert(
        {
          user_id:      profile.user_id,
          company_name: profile.organization_name,
          company_data: {
            ...existingSd,
            offerings: {
              ...(existingSd.offerings || {}),
              products_services: productsForm.filter(p => p.name),
              key_features:      keyFeatForm.filter(Boolean),
            },
            authority_and_trust: {
              ...(existingSd.authority_and_trust || {}),
              awards_certifications: awardsForm.filter(Boolean),
            },
            presence_and_contact: {
              ...(existingSd.presence_and_contact || {}),
              headquarters:       contactForm.headquarters,
              support_portal_url: contactForm.support_portal_url,
              phone_numbers:      contactForm.phone_numbers.filter(Boolean),
              contact_emails:     contactForm.contact_emails.filter(Boolean),
            },
          },
        },
        { onConflict: 'user_id' }
      );

      // 4 ── News articles → org_news_articles (delete + reinsert)
      await supabase.from('org_news_articles').delete().eq('user_id', profile.user_id);
      const validNews = newsForm.filter(a => a.title && a.url);
      if (validNews.length > 0) {
        await supabase.from('org_news_articles').insert(
          validNews.map(a => ({ user_id: profile.user_id, title: a.title, url: a.url, source: a.source }))
        );
      }

      // 5 ── Publications → org_publications (delete + reinsert)
      await supabase.from('org_publications').delete().eq('user_id', profile.user_id);
      const validPubs = pubsForm.filter(p => p.publication_title);
      if (validPubs.length > 0) {
        await supabase.from('org_publications').insert(
          validPubs.map(p => ({ ...p, user_id: profile.user_id, organization_name: profile.organization_name }))
        );
      }

      // 6 ── Reviews → org_reviews (delete + reinsert)
      await supabase.from('org_reviews').delete().eq('user_id', profile.user_id);
      const validReviews = reviewsForm.filter(r => r.source_platform && r.rating);
      if (validReviews.length > 0) {
        await supabase.from('org_reviews').insert(
          validReviews.map(r => ({ ...r, user_id: profile.user_id, rating: Number(r.rating) || 0, review_count: r.review_count ? Number(r.review_count) : null }))
        );
      }

      onSave({
        ...profile,
        ...orgFields,
        details: { ...(profile.details || {}), email_id: form.email_id },
      });
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => onCancel();

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
    <div className="editable-profile">

      {/* ── Sticky action bar ── */}
      <div className="ep-action-bar">
        <div className="ep-action-bar-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <div className="ep-action-copy">
            <span>Editing Organization Profile</span>
            <small>Scroll through all sections and fill in your changes</small>
          </div>
        </div>
        <div className="ep-action-bar-right">
          {error && <span className="ep-action-error">{error}</span>}
          <button className="ep-btn ep-btn--cancel" onClick={handleCancel}>Cancel</button>
          <button className="ep-btn ep-btn--save" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="ep-spinner" /> Saving...</> : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          1. Basic Info
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Basic Information</h4>
        <div className="ep-grid">
          <div className="ep-field ep-field--full">
            <label>Organization Name</label>
            <input value={form.organization_name} onChange={e => update('organization_name', e.target.value)} placeholder="e.g. Acme Corporation" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Tagline</label>
            <input value={form.tagline} onChange={e => update('tagline', e.target.value)} placeholder="e.g. Building the future of technology" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Description</label>
            <textarea rows={4} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief description of the organization..." />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          2. Details
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Organization Details</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Industry / Sector</label>
            <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="e.g. Technology" />
          </div>
          <div className="ep-field">
            <label>Location</label>
            <input value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
          </div>
          <div className="ep-field">
            <label>Founded Year</label>
            <input type="number" value={form.founded_year} onChange={e => update('founded_year', e.target.value)} placeholder="e.g. 2010" />
          </div>
          <div className="ep-field">
            <label>Team Size</label>
            <input value={form.team_size} onChange={e => update('team_size', e.target.value)} placeholder="e.g. 51–200" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          3. Contact & Channels
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Contact &amp; Social Channels</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Website</label>
            <input type="url" value={form.channel_website || form.website_url} onChange={e => { update('channel_website', e.target.value); update('website_url', e.target.value); }} placeholder="https://..." />
          </div>
          <div className="ep-field">
            <label>Contact Email</label>
            <input type="email" value={form.email_id} onChange={e => update('email_id', e.target.value)} placeholder="contact@company.com" />
          </div>
          <div className="ep-field">
            <label>LinkedIn</label>
            <input type="url" value={form.channel_linkedin} onChange={e => update('channel_linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>
          <div className="ep-field">
            <label>X (Twitter)</label>
            <input type="url" value={form.channel_x} onChange={e => update('channel_x', e.target.value)} placeholder="https://x.com/..." />
          </div>
          <div className="ep-field">
            <label>YouTube</label>
            <input type="url" value={form.channel_youtube} onChange={e => update('channel_youtube', e.target.value)} placeholder="https://youtube.com/..." />
          </div>
          <div className="ep-field">
            <label>GitHub</label>
            <input type="url" value={form.channel_github} onChange={e => update('channel_github', e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="ep-field">
            <label>Crunchbase</label>
            <input type="url" value={form.channel_crunchbase} onChange={e => update('channel_crunchbase', e.target.value)} placeholder="https://crunchbase.com/organization/..." />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          4. Credibility Stats
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Credibility Stats</h4>
        <div className="ep-grid">
          {[
            { key: 'years_in_business',      label: 'Years in Business'   },
            { key: 'key_clients_count',      label: 'Key Clients'         },
            { key: 'verified_reviews_count', label: 'Verified Reviews'    },
            { key: 'awards_count',           label: 'Awards Count'        },
            { key: 'projects_delivered',     label: 'Projects Delivered'  },
            { key: 'media_mentions_count',   label: 'Media Mentions'      },
            { key: 'social_followers',       label: 'Social Followers'    },
            { key: 'publications_count',     label: 'Publications Count'  },
          ].map(({ key, label }) => (
            <div key={key} className="ep-field">
              <label>{label}</label>
              <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder="e.g. 50" />
            </div>
          ))}
          <div className="ep-field">
            <label>Authority Score</label>
            <input type="number" value={form.authority_score} onChange={e => update('authority_score', Number(e.target.value))} min="0" max="100" placeholder="0–100" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          5. Company Story
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Company Story</h4>
        <div className="ep-grid">
          <div className="ep-field ep-field--full">
            <label>Mission</label>
            <textarea rows={3} value={form.mission} onChange={e => update('mission', e.target.value)} placeholder="Our mission is to..." />
          </div>
          <div className="ep-field ep-field--full">
            <label>Vision</label>
            <textarea rows={3} value={form.vision} onChange={e => update('vision', e.target.value)} placeholder="We envision a world where..." />
          </div>
          <div className="ep-field ep-field--full">
            <label>Market Positioning</label>
            <textarea rows={3} value={form.market_positioning} onChange={e => update('market_positioning', e.target.value)} placeholder="We differentiate ourselves by..." />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          6. Key Differentiators
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Key Differentiators</h4>
          <button className="ep-add-btn" onClick={() => addStringItem('key_differentiators', diffInputRef)}>+ Add</button>
        </div>
        {(form.key_differentiators || []).map((item, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('key_differentiators', i)}>&times;</button>
            <div className="ep-field">
              <input value={item} onChange={e => updateStringItem('key_differentiators', i, e.target.value)} placeholder="e.g. First-mover in AI-powered logistics" />
            </div>
          </div>
        ))}
        <input ref={diffInputRef} className="ep-tag-input" placeholder="Type a differentiator and press Enter or click + Add…" onKeyDown={e => { if (e.key === 'Enter') addStringItem('key_differentiators', diffInputRef); }} />
      </div>

      {/* ════════════════════════════════════════
          7. Trusted By
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Trusted By</h4>
          <button className="ep-add-btn" onClick={() => addStringItem('trusted_by', trustedInputRef)}>+ Add</button>
        </div>
        <div className="ep-tags">
          {(form.trusted_by || []).map((name, i) => (
            <span key={i} className="ep-tag">{name}<button className="ep-tag-remove" onClick={() => removeArrayItem('trusted_by', i)}>&times;</button></span>
          ))}
        </div>
        <input ref={trustedInputRef} className="ep-tag-input" placeholder="Type organization name and press Enter or click + Add…" onKeyDown={e => { if (e.key === 'Enter') addStringItem('trusted_by', trustedInputRef); }} />
      </div>

      {/* ════════════════════════════════════════
          8. Core Services
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Core Services</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('core_services', { title: '', description: '', outcomes: '' })}>+ Add Service</button>
        </div>
        {(form.core_services || []).map((svc, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('core_services', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field">
                <label>Title</label>
                <input value={svc.title || ''} onChange={e => updateNestedArray('core_services', i, 'title', e.target.value)} placeholder="e.g. AI Consulting" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Description</label>
                <textarea rows={2} value={svc.description || ''} onChange={e => updateNestedArray('core_services', i, 'description', e.target.value)} placeholder="What this service does…" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Outcomes</label>
                <textarea rows={2} value={svc.outcomes || ''} onChange={e => updateNestedArray('core_services', i, 'outcomes', e.target.value)} placeholder="Expected results or benefits…" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          9. Leadership
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Leadership &amp; Key People</h4>
          <button className="ep-add-btn ep-add-btn--primary" onClick={() => setPickerOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Pick from Lexicon
          </button>
        </div>
        {(form.leadership || []).length > 0 ? (
          <div className="lp-lexicon-grid">
            {(form.leadership || []).map((person, realIdx) => {
              const initials   = (person.name || '').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'NA';
              const badgeLabel = person.source === 'live' ? 'Live' : person.source === 'manual' ? 'Manual' : 'Lexicon';
              return (
                <div key={person.user_id || realIdx} className="lp-mini-card">
                  <div className="lp-mini-avatar">
                    {person.image ? <img src={person.image} alt={person.name} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
                    <span style={{ display: person.image ? 'none' : 'flex' }}>{initials}</span>
                  </div>
                  <div className="lp-mini-info">
                    <span className="lp-mini-name">{person.name || '—'}</span>
                    {person.role && <span className="lp-mini-role">{person.role}</span>}
                  </div>
                  <span className="lp-mini-badge">{badgeLabel}</span>
                  <button className="lp-mini-remove" onClick={() => removeArrayItem('leadership', realIdx)}>×</button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '12px 0 0' }}>No leadership members yet. Pick from the Lexicon to add people.</p>
        )}
      </div>

      {/* ════════════════════════════════════════
          10. Specializations
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Specializations</h4>
          <button className="ep-add-btn" onClick={() => addStr(setSpecForm, specInputRef)}>+ Add</button>
        </div>
        <p className="ep-section-hint">Saved to LinkedIn data — appear as coloured tags on the profile.</p>
        <div className="ep-tags">
          {specForm.map((tag, i) => (
            <span key={i} className="ep-tag">{tag}<button className="ep-tag-remove" onClick={() => removeAt(setSpecForm, i)}>&times;</button></span>
          ))}
        </div>
        <input ref={specInputRef} className="ep-tag-input" placeholder="e.g. Machine Learning, SaaS, FinTech…" onKeyDown={e => { if (e.key === 'Enter') addStr(setSpecForm, specInputRef); }} />
      </div>

      {/* ════════════════════════════════════════
          11. Products & Offerings
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Products &amp; Offerings</h4>
          <button className="ep-add-btn" onClick={() => setProductsForm(prev => [...prev, { name: '', description: '' }])}>+ Add Product</button>
        </div>
        <p className="ep-section-hint">Saved to site data — shown in the Products &amp; Offerings section.</p>
        {productsForm.map((p, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeAt(setProductsForm, i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field">
                <label>Product / Service Name</label>
                <input value={p.name} onChange={e => updateAt(setProductsForm, i, { name: e.target.value })} placeholder="e.g. Analytics Suite" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Description</label>
                <textarea rows={2} value={p.description} onChange={e => updateAt(setProductsForm, i, { description: e.target.value })} placeholder="What this product does…" />
              </div>
            </div>
          </div>
        ))}
        {/* Key Features */}
        <div style={{ marginTop: 16 }}>
          <div className="ep-section-header" style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Key Features</label>
            <button className="ep-add-btn" onClick={() => addStr(setKeyFeatForm, keyFeatInputRef)}>+ Add</button>
          </div>
          <div className="ep-tags">
            {keyFeatForm.map((f, i) => (
              <span key={i} className="ep-tag">{f}<button className="ep-tag-remove" onClick={() => removeAt(setKeyFeatForm, i)}>&times;</button></span>
            ))}
          </div>
          <input ref={keyFeatInputRef} className="ep-tag-input" placeholder="e.g. Real-time dashboards, API access…" onKeyDown={e => { if (e.key === 'Enter') addStr(setKeyFeatForm, keyFeatInputRef); }} />
        </div>
      </div>

      {/* ════════════════════════════════════════
          12. Awards & Recognition
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Awards &amp; Recognition</h4>
          <button className="ep-add-btn" onClick={() => addStr(setAwardsForm, awardsInputRef)}>+ Add</button>
        </div>
        <p className="ep-section-hint">Each entry is one award or certification text. Saved to site data.</p>
        {awardsForm.map((award, i) => (
          <div key={i} className="ep-card" style={{ padding: '10px 44px 10px 14px' }}>
            <button className="ep-card-remove" onClick={() => removeAt(setAwardsForm, i)}>&times;</button>
            <input
              className="ep-tag-input"
              style={{ margin: 0 }}
              value={award}
              onChange={e => updateAt(setAwardsForm, i, e.target.value)}
              placeholder="e.g. Best SaaS Product 2024 on G2"
            />
          </div>
        ))}
        <input ref={awardsInputRef} className="ep-tag-input" placeholder="e.g. Forbes 30 Under 30 on Forbes 2023…" onKeyDown={e => { if (e.key === 'Enter') addStr(setAwardsForm, awardsInputRef); }} />
      </div>

      {/* ════════════════════════════════════════
          13. Publications & Resources
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Publications &amp; Resources</h4>
          <button className="ep-add-btn" onClick={() => setPubsForm(prev => [...prev, { publication_title: '', publication_url: '', abstract_snippet: '', publication_year: '' }])}>+ Add</button>
        </div>
        <p className="ep-section-hint">Saved to <code>org_publications</code> table. Existing entries are replaced on save.</p>
        {pubsForm.map((p, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeAt(setPubsForm, i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field ep-field--full">
                <label>Title</label>
                <input value={p.publication_title} onChange={e => updateAt(setPubsForm, i, { publication_title: e.target.value })} placeholder="Publication title…" />
              </div>
              <div className="ep-field">
                <label>URL</label>
                <input type="url" value={p.publication_url} onChange={e => updateAt(setPubsForm, i, { publication_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="ep-field">
                <label>Year</label>
                <input value={p.publication_year} onChange={e => updateAt(setPubsForm, i, { publication_year: e.target.value })} placeholder="e.g. 2024" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Abstract / Snippet</label>
                <textarea rows={2} value={p.abstract_snippet} onChange={e => updateAt(setPubsForm, i, { abstract_snippet: e.target.value })} placeholder="Brief summary…" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          14. News & Press Articles
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">News &amp; Press Articles</h4>
          <button className="ep-add-btn" onClick={() => setNewsForm(prev => [...prev, { title: '', url: '', source: '' }])}>+ Add Article</button>
        </div>
        <p className="ep-section-hint">Saved to <code>org_news_articles</code> table. Existing articles are replaced on save.</p>
        {newsForm.map((a, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeAt(setNewsForm, i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field ep-field--full">
                <label>Headline</label>
                <input value={a.title} onChange={e => updateAt(setNewsForm, i, { title: e.target.value })} placeholder="Article headline…" />
              </div>
              <div className="ep-field">
                <label>URL</label>
                <input type="url" value={a.url} onChange={e => updateAt(setNewsForm, i, { url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="ep-field">
                <label>Source / Publication</label>
                <input value={a.source} onChange={e => updateAt(setNewsForm, i, { source: e.target.value })} placeholder="e.g. TechCrunch" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          15. Reviews & Ratings
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Reviews &amp; Ratings</h4>
          <button className="ep-add-btn" onClick={() => setReviewsForm(prev => [...prev, { source_platform: '', rating: '', review_count: '', review_snippet: '', review_url: '' }])}>+ Add Review</button>
        </div>
        <p className="ep-section-hint">Saved to <code>org_reviews</code> table. Existing reviews are replaced on save.</p>
        {reviewsForm.map((r, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeAt(setReviewsForm, i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field">
                <label>Platform</label>
                <input value={r.source_platform} onChange={e => updateAt(setReviewsForm, i, { source_platform: e.target.value })} placeholder="e.g. G2, Glassdoor, Trustpilot" />
              </div>
              <div className="ep-field">
                <label>Rating (e.g. 4.5)</label>
                <input type="number" step="0.1" min="0" max="5" value={r.rating} onChange={e => updateAt(setReviewsForm, i, { rating: e.target.value })} placeholder="4.5" />
              </div>
              <div className="ep-field">
                <label>Review Count</label>
                <input type="number" value={r.review_count} onChange={e => updateAt(setReviewsForm, i, { review_count: e.target.value })} placeholder="e.g. 230" />
              </div>
              <div className="ep-field">
                <label>Review Page URL</label>
                <input type="url" value={r.review_url} onChange={e => updateAt(setReviewsForm, i, { review_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Snippet / Summary</label>
                <textarea rows={2} value={r.review_snippet} onChange={e => updateAt(setReviewsForm, i, { review_snippet: e.target.value })} placeholder="A short excerpt from reviews…" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          16. Office Locations
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Office Locations</h4>
          <button className="ep-add-btn" onClick={() => setLocsForm(prev => [...prev, { city: '', country: '', headquarter: false }])}>+ Add Location</button>
        </div>
        <p className="ep-section-hint">Saved to LinkedIn data — shown on the Locations section of the profile.</p>
        {locsForm.map((loc, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeAt(setLocsForm, i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field">
                <label>City</label>
                <input value={loc.city} onChange={e => updateAt(setLocsForm, i, { city: e.target.value })} placeholder="e.g. San Francisco" />
              </div>
              <div className="ep-field">
                <label>Country</label>
                <input value={loc.country} onChange={e => updateAt(setLocsForm, i, { country: e.target.value })} placeholder="e.g. United States" />
              </div>
              <div className="ep-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={loc.headquarter} onChange={e => updateAt(setLocsForm, i, { headquarter: e.target.checked })} style={{ width: 'auto' }} />
                  Mark as HQ
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          17. Contact & Presence
          ════════════════════════════════════════ */}
      <div className="ep-section">
        <h4 className="ep-section-title">Contact &amp; Presence</h4>
        <p className="ep-section-hint">Saved to site data — shown in the Contact &amp; Presence section.</p>
        <div className="ep-grid">
          <div className="ep-field ep-field--full">
            <label>Headquarters Address</label>
            <input value={contactForm.headquarters} onChange={e => setContactForm(prev => ({ ...prev, headquarters: e.target.value }))} placeholder="e.g. 123 Main St, San Francisco, CA 94105" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Support Portal URL</label>
            <input type="url" value={contactForm.support_portal_url} onChange={e => setContactForm(prev => ({ ...prev, support_portal_url: e.target.value }))} placeholder="https://support.example.com" />
          </div>
        </div>

        {/* Phone numbers */}
        <div style={{ marginTop: 14 }}>
          <div className="ep-section-header" style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Phone Numbers</label>
            <button className="ep-add-btn" onClick={() => {
              const val = phoneInputRef.current?.value?.trim();
              if (!val) return;
              setContactForm(prev => ({ ...prev, phone_numbers: [...prev.phone_numbers, val] }));
              if (phoneInputRef.current) phoneInputRef.current.value = '';
            }}>+ Add</button>
          </div>
          <div className="ep-tags">
            {contactForm.phone_numbers.map((ph, i) => (
              <span key={i} className="ep-tag">{ph}<button className="ep-tag-remove" onClick={() => setContactForm(prev => ({ ...prev, phone_numbers: prev.phone_numbers.filter((_, idx) => idx !== i) }))}>&times;</button></span>
            ))}
          </div>
          <input ref={phoneInputRef} className="ep-tag-input" placeholder="+1 555 000 0000" onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = phoneInputRef.current?.value?.trim();
              if (!val) return;
              setContactForm(prev => ({ ...prev, phone_numbers: [...prev.phone_numbers, val] }));
              phoneInputRef.current.value = '';
            }
          }} />
        </div>

        {/* Contact emails */}
        <div style={{ marginTop: 14 }}>
          <div className="ep-section-header" style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Contact Emails</label>
            <button className="ep-add-btn" onClick={() => {
              const val = emailInputRef.current?.value?.trim();
              if (!val) return;
              setContactForm(prev => ({ ...prev, contact_emails: [...prev.contact_emails, val] }));
              if (emailInputRef.current) emailInputRef.current.value = '';
            }}>+ Add</button>
          </div>
          <div className="ep-tags">
            {contactForm.contact_emails.map((em, i) => (
              <span key={i} className="ep-tag">{em}<button className="ep-tag-remove" onClick={() => setContactForm(prev => ({ ...prev, contact_emails: prev.contact_emails.filter((_, idx) => idx !== i) }))}>&times;</button></span>
            ))}
          </div>
          <input ref={emailInputRef} type="email" className="ep-tag-input" placeholder="press@example.com" onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = emailInputRef.current?.value?.trim();
              if (!val) return;
              setContactForm(prev => ({ ...prev, contact_emails: [...prev.contact_emails, val] }));
              emailInputRef.current.value = '';
            }
          }} />
        </div>
      </div>

    </div>

    {pickerOpen && (
      <LeadershipPickerModal
        currentIds={(form.leadership || []).filter(p => p.user_id).map(p => p.user_id)}
        onAdd={addLexiconPeople}
        onClose={() => setPickerOpen(false)}
      />
    )}
    </>
  );
};

export default EditableOrganizationProfile;
