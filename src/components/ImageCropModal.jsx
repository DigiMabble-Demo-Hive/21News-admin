import { useEffect, useRef, useState, useCallback } from 'react';
import './ImageCropModal.css';

// Default output dimensions for the cropped card image (matches entity card ratio)
const DEFAULT_CROP_W = 480;
const DEFAULT_CROP_H = 300;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const ImageCropModal = ({
  imageSrc,
  originalFile,
  onSave,
  onCancel,
  cropWidth = DEFAULT_CROP_W,
  cropHeight = DEFAULT_CROP_H,
  title = 'Crop your photo',
  subtitle = 'Drag to reposition · Slide to zoom',
}) => {
  const CROP_W = cropWidth;
  const CROP_H = cropHeight;

  const mainCanvasRef  = useRef(null);
  const previewCanvasRef = useRef(null);
  const imgRef         = useRef(null);
  const dragRef        = useRef(null);

  const [minScale, setMinScale]   = useState(1);
  const [scale,    setScale]      = useState(1);
  const [offset,   setOffset]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [ready,    setReady]      = useState(false);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const calcMinScale = (img) => Math.max(CROP_W / img.width, CROP_H / img.height);

  const clampOffset = useCallback((ox, oy, sc) => {
    if (!imgRef.current) return { x: ox, y: oy };
    const halfW = (imgRef.current.width  * sc - CROP_W) / 2;
    const halfH = (imgRef.current.height * sc - CROP_H) / 2;
    return {
      x: clamp(ox, -halfW, halfW),
      y: clamp(oy, -halfH, halfH),
    };
  }, [CROP_W, CROP_H]);

  const previewW = 160;
  const previewH = Math.round(160 * (CROP_H / CROP_W));

  const draw = useCallback((sc, ox, oy) => {
    const img = imgRef.current;
    if (!img) return;

    // Main canvas
    const main = mainCanvasRef.current;
    if (main) {
      const ctx = main.getContext('2d');
      ctx.clearRect(0, 0, CROP_W, CROP_H);
      const sw = img.width  * sc;
      const sh = img.height * sc;
      const x  = (CROP_W - sw) / 2 + ox;
      const y  = (CROP_H - sh) / 2 + oy;
      ctx.drawImage(img, x, y, sw, sh);
    }

    // Small preview canvas
    const prev = previewCanvasRef.current;
    if (prev) {
      const ctx = prev.getContext('2d');
      ctx.clearRect(0, 0, previewW, previewH);
      const ratio = previewW / CROP_W;
      const sw = img.width  * sc * ratio;
      const sh = img.height * sc * ratio;
      const x  = (previewW - sw) / 2 + ox * ratio;
      const y  = (previewH - sh) / 2 + oy * ratio;
      ctx.drawImage(img, x, y, sw, sh);
    }
  }, [CROP_W, CROP_H, previewW, previewH]);

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const ms = calcMinScale(img);
      const clamped = clampOffset(0, 0, ms);
      setMinScale(ms);
      setScale(ms);
      setOffset(clamped);
      setReady(true);
    };
    // Support cross-origin images for re-crop of existing URLs
    if (!imageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = imageSrc;
  }, [imageSrc, clampOffset]);

  // ── Redraw whenever scale / offset change ───────────────────────────────────
  useEffect(() => {
    draw(scale, offset.x, offset.y);
  }, [scale, offset, draw, ready]);

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
    const next = clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, scale);
    setOffset(next);
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
    const next = clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, scale);
    setOffset(next);
  }, [dragging, scale, clampOffset]);

  const onTouchEnd = () => setDragging(false);

  // ── Zoom slider ─────────────────────────────────────────────────────────────
  const onZoomChange = (e) => {
    const newScale = Number(e.target.value);
    const clamped  = clampOffset(offset.x, offset.y, newScale);
    setScale(newScale);
    setOffset(clamped);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    setSaving(true);
    draw(scale, offset.x, offset.y); // ensure latest frame is painted

    mainCanvasRef.current.toBlob(async (croppedBlob) => {
      await onSave(croppedBlob, originalFile);
      setSaving(false);
    }, 'image/jpeg', 0.93);
  };

  return (
    <div className="crop-overlay" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="crop-panel">

        {/* Header */}
        <div className="crop-header">
          <div className="crop-header-text">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button className="crop-close-btn" onClick={onCancel} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Main Canvas */}
        <div className="crop-canvas-wrap">
          {!ready && <div className="crop-loading">Loading image…</div>}
          <canvas
            ref={mainCanvasRef}
            width={CROP_W}
            height={CROP_H}
            className="crop-canvas"
            style={{ cursor: dragging ? 'grabbing' : 'grab', display: ready ? 'block' : 'none' }}
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
        <div className="crop-zoom-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <input
            type="range"
            className="crop-zoom-slider"
            min={minScale}
            max={minScale * 3}
            step={0.005}
            value={scale}
            onChange={onZoomChange}
            aria-label="Zoom"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        {/* Preview strip */}
        <div className="crop-preview-strip">
          <div className="crop-preview-item">
            <span className="crop-preview-label">Card Preview</span>
            <div className="crop-preview-card-frame">
              <canvas ref={previewCanvasRef} width={previewW} height={previewH} className="crop-preview-canvas" />
            </div>
          </div>
          <div className="crop-preview-item">
            <span className="crop-preview-label">Full Photo</span>
            <div className="crop-preview-full-frame">
              <img src={imageSrc} alt="full" className="crop-preview-full-img" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="crop-actions">
          <button className="crop-btn-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="crop-btn-save"   onClick={handleSave} disabled={!ready || saving}>
            {saving ? 'Uploading…' : 'Save Photo'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImageCropModal;
