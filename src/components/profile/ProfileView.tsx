import React from 'react';
import { AlertTriangle, ExternalLink, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import type { ProfileResponse } from '../../types';

interface ProfileViewProps {
  profile: ProfileResponse;
}

const EMPTY_VALUE = 'Not provided';

function labelFor(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE;
  return value
    .toLocaleLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | null): string {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatMoney(value: number | null): string {
  if (value === null) return EMPTY_VALUE;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="rounded-xl border border-white/5 bg-obsidian/30 p-3.5">
      <span className="mb-1 block font-mono text-[8px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div className={`break-words text-xs ${empty ? 'italic text-gray-600' : 'text-gray-200'}`}>{empty ? EMPTY_VALUE : value}</div>
    </div>
  );
}

function Tags({ values }: { values: string[] }) {
  if (!values.length) return <span className="italic text-gray-600">{EMPTY_VALUE}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-lg border border-primary-gold/20 bg-primary-gold/10 px-2.5 py-1 text-[10px] text-champagne">
          {value}
        </span>
      ))}
    </div>
  );
}

function ProfileLink({ href }: { href: string | null }) {
  if (!href) return <span className="italic text-gray-600">{EMPTY_VALUE}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary-gold hover:text-champagne hover:underline">
      <span className="truncate">{href}</span><ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

function isProfileIncomplete(profile: ProfileResponse): boolean {
  const sharedIncomplete = !profile.fullName || !profile.displayName || !profile.country || !profile.timezone || !profile.bio;
  if (profile.role === 'CLIENT') {
    return sharedIncomplete || !profile.clientProfile || !profile.clientProfile.companyName || !profile.clientProfile.clientType;
  }
  if (profile.role === 'EDITOR') {
    return sharedIncomplete || !profile.editorProfile || !profile.editorProfile.professionalTitle || profile.editorProfile.skills.length === 0;
  }
  return sharedIncomplete;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile }) => (
  <div className="space-y-7">
    {isProfileIncomplete(profile) && (
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs text-amber-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p className="font-bold">Your profile is incomplete</p>
          <p className="mt-1 leading-relaxed text-amber-400">Add the missing details so your dashboard and collaborator identity stay current.</p>
        </div>
      </div>
    )}

    <section className="space-y-4">
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-white">Account identity</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Detail label="Full name" value={<span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-primary-gold" />{profile.fullName}</span>} />
        <Detail label="Display name" value={profile.displayName} />
        <Detail label="Email" value={<span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary-gold" />{profile.email}</span>} />
        <Detail label="Role" value={<span className="font-mono text-primary-gold">{profile.role}</span>} />
        <Detail label="Phone" value={profile.phoneNumber ? <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary-gold" />{profile.phoneNumber}</span> : null} />
        <Detail label="Country" value={profile.country ? <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary-gold" />{profile.country}</span> : null} />
        <Detail label="Timezone" value={profile.timezone} />
        <Detail label="Member since" value={formatDate(profile.createdAt)} />
      </div>
      <Detail label="Bio" value={profile.bio ? <p className="whitespace-pre-wrap leading-relaxed">{profile.bio}</p> : null} />
    </section>

    {profile.role === 'CLIENT' && (
      <section className="space-y-4">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-white">Client details</h3>
        {profile.clientProfile ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Company" value={profile.clientProfile.companyName} />
            <Detail label="Client type" value={labelFor(profile.clientProfile.clientType)} />
            <Detail label="Preferred communication" value={labelFor(profile.clientProfile.preferredCommunication)} />
            <Detail label="Default project category" value={profile.clientProfile.defaultProjectCategory} />
          </div>
        ) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500">No client details have been added yet.</div>}
      </section>
    )}

    {profile.role === 'EDITOR' && (
      <section className="space-y-4">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-white">Editor details</h3>
        {profile.editorProfile ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Professional title" value={profile.editorProfile.professionalTitle} />
              <Detail label="Experience" value={profile.editorProfile.experienceYears === null ? null : `${profile.editorProfile.experienceYears} years`} />
              <Detail label="Availability" value={labelFor(profile.editorProfile.availabilityStatus)} />
              <Detail label="Starting price" value={profile.editorProfile.startingPrice === null ? null : formatMoney(profile.editorProfile.startingPrice)} />
              <Detail label="Hourly rate" value={profile.editorProfile.hourlyRate === null ? null : formatMoney(profile.editorProfile.hourlyRate)} />
              <Detail label="Delivery time" value={profile.editorProfile.deliveryTime} />
              <Detail label="Location" value={profile.editorProfile.location} />
            </div>
            <Detail label="Skills" value={<Tags values={profile.editorProfile.skills} />} />
            <Detail label="Software used" value={<Tags values={profile.editorProfile.softwareUsed} />} />
            <Detail label="Languages" value={<Tags values={profile.editorProfile.languages} />} />
            <Detail label="Certifications" value={<Tags values={profile.editorProfile.certifications} />} />
            <Detail label="Portfolio summary" value={profile.editorProfile.portfolioSummary ? <p className="whitespace-pre-wrap leading-relaxed">{profile.editorProfile.portfolioSummary}</p> : null} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Detail label="Website" value={<ProfileLink href={profile.editorProfile.websiteUrl} />} />
              <Detail label="Instagram" value={<ProfileLink href={profile.editorProfile.instagramUrl} />} />
              <Detail label="LinkedIn" value={<ProfileLink href={profile.editorProfile.linkedinUrl} />} />
            </div>
          </div>
        ) : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500">No editor details have been added yet.</div>}
      </section>
    )}

    <p className="border-t border-white/5 pt-4 text-right font-mono text-[9px] uppercase tracking-wider text-gray-600">
      Last updated: {formatDate(profile.updatedAt)}
    </p>
  </div>
);
