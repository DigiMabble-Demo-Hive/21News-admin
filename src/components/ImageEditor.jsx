import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import './ImageEditor.css';

const CROP_W = 480;
const CROP_H = 300;
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Parse a Supabase Storage public URL into { bucket, filePath }.
 * Returns null if the URL doesn't match the expected pattern.
 */
export const extractStorageFile = (url) => {
  if (!url || !url.includes('/storage/v1/object/public/')) return null;
  const urlParts = url.split('/storage/v1/object/public/');
  if (urlParts.length < 2) return null;
  const [bucket, ...pathParts] = urlParts[1].split('/');
  const filePath = pathParts.join('/');
  if (!bucket || !filePath) return null;
  return { bucket, filePath };
};

/**
 * Safely remove files from Supabase Storage. Never throws — logs warnings on failure.
 */
const safeRemoveStorageFiles = async (urls) => {
  const files = urls.filter(Boolean).map(extractStorageFile).filter(Boolean);
  const byBucket = files.reduce((acc, { bucket, filePath }) => {
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(filePath);
    return acc;
  }, {});
  for (const [bucket, filePaths] of Object.entries(byBucket)) {
    try {
      const { error } = await supabase.storage.from(bucket).remove(filePaths);
      if (error) console.warn(`Cleanup warning: failed to remove files from "${bucket}":`, error.message);
    } catch (err) {
      console.warn('Cleanup warning: storage remove threw:', err.message);
    }
  }
};

/**
 * ImageEditor — Admin image management with two modes:
 *
 * 1. Card Mode (tableName === 'user_details'):
 *    Inline crop canvas (480×300) with drag/zoom.
 *    Stores both full original (photo_url) and cropped (cropped_photo_url).
 *
 * 2. Profile Mode (tableName === 'entities_master'):
 *    Simple direct upload — no crop required.
 *    Stores image_url (the uploaded file).
 */
