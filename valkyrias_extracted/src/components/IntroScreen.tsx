import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    // Elegant slow-paced intro duration: 3.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Central Ambient Radial Gradient Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.45, 0.45, 0], scale: [0.85, 1.05, 1.05, 0.9] }}
        transition={{
          duration: 3.5,
          times: [0, 0.4, 0.8, 1],
          ease: "easeInOut"
        }}
        className="absolute w-[500px] h-[500px] max-w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(223,178,113,0.18)_0%,rgba(191,157,98,0.06)_40%,transparent_70%)] pointer-events-none blur-3xl"
      />

      {/* Intro Text Content */}
      <div className="relative z-10 text-center max-w-4xl w-full flex items-center justify-center min-h-[250px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 3.5,
            times: [0, 0.4, 0.8, 1],
            ease: "easeInOut"
          }}
          className="relative px-4 py-8 w-full flex flex-col items-center justify-center"
        >
          {/* Elegant, perfectly scaled gold-to-silver-to-bronze gradient text with slow reveal */}
          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-r from-[#e5b358] via-[#fcf5e3] to-[#b88728] bg-clip-text text-transparent uppercase tracking-[0.25em] pl-[0.25em] text-center select-none leading-none py-3 filter drop-shadow-[0_2px_15px_rgba(229,179,88,0.25)]">
            VALKYRIAS
          </h1>
          
          {/* Subtitle with matching slow reveal - Changed to CREATIVE CLOUD and made slightly bigger */}
          <p className="font-mono text-xs sm:text-sm md:text-base tracking-[0.45em] pl-[0.45em] text-gray-300 uppercase mt-5">
            CREATIVE CLOUD
          </p>
        </motion.div>
      </div>
    </div>
  );
};
