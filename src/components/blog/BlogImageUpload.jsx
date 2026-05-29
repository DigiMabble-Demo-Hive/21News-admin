import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import './BlogImageUpload.css';

const CROP_W = 1200;
const CROP_H = 630;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const BlogImageUpload = ({ isOpen, onClose, currentUrl, onSave }) => {
  const [imageSrc, setImageSrc]       = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [canvasReady, setCanvasReady] = useState(false);
  const [scale, setScale]             = useState(1);
  const [minScale, setMinScale]       = useState(1);
  const [offset, setOffset]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging]       = useState(false);

  const canvasRef  = useRef(null);
  const previewRef = useRef(null);
  const imgRef     = useRef(null);
  const dragRef    = useRef(null);

  const PREV_W = 320;
  const PREV_H = Math.round(PREV_W * (CROP_H / CROP_W)); // 168

  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setError('');
      setCanvasReady(false);
      return;
    }
    if (currentUrl) setImageSrc(currentUrl);
  }, [isOpen, currentUrl]);

  const calcMinScale = (img) => Math.max(CROP_W / img.width, CROP_H / img.height);

  const clampOffset = useCallback((ox, oy, sc) => {
    if (!imgRef.current) return { x: ox, y: oy };
    const hw = (imgRef.current.width  * sc - CROP_W) / 2;
    const hh = (imgRef.current.height * sc - CROP_H) / 2;
    return { x: clamp(ox, -hw, hw), y: clamp(oy, -hh, hh) };
  }, []);

  const draw = useCallback((sc, ox, oy) => {
    const img = imgRef.current;
    if (!img) return;
    const drawTo = (canvas, w, h) => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      const ratio = w / CROP_W;
      const sw = img.width  * sc * ratio;
      const sh = img.height * sc * ratio;
      ctx.drawImage(img, (w - sw) / 2 + ox * ratio, (h - sh) / 2 + oy * ratio, sw, sh);
    };
    if (canvasRef.current)  drawTo(canvasRef.current,  CROP_W,  CROP_H);
    if (previewRef.current) drawTo(previewRef.current, PREV_W,  PREV_H);
  }, [PREV_W, PREV_H]);

  useEffect(() => {
    if (!imageSrc) return;
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
    if (!imageSrc.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.src = imageSrc;
  }, [imageSrc, clampOffset]);

  useEffect(() => { if (canvasReady) draw(scale, offset.x, offset.y); }, [scale, offset, draw, canvasReady]);

  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragRef.current) return;
    setOffset(clampOffset(dragRef.current.ox + e.clientX - dragRef.current.startX, dragRef.current.oy + e.clientY - dragRef.current.startY, scale));
  }, [dragging, scale, clampOffset]);
  const onMouseUp = () => setDragging(false);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = useCallback((e) => {
    if (!dragging || !dragRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setOffset(clampOffset(dragRef.current.ox + t.clientX - dragRef.current.startX, dragRef.current.oy + t.clientY - dragRef.current.startY, scale));
  }, [dragging, scale, clampOffset]);
  const onTouchEnd = () => setDragging(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 8 * 1024 * 1024)    { setError('Image must be under 8 MB.');    return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !canvasReady) return;
    setUploading(true);
    setError('');
    draw(scale, offset.x, offset.y);

    canvasRef.current.toBlob(async (blob) => {
      try {
        const fileName = `blog/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(fileName, blob, { upsert: false, contentType: 'image/jpeg' });
        if (upErr) throw new Error(upErr.message);
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        onSave(publicUrl);
        onClose();
      } catch (err) {
        setError(err.message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.93);
  };

  if (!isOpen) return null;

  return (
    <div className="biu-overlay" onClick={onClose}>
      <div className="biu-modal" onClick={(e) => e.stopPropagation()}>
        <div className="biu-header">
          <div className="biu-header-text">
            <h3>Featured Image</h3>
            <p>{imageSrc ? 'Drag to reposition · Scroll slider to zoom · 40 : 21 crop (1200×630)' : 'Upload a featured image (1200×630 recommended for blog SEO)'}</p>
          </div>
          <button className="biu-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && <div className="biu-error">{error}</div>}

        <div className="biu-body">
          {imageSrc ? (
            <>
              <div className="biu-canvas-wrap">
                {!canvasReady && <div className="biu-canvas-loading">Loading image…</div>}
                <canvas
                  ref={canvasRef}
                  width={CROP_W}
                  height={CROP_H}
                  className="biu-canvas"
                  style={{ cursor: dragging ? 'grabbing' : 'grab', display: canvasReady ? 'block' : 'none' }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                />
                <div className="biu-canvas-rule">1200 × 630 px</div>
              </div>

              <div className="biu-zoom-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <input
                  type="range" className="biu-zoom-slider"
                  min={minScale} max={minScale * 3} step={0.005}
                  value={scale}
                  onChange={(e) => {
                    const ns = Number(e.target.value);
                    setScale(ns);
                    setOffset(clampOffset(offset.x, offset.y, ns));
                  }}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </div>

              <div className="biu-preview-strip">
                <span className="biu-preview-label">Preview</span>
                <canvas ref={previewRef} width={PREV_W} height={PREV_H} className="biu-preview-canvas" />
              </div>

              <label className="biu-change-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Different Image
                <input type="file" accept="image/*" onChange={handleFile} hidden />
              </label>
            </>
          ) : (
            <label className="biu-dropzone">
              <div className="biu-dropzone-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <span className="biu-dropzone-title">Click to upload featured image</span>
              <span className="biu-dropzone-hint">JPG · PNG · WebP · Max 8 MB · 1200×630 recommended</span>
              <input type="file" accept="image/*" onChange={handleFile} hidden />
            </label>
          )}
        </div>

        <div className="biu-footer">
          <button className="biu-btn biu-btn--cancel" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          {imageSrc && (
            <button className="biu-btn biu-btn--save" onClick={handleSave} disabled={uploading || !canvasReady}>
              {uploading ? (
                <><div className="biu-spinner" />Uploading…</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Save Image
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogImageUpload;