const ImageEditor = ({
  isOpen,
  onClose,
  currentImageUrl,
  oldFullUrl,
  oldCroppedUrl,
  userId,
  onSave,
  onDelete,
  tableName = 'user_details',
  columnName = 'photo_url',
  title = 'Edit Image',
  description = '',
}) => {
  const isCardMode = tableName === 'user_details';

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Profile mode state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Card mode — inline canvas state
  const [cardImageSrc, setCardImageSrc] = useState(null); // data URL or remote URL loaded into canvas
  const [cardOriginalFile, setCardOriginalFile] = useState(null); // File object if new upload
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // Lightbox for full photo
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const previewW = 160;
  const previewH = Math.round(160 * (CROP_H / CROP_W));

  // ── Reset on open/close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setConfirmDelete(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCardImageSrc(null);
      setCardOriginalFile(null);
      setCanvasReady(false);
      setLightboxOpen(false);
      return;
    }
    // Card mode: load existing image into canvas on open
    if (isCardMode) {
      const fullUrl = oldFullUrl || currentImageUrl;
      if (fullUrl) {
        setCardImageSrc(fullUrl);
        setCardOriginalFile(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ── Canvas helpers ──────────────────────────────────────────────────────────
  const calcMinScale = (img) => Math.max(CROP_W / img.width, CROP_H / img.height);

  const clampOffset = useCallback((ox, oy, sc) => {
    if (!imgRef.current) return { x: ox, y: oy };
    const halfW = (imgRef.current.width * sc - CROP_W) / 2;
    const halfH = (imgRef.current.height * sc - CROP_H) / 2;
    return { x: clamp(ox, -halfW, halfW), y: clamp(oy, -halfH, halfH) };
  }, []);

  const draw = useCallback((sc, ox, oy) => {
    const img = imgRef.current;
    if (!img) return;
    const main = canvasRef.current;
    if (main) {
      const ctx = main.getContext('2d');
      ctx.clearRect(0, 0, CROP_W, CROP_H);
      const sw = img.width * sc;
      const sh = img.height * sc;
      const x = (CROP_W - sw) / 2 + ox;
      const y = (CROP_H - sh) / 2 + oy;
      ctx.drawImage(img, x, y, sw, sh);
    }
    const prev = previewCanvasRef.current;
    if (prev) {
      const ctx = prev.getContext('2d');
      ctx.clearRect(0, 0, previewW, previewH);
      const ratio = previewW / CROP_W;
      const sw = img.width * sc * ratio;
      const sh = img.height * sc * ratio;
      const x = (previewW - sw) / 2 + ox * ratio;
      const y = (previewH - sh) / 2 + oy * ratio;
      ctx.drawImage(img, x, y, sw, sh);
    }
  }, [previewW, previewH]);

  // ── Load image into canvas when cardImageSrc changes ────────────────────────
  useEffect(() => {
    if (!cardImageSrc) return;
    setCanvasReady(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const ms = calcMinScale(img);
      const co = clampOffset(0, 0, ms);
      setMinScale(ms);
      setScale(ms);
      setOffset(co);
      setCanvasReady(true);
    };
    if (!cardImageSrc.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.src = cardImageSrc;
  }, [cardImageSrc, clampOffset]);

  // Redraw on scale/offset change
  useEffect(() => {
    if (canvasReady) draw(scale, offset.x, offset.y);
  }, [scale, offset, draw, canvasReady]);

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, scale));
  }, [dragging, scale, clampOffset]);
  const onMouseUp = () => setDragging(false);

  // ── Touch drag ──────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = useCallback((e) => {
    if (!dragging || !dragRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, scale));
  }, [dragging, scale, clampOffset]);
  const onTouchEnd = () => setDragging(false);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const onZoomChange = (e) => {
    const ns = Number(e.target.value);
    setScale(ns);
    setOffset(clampOffset(offset.x, offset.y, ns));
  };

  // ── Close ───────────────────────────────────────────────────────────────────
  const handleAttemptClose = () => {
    if (uploading) return;
    onClose();
  };

  // ── FILE PICK ───────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Please select an image smaller than 5 MB.'); return; }
    setError('');
    setConfirmDelete(false);

    if (isCardMode) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCardImageSrc(ev.target.result);
        setCardOriginalFile(file);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ── CARD MODE: Save from Lexicon Card tab (crops via canvas) ────────────────
  const handleCardSave = async () => {
    if (!canvasRef.current || !canvasReady) {
      setError('Canvas not ready. Please wait or switch to Card View tab first.');
      return;
    }
    setUploading(true);
    setError('');
    draw(scale, offset.x, offset.y);

    canvasRef.current.toBlob(async (croppedBlob) => {
      try {
        const timestamp = Date.now();
        const base = `${timestamp}-${userId}`;
        let fullPublicUrl = null;
        let croppedPublicUrl = null;

        if (cardOriginalFile) {
          const ext = cardOriginalFile.name.split('.').pop() || 'jpg';
          const fullFileName = `${base}-full.${ext}`;
          const { error: fullErr } = await supabase.storage
            .from('photos').upload(fullFileName, cardOriginalFile, { upsert: false, contentType: cardOriginalFile.type });
          if (fullErr) throw new Error(`Full image upload failed: ${fullErr.message}`);
          fullPublicUrl = supabase.storage.from('photos').getPublicUrl(fullFileName).data.publicUrl;
        }

        const croppedFileName = `${base}-card.jpg`;
        const { error: cropErr } = await supabase.storage
          .from('photos').upload(croppedFileName, croppedBlob, { upsert: false, contentType: 'image/jpeg' });
        if (cropErr) throw new Error(`Cropped upload failed: ${cropErr.message}`);
        croppedPublicUrl = supabase.storage.from('photos').getPublicUrl(croppedFileName).data.publicUrl;

        const updateData = {};
        if (fullPublicUrl) updateData.photo_url = fullPublicUrl;
        updateData.cropped_photo_url = croppedPublicUrl;
        await updateAdminProfile({ userId, updateData, table: tableName });

        if (fullPublicUrl) {
          await updateAdminProfile({
            userId,
            updateData: { image_url: fullPublicUrl },
            table: 'entities_master'
          });
        }

        const toClean = [];
        if (fullPublicUrl && oldFullUrl) toClean.push(oldFullUrl);
        if (croppedPublicUrl && oldCroppedUrl) toClean.push(oldCroppedUrl);
        if (toClean.length > 0) await safeRemoveStorageFiles(toClean);

        if (onSave) onSave({ fullUrl: fullPublicUrl || oldFullUrl, croppedUrl: croppedPublicUrl });
        onClose();
      } catch (err) {
        console.error('Card image upload error:', err);
        setError(err.message || 'Failed to upload image.');
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.93);
  };

  // ── PROFILE MODE: Direct Upload ─────────────────────────────────────────────
  const handleProfileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const timestamp = Date.now();
      const ext = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `${userId}_${timestamp}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('photos').upload(fileName, selectedFile, { upsert: false, contentType: selectedFile.type });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
      const publicUrl = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl;
      await updateAdminProfile({ userId, updateData: { [columnName]: publicUrl }, table: tableName });
      if (currentImageUrl) await safeRemoveStorageFiles([currentImageUrl]);
      if (onSave) onSave(publicUrl);
      onClose();
    } catch (err) {
      console.error('Profile image upload error:', err);
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  // ── DELETE ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!onDelete) return;
    setUploading(true);
    setError('');
    try { await onDelete(); } catch (err) { setError(err.message || 'Failed to delete image.'); } finally { setUploading(false); }
  };

  if (!isOpen) return null;

  const hasCurrentImage = Boolean(currentImageUrl);
  const fullPhotoUrl = isCardMode ? (oldFullUrl || currentImageUrl) : null;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Full photo lightbox */}
      {lightboxOpen && fullPhotoUrl && (
        <div className="img-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="img-lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <button className="img-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img src={fullPhotoUrl} alt="Full resolution" className="img-lightbox-img" />
          </div>
        </div>
      )}

      {/* Main editor modal */}
      <div className="img-editor-overlay" onClick={handleAttemptClose}>
        <div className={`img-editor-modal ${isCardMode && cardImageSrc ? 'img-editor-modal--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="img-editor-header">
            <div className="img-editor-header-copy">
              <h3>{title}</h3>
              <p>{isCardMode && cardImageSrc ? 'Drag to reposition · Slide to zoom · Fixed 480×300' : description}</p>
            </div>
            <button className="img-editor-close" onClick={handleAttemptClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {error && <div className="img-editor-error">{error}</div>}

          <div className="img-editor-body">

            {/* ─── CARD MODE: inline crop canvas ─── */}
            {isCardMode && cardImageSrc && (
              <>
                <div className="img-crop-canvas-wrap">
                  {!canvasReady && <div className="img-crop-loading">Loading image…</div>}
                  <canvas
                    ref={canvasRef}
                    width={CROP_W}
                    height={CROP_H}
                    className="img-crop-canvas"
                    style={{ cursor: dragging ? 'grabbing' : 'grab', display: canvasReady ? 'block' : 'none' }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  />
                </div>

                {/* Zoom slider */}
                <div className="img-crop-zoom-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <input
                    type="range"
                    className="img-crop-zoom-slider"
                    min={minScale}
                    max={minScale * 3}
                    step={0.005}
                    value={scale}
                    onChange={onZoomChange}
                    aria-label="Zoom"
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>

                {/* Preview strip */}
                <div className="img-crop-preview-strip">
                  <div className="img-crop-preview-item">
                    <span className="img-crop-preview-label">Card Preview</span>
                    <div className="img-crop-preview-card-frame">
                      <canvas ref={previewCanvasRef} width={previewW} height={previewH} className="img-crop-preview-canvas" />
                    </div>
                  </div>
                  {fullPhotoUrl && (
                    <div className="img-crop-preview-item">
                      <span className="img-crop-preview-label">Full Photo</span>
                      <div
                        className="img-crop-preview-full-frame"
                        onClick={() => setLightboxOpen(true)}
                        title="Click to view full size"
                      >
                        <img src={fullPhotoUrl} alt="Full" className="img-crop-preview-full-img" />
                        <div className="img-crop-expand-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── CARD MODE: no image yet — dropzone ─── */}
            {isCardMode && !cardImageSrc && !fullPhotoUrl && (
              <div className="img-editor-upload-area">
                <label className="img-editor-dropzone">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Click to upload an image</span>
                  <span className="img-editor-dropzone-hint">JPG, PNG, WebP — Max 5 MB</span>
                  <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
                </label>
              </div>
            )}

            {/* ─── PROFILE MODE: current image + new preview ─── */}
            {!isCardMode && hasCurrentImage && !selectedFile && (
              <div className="img-editor-current-preview">
                <span className="img-editor-current-label">Current Image</span>
                <div className="img-editor-current-frame">
                  <img src={currentImageUrl} alt="Current" className="img-editor-current-img" />
                </div>
              </div>
            )}
            {!isCardMode && previewUrl && (
              <div className="img-editor-current-preview">
                <span className="img-editor-current-label">New Image Preview</span>
                <div className="img-editor-current-frame">
                  <img src={previewUrl} alt="Preview" className="img-editor-current-img" />
                </div>
              </div>
            )}
            {!isCardMode && !hasCurrentImage && !previewUrl && (
              <div className="img-editor-upload-area">
                <label className="img-editor-dropzone">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Click to upload an image</span>
                  <span className="img-editor-dropzone-hint">JPG, PNG, WebP — Max 5 MB</span>
                  <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
                </label>
              </div>
            )}

            {/* Upload New button — always visible when there's already an image */}
            {((isCardMode && cardImageSrc) || (!isCardMode && (hasCurrentImage || previewUrl))) && (
              <div className="img-editor-action-buttons">
                <label className="img-editor-upload-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {isCardMode ? 'Upload New Image' : (hasCurrentImage ? 'Upload New Image' : 'Choose Different Image')}
                  <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="img-editor-footer">
            {hasCurrentImage && onDelete && (
              confirmDelete ? (
                <div className="img-editor-delete-confirm">
                  <span>Delete this image?</span>
                  <button className="img-editor-btn img-editor-btn--delete-yes" onClick={handleDelete} disabled={uploading}>Yes, delete</button>
                  <button className="img-editor-btn img-editor-btn--cancel" onClick={() => setConfirmDelete(false)} disabled={uploading}>No</button>
                </div>
              ) : (
                <button className="img-editor-btn img-editor-btn--delete" onClick={() => setConfirmDelete(true)} disabled={uploading}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Delete Image
                </button>
              )
            )}
            <div className="img-editor-footer-right">
              <button className="img-editor-btn img-editor-btn--cancel" onClick={handleAttemptClose} disabled={uploading}>Cancel</button>

              {/* Card mode save — crops via canvas */}
              {isCardMode && cardImageSrc && (
                <button className="img-editor-btn img-editor-btn--save" onClick={handleCardSave} disabled={uploading || !canvasReady}>
                  {uploading ? (<><div className="img-editor-spinner" /> Uploading…</>) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Save Photo</>
                  )}
                </button>
              )}

              {/* Profile mode save */}
              {!isCardMode && selectedFile && (
                <button className="img-editor-btn img-editor-btn--save" onClick={handleProfileUpload} disabled={uploading}>
                  {uploading ? (<><div className="img-editor-spinner" /> Uploading…</>) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Upload Image</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageEditor;
