import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, UploadCloud } from 'lucide-react';
import { ApiError, deleteMyAvatar, uploadMyAvatar } from '../../api';
import type { ProfileResponse } from '../../types';
import { ValkyriasLoader } from '../common/ValkyriasLoader';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileImageCropDialog } from './ProfileImageCropDialog';

interface AvatarUploaderProps {
  profile: ProfileResponse;
  onChanged: (profile: ProfileResponse | null, message: string) => void | Promise<void>;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

function isAllowedAvatarFile(file: File): boolean {
  if (ALLOWED_AVATAR_TYPES.has(file.type)) return true;

  const browserTypeIsUnreliable = !file.type || file.type === 'application/octet-stream';
  const extension = file.name.split('.').pop()?.toLocaleLowerCase() ?? '';
  return browserTypeIsUnreliable && ALLOWED_AVATAR_EXTENSIONS.has(extension);
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ profile, onChanged }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<'upload' | 'delete' | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const chooseFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!isAllowedAvatarFile(file)) {
      clearSelection();
      setError('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      clearSelection();
      setError('The profile image must be 5 MB or smaller.');
      return;
    }
    if (file.size === 0) {
      clearSelection();
      setError('The selected image is empty.');
      return;
    }

    setCropSourceFile(file);
  };

  const restoreChooseButtonFocus = () => {
    window.requestAnimationFrame(() => chooseButtonRef.current?.focus());
  };

  const cancelCrop = () => {
    setCropSourceFile(null);
    if (inputRef.current) inputRef.current.value = '';
    restoreChooseButtonFocus();
  };

  const applyCrop = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCropSourceFile(null);
    if (inputRef.current) inputRef.current.value = '';
    restoreChooseButtonFocus();
  };

  const upload = async () => {
    if (!selectedFile) return;
    setBusyAction('upload');
    setError('');
    try {
      const updated = await uploadMyAvatar(selectedFile);
      clearSelection();
      await onChanged(updated, 'Profile image updated successfully.');
    } catch (uploadError) {
      setError(uploadError instanceof ApiError || uploadError instanceof Error
        ? uploadError.message
        : 'Unable to upload the profile image.');
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async () => {
    if (!profile.profileImageUrl) return;
    setBusyAction('delete');
    setError('');
    try {
      await deleteMyAvatar();
      clearSelection();
      await onChanged(null, 'Profile image removed.');
      setRemoveConfirmOpen(false);
    } catch (deleteError) {
      setError(deleteError instanceof ApiError || deleteError instanceof Error
        ? deleteError.message
        : 'Unable to remove the profile image.');
    } finally {
      setBusyAction(null);
    }
  };

  const imageUrl = previewUrl || profile.profileImageUrl;


  return (
    <>
      <div className="rounded-2xl border border-white/5 bg-obsidian/30 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0">
          <ProfileAvatar
            src={imageUrl}
            name={profile.displayName || profile.fullName || profile.email}
            alt="Profile preview"
            className="h-24 w-24 rounded-2xl border border-primary-gold/20 bg-obsidian text-xl font-black shadow-[inset_4px_4px_10px_rgba(0,0,0,0.35)]"
          />
          {previewUrl && <span className="absolute bottom-1.5 right-1.5 rounded bg-primary-gold px-1.5 py-0.5 font-mono text-[7px] font-bold text-obsidian">PREVIEW</span>}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-display text-sm font-extrabold text-white">Profile image</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-500">PNG, JPEG, or WebP. Maximum file size 5 MB.</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => chooseFile(event.target.files?.[0])}
            className="hidden"
            id="profile-avatar-input"
            tabIndex={-1}
          />
          <div className="flex flex-wrap gap-2">
            <button
              ref={chooseButtonRef}
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => inputRef.current?.click()}
              className="neumorphic-button inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold text-gray-300 transition hover:text-primary-gold disabled:cursor-wait disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> Choose image
            </button>
            {selectedFile && (
              <button
                type="button"
                onClick={upload}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-gold px-3 py-2 text-[10px] font-extrabold text-obsidian transition hover:bg-champagne disabled:opacity-50"
              >
                {busyAction === 'upload' ? <ValkyriasLoader compact label="Uploading profile image" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Upload image
              </button>
            )}
            {profile.profileImageUrl && !selectedFile && (
              <button
                type="button"
                onClick={() => setRemoveConfirmOpen(true)}
                disabled={Boolean(busyAction)}
                className="neumorphic-button inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold text-red-400 transition hover:text-red-300 disabled:opacity-50"
              >
                {busyAction === 'delete' ? <ValkyriasLoader compact label="Removing profile image" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </button>
            )}
            {selectedFile && (
              <button type="button" onClick={clearSelection} disabled={Boolean(busyAction)} className="px-2 py-2 text-[10px] text-gray-500 transition hover:text-white">
                Cancel preview
              </button>
            )}
          </div>
          {selectedFile && <p className="truncate font-mono text-[9px] text-primary-gold">{selectedFile.name} | {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>}
          {error && <p role="alert" className="text-[10px] text-red-400">{error}</p>}
        </div>
        </div>
      </div>
      <ConfirmDialog
        open={removeConfirmOpen}
        title="Remove profile image?"
        description="Your current profile image will be permanently removed from secure storage. You can upload a replacement at any time."
        confirmLabel="Remove image"
        busy={busyAction === 'delete'}
        error={removeConfirmOpen ? error : null}
        onCancel={() => {
          setRemoveConfirmOpen(false);
          setError('');
        }}
        onConfirm={() => void remove()}
      />
      <ProfileImageCropDialog
        open={Boolean(cropSourceFile)}
        file={cropSourceFile}
        onCancel={cancelCrop}
        onApply={applyCrop}
      />
    </>
  );
};
