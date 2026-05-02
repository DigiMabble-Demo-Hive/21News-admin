export const generateJsonLd = (profile) => {
  if (!profile) return null;

  const baseUrl = window.location.origin;
  const profileUrl = `${baseUrl}/entity/${profile.entity_slug || profile.user_id}`;

  // Determine entity type
  const getSchemaType = () => {
    const type = profile.entity_type?.toLowerCase();
    if (type === 'person') return 'Person';
    if (type === 'company' || type === 'organization') return 'Organization';
    if (type === 'institution') return 'EducationalOrganization';
    if (type === 'project') return 'Project';
    return 'Thing';
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(),
    '@id': profileUrl,
    name: profile.name,
    url: profileUrl,
    description: profile.bio || profile.subtitle,
    image: profile.image_url,
  };

  // Person-specific fields
  if (getSchemaType() === 'Person') {
    jsonLd.jobTitle = profile.role;
    jsonLd.worksFor = profile.company ? {
      '@type': 'Organization',
      name: profile.company
    } : undefined;
    if (profile.linkedin_url) jsonLd.sameAs = [profile.linkedin_url];
  }

  // Organization-specific fields
  if (getSchemaType() === 'Organization' || getSchemaType() === 'EducationalOrganization') {
    if (profile.location) jsonLd.address = profile.location;
    if (profile.website_url) jsonLd.url = profile.website_url;
    if (profile.hq_image_url) jsonLd.photo = profile.hq_image_url;
  }

  // Awards
  if (profile.awards?.length > 0) {
    jsonLd.award = profile.awards.map(a => a.title);
  }

  // Publications
  if (profile.publications?.length > 0) {
    jsonLd.publishedWork = profile.publications.map(pub => ({
      '@type': 'CreativeWork',
      name: pub.title,
      datePublished: pub.date,
      publisher: pub.journal
    }));
  }

  // Authority & Verification
  jsonLd.additionalProperty = [
    {
      '@type': 'PropertyValue',
      name: 'Authority Score',
      value: profile.authority_score
    },
    {
      '@type': 'PropertyValue',
      name: 'Verification Status',
      value: profile.badge === 'verified' ? 'Verified by 21 News' : 'Unverified'
    },
    {
      '@type': 'PropertyValue',
      name: 'Sector',
      value: profile.sector
    }
  ];

  return jsonLd;
};
