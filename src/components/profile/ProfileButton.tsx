import React from 'react';
import { CircleUserRound } from 'lucide-react';

interface ProfileButtonProps {
  onClick: () => void;
  compact?: boolean;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({ onClick, compact = false }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open my profile"
    className="neumorphic-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-mono text-[10px] font-bold tracking-wider text-primary-gold transition hover:text-champagne"
  >
    <CircleUserRound className="h-4 w-4" />
    {!compact && <span className="hidden sm:inline">MY PROFILE</span>}
  </button>
);
