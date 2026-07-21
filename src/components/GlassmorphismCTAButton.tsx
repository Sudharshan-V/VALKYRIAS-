import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface GlassmorphismCTAButtonProps {
  text: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  id?: string;
  className?: string;
  size?: 'md' | 'lg';
}

export const GlassmorphismCTAButton: React.FC<GlassmorphismCTAButtonProps> = ({
  text,
  icon,
  onClick,
  id,
  className = "",
  size = 'md'
}) => {
  const isLg = size === 'lg';

  return (
    <button
      id={id}
      onClick={onClick}
      className={`group relative isolate flex items-center justify-center bg-gradient-to-r from-[#C8BDD7]/75 to-[#B9E7E6]/75 backdrop-blur-[20px] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),_0_10px_30px_rgba(0,0,0,0.22)] hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),_0_16px_40px_rgba(0,0,0,0.3)] hover:-translate-y-[3px] hover:brightness-[1.08] active:scale-[0.98] transition-all duration-300 active:duration-150 ease-in-out cursor-pointer border-none rounded-full ${
        isLg 
          ? "h-[46px] px-7 gap-[14px] w-full sm:w-auto min-w-[210px]" 
          : "h-[40px] px-5 gap-[10px] w-full"
      } ${className}`}
    >
      {/* Dynamic ambient background glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#C8BDD7] to-[#B9E7E6] opacity-40 blur-[12px] group-hover:opacity-75 group-hover:blur-[18px] transition-all duration-300 pointer-events-none -z-10" />
      <span className={`font-sans font-extrabold uppercase select-none leading-none pt-[1px] text-white ${
        isLg ? "text-[12px] tracking-[4px]" : "text-[10px] tracking-[3px]"
      }`}>
        {text}
      </span>
      {icon ? (
        <span className="transition-transform duration-300 ease-in-out group-hover:translate-x-[4px] group-hover:-translate-y-[2px] shrink-0">
          {icon}
        </span>
      ) : (
        <span className="transition-transform duration-300 ease-in-out group-hover:translate-x-[4px] group-hover:-translate-y-[2px] shrink-0">
          <ArrowUpRight 
            className={`text-white ${isLg ? "w-[18px] h-[18px]" : "w-[14px] h-[14px]"}`} 
            strokeWidth={2.5} 
          />
        </span>
      )}
    </button>
  );
};


