import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { useRef, useState } from 'react';
import { prepareWebPhoto, type WebPreparedPhoto } from '../utils/photoHelper';

interface PhotoUploaderProps {
  existingPhotoUris?: string[];
  localPhoto?: WebPreparedPhoto | null;
  onPhotoSelected: (photo: WebPreparedPhoto | null) => void;
}

export function PhotoUploader({
  existingPhotoUris = [],
  localPhoto,
  onPhotoSelected,
}: PhotoUploaderProps) {
  const locale = DEFAULT_LOCALE;
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setLoading(true);
    try {
      const prepared = await prepareWebPhoto(file);
      onPhotoSelected(prepared);
    } catch {
      setError(t(locale, 'photo.prepareError'));
    } finally {
      setLoading(false);
    }
  }

  function triggerLibrarySelect() {
    libraryInputRef.current?.click();
  }

  function triggerCameraCapture() {
    cameraInputRef.current?.click();
  }

  function formatSizeSummary(photo: WebPreparedPhoto) {
    return t(locale, 'photo.sizeSummary')
      .replace('{width}', String(photo.metadata.widthPx))
      .replace('{height}', String(photo.metadata.heightPx))
      .replace('{kilobytes}', String(Math.round(photo.metadata.sizeBytes / 1024)));
  }

  return (
    <div className="photo-uploader">
      <input
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        ref={libraryInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {localPhoto ? (
        <div className="photo-preview-block">
          <div className="photo-thumbnail-container">
            <img
              src={localPhoto.previewUrl}
              alt={t(locale, 'photo.preview')}
              className="photo-thumbnail-img"
            />
            <button
              type="button"
              className="photo-remove-btn"
              onClick={() => onPhotoSelected(null)}
              title={t(locale, 'common.remove')}
            >
              &times;
            </button>
          </div>
          <p className="photo-size-summary">{formatSizeSummary(localPhoto)}</p>
        </div>
      ) : null}

      {existingPhotoUris.length > 0 ? (
        <div className="photo-existing-list">
          {existingPhotoUris.map((uri) => (
            <div className="photo-thumbnail-container" key={uri}>
              <img src={uri} alt={t(locale, 'photo.savedPhotos')} className="photo-thumbnail-img" />
            </div>
          ))}
        </div>
      ) : null}

      <p className="field-help">{t(locale, 'photo.storageWarning')}</p>

      <div className="photo-uploader-actions">
        <button
          type="button"
          className="secondary-button photo-action-button"
          disabled={loading}
          onClick={triggerLibrarySelect}
        >
          {loading ? t(locale, 'app.loading') : t(locale, localPhoto ? 'photo.replace' : 'photo.pick')}
        </button>
        <button
          type="button"
          className="secondary-button photo-action-button"
          disabled={loading}
          onClick={triggerCameraCapture}
        >
          {t(locale, 'photo.take')}
        </button>
      </div>
      {error ? <p className="notice error">{error}</p> : null}
    </div>
  );
}
