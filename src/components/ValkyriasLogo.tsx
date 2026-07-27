import React from 'react';

interface ValkyriasLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'giant';
  showText?: boolean;
  centered?: boolean;
}

export const ValkyriasLogo: React.FC<ValkyriasLogoProps> = ({
  size = 'md',
  showText = true,
  centered = false,
}) => {
  // Sizing definitions
  const sizeMap = {
    sm: { container: 'w-8 h-8', textTitle: 'text-[12px]', textSub: 'text-[7px]' },
    md: { container: 'w-10 h-10', textTitle: 'text-[14px] md:text-base', textSub: 'text-[8px]' },
    lg: { container: 'w-16 h-16', textTitle: 'text-xl md:text-2xl', textSub: 'text-[10px]' },
    xl: { container: 'w-24 h-24', textTitle: 'text-3xl md:text-4xl', textSub: 'text-xs' },
    giant: { container: 'w-36 h-36', textTitle: 'text-4xl md:text-5xl', textSub: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`valkyrias-brand-logo flex ${centered ? 'flex-col items-center text-center' : 'items-center space-x-3'} group cursor-pointer select-none`}>
      {/* Bird Icon with Golden Glow */}
      <div className={`valkyrias-brand-emblem relative ${currentSize.container} flex-shrink-0`}>
        {/* Ambient golden radial glow behind the bird */}
        <div className="valkyrias-brand-aura absolute inset-0 bg-primary-gold/25 rounded-full blur-[10px] scale-95 group-hover:scale-110 transition-transform duration-500 animate-pulse" />

        <svg
          className="valkyrias-brand-mark w-full h-full text-primary-gold filter drop-shadow-[0_0_8px_rgba(223,178,113,0.75)] drop-shadow-[0_0_16px_rgba(223,178,113,0.4)] transition-transform duration-500 group-hover:scale-105"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Phoenix Bird Path Structure */}
          <g fill="currentColor">
            {/* Central Body & Head */}
            <path d="M50,82 C46.5,72 43.5,53.5 45.5,38.5 C46.5,33.5 48.5,30.5 50,30.5 C51.5,30.5 53.5,33.5 54.5,38.5 C56.5,53.5 53.5,72 50,82 Z" />

            {/* Head details: Beak & Crest feathers */}
            <path d="M48,30.5 C44,28.5 40,24.5 40.5,19.5 C41,18 43,18 44.5,20 C46.5,22.5 48.5,25.5 48.5,28.5 Z" />
            <path d="M50,28.5 C51,25.5 53,22.5 55,23.5 C57,24.5 58,26.5 56.5,28 C54.5,29.5 52,30 50,30.5 Z" />

            {/* Tail feathers */}
            <path d="M50,82 L47,94 C46.5,96 48.5,98 50,96.5 C51.5,98 53.5,96 53,94 Z" />
            <path d="M50,82 L43,91 C42,92.5 44,94.5 45.5,93.5 L50,86 Z" />
            <path d="M50,82 L57,91 C58,92.5 56,94.5 54.5,93.5 L50,86 Z" />

            {/* Left Wing - Symmetrical feathers sweeping high */}
            <path d="M38,72 C22,61 10.5,38.5 14,16.5 C16,11 19.5,13.5 22,20 C25.5,31 31.5,46.5 41.5,57.5 C42.5,58.5 42,60 40,59.5 C35.5,58 31,55 27,51 C24,48 21.5,44 19.5,40.5 C19,39.5 17,40.5 17.5,41.5 C20,47 24,53.5 29.5,59 C36,65.5 44,70 41,72.5 C40,73.5 39,73 38,72 Z" />
            <path d="M35,61 C24.5,51 16.5,32.5 19.5,14.5 C21,10 24,12 26,17.5 C29.5,27 34,39.5 42.5,47.5 C43.5,48.5 43,50 41,49.5 C37,48 33,45 29.5,41 C27.5,38.5 25.5,35 24,31.5 C23.5,30.5 21.5,31.5 22,32.5 C24.5,37.5 28,43 32.5,47.5 C38,53 43.5,56 40,58.5 C38.5,59.5 37,59.5 35,61 Z" />
            <path d="M31.5,48 C24,38.5 19,23.5 21.5,9 C22.5,5 25.5,7 27,12 C29.5,20.5 33.5,31.5 40.5,38 C41.5,39 41,40.5 39,40 C36,39 32.5,36.5 29.5,33 C27.5,30.5 26,27 24.5,23.5 C24,22.5 22,23.5 22.5,24.5 C24.5,29 27.5,33.5 31.5,38 C35.5,42.5 38.5,44.5 35.5,46.5 C34.5,47.5 33,47.5 31.5,48 Z" />

            {/* Right Wing - Symmetrical feathers sweeping high */}
            <path d="M62,72 C78,61 89.5,38.5 86,16.5 C84,11 80.5,13.5 78,20 C74.5,31 68.5,46.5 58.5,57.5 C57.5,58.5 58,60 60,59.5 C64.5,58 69,55 73,51 C76,48 78.5,44 80.5,40.5 C81,39.5 83,40.5 82.5,41.5 C80,47 76,53.5 70.5,59 C64,65.5 56,70 59,72.5 C60,73.5 61,73 62,72 Z" />
            <path d="M65,61 C75.5,51 83.5,32.5 80.5,14.5 C79,10 76,12 74,17.5 C70.5,27 66,39.5 57.5,47.5 C56.5,48.5 57,50 59,49.5 C63,48 67,45 70.5,41 C72.5,38.5 74.5,35 76,31.5 C76.5,30.5 78.5,31.5 78,32.5 C75.5,37.5 72,43 67.5,47.5 C62,53 56.5,56 60,58.5 C61.5,59.5 63,59.5 65,61 Z" />
            <path d="M68.5,48 C76,38.5 81,23.5 78.5,9 C77.5,5 74.5,7 73,12 C70.5,20.5 66.5,31.5 59.5,38 C58.5,39 59,40.5 61,40 C64,39 67.5,36.5 70.5,33 C72.5,30.5 74,27 75.5,23.5 C76,22.5 78,23.5 77.5,24.5 C75.5,29 72.5,33.5 68.5,38 C64.5,42.5 61.5,44.5 64.5,46.5 C65.5,47.5 67,47.5 68.5,48 Z" />
          </g>
        </svg>
      </div>

      {/* Text Labels with Gray Gradient & Shimmer Sweeper */}
      {showText && (
        <div className={`flex flex-col relative overflow-hidden py-1 pr-2 ${centered ? 'mt-4 items-center' : ''}`}>
          <h1 className={`valkyrias-brand-wordmark font-display font-extrabold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-100 to-gray-500 uppercase relative select-none leading-none ${currentSize.textTitle}`}>
            VALKYRIAS
            {/* Sweeper shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
          </h1>
          <span className={`valkyrias-brand-subtitle font-mono tracking-[0.4em] text-gray-500 uppercase mt-1.5 relative leading-none ${currentSize.textSub}`}>
            SINCE 2022
            {/* Sweeper shimmer for subtitle */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
          </span>
        </div>
      )}
    </div>
  );
};
