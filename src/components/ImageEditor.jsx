import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../lib/supabase';
import { updateAdminProfile } from '../lib/adminProfileApi';
import './ImageEditor.css';

const ASPECT_OPTIONS = [
  { label: 'Lexicon Card', value: 3 / 2, badge: '3:2' },
  { label: 'Square', value: 1, badge: '1:1' },
  { label: 'Portrait', value: 4 / 5, badge: '4:5' },
  { label: 'Landscape', value: 16 / 9, badge: '16:9' },
];

const DEFAULT_ASPECT = ASPECT_OPTIONS[0].value;

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => {
      console.error('Canvas image load error details:', error);
      reject(new Error('Failed to load image for cropping. If this is an existing image, it may be a CORS issue with your storage bucket.'));
    });

    if (!url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }

    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = {
    width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
    height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
  };

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
};

const extractStorageFile = (url) => {
  if (!url || !url.includes('/storage/v1/object/public/')) return null;

  const urlParts = url.split('/storage/v1/object/public/');
  if (urlParts.length < 2) return null;

  const [bucket, ...pathParts] = urlParts[1].split('/');
  const filePath = pathParts.join('/');

  if (!bucket || !filePath) return null;

  return { bucket, filePath };
};

const ImageEditor = ({ isOpen, onClose, currentImageUrl, userId, onSave, onDelete }) => {
  const [imageSrc, setImageSrc] = useState(currentImageUrl || null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [existingImageBroken, setExistingImageBroken] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentImageUrl) return;

    let cancelled = false;
    const previewImage = new Image();

    previewImage.onload = () => {
      if (cancelled) return;
      setImageSrc(currentImageUrl);
    };

    previewImage.onerror = () => {
      if (cancelled) return;
      setExistingImageBroken(true);
      setImageSrc(null);
      setError('The current image could not be loaded. You can upload a replacement image below.');
    };

    if (!currentImageUrl.startsWith('data:')) {
      previewImage.crossOrigin = 'anonymous';
    }

    previewImage.src = currentImageUrl;

    return () => {
      cancelled = true;
    };
  }, [currentImageUrl, isOpen]);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const isDirty = Boolean(imageSrc) && (
    imageSrc !== currentImageUrl ||
    crop.x !== 0 ||
    crop.y !== 0 ||
    zoom !== 1 ||
    rotation !== 0 ||
    aspect !== DEFAULT_ASPECT
  );

  const handleAttemptClose = () => {
    if (uploading) return;

    if (isDirty && !window.confirm('Discard your image changes?')) {
      return;
    }

    onClose();
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(DEFAULT_ASPECT);
    setError('');
    setConfirmDelete(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Please select an image smaller than 5MB');
      return;
    }

    setError('');
    setExistingImageBroken(false);
    setConfirmDelete(false);

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError('');

    try {
      const previousImage = extractStorageFile(currentImageUrl);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const fileName = `${userId}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      await updateAdminProfile({
        userId,
        updateData: { photo_url: publicUrl },
        table: 'user_details',
      });

      if (previousImage && currentImageUrl !== publicUrl) {
        await supabase.storage.from(previousImage.bucket).remove([previousImage.filePath]);
      }

      if (onSave) onSave(publicUrl);
      onClose();
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setUploading(true);
    setError('');

    try {
      await onDelete();
    } catch (err) {
      setError(err.message || 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  const aspectLabel = ASPECT_OPTIONS.find((option) => option.value === aspect)?.badge || '3:2';

  if (!isOpen) return null;

  return (
    <div className="img-editor-overlay" onClick={handleAttemptClose}>
      <div className="img-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="img-editor-header">
          <div className="img-editor-header-copy">
            <h3>Edit Lexicon Card Image</h3>
            <p>Adjust the framing and save the image used on Lexicon profile cards only.</p>
          </div>
          <button className="img-editor-close" onClick={handleAttemptClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="img-editor-error">{error}</div>}

        <div className="img-editor-body">
          {imageSrc ? (
            <>
              <div className="img-editor-toolbar">
                <div className="img-editor-aspects">
                  {ASPECT_OPTIONS.map((option) => (
                    <button
                      key={option.badge}
                      type="button"
                      className={`img-editor-aspect-btn ${aspect === option.value ? 'active' : ''}`}
                      onClick={() => setAspect(option.value)}
                    >
                      <span>{option.label}</span>
                      <strong>{option.badge}</strong>
                    </button>
                  ))}
                </div>
                <button type="button" className="img-editor-reset-btn" onClick={handleReset}>
                  Reset
                </button>
              </div>

              <div className="img-editor-cropper">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid={false}
                />
              </div>

              <div className="img-editor-controls">
                <div className="img-editor-sliders-container">
                  <div className="img-editor-slider-row">
                    <span className="img-editor-slider-label">Zoom</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Zoom Out">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="img-editor-slider"
                    />
                    <span className="img-editor-slider-value">{zoom.toFixed(2)}x</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Zoom In">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </div>
                  <div className="img-editor-slider-row">
                    <span className="img-editor-slider-label">Rotate</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Rotate Left">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="img-editor-slider"
                    />
                    <span className="img-editor-slider-value">{rotation}&deg;</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Rotate Right">
                      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </div>
                </div>

                <label className="img-editor-upload-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Change Image
                  <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
                </label>
              </div>

              <div className="img-editor-status-row">
                <span>Tip: drag the image to reposition it inside the crop frame.</span>
                <span>Current ratio: {aspectLabel}</span>
              </div>
            </>
          ) : (
            <div className="img-editor-upload-area">
              {existingImageBroken && (
                <div className="img-editor-status">
                  The stored image is unavailable. Upload a replacement to restore the profile image.
                </div>
              )}
              <label className="img-editor-dropzone">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Click to upload an image</span>
                <span className="img-editor-dropzone-hint">JPG, PNG, WebP - Max 5MB</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} hidden />
              </label>
            </div>
          )}
        </div>

        <div className="img-editor-footer">
          {currentImageUrl && onDelete && (
            confirmDelete ? (
              <div className="img-editor-delete-confirm">
                <span>Delete this image?</span>
                <button className="img-editor-btn img-editor-btn--delete-yes" onClick={handleDelete} disabled={uploading}>Yes, delete</button>
                <button className="img-editor-btn img-editor-btn--cancel" onClick={() => setConfirmDelete(false)} disabled={uploading}>No</button>
              </div>
            ) : (
              <button
                className="img-editor-btn img-editor-btn--delete"
                onClick={() => setConfirmDelete(true)}
                disabled={uploading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete Image
              </button>
            )
          )}
          <div className="img-editor-footer-right">
            <button className="img-editor-btn img-editor-btn--cancel" onClick={handleAttemptClose} disabled={uploading}>
              Cancel
            </button>
            <button
              className="img-editor-btn img-editor-btn--save"
              onClick={handleSave}
              disabled={!imageSrc || uploading || !croppedAreaPixels}
            >
              {uploading ? (
                <><div className="img-editor-spinner" /> Saving...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Save Image</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
