import React, { useEffect, useState } from 'react';
import { FileImage, Layers } from 'lucide-react';
import { ValkyriasLogo } from '../ValkyriasLogo';

interface MediaThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallback?: 'project' | 'file' | 'logo';
}

export const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  src,
  alt,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  fallback = 'project',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src?.trim()) && !failed;

  return (
    <div className={`relative overflow-hidden bg-surface-container ${className}`}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={imageClassName}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary-gold" aria-label={`${alt} thumbnail unavailable`}>
          {fallback === 'logo' ? (
            <ValkyriasLogo size="sm" showText={false} />
          ) : fallback === 'file' ? (
            <FileImage className="h-5 w-5" />
          ) : (
            <Layers className="h-5 w-5" />
          )}
        </div>
      )}
    </div>
  );
};
