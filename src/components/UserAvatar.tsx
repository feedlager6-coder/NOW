'use client';

import React, { useState } from 'react';

export interface UserAvatarProps {
  avatarRef?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 min-w-[20px] min-h-[20px]',
  sm: 'w-6 h-6 min-w-[24px] min-h-[24px]',
  md: 'w-10 h-10 min-w-[40px] min-h-[40px]',
  lg: 'w-14 h-14 min-w-[56px] min-h-[56px]',
  xl: 'w-20 h-20 min-w-[80px] min-h-[80px]',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarRef,
  displayName = 'Участник',
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const borderClass = showBorder ? 'border border-slate-700/80 shadow-sm' : '';
  const baseClasses = `relative rounded-full overflow-hidden inline-flex items-center justify-center flex-shrink-0 bg-slate-800 ${sizeClass} ${borderClass} ${className}`;

  // Fallback neutral SVG silhouette component
  const FallbackSilhouette = (
    <svg
      data-testid="fallback-avatar-svg"
      viewBox="0 0 100 100"
      className="w-full h-full object-cover"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={displayName}
    >
      <rect width="100" height="100" fill="#1e293b" />
      <circle cx="50" cy="38" r="18" fill="#94a3b8" />
      <path
        d="M22 88C22 72.5 34.5 60 50 60C65.5 60 78 72.5 78 88"
        stroke="#94a3b8"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  );

  // If no avatar ref or error occurred, render fallback
  if (!avatarRef || imgError) {
    return <div className={baseClasses}>{FallbackSilhouette}</div>;
  }

  // If avatarRef is single emoji or short symbol
  if (avatarRef.length <= 4 && !avatarRef.includes('/')) {
    return (
      <div className={baseClasses}>
        <span className="select-none text-center leading-none" aria-hidden="true">
          {avatarRef}
        </span>
      </div>
    );
  }

  // Image path (SVG preset in /avatars/ or uploaded file in /uploads/)
  const isPath = avatarRef.startsWith('/') || avatarRef.startsWith('http');
  if (isPath) {
    return (
      <div className={baseClasses}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarRef}
          alt={displayName}
          className="w-full h-full object-cover select-none"
          loading="lazy"
          onError={() => setImgError(true)}
          data-testid="user-avatar-img"
        />
      </div>
    );
  }

  // If unrecognized string format, NEVER render text; fallback to SVG
  return <div className={baseClasses}>{FallbackSilhouette}</div>;
};
