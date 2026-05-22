import { useState } from 'react';
import { updateAdminProfile } from '../lib/adminProfileApi';
import './EditableProfile.css';

const EditableOrganizationProfile = ({ profile, onSave, onCancel }) => {
  // Flatten org + details into one form object for simplicity
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
      ? profile.key_differentiators.map((d) => (typeof d === 'string' ? d : d.title || d.text || d.description || ''))
      : [],
    trusted_by: Array.isArray(profile.trusted_by)
      ? profile.trusted_by.map((d) => (typeof d === 'string' ? d : d.name || ''))
      : [],
    core_services: Array.isArray(profile.core_services) ? profile.core_services : [],
    leadership:    Array.isArray(profile.leadership)    ? profile.leadership    : [],
  });

  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');
  const isDirty = JSON.stringify(form) !== JSON.stringify({
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
      ? profile.key_differentiators.map((d) => (typeof d === 'string' ? d : d.title || d.text || d.description || ''))
      : [],
    trusted_by: Array.isArray(profile.trusted_by)
      ? profile.trusted_by.map((d) => (typeof d === 'string' ? d : d.name || ''))
      : [],
    core_services: Array.isArray(profile.core_services) ? profile.core_services : [],
    leadership:    Array.isArray(profile.leadership)    ? profile.leadership    : [],
  });

  /* ── Helpers ── */
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateNestedArray = (key, index, field, value) =>
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });

  const addArrayItem = (key, template) =>
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));

  const removeArrayItem = (key, index) =>
    setForm((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));

  /* String-list helpers (differentiators, trusted_by) */
  const addStringItem = (key, inputRef) => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), val] }));
    if (inputRef.current) inputRef.current.value = '';
  };

  const updateStringItem = (key, index, value) =>
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[index] = value;
      return { ...prev, [key]: arr };
    });

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const orgFields = {
        organization_name:      form.organization_name,
        tagline:                form.tagline,
        description:            form.description,
        industry:               form.industry,
        location:               form.location,
        founded_year:           form.founded_year || null,
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

      await updateAdminProfile({
        userId:     profile.user_id,
        updateData: orgFields,
        table:      'master_organization_entities',
      });

      // Only update organization_details if email changed
      const detailsFields = { email_id: form.email_id };
      await updateAdminProfile({
        userId:     profile.user_id,
        updateData: detailsFields,
        table:      'organization_details',
      });

      onSave({
        ...profile,
        ...orgFields,
        details: { ...(profile.details || {}), email_id: form.email_id },
      });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard your unsaved changes?')) return;
    onCancel();
  };

  /* ── Refs for string-list inputs ── */
  const diffInputRef    = { current: null };
  const trustedInputRef = { current: null };

  return (
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
            <small>{isDirty ? 'Unsaved changes' : 'All changes saved'}</small>
          </div>
        </div>
        <div className="ep-action-bar-right">
          {error && <span className="ep-action-error">{error}</span>}
          <button className="ep-btn ep-btn--cancel" onClick={handleCancel}>Cancel</button>
          <button className="ep-btn ep-btn--save" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? <><div className="ep-spinner" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── 1. Basic Info ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Basic Information</h4>
        <div className="ep-grid">
          <div className="ep-field ep-field--full">
            <label>Organization Name</label>
            <input value={form.organization_name} onChange={(e) => update('organization_name', e.target.value)} placeholder="e.g. Acme Corporation" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Tagline</label>
            <input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="e.g. Building the future of technology" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brief description of the organization..." />
          </div>
        </div>
      </div>

      {/* ── 2. Details ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Organization Details</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Industry / Sector</label>
            <input value={form.industry} onChange={(e) => update('industry', e.target.value)} placeholder="e.g. Technology" />
          </div>
          <div className="ep-field">
            <label>Location</label>
            <input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
          </div>
          <div className="ep-field">
            <label>Founded Year</label>
            <input type="number" value={form.founded_year} onChange={(e) => update('founded_year', e.target.value)} placeholder="e.g. 2010" />
          </div>
          <div className="ep-field">
            <label>Team Size</label>
            <input value={form.team_size} onChange={(e) => update('team_size', e.target.value)} placeholder="e.g. 51–200" />
          </div>
        </div>
      </div>

      {/* ── 3. Contact & Channels ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Contact & Social Channels</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Website</label>
            <input type="url" value={form.channel_website || form.website_url} onChange={(e) => { update('channel_website', e.target.value); update('website_url', e.target.value); }} placeholder="https://..." />
          </div>
          <div className="ep-field">
            <label>Contact Email</label>
            <input type="email" value={form.email_id} onChange={(e) => update('email_id', e.target.value)} placeholder="contact@company.com" />
          </div>
          <div className="ep-field">
            <label>LinkedIn</label>
            <input type="url" value={form.channel_linkedin} onChange={(e) => update('channel_linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>
          <div className="ep-field">
            <label>X (Twitter)</label>
            <input type="url" value={form.channel_x} onChange={(e) => update('channel_x', e.target.value)} placeholder="https://x.com/..." />
          </div>
          <div className="ep-field">
            <label>YouTube</label>
            <input type="url" value={form.channel_youtube} onChange={(e) => update('channel_youtube', e.target.value)} placeholder="https://youtube.com/..." />
          </div>
          <div className="ep-field">
            <label>GitHub</label>
            <input type="url" value={form.channel_github} onChange={(e) => update('channel_github', e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="ep-field">
            <label>Crunchbase</label>
            <input type="url" value={form.channel_crunchbase} onChange={(e) => update('channel_crunchbase', e.target.value)} placeholder="https://crunchbase.com/organization/..." />
          </div>
        </div>
      </div>

      {/* ── 4. Credibility Stats ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Credibility Stats</h4>
        <div className="ep-grid">
          {[
            { key: 'years_in_business',      label: 'Years in Business'   },
            { key: 'key_clients_count',      label: 'Key Clients'         },
            { key: 'verified_reviews_count', label: 'Verified Reviews'    },
            { key: 'awards_count',           label: 'Awards'              },
            { key: 'projects_delivered',     label: 'Projects Delivered'  },
            { key: 'media_mentions_count',   label: 'Media Mentions'      },
            { key: 'social_followers',       label: 'Social Followers'    },
            { key: 'publications_count',     label: 'Publications'        },
          ].map(({ key, label }) => (
            <div key={key} className="ep-field">
              <label>{label}</label>
              <input value={form[key]} onChange={(e) => update(key, e.target.value)} placeholder="e.g. 50" />
            </div>
          ))}
          <div className="ep-field">
            <label>Authority Score</label>
            <input type="number" value={form.authority_score} onChange={(e) => update('authority_score', Number(e.target.value))} min="0" max="100" placeholder="0–100" />
          </div>
        </div>
      </div>

      {/* ── 5. Company Story ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Company Story</h4>
        <div className="ep-grid">
          <div className="ep-field ep-field--full">
            <label>Mission</label>
            <textarea rows={3} value={form.mission} onChange={(e) => update('mission', e.target.value)} placeholder="Our mission is to..." />
          </div>
          <div className="ep-field ep-field--full">
            <label>Vision</label>
            <textarea rows={3} value={form.vision} onChange={(e) => update('vision', e.target.value)} placeholder="We envision a world where..." />
          </div>
          <div className="ep-field ep-field--full">
            <label>Market Positioning</label>
            <textarea rows={3} value={form.market_positioning} onChange={(e) => update('market_positioning', e.target.value)} placeholder="We differentiate ourselves by..." />
          </div>
        </div>
      </div>

      {/* ── 6. Key Differentiators ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Key Differentiators</h4>
          <button
            className="ep-add-btn"
            onClick={() => {
              const val = diffInputRef.current?.value?.trim();
              if (val) { addStringItem('key_differentiators', diffInputRef); }
            }}
          >
            + Add
          </button>
        </div>
        {(form.key_differentiators || []).map((item, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('key_differentiators', i)}>&times;</button>
            <div className="ep-field">
              <input value={item} onChange={(e) => updateStringItem('key_differentiators', i, e.target.value)} placeholder="e.g. First-mover in AI-powered logistics" />
            </div>
          </div>
        ))}
        <input
          ref={diffInputRef}
          className="ep-tag-input"
          placeholder="Type a differentiator and click + Add..."
          onKeyDown={(e) => { if (e.key === 'Enter') { addStringItem('key_differentiators', diffInputRef); } }}
        />
      </div>

      {/* ── 7. Trusted By ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Trusted By</h4>
          <button
            className="ep-add-btn"
            onClick={() => addStringItem('trusted_by', trustedInputRef)}
          >
            + Add
          </button>
        </div>
        <div className="ep-tags">
          {(form.trusted_by || []).map((name, i) => (
            <span key={i} className="ep-tag">
              {name}
              <button className="ep-tag-remove" onClick={() => removeArrayItem('trusted_by', i)}>&times;</button>
            </span>
          ))}
        </div>
        <input
          ref={trustedInputRef}
          className="ep-tag-input"
          placeholder="Type organization name and click + Add..."
          onKeyDown={(e) => { if (e.key === 'Enter') { addStringItem('trusted_by', trustedInputRef); } }}
        />
      </div>

      {/* ── 8. Core Services ── */}
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
                <input value={svc.title || ''} onChange={(e) => updateNestedArray('core_services', i, 'title', e.target.value)} placeholder="e.g. AI Consulting" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Description</label>
                <textarea rows={2} value={svc.description || ''} onChange={(e) => updateNestedArray('core_services', i, 'description', e.target.value)} placeholder="What this service does..." />
              </div>
              <div className="ep-field ep-field--full">
                <label>Outcomes</label>
                <textarea rows={2} value={svc.outcomes || ''} onChange={(e) => updateNestedArray('core_services', i, 'outcomes', e.target.value)} placeholder="Expected results or benefits..." />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 9. Leadership ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Leadership &amp; Key People</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('leadership', { name: '', role: '', expertise: '', image: '', score: '', verified: true })}>+ Add Person</button>
        </div>
        {(form.leadership || []).map((person, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('leadership', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field">
                <label>Name</label>
                <input value={person.name || ''} onChange={(e) => updateNestedArray('leadership', i, 'name', e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
              <div className="ep-field">
                <label>Role / Title</label>
                <input value={person.role || ''} onChange={(e) => updateNestedArray('leadership', i, 'role', e.target.value)} placeholder="e.g. Co-Founder & CEO" />
              </div>
              <div className="ep-field ep-field--full">
                <label>Expertise / Bio</label>
                <input value={person.expertise || ''} onChange={(e) => updateNestedArray('leadership', i, 'expertise', e.target.value)} placeholder="e.g. 20 years in enterprise SaaS" />
              </div>
              <div className="ep-field">
                <label>Photo URL</label>
                <input type="url" value={person.image || ''} onChange={(e) => updateNestedArray('leadership', i, 'image', e.target.value)} placeholder="https://..." />
              </div>
              <div className="ep-field">
                <label>Authority Score</label>
                <input type="number" value={person.score || ''} onChange={(e) => updateNestedArray('leadership', i, 'score', e.target.value)} placeholder="e.g. 78" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default EditableOrganizationProfile;
