import React from 'react';
import { useAppState } from '../../context/StateContext';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileButtonProps {
  onClick: () => void;
  compact?: boolean;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({ onClick, compact = false }) => {
  const { profile } = useAppState();
  const name = profile?.displayName || profile?.fullName || profile?.email || 'My Profile';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open profile for ${name}`}
      className="neumorphic-button inline-flex max-w-[220px] shrink-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2 font-mono text-[10px] font-bold tracking-wider text-primary-gold transition hover:text-champagne"
    >
      <ProfileAvatar
        src={profile?.profileImageUrl}
        name={name}
        className="h-7 w-7 rounded-lg border border-primary-gold/20 bg-obsidian text-[9px] font-black"
      />
      {!compact && <span className="hidden max-w-[150px] truncate sm:inline">{name}</span>}
    </button>
  );
};
