import React, { useEffect, useMemo, useState } from 'react';
import { CircleUserRound } from 'lucide-react';

interface ProfileAvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  name,
  alt = '',
  className = '',
  imageClassName = 'h-full w-full object-cover',
  fallbackClassName = 'text-primary-gold',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = useMemo(() => (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join(''), [name]);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden ${fallbackClassName} ${className}`}>
      {src?.trim() && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailed(true)}
          className={imageClassName}
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <CircleUserRound className="h-1/2 w-1/2" aria-hidden="true" />
      )}
    </span>
  );
};
