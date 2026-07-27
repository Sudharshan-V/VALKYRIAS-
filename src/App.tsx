import React, { useState } from 'react';
import { AppStateProvider, useAppState } from './context/StateContext';
import { LandingPage } from './components/LandingPage';
import { LoginPortal } from './components/LoginPortal';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { CheckoutPage } from './components/CheckoutPage';
import { IntroScreen } from './components/IntroScreen';
import { LauraAIChat } from './components/LauraAIChat';
import { ThemeSwitcher } from './components/common/ThemeSwitcher';
import { ScrollRevealController } from './components/common/ScrollRevealController';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';

function isOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('auth_callback') === 'google' || params.has('code');
}

function isPasswordRecoveryRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash).get('type') === 'recovery' || new URLSearchParams(window.location.search).get('type') === 'recovery';
}

function NavigationRouter() {
  const { view } = useAppState();
  const [showIntro, setShowIntro] = useState(() => !isPasswordRecoveryRedirect() && !isOAuthCallback());

  React.useEffect(() => {
    const handleReplay = () => setShowIntro(true);
    window.addEventListener('replay-intro', handleReplay);
    return () => window.removeEventListener('replay-intro', handleReplay);
  }, []);

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  const renderActiveView = () => {
    switch (view) {
      case 'landing':
        return <LandingPage />;
      case 'login':
        return <LoginPortal />;
      case 'reset-password':
        return <ResetPasswordScreen />;
      case 'admin':
        return <AdminDashboard />;
      case 'client':
        return <ClientDashboard />;
      case 'customer':
        return <CustomerPortal />;
      case 'checkout':
        return <CheckoutPage />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen bg-obsidian text-gray-200 selection:bg-primary-gold/30 selection:text-white"
        >
          {renderActiveView()}
        </motion.div>
      </AnimatePresence>
      <ThemeSwitcher />
      <LauraAIChat />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <ScrollRevealController />
        <NavigationRouter />
      </AppStateProvider>
    </ThemeProvider>
  );
}
