import React from 'react';
import { useAppState } from '../context/StateContext';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Shield, Sparkles, Sliders, Star, Globe, Mail, Folder, LogIn, Instagram, Youtube, PlayCircle, Phone, MapPin } from 'lucide-react';
import { GlassmorphismCTAButton } from './GlassmorphismCTAButton';
import { ValkyriasLogo } from './ValkyriasLogo';
import { MediaThumbnail } from './common/MediaThumbnail';
import { ProfileAvatar } from './profile/ProfileAvatar';
import type { PortfolioItem } from '../types';
import { LegalDocumentModal } from './common/LegalDocumentModal';
import { safeLower } from '../utils/safeText';

const externalHref = (value: string): string => {
  const clean = value.trim();
  if (!clean) return '#';
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

export const LandingPage: React.FC = () => {
  const { setView, setActivePlan, portfolioItems, loggedInUser, profile, plans, siteSettings } = useAppState();
  const [selectedPortfolioItem, setSelectedPortfolioItem] = React.useState<PortfolioItem | null>(null);
  const [legalModal, setLegalModal] = React.useState<'privacy' | 'terms' | null>(null);

  const { scrollY } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const yGlow1 = useTransform(scrollY, [0, 1500], [0, 180]);
  const yGlow2 = useTransform(scrollY, [0, 1500], [0, -150]);
  const yGlow3 = useTransform(scrollY, [0, 2500], [0, 250]);

  const handleStartProjectClick = () => {
    if (loggedInUser) {
      if (loggedInUser === 'admin') {
        setView('admin');
      } else if (loggedInUser === 'editor') {
        setView('client');
      } else {
        setView('customer');
      }
    } else {
      setView('login');
    }
  };

  const handleSelectPlan = (planId: string) => {
    setActivePlan(planId);
    if (loggedInUser) {
      if (loggedInUser === 'admin') {
        setView('admin');
      } else if (loggedInUser === 'editor') {
        setView('client');
      } else {
        setView('customer');
      }
    } else {
      setView('login');
    }
  };

  return (
    <div className="landing-shell min-h-screen bg-obsidian text-gray-200 font-sans selection:bg-primary-gold/30 selection:text-white relative overflow-x-clip">
      {/* Theme-aware ambient glows with parallax scrolling */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: prefersReducedMotion ? 0 : yGlow1 }} className="landing-glow landing-glow--violet absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]" />
        <motion.div style={{ y: prefersReducedMotion ? 0 : yGlow2 }} className="landing-glow landing-glow--blue absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]" />
        <motion.div style={{ y: prefersReducedMotion ? 0 : yGlow3 }} className="landing-glow landing-glow--gold absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px]" />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-3 py-4 sm:px-6 md:px-12 flex justify-between items-center gap-2">
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="shrink-0">
          <div className="sm:hidden">
            <ValkyriasLogo size="sm" showText={false} />
          </div>
          <div className="hidden sm:block">
            <ValkyriasLogo size="md" />
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-[11px] font-bold tracking-[0.18em] text-gray-400">
          <a href="#about" className="hover:text-white transition">ABOUT</a>
          <a href="#about" className="hover:text-white transition">WHO WE ARE</a>
          <a href="#portfolio" className="hover:text-white transition">WHAT WE DO</a>
          <a href="#portfolio" className="hover:text-white transition">PROJECTS</a>
        </nav>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-laura-ai'))}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary-gold/50 p-0 text-primary-gold transition bg-gradient-to-r from-surface-container-high to-surface-container-lowest text-[10px] font-mono font-bold tracking-[0.2em] cursor-pointer shadow-[0_0_12px_rgba(223,178,113,0.15)] hover:text-white hover:shadow-[0_0_20px_rgba(223,178,113,0.35)] duration-300 whitespace-nowrap sm:h-auto sm:w-auto sm:space-x-2.5 sm:px-4.5 sm:py-2"
            title="Consult Laura AI"
            aria-label="Open Laura AI portal guide"
          >
            <svg
              className="w-5 h-5 text-primary-gold animate-pulse flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-3z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 6v11M12 6L8 10M12 6l4 4M7 14h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden whitespace-nowrap sm:inline">LAURA AI</span>
          </button>

          {loggedInUser && profile ? (
            <button
              type="button"
              onClick={handleStartProjectClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary-gold/40 bg-gradient-to-r from-surface-container-high to-surface-container-lowest p-1 text-[10px] font-mono font-bold tracking-[0.18em] text-primary-gold shadow-[0_0_12px_rgba(223,178,113,0.15)] transition hover:text-white hover:shadow-[0_0_20px_rgba(223,178,113,0.30)] sm:w-auto sm:justify-start sm:gap-2 sm:px-2.5 sm:pr-4"
              aria-label={`Open ${safeLower(profile.role)} portal`}
            >
              <ProfileAvatar
                src={profile.profileImageUrl}
                name={profile.displayName || profile.fullName || profile.email}
                className="h-7 w-7 rounded-full border border-primary-gold/30 bg-obsidian text-[8px] font-black"
              />
              <span className="hidden sm:inline">PORTAL</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView('login')}
                className="neumorphic-button flex h-9 w-9 items-center justify-center rounded-full text-primary-gold sm:hidden"
                aria-label="Open portal"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="hidden sm:block">
                <GlassmorphismCTAButton
                  text="PORTAL"
                  size="md"
                  className="!h-[36px] !px-4 !rounded-full !text-[10px] !tracking-[2px]"
                  onClick={() => setView('login')}
                />
              </div>
            </>
          )}
        </div>
      </header>


      {/* Hero Section */}
      <section className="landing-section-shell relative py-16 md:py-24 px-6 md:px-12 text-center overflow-hidden max-w-7xl mx-auto">
        <div className="landing-section-glow landing-section-glow--hero" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl mx-auto neumorphic-card rounded-[32px] p-8 md:p-16 border border-white/5 relative overflow-hidden"
        >
          {/* Tagline */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full neumorphic-inset text-[10px] font-mono tracking-[0.2em] text-primary-gold mb-6 border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-gold animate-pulse" />
            <span>CINEMATIC EXCELLENCE</span>
          </div>

          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl leading-[1.15] text-white tracking-tight mb-6">
            Crafting Your <br />
            <span className="bg-gradient-to-r from-primary-gold via-champagne to-primary-fixed-dim bg-clip-text text-transparent">
              Digital Identity
            </span>
          </h2>

          <p className="max-w-2xl mx-auto text-gray-400 font-sans font-light text-sm md:text-base leading-relaxed mb-10">
            Valkyrias merges technical mastery with sculpted Neumorphic aesthetics for visionary brands seeking a tactile edge in the modern landscape.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GlassmorphismCTAButton
              id="hero-book-btn"
              text="START PROJECT"
              size="lg"
              onClick={handleStartProjectClick}
            />
            <a
              href="#portfolio"
              className="w-full sm:w-auto h-[46px] px-7 rounded-full text-[12px] font-bold tracking-[4px] text-gray-300 neumorphic-button hover:text-white transition flex items-center justify-center space-x-2 bg-white/5 uppercase"
            >
              <span>SHOWCASE</span>
              <span className="text-[14px] ml-1">⊙</span>
            </a>
          </div>
        </motion.div>

        {/* Collaborators Banner */}
        <div className="mt-12 max-w-5xl mx-auto rounded-[24px] neumorphic-card p-6 md:p-8 border border-white/5 relative overflow-hidden">
          <p className="font-mono text-[9px] tracking-[0.3em] text-primary-gold/60 uppercase mb-4">COLLABORATING WITH VISIONARIES</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 font-mono text-[11px] font-bold tracking-[0.25em] text-gray-500">
            <span className="hover:text-white transition duration-300 cursor-default">AESTHETALES</span>
            <span className="hover:text-white transition duration-300 cursor-default">RAZOR</span>
            <span className="hover:text-white transition duration-300 cursor-default">MADMAX CLUB</span>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section id="about" className="landing-section-shell relative py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5">
        <div className="landing-section-glow landing-section-glow--about" aria-hidden="true" />
        <div className="text-center space-y-4 mb-16">
          <p className="font-mono text-xs tracking-[0.3em] text-primary-gold uppercase">Operational Philosophy</p>
          <h3 className="font-display font-extrabold text-3xl md:text-4xl text-white">Three Pillars of Mastery</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Sliders className="w-7 h-7 text-primary-gold" />,
              title: "Cinematic Precision",
              desc: "Deep color grading, selective masking, and high-fidelity soundscapes crafted by senior editors."
            },
            {
              icon: <Sparkles className="w-7 h-7 text-primary-gold" />,
              title: "Neumorphic Sculpting",
              desc: "Bespoke user interfaces, custom graphics, and layout structures designed with spatial harmony."
            },
            {
              icon: <Shield className="w-7 h-7 text-primary-gold" />,
              title: "Secure Enterprise Pipeline",
              desc: "Bank-grade file storage encryption, real-time revision feedback, and direct cloud deliverables."
            }
          ].map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="neumorphic-card p-8 rounded-2xl flex flex-col items-start space-y-4"
            >
              <div className="w-14 h-14 rounded-xl neumorphic-inset flex items-center justify-center border border-white/5">
                {feat.icon}
              </div>
              <h4 className="font-display font-bold text-xl text-white">{feat.title}</h4>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Published portfolio items loaded from the backend */}
      <section id="portfolio" className="landing-section-shell relative isolate overflow-hidden py-20 px-6 md:px-12 bg-surface-container-low border-t border-b border-white/5">
        <div className="landing-section-glow landing-section-glow--portfolio" aria-hidden="true" />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div className="space-y-4">
              <p className="font-mono text-xs tracking-[0.3em] text-primary-gold uppercase">Featured Creations</p>
              <h3 className="font-display font-black text-3xl md:text-5xl text-white">The Creative Portfolio</h3>
            </div>
            <p className="max-w-md text-sm text-gray-400">
              A meticulously curated preview of our client deliverables across commercial editing, thumbnail optimizations, and brand identity systems.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {portfolioItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedPortfolioItem(item)}
                className="group relative rounded-2xl overflow-hidden neumorphic-card cursor-pointer hover:border-primary-gold/40 border border-transparent transition-all duration-300"
              >
                <div className="theme-dark-media aspect-[4/3] w-full overflow-hidden relative bg-obsidian">
                  <MediaThumbnail
                    src={item.image}
                    alt={item.title}
                    fallback="logo"
                    className="h-full w-full"
                    imageClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent opacity-80" />

                  {/* Hover visual cue */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity duration-300">
                    <span className="w-10 h-10 rounded-full bg-primary-gold/20 border border-primary-gold flex items-center justify-center text-primary-gold shadow-[0_0_15px_rgba(223,178,113,0.3)]">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] text-primary-gold font-bold">VIEW CASE STUDY</span>
                  </div>
                </div>
                <div className="p-6 relative z-10 bg-surface-container/95 border-t border-white/5">
                  <span className="font-mono text-[10px] tracking-widest text-primary-gold font-bold uppercase">
                    {item.category}
                  </span>
                  <h4 className="font-display font-extrabold text-xl text-white mt-1 group-hover:text-primary-gold transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-primary-gold fill-primary-gold" />
                      5.0 (Review)
                    </span>
                    <span className="font-mono text-primary-gold/80 hover:underline">Tap for Details →</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Tiers Section */}
      <section id="pricing" className="landing-section-shell relative isolate py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="landing-section-glow landing-section-glow--pricing" aria-hidden="true" />
        <div className="text-center space-y-4 mb-20">
          <h3 className="font-display font-black text-3xl md:text-5xl text-white">
            Investment in <span className="bg-gradient-to-r from-primary-gold via-champagne to-primary-fixed-dim bg-clip-text text-transparent">Mastery</span>
          </h3>
          <p className="max-w-2xl mx-auto text-sm text-gray-400 font-sans font-light">
            Luxury tiers tailored for visionary brands seeking an unforgettable visual identity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.id || index}
              className={`rounded-[32px] p-8 relative flex flex-col justify-between ${
                plan.isPopular
                  ? "bg-gradient-to-b from-surface-container-high to-surface-container border-2 border-primary-gold/30 shadow-2xl shadow-primary-gold/5"
                  : "neumorphic-card border border-white/5"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-gold to-champagne text-obsidian text-[10px] font-mono font-bold tracking-[0.2em]">
                  MOST POPULAR
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="font-mono text-xs tracking-[0.2em] text-gray-400 font-bold mb-2 uppercase">{plan.name}</h4>
                  {plan.desc && (
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">{plan.desc}</p>
                  )}
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="font-mono text-3xl md:text-4xl font-extrabold text-primary-gold">
                    {plan.customQuote || plan.price === 'CUSTOM' ? 'CUSTOM QUOTE' : `₹${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-xs text-gray-500 font-medium">/ {plan.period}</span>
                  )}
                </div>

                <ul className="space-y-3.5 border-t border-white/5 pt-6 text-sm">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center space-x-3 text-gray-300">
                      <svg className="w-4 h-4 text-primary-gold shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="font-sans text-[13px]">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                {plan.customQuote || plan.price === 'CUSTOM' ? (
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    id={`plan-btn-${index}`}
                    className="w-full h-[46px] rounded-full text-[11px] font-bold tracking-[3px] text-gray-300 hover:text-white transition flex items-center justify-center bg-white/5 border border-white/5 uppercase cursor-pointer"
                  >
                    REQUEST CUSTOM QUOTE
                  </button>
                ) : plan.isPopular ? (
                  <GlassmorphismCTAButton
                    id={`plan-btn-${index}`}
                    text="BOOK ELITE SESSION"
                    size="lg"
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                  />
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    id={`plan-btn-${index}`}
                    className="w-full h-[46px] rounded-full text-[11px] font-bold tracking-[3px] text-gray-300 hover:text-white transition flex items-center justify-center bg-white/5 border border-white/5 uppercase cursor-pointer"
                  >
                    SELECT PLAN
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Access Portal CTA Banner */}
      <section className="landing-section-shell relative isolate overflow-hidden py-16 px-6 md:px-12 bg-surface-container border-t border-white/5">
        <div className="landing-section-glow landing-section-glow--cta" aria-hidden="true" />
        <div className="max-w-4xl mx-auto neumorphic-flat p-8 md:p-12 rounded-3xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-primary-gold/5 blur-3xl" />
          <h3 className="font-display font-extrabold text-2xl md:text-3xl text-white">Already on Board with Valkyrias?</h3>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Log in to your premium client portal or editor dashboard to track real-time rendering, download assets, and discuss milestones directly with your design lead.
          </p>
          <div className="flex justify-center">
            <GlassmorphismCTAButton
              id="cta-portal-btn"
              text="START PROJECT"
              size="lg"
              onClick={handleStartProjectClick}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-obsidian border-t border-white/5 pt-20 pb-10 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16 text-left">
          <div className="space-y-4">
            <h4 className="font-display font-black tracking-[0.25em] text-primary-gold text-lg">VALKYRIAS</h4>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-sans font-light">{siteSettings.brandDescription}</p>
            <div className="flex space-x-3 pt-2">
              <a href={externalHref(siteSettings.websiteUrl)} target="_blank" rel="noreferrer" aria-label="VALKYRIAS website" className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-gray-400 hover:text-white transition bg-white/5"><Globe className="w-4 h-4" /></a>
              <a href={`mailto:${siteSettings.supportEmail}`} aria-label="Email VALKYRIAS" className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-gray-400 hover:text-white transition bg-white/5"><Mail className="w-4 h-4" /></a>
              <a href="#portfolio" aria-label="Open portfolio" className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-gray-400 hover:text-white transition bg-white/5"><Folder className="w-4 h-4" /></a>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase font-bold">STUDIO</h5>
            <ul className="space-y-2.5 text-xs text-gray-400 font-sans">
              <li><a href="#about" className="hover:text-white transition">About</a></li>
              <li><a href="#portfolio" className="hover:text-white transition">Services</a></li>
              <li><a href="#portfolio" className="hover:text-white transition">Work</a></li>
              <li className="flex items-start gap-2 text-gray-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{siteSettings.address}</span></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase font-bold">SOCIAL</h5>
            <ul className="space-y-2.5 text-xs text-gray-400 font-sans">
              <li><a href={externalHref(siteSettings.instagramUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition"><Instagram className="h-3.5 w-3.5" />Instagram</a></li>
              <li><a href={externalHref(siteSettings.vimeoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition"><PlayCircle className="h-3.5 w-3.5" />Vimeo</a></li>
              <li><a href={externalHref(siteSettings.youtubeUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition"><Youtube className="h-3.5 w-3.5" />YouTube</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase font-bold">LEGAL</h5>
            <ul className="space-y-2.5 text-xs text-gray-400 font-sans">
              <li><button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-white transition">Privacy Policy</button></li>
              <li><button type="button" onClick={() => setLegalModal('terms')} className="hover:text-white transition">Terms and Conditions</button></li>
              <li><a href={`mailto:${siteSettings.privacyEmail}`} className="hover:text-white transition">Privacy & Grievance</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono tracking-widest text-gray-500 gap-4">
          <span>© 2026 VALKYRIAS. CINEMATIC EXCELLENCE.</span>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href={`mailto:${siteSettings.supportEmail}`} className="hover:text-white transition">{siteSettings.supportEmail}</a>
            <a href={`tel:${siteSettings.contactPhone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-white transition"><Phone className="h-3 w-3" />{siteSettings.contactPhone}</a>
          </div>
        </div>
      </footer>

      <LegalDocumentModal open={legalModal === 'privacy'} title="Privacy Policy" content={siteSettings.privacyPolicy} onClose={() => setLegalModal(null)} />
      <LegalDocumentModal open={legalModal === 'terms'} title="Terms and Conditions" content={siteSettings.termsConditions} onClose={() => setLegalModal(null)} />

      {/* Portfolio Item Detail Case-Study Modal */}
      {selectedPortfolioItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl rounded-[32px] overflow-hidden bg-surface-container border border-white/10 shadow-2xl relative my-auto"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPortfolioItem(null)}
              className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-obsidian/40 border border-white/10 text-gray-400 hover:text-white hover:border-primary-gold/50 hover:shadow-[0_0_15px_rgba(223,178,113,0.3)] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Image side */}
              <div className="theme-dark-media relative aspect-[4/3] md:aspect-auto md:h-full min-h-[300px] bg-obsidian">
                <MediaThumbnail
                  src={selectedPortfolioItem.image}
                  alt={selectedPortfolioItem.title}
                  fallback="logo"
                  className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-obsidian/90 via-obsidian/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-[0.2em] bg-primary-gold/20 text-primary-gold border border-primary-gold/30 uppercase">
                    {selectedPortfolioItem.category}
                  </span>
                  <h3 className="font-display font-black text-2xl md:text-3xl text-white mt-3 leading-tight">
                    {selectedPortfolioItem.title}
                  </h3>
                </div>
              </div>

              {/* Text Side */}
              <div className="p-8 md:p-12 space-y-8 flex flex-col justify-between bg-surface-container-high">
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-xs font-mono text-primary-gold uppercase tracking-[0.25em]">
                    <Sparkles className="w-4 h-4" />
                    <span>PUBLISHED CASE STUDY</span>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed font-sans font-light">
                    {selectedPortfolioItem.description || 'No description provided.'}
                  </p>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 text-xs">
                    <div className="space-y-1">
                      <span className="text-gray-500 font-mono tracking-wider uppercase text-[9px]">CLIENT BRAND</span>
                      <p className="text-white font-bold font-sans">{selectedPortfolioItem.clientName || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 font-mono tracking-wider uppercase text-[9px]">SOFTWARE SUITE</span>
                      <p className="text-white font-bold font-sans">{selectedPortfolioItem.software || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 font-mono tracking-wider uppercase text-[9px]">DELIVERABLE TYPE</span>
                      <p className="text-white font-bold font-sans">{selectedPortfolioItem.duration || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 font-mono tracking-wider uppercase text-[9px]">PUBLICATION STATUS</span>
                      <p className="text-emerald-400 font-extrabold font-mono text-xs flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-primary-gold fill-primary-gold shrink-0" />
                        PUBLISHED
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setSelectedPortfolioItem(null)}
                    className="flex-1 h-12 rounded-full text-xs font-mono font-bold tracking-[0.2em] text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer text-center flex items-center justify-center uppercase"
                  >
                    CLOSE CASE STUDY
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPortfolioItem(null);
                      setView('login');
                    }}
                    className="flex-1 h-12 rounded-full text-xs font-mono font-bold tracking-[0.2em] text-obsidian bg-primary-gold hover:bg-champagne hover:shadow-[0_0_20px_rgba(223,178,113,0.4)] transition cursor-pointer text-center flex items-center justify-center uppercase"
                  >
                    ORDER SIMILAR WORK
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
