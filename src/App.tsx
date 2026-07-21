import React, { useState } from 'react';
import { AppStateProvider, useAppState } from './context/StateContext';
import { LandingPage } from './components/LandingPage';
import { LoginPortal } from './components/LoginPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { CheckoutPage } from './components/CheckoutPage';
import { IntroScreen } from './components/IntroScreen';
import { LauraAIChat } from './components/LauraAIChat';
import { AnimatePresence, motion } from 'motion/react';

function NavigationRouter() {
  const { view } = useAppState();
  const [showIntro, setShowIntro] = useState(true);

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
      <LauraAIChat />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <NavigationRouter />
    </AppStateProvider>
  );
}
