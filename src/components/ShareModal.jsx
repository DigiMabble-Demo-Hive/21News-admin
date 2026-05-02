import { useState, useRef, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import ShareProfileCard from './ShareProfileCard';
import { trackProfileEvent } from '../lib/profileAnalytics';
import './ShareModal.css';

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    formats: ['square'],
    color: '#E4405F',
    gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'ig-stories',
    name: 'IG Stories',
    formats: ['vertical'],
    color: '#E4405F',
    gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    formats: ['square'],
    color: '#25D366',
    gradient: 'linear-gradient(135deg, #25D366, #128C7E)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X',
    formats: ['horizontal'],
    color: '#000000',
    gradient: 'linear-gradient(135deg, #15202B, #1DA1F2)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    formats: ['square', 'horizontal'],
    color: '#0A66C2',
    gradient: 'linear-gradient(135deg, #0A66C2, #004182)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    formats: ['horizontal'],
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877F2, #0D47A1)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'telegram',
    name: 'Telegram',
    formats: ['square'],
    color: '#26A5E4',
    gradient: 'linear-gradient(135deg, #26A5E4, #0088CC)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    id: 'copy',
    name: 'Copy',
    formats: ['square', 'vertical', 'horizontal'],
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    id: 'download',
    name: 'Save',
    formats: ['square', 'vertical', 'horizontal'],
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #047857)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];



const ShareModal = ({ isOpen, onClose, profile }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('square');
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const cardRef = useRef(null);
  const modalRef = useRef(null);
  const profileId = profile?.user_id || profile?.entity_slug;

  const trackShareEvent = useCallback(
    (eventType, platform) => {
      if (!profileId) return;

      trackProfileEvent({
        profileId,
        eventType,
        sectionKey: 'profile_share',
        metadata: { platform },
      });
    },
    [profileId]
  );

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform(null);
      setShareStatus(null);
      setSelectedFormat('square');
    }
  }, [isOpen]);

  const getProfileUrl = useCallback(() => {
    if (profile?.entity_slug || profile?.user_id) {
      return `${window.location.origin}/entity/${profile.entity_slug || profile.user_id}`;
    }
    return window.location.href;
  }, [profile?.entity_slug, profile?.user_id]);

  const getShareText = useCallback(() => {
    const base = `Check out ${profile.name}'s verified authority profile on 21NEWS — Authority Score: ${profile.authority_score || 0}`;
    switch (selectedPlatform) {
      case 'linkedin':
        return `Thrilled to share ${profile.name}'s verified profile on 21NEWS. Their Authority Score is ${profile.authority_score || 0}!`;
      case 'x':
        return `Check out ${profile.name}'s verified authority profile on @21NEWS! \nAuthority Score: ${profile.authority_score || 0} 📈\n`;
      case 'instagram':
        return `Check out ${profile.name}'s verified authority profile on 21NEWS!\n\nAuthority Score: ${profile.authority_score || 0}\n#21NEWS #AuthorityProfile #${profile.name.replace(/\s+/g, '')}`;
      case 'facebook':
        return `I found ${profile.name}'s verified authority profile on 21NEWS incredibly insightful. Their Authority Score is ${profile.authority_score || 0}!`;
      case 'whatsapp':
        return `Take a look at ${profile.name}'s verified profile on 21NEWS. Authority Score is : ${profile.authority_score || 0}`;
      default:
        return base;
    }
  }, [profile, selectedPlatform]);

  const getCaptionText = useCallback(() => {
    return `${getShareText()}\n\n${getProfileUrl()}`;
  }, [getProfileUrl, getShareText]);

  /* ─── GHOST MODE: Pixel-perfect capture engine ─── */
  const convertImageToBase64 = async (url) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url; // fallback to original URL
    }
  };

  const waitForFonts = async () => {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      // Extra safety: wait a tick for rendering
      await new Promise((r) => setTimeout(r, 100));
    } catch { /* fonts API not available, proceed */ }
  };

  const captureCard = async () => {
    if (!cardRef.current) return null;
    try {
      // 1. Wait for all fonts to fully load
      await waitForFonts();

      const source = cardRef.current;

      // 2. Convert any <img> src URLs to base64 (CORS-safe for SVG foreignObject)
      const imgEls = source.querySelectorAll('img');
      const originalSrcs = [];
      for (const el of imgEls) {
        if (el.src && !el.src.startsWith('data:')) {
          originalSrcs.push({ el, original: el.src });
          const b64 = await convertImageToBase64(el.src);
          el.src = b64;
        }
      }

      // 3. GHOST MODE — Neutralize all ancestor transforms in-place
      //    This ensures the card renders at its *natural CSS size* (not scaled)
      //    while preserving the full CSS cascade (which cloneNode breaks).
      const ancestors = [];
      let node = source.parentElement;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (cs.transform && cs.transform !== 'none') {
          ancestors.push({ node, original: node.style.transform });
          node.style.transform = 'none';
        }
        node = node.parentElement;
      }
      // Also neutralize any transform on the card wrapper itself
      const origSourceTransform = source.style.transform;
      source.style.transform = 'none';

      // Force layout reflow so the browser recalculates at natural size
      source.getBoundingClientRect();

      // Small delay to let the browser paint at natural size
      await new Promise((r) => setTimeout(r, 50));

      // 4. Capture with html-to-image (SVG foreignObject — preserves real CSS)
      const dataUrl = await toPng(source, {
        pixelRatio: 3,         // 3x resolution for crisp output
        cacheBust: true,
        quality: 1.0,
        style: {
          transform: 'none',   // Redundant safety
          transformOrigin: 'top left',
        },
      });

      // 5. Restore everything — transforms and image sources
      source.style.transform = origSourceTransform;
      for (const { node: n, original } of ancestors) {
        n.style.transform = original;
      }
      for (const { el, original } of originalSrcs) {
        el.src = original;
      }

      // 6. Convert dataUrl to canvas for compatibility with existing share logic
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas;
    } catch (err) {
      console.error('Ghost Mode capture failed:', err);
      return null;
    }
  };

  const canvasToBlob = (canvas) =>
    new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0));

  const handleSend = async () => {
    if (!selectedPlatform) return;

    setIsSharing(true);
    setShareStatus(null);

    const profileUrl = getProfileUrl();
    const shareText = getShareText();

    const shareWithImageFallback = async (platformName, webIntentUrl) => {
      let imageShared = false;
      let canvas = null;

      // 1. Try native share (mobile) — send image + text TOGETHER
      //    Modern apps (WhatsApp 2.23+, Telegram, etc.) treat `text` as the image caption.
      //    This is the ONLY browser API capable of sharing files, and sending both
      //    together gives the receiving app the best chance of combining them.
      if (navigator.share && navigator.canShare) {
        canvas = await captureCard();
        if (canvas) {
          const blob = await canvasToBlob(canvas);
          const file = new File([blob], `${profile.name.replace(/\s+/g, '_')}_21NEWS.png`, { type: 'image/png' });
          const captionWithUrl = shareText + '\n\n' + profileUrl;

          // First try with both text + file (best case: app merges them)
          const fullShareData = {
            title: `${profile.name} — 21NEWS Verified Authority`,
            text: captionWithUrl,
            files: [file],
          };

          if (navigator.canShare(fullShareData)) {
            try {
              await navigator.share(fullShareData);
              imageShared = true;
            } catch (e) {
              if (e.name !== 'AbortError') {
                // If full share fails, try file-only as fallback
                const fileOnly = { files: [file] };
                if (navigator.canShare(fileOnly)) {
                  try {
                    await navigator.share(fileOnly);
                    imageShared = true;
                  } catch (e2) { /* user cancelled */ }
                }
              }
            }
          }
        }
      }

      // 2. Desktop fallback: download image + copy caption + open platform
      if (!imageShared) {
        if (!canvas) canvas = await captureCard();
        if (canvas) {
          const link = document.createElement('a');
          link.download = `${profile.name.replace(/\s+/g, '_')}_${platformName}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        // Copy caption to clipboard so user can paste it alongside the downloaded image
        try {
          await navigator.clipboard.writeText(shareText + '\n\n' + profileUrl);
        } catch (e) { }

        if (webIntentUrl) {
          window.open(webIntentUrl, '_blank');
        }
      }
      setShareStatus('success');
    };

    try {
      switch (selectedPlatform) {
        case 'copy': {
          const textToCopy = `${shareText}\n\n${profileUrl}`;
          await navigator.clipboard.writeText(textToCopy);
          trackShareEvent('share_success', 'copy');
          setShareStatus('success');
          break;
        }
        case 'download': {
          const canvas = await captureCard();
          if (canvas) {
            const link = document.createElement('a');
            link.download = `${profile.name.replace(/\s+/g, '_')}_21NEWS.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            trackShareEvent('share_success', 'download');
            setShareStatus('success');
          }
          break;
        }
        case 'instagram': {
          await shareWithImageFallback('Instagram', 'https://www.instagram.com/');
          break;
        }
        case 'ig-stories': {
          await shareWithImageFallback('IG Stories', 'https://www.instagram.com/');
          break;
        }
        case 'whatsapp': {
          await shareWithImageFallback('WhatsApp', `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + profileUrl)}`);
          break;
        }
        case 'x': {
          await shareWithImageFallback('X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`);
          break;
        }
        case 'linkedin': {
          await shareWithImageFallback('LinkedIn', 'https://www.linkedin.com/feed/?shareActive=true');
          break;
        }
        case 'facebook': {
          await shareWithImageFallback('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}&quote=${encodeURIComponent(shareText)}`);
          break;
        }
        case 'telegram': {
          await shareWithImageFallback('Telegram', `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`);
          break;
        }
        default:
          break;
      }
      if (selectedPlatform !== 'copy' && selectedPlatform !== 'download') {
        trackShareEvent('share_success', selectedPlatform);
        setTimeout(() => setShareStatus(null), 4000);
      } else {
        setTimeout(() => setShareStatus(null), 3000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setShareStatus('error');
        setTimeout(() => setShareStatus(null), 2000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) onClose();
  };

  if (!isOpen) return null;

  const currentFormat = selectedFormat || 'square';
  const visiblePlatforms = PLATFORMS.filter((p) => p.formats.includes(currentFormat));
  const activePlatform = visiblePlatforms.find((p) => p.id === selectedPlatform);

  const handleFormatChange = (fmt) => {
    setSelectedFormat(fmt);
    const validPlatforms = PLATFORMS.filter((p) => p.formats.includes(fmt));
    if (selectedPlatform && !validPlatforms.find((p) => p.id === selectedPlatform)) {
      setSelectedPlatform(null);
      setShareStatus(null);
    }
  };

  return (
    <div className="sm-overlay" ref={modalRef} onClick={handleBackdropClick}>

      {/* SUCCESS TOAST POPUP */}
      {shareStatus === 'success' && (
        <div className="sm__toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>
            {selectedPlatform === 'copy'
              ? 'Profile link copied to clipboard!'
              : selectedPlatform === 'download'
                ? 'Image downloaded successfully!'
                : `Shared to ${activePlatform?.name} successfully!`}
          </span>
        </div>
      )}

      <div className="sm" role="dialog" aria-label="Share Profile">
        {/* Close */}
        <button className="sm__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="sm__layout">
          {/* Sidebar — Platform Icons */}
          <div className="sm__sidebar">
            <div className="sm__sidebar-label">Share to</div>
            <div className="sm__sidebar-icons">
              {visiblePlatforms.map((p) => (
                <button
                  key={p.id}
                  className={`sm__icon-btn ${selectedPlatform === p.id ? 'sm__icon-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedPlatform(p.id);
                    setShareStatus(null);
                    trackShareEvent('share_click', p.id);
                  }}
                  title={p.name}
                  style={{ '--pc': p.color, '--pg': p.gradient }}
                >
                  <div className="sm__icon-circle">{p.icon}</div>
                  <span className="sm__icon-name">{p.name}</span>
                  {selectedPlatform === p.id && shareStatus === 'success' && (
                    <div className="sm__icon-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main — Preview + Caption + Send */}
          <div className="sm__main">

            {/* Format Toggle at Top */}
            <div className="sm__format-toggle">
              {['square', 'vertical', 'horizontal'].map(fmt => (
                <button
                  key={fmt}
                  className={`sm__format-btn ${currentFormat === fmt ? 'sm__format-btn--active' : ''}`}
                  onClick={() => handleFormatChange(fmt)}
                >
                  {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className={`sm__preview sm__preview--${currentFormat}`}>
              <div className="sm__preview-canvas">
                <div className="sm__card-wrap" key={currentFormat}>
                  <ShareProfileCard ref={cardRef} profile={profile} format={currentFormat} />
                </div>
              </div>
            </div>

            {/* Generated Text View */}
            {selectedPlatform && selectedPlatform !== 'download' && (
              <div className="sm__generated-caption">
                <p>{getCaptionText()}</p>
                <div className="sm__generated-badge">Share Text</div>
              </div>
            )}

            {/* Send Button */}
            <button
              className={`sm__send-btn ${selectedPlatform ? 'sm__send-btn--ready' : ''}`}
              onClick={handleSend}
              disabled={!selectedPlatform || isSharing}
              style={activePlatform ? { '--send-color': activePlatform.color } : {}}
            >
              {isSharing ? (
                <>
                  <div className="sm__send-spinner" />
                  Sharing...
                </>
              ) : shareStatus === 'success' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Shared!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {selectedPlatform
                    ? `Share to ${activePlatform?.name}`
                    : 'Select a platform'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
