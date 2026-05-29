const wordCount = (html) =>
  (html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

export const calcAiReadiness = (post) => {
  let score = 0;
  if (post.meta_title?.trim()) score += 10;
  if (post.meta_description?.trim()) score += 20;
  if (post.focus_keyword?.trim()) score += 10;
  if (wordCount(post.content) >= 300) score += 20;
  if (post.featured_image_url?.trim() && post.featured_image_alt?.trim()) score += 20;
  if (post.faq_pairs?.length > 0) score += 20;
  return score;
};

export const readinessColor = (score) => {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

export const readinessLabel = (score) => {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
};
