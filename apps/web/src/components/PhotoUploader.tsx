import { getActiveLocale, t } from '@project4/i18n';
import { useEffect, useRef, useState } from 'react';
import { prepareWebPhoto, type WebPreparedPhoto } from '../utils/photoHelper';
import {
  deferWebPreparedPhotoRelease,
} from '../utils/webPreparedPhotoLifecycle';
import { StatusMessage } from './StatusMessage';

export interface ExistingWebPhoto {
  id: string;
  photoPath: string;
  thumbnailPath: string;
  uri: string;
}

interface PhotoUploaderProps {
  existingPhotos?: ExistingWebPhoto[];
  localPhoto?: WebPreparedPhoto | null;
  onDeleteExistingPhoto?: (photo: ExistingWebPhoto) => Promise<void>;
  onPhotoSelected: (photo: WebPreparedPhoto | null) => void;
}

export function PhotoUploader({
  existingPhotos = [],
  localPhoto,
  onDeleteExistingPhoto,
  onPhotoSelected,
}: PhotoUploaderProps) {
  const locale = getActiveLocale();
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const currentPhotoRef = useRef(localPhoto);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const ownedPhoto = localPhoto;
    currentPhotoRef.current = ownedPhoto;
    return () => {
      deferWebPreparedPhotoRelease(ownedPhoto, () => {
        const currentPhoto = currentPhotoRef.current;
        return Boolean(
          mountedRef.current &&
            currentPhoto &&
            ownedPhoto &&
            currentPhoto.uploadId === ownedPhoto.uploadId &&
            currentPhoto.previewUrl === ownedPhoto.previewUrl,
        );
      });
    };
  }, [localPhoto]);

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

  async function deleteExistingPhoto(photo: ExistingWebPhoto) {
    if (
      !onDeleteExistingPhoto ||
      deletingPhotoId ||
      !window.confirm(t(locale, 'photo.deleteConfirm'))
    ) {
      return;
    }

    setError(null);
    setDeletingPhotoId(photo.id);
    try {
      await onDeleteExistingPhoto(photo);
    } catch {
      setError(t(locale, 'photo.deleteError'));
    } finally {
      setDeletingPhotoId(null);
    }
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

      {existingPhotos.length > 0 ? (
        <div className="photo-existing-list">
          {existingPhotos.map((photo) => (
            <div className="photo-thumbnail-container" key={photo.id}>
              <img
                src={photo.uri}
                alt={t(locale, 'photo.savedPhotos')}
                className="photo-thumbnail-img"
              />
              {onDeleteExistingPhoto ? (
                <button
                  aria-label={t(locale, 'common.remove')}
                  className="photo-remove-btn"
                  disabled={deletingPhotoId !== null}
                  onClick={() => void deleteExistingPhoto(photo)}
                  title={
                    deletingPhotoId === photo.id
                      ? t(locale, 'photo.deleting')
                      : t(locale, 'common.remove')
                  }
                  type="button"
                >
                  &times;
                </button>
              ) : null}
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
          {loading
            ? t(locale, 'app.loading')
            : t(locale, localPhoto ? 'photo.replace' : 'photo.pick')}
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
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
