const stripHtml = (html) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const generateBlogJsonLd = (post) => {
  if (!post) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://21news.in';
  const canonical = post.canonical_url || `${baseUrl}/blog/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    image: post.featured_image_url,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Organization',
      name: '21 News',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: '21 News',
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    url: canonical,
    keywords: post.focus_keyword,
    articleBody: stripHtml(post.content).substring(0, 2000),
  };

  if (!post.faq_pairs || post.faq_pairs.length === 0) return jsonLd;

  return [
    jsonLd,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq_pairs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];
};
