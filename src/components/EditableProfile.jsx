import { useState } from 'react';
import { updateAdminProfile } from '../lib/adminProfileApi';
import './EditableProfile.css';

const EditableProfile = ({ profile, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const isDirty = JSON.stringify(form) !== JSON.stringify(profile);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateFeatured = (field, value) =>
    setForm((prev) => ({
      ...prev,
      featured_content: { ...(prev.featured_content || {}), [field]: value },
    }));

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    const benefits = form.featured_content?.key_benefits || [];
    updateFeatured('key_benefits', [...benefits, benefitInput.trim()]);
    setBenefitInput('');
  };

  const removeBenefit = (i) => {
    const benefits = [...(form.featured_content?.key_benefits || [])];
    benefits.splice(i, 1);
    updateFeatured('key_benefits', benefits);
  };

  const updateAuthority = (key, value, max) => {
    let numValue = Number(value);
    if (isNaN(numValue)) numValue = 0;
    if (numValue < 0) numValue = 0;
    if (numValue > max) numValue = max;

    setForm((prev) => {
      const newForm = { ...prev, [key]: numValue };
      const linkedin    = key === 'linkedin_presence'        ? numValue : Number(prev.linkedin_presence        || 0);
      const media       = key === 'media_presence'           ? numValue : Number(prev.media_presence           || 0);
      const digital     = key === 'digital_presence'         ? numValue : Number(prev.digital_presence         || 0);
      const credibility = key === 'professional_credibility' ? numValue : Number(prev.professional_credibility || 0);
      const content     = key === 'content_activity'         ? numValue : Number(prev.content_activity         || 0);
      newForm.authority_score = linkedin + media + digital + credibility + content;
      return newForm;
    });
  };

  const updateNestedArray = (key, index, field, value) => {
    setForm((prev) => {
      const arr = [...(prev[key] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });
  };

  const addArrayItem = (key, template) => {
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), template] }));
  };

  const removeArrayItem = (key, index) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = { name: e.target.value.trim(), type: 'outline-blue' };
      update('trust_tags', [...(form.trust_tags || []), newTag]);
      e.target.value = '';
    }
  };

  const removeTag = (index) => {
    update('trust_tags', (form.trust_tags || []).filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updateData = {
        name:                     form.name,
        role:                     form.role,
        subtitle:                 form.subtitle,
        bio:                      form.bio,
        location:                 form.location,
        sector:                   form.sector,
        company:                  form.company,
        status:                   form.status,
        active_since:             form.active_since,
        // Social links
        website_url:              form.website_url,
        linkedin_url:             form.linkedin_url,
        twitter_url:              form.twitter_url,
        facebook_url:             form.facebook_url,
        instagram_url:            form.instagram_url,
        youtube_url:              form.youtube_url,
        medium_url:               form.medium_url,
        github_url:               form.github_url,
        wikipedia_url:            form.wikipedia_url,
        subscribe_url:            form.subscribe_url,
        // Premium featured content
        featured_content:         form.featured_content,
        // Profile data
        trust_tags:               form.trust_tags,
        awards:                   form.awards,
        videos:                   form.videos,
        publications:             form.publications,
        quick_facts:              form.quick_facts,
        authority_score:          form.authority_score,
        authority_percentile:     form.authority_percentile,
        linkedin_presence:        form.linkedin_presence,
        media_presence:           form.media_presence,
        digital_presence:         form.digital_presence,
        professional_credibility: form.professional_credibility,
        content_activity:         form.content_activity,
      };

      await updateAdminProfile({ userId: profile.user_id, updateData });
      onSave({ ...profile, ...updateData });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard your unsaved profile changes?')) return;
    onCancel();
  };

  const fc = form.featured_content || {};

  return (
    <div className="editable-profile">
      {/* ── Save / Cancel Bar ── */}
      <div className="ep-action-bar">
        <div className="ep-action-bar-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <div className="ep-action-copy">
            <span>Editing Profile</span>
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

      {/* ── Basic Information ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Basic Information</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Name</label>
            <input value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="e.g. John Doe" />
          </div>
          <div className="ep-field">
            <label>Role</label>
            <input value={form.role || ''} onChange={(e) => update('role', e.target.value)} placeholder="e.g. Chief Executive Officer" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Subtitle</label>
            <input value={form.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} placeholder="e.g. Tech Visionary & Innovator" />
          </div>
          <div className="ep-field ep-field--full">
            <label>Biography</label>
            <textarea rows={4} value={form.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="e.g. An experienced leader..." />
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Details</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Location</label>
            <input value={form.location || ''} onChange={(e) => update('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
          </div>
          <div className="ep-field">
            <label>Sector</label>
            <input value={form.sector || ''} onChange={(e) => update('sector', e.target.value)} placeholder="e.g. Technology" />
          </div>
          <div className="ep-field">
            <label>Company</label>
            <input value={form.company || ''} onChange={(e) => update('company', e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          <div className="ep-field">
            <label>Status</label>
            <input value={form.status || ''} onChange={(e) => update('status', e.target.value)} placeholder="e.g. Active" />
          </div>
          <div className="ep-field">
            <label>Active Since</label>
            <input value={form.active_since || ''} onChange={(e) => update('active_since', e.target.value)} placeholder="e.g. 2010" />
          </div>
        </div>
      </div>

      {/* ── Social Links ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Social Links</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Website URL</label>
            <input type="url" value={form.website_url || ''} onChange={(e) => update('website_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="ep-field">
            <label>LinkedIn URL</label>
            <input type="url" value={form.linkedin_url || ''} onChange={(e) => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="ep-field">
            <label>X (Twitter) URL</label>
            <input type="url" value={form.twitter_url || ''} onChange={(e) => update('twitter_url', e.target.value)} placeholder="https://x.com/..." />
          </div>
          <div className="ep-field">
            <label>Facebook URL</label>
            <input type="url" value={form.facebook_url || ''} onChange={(e) => update('facebook_url', e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div className="ep-field">
            <label>Instagram URL</label>
            <input type="url" value={form.instagram_url || ''} onChange={(e) => update('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
          </div>
          <div className="ep-field">
            <label>YouTube URL</label>
            <input type="url" value={form.youtube_url || ''} onChange={(e) => update('youtube_url', e.target.value)} placeholder="https://youtube.com/..." />
          </div>
          <div className="ep-field">
            <label>Medium URL</label>
            <input type="url" value={form.medium_url || ''} onChange={(e) => update('medium_url', e.target.value)} placeholder="https://medium.com/..." />
          </div>
          <div className="ep-field">
            <label>GitHub URL</label>
            <input type="url" value={form.github_url || ''} onChange={(e) => update('github_url', e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="ep-field">
            <label>Wikipedia URL</label>
            <input type="url" value={form.wikipedia_url || ''} onChange={(e) => update('wikipedia_url', e.target.value)} placeholder="https://en.wikipedia.org/wiki/..." />
          </div>
          {form.is_premium && (
            <div className="ep-field">
              <label>
                Subscribe / Podcast URL
                <span className="ep-premium-tag">Premium</span>
              </label>
              <input type="url" value={form.subscribe_url || ''} onChange={(e) => update('subscribe_url', e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
      </div>

      {/* ── Featured Service (Premium Showcase) — only for premium profiles ── */}
      {form.is_premium && (
        <div className="ep-section">
          <div className="ep-section-header">
            <div>
              <h4 className="ep-section-title" style={{ marginBottom: 4 }}>
                Featured Service
                <span className="ep-premium-tag">Premium</span>
              </h4>
              <p className="ep-section-desc">
                Shown in the left grid card for premium profiles. Falls back to placeholder data when empty.
              </p>
            </div>
          </div>

          <div className="ep-grid">
            <div className="ep-field ep-field--full">
              <label>Excerpt / Service Description</label>
              <textarea
                rows={3}
                value={fc.excerpt || ''}
                onChange={(e) => updateFeatured('excerpt', e.target.value)}
                placeholder="e.g. Leading AI ethics consulting and framework development for enterprise organizations..."
              />
            </div>
            <div className="ep-field">
              <label>CTA Button URL ("Discover the Service")</label>
              <input
                type="url"
                value={fc.article_url || ''}
                onChange={(e) => updateFeatured('article_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="ep-field">
              <label>Featured Image URL</label>
              <input
                type="url"
                value={fc.image_url || ''}
                onChange={(e) => updateFeatured('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="ep-field ep-field--full">
              <label>Unique Differentiator (Highlight Quote)</label>
              <input
                value={fc.highlight_quote || ''}
                onChange={(e) => updateFeatured('highlight_quote', e.target.value)}
                placeholder="e.g. Only consultancy led by Stanford PhD researchers with direct policy advisory experience"
              />
            </div>
            <div className="ep-field ep-field--full">
              <label>Why Choose Them</label>
              <textarea
                rows={2}
                value={fc.why_choose || ''}
                onChange={(e) => updateFeatured('why_choose', e.target.value)}
                placeholder="e.g. We help organizations build AI systems that are not just powerful, but trustworthy..."
              />
            </div>
          </div>

          {/* Key Benefits */}
          <div className="ep-benefits-wrap">
            <p className="ep-benefits-label">Key Benefits</p>
            <div className="ep-tags" style={{ marginBottom: 8 }}>
              {(fc.key_benefits || []).map((b, i) => (
                <span key={i} className="ep-tag ep-tag--benefit">
                  {b}
                  <button onClick={() => removeBenefit(i)} className="ep-tag-remove">&times;</button>
                </span>
              ))}
            </div>
            <div className="ep-benefit-add-row">
              <input
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }}
                placeholder="Type a benefit and press Enter or click + Add"
              />
              <button className="ep-add-btn" onClick={addBenefit}>+ Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trust Tags ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Trust Tags</h4>
        <div className="ep-tags">
          {(form.trust_tags || []).map((tag, i) => (
            <span key={i} className="ep-tag">
              {tag.name}
              <button onClick={() => removeTag(i)} className="ep-tag-remove">&times;</button>
            </span>
          ))}
        </div>
        <input className="ep-tag-input" placeholder="Type tag and press Enter..." onKeyDown={handleTagAdd} />
      </div>

      {/* ── Awards ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Awards &amp; Recognition</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('awards', { title: '', issuer: '', year: '', tag: '', description: '' })}>+ Add Award</button>
        </div>
        {(form.awards || []).map((award, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('awards', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field"><label>Title</label><input value={award.title || ''} onChange={(e) => updateNestedArray('awards', i, 'title', e.target.value)} placeholder="e.g. Best Innovator" /></div>
              <div className="ep-field"><label>Issuer</label><input value={award.issuer || ''} onChange={(e) => updateNestedArray('awards', i, 'issuer', e.target.value)} placeholder="e.g. Tech Magazine" /></div>
              <div className="ep-field"><label>Year</label><input value={award.year || ''} onChange={(e) => updateNestedArray('awards', i, 'year', e.target.value)} placeholder="e.g. 2023" /></div>
              <div className="ep-field"><label>Tag</label><input value={award.tag || ''} onChange={(e) => updateNestedArray('awards', i, 'tag', e.target.value)} placeholder="e.g. Winner" /></div>
              <div className="ep-field ep-field--full"><label>Description</label><textarea rows={2} value={award.description || ''} onChange={(e) => updateNestedArray('awards', i, 'description', e.target.value)} placeholder="e.g. Awarded for exceptional contribution..." /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Videos ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Videos</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('videos', { title: '', url: '', type: '', date: '', duration: '' })}>+ Add Video</button>
        </div>
        {(form.videos || []).map((vid, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('videos', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field"><label>Title</label><input value={vid.title || ''} onChange={(e) => updateNestedArray('videos', i, 'title', e.target.value)} placeholder="e.g. Keynote Speech" /></div>
              <div className="ep-field"><label>URL</label><input value={vid.url || ''} onChange={(e) => updateNestedArray('videos', i, 'url', e.target.value)} placeholder="e.g. https://youtube.com/..." /></div>
              <div className="ep-field"><label>Type</label><input value={vid.type || ''} onChange={(e) => updateNestedArray('videos', i, 'type', e.target.value)} placeholder="e.g. Interview" /></div>
              <div className="ep-field"><label>Date</label><input value={vid.date || ''} onChange={(e) => updateNestedArray('videos', i, 'date', e.target.value)} placeholder="e.g. 2023-10-15" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Publications ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Publications</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('publications', { title: '', journal: '', date: '', type: '', url: '' })}>+ Add Publication</button>
        </div>
        {(form.publications || []).map((pub, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('publications', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field"><label>Title</label><input value={pub.title || ''} onChange={(e) => updateNestedArray('publications', i, 'title', e.target.value)} placeholder="e.g. The Future of AI" /></div>
              <div className="ep-field"><label>Journal</label><input value={pub.journal || ''} onChange={(e) => updateNestedArray('publications', i, 'journal', e.target.value)} placeholder="e.g. Tech Journal" /></div>
              <div className="ep-field"><label>Date</label><input value={pub.date || ''} onChange={(e) => updateNestedArray('publications', i, 'date', e.target.value)} placeholder="e.g. 2023-05-20" /></div>
              <div className="ep-field"><label>Type</label><input value={pub.type || ''} onChange={(e) => updateNestedArray('publications', i, 'type', e.target.value)} placeholder="e.g. Article" /></div>
              <div className="ep-field ep-field--full"><label>URL</label><input type="url" value={pub.url || ''} onChange={(e) => updateNestedArray('publications', i, 'url', e.target.value)} placeholder="e.g. https://..." /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Facts ── */}
      <div className="ep-section">
        <div className="ep-section-header">
          <h4 className="ep-section-title">Quick Facts</h4>
          <button className="ep-add-btn" onClick={() => addArrayItem('quick_facts', { label: '', value: '', verified_sources: 0 })}>+ Add Fact</button>
        </div>
        {(form.quick_facts || []).map((fact, i) => (
          <div key={i} className="ep-card">
            <button className="ep-card-remove" onClick={() => removeArrayItem('quick_facts', i)}>&times;</button>
            <div className="ep-grid">
              <div className="ep-field"><label>Label</label><input value={fact.label || ''} onChange={(e) => updateNestedArray('quick_facts', i, 'label', e.target.value)} placeholder="e.g. Net Worth" /></div>
              <div className="ep-field"><label>Value</label><input value={fact.value || ''} onChange={(e) => updateNestedArray('quick_facts', i, 'value', e.target.value)} placeholder="e.g. $1M+" /></div>
              <div className="ep-field"><label>Verified Sources</label><input type="number" value={fact.verified_sources || 0} onChange={(e) => updateNestedArray('quick_facts', i, 'verified_sources', Number(e.target.value))} placeholder="e.g. 3" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Authority Intelligence ── */}
      <div className="ep-section">
        <h4 className="ep-section-title">Authority Intelligence</h4>
        <div className="ep-grid">
          <div className="ep-field">
            <label>Authority Score (auto-calculated)</label>
            <input type="number" value={form.authority_score || 0} readOnly className="ep-readonly-input" title="Calculated automatically from sub-scores below" />
          </div>
          <div className="ep-field">
            <label>Authority Percentile</label>
            <input value={form.authority_percentile || ''} onChange={(e) => update('authority_percentile', e.target.value)} placeholder="e.g. Top 1%" />
          </div>
          <div className="ep-field">
            <label>LinkedIn Presence (max 25)</label>
            <input type="number" value={form.linkedin_presence || 0} onChange={(e) => updateAuthority('linkedin_presence', e.target.value, 25)} min="0" max="25" />
          </div>
          <div className="ep-field">
            <label>Media Presence (max 20)</label>
            <input type="number" value={form.media_presence || 0} onChange={(e) => updateAuthority('media_presence', e.target.value, 20)} min="0" max="20" />
          </div>
          <div className="ep-field">
            <label>Digital Presence (max 15)</label>
            <input type="number" value={form.digital_presence || 0} onChange={(e) => updateAuthority('digital_presence', e.target.value, 15)} min="0" max="15" />
          </div>
          <div className="ep-field">
            <label>Professional Credibility (max 15)</label>
            <input type="number" value={form.professional_credibility || 0} onChange={(e) => updateAuthority('professional_credibility', e.target.value, 15)} min="0" max="15" />
          </div>
          <div className="ep-field">
            <label>Content Activity (max 25)</label>
            <input type="number" value={form.content_activity || 0} onChange={(e) => updateAuthority('content_activity', e.target.value, 25)} min="0" max="25" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableProfile;
