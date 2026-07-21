import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, ArrowUpRight } from 'lucide-react';
import { useAppState } from '../context/StateContext';

const ValkyrieIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
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
);

export const LauraAIChat: React.FC = () => {
  const { setView, setActivePlan, loggedInUser } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'laura' | 'user'; text: string }>>([
    {
      id: '1',
      sender: 'laura',
      text: "Welcome to Valkyrias. I am Laura, your executive brand advisor. How can I assist you with your digital masterpiece today?"
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Open chat on custom event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-laura-ai', handleOpen);
    return () => window.removeEventListener('open-laura-ai', handleOpen);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Suggested prompts for users
  const suggestions = [
    { label: "Our Services", text: "What services does Valkyrias offer?" },
    { label: "Active Packages", text: "Tell me about your pricing packages." },
    { label: "Book a Project", text: "How can I start a project with you?" },
    { label: "Client Portal", text: "How does the secure client portal work?" }
  ];

  // Smart responsive engine for Laura AI
  const getSmartResponse = (input: string): string => {
    const text = input.toLowerCase();
    
    if (text.includes('book elite') || text.includes('choose package') || text.includes('select package') || text.includes('select plan') || text.includes('buy plan')) {
      return "Certainly! I would be delighted to assist you with booking or selecting your premium Valkyrias package.\n\nSince we prioritize absolute compliance and security, choosing a package will synchronize with your client portal dashboard. Please select your package below to proceed:";
    }
    
    if (text.includes('service') || text.includes('pillar') || text.includes('what do you do') || text.includes('work')) {
      return "Valkyrias operates across three pillars of technical mastery:\n\n1. **Cinematic Precision**: Deep color grading, high-fidelity compositions, and executive film editing.\n2. **Neumorphic Sculpting**: Bespoke tactile user interfaces designed with absolute spatial harmony.\n3. **Full-Stack Innovation**: Highly secure web experiences paired with lightning-fast performance.\n\nWhich pillar excites your team the most?";
    }
    
    if (text.includes('package') || text.includes('pricing') || text.includes('cost') || text.includes('price') || text.includes('plan')) {
      return "We offer three meticulously tailored cinematic tiers:\n\n• **Standard Tier** (₹1,50,000.00): Perfect for refined, focused editorial projects.\n• **Cinematic Package** (₹4,50,000.00): Our signature end-to-end production with advanced sound design.\n• **Valkyrias Sovereign** (₹12,50,000.00): Bespoke world-building, limitless revisions, and a dedicated post-production squad.\n\nWould you like me to redirect you to our pricing checkout? Please choose a package below:";
    }
    
    if (text.includes('book') || text.includes('start') || text.includes('hire') || text.includes('begin')) {
      return "Initiating a project with us is exceptionally direct. \n\nYou can select any of our premium packages below, and it will direct you to our highly secure portal or login gateway to lock in your slot. Let me know if you would like me to set that up for you!";
    }

    if (text.includes('portal') || text.includes('client') || text.includes('login') || text.includes('dashboard')) {
      return "Our **Valkyrias secure client portal** is a central command center where you can view live project progress, download certified deliverables, review action items, and approve milestones securely. \n\nYou can login using your registered email (e.g. `tanishq@reliancejewels.com` for clients or `marcus@valkyrias.agency` for editors) to explore your active environment!";
    }

    if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('laura')) {
      return "Hello! I am delighted to consult with you. Tell me about your brand vision, or ask me anything about our high-fidelity engineering and production suites.";
    }

    if (text.includes('contact') || text.includes('email') || text.includes('phone') || text.includes('reach')) {
      return "You can reach our executive desk at **concierge@valkyrias.agency**. If you log in to your secure portal, you also gain direct 24/7 access to our senior editors and administrators.";
    }

    return "Fascinating query. At Valkyrias, we believe every pixel should carry weight. I've noted this, and our creative directors will be briefed. Would you like to proceed with exploring our packages, or would you like to review our secure login portal?";
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user' as const,
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate luxury slow executive response typing
    setTimeout(() => {
      const responseText = getSmartResponse(textToSend);
      const lauraMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'laura' as const,
        text: responseText
      };
      setMessages(prev => [...prev, lauraMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* Neumorphic Gold-Glowing Animated Floating FAB Button */}
      <motion.button
        id="laura-ai-fab-button"
        onClick={() => setIsOpen(!isOpen)}
        animate={{
          scale: isOpen ? 0.9 : [1, 1.05, 1],
          boxShadow: [
            "0 4px 20px rgba(223,178,113,0.15)",
            "0 4px 35px rgba(223,178,113,0.45)",
            "0 4px 20px rgba(223,178,113,0.15)"
          ]
        }}
        transition={{
          scale: { duration: 0.2 },
          boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#13141a] to-[#07080a] border border-[#dfb271]/50 flex items-center justify-center cursor-pointer group active:scale-95 shadow-lg select-none"
        title="Consult Laura AI"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <ValkyrieIcon className="w-6 h-6 text-[#dfb271] group-hover:scale-110 transition-transform duration-300" />
        </motion.div>
        
        {/* Subtle pulsing indicator ring */}
        <span className="absolute inset-0 rounded-full border border-[#dfb271]/30 animate-ping opacity-25 pointer-events-none" />
      </motion.button>

      {/* Laura AI Chatbox Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="fixed bottom-24 right-6 z-40 w-[350px] sm:w-[380px] h-[520px] bg-[#090a0f] border border-[#dfb271]/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Ambient gold background glow within chatbox */}
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(223,178,113,0.12),transparent)] pointer-events-none z-0" />

            {/* Chatbox Header */}
            <div className="relative z-10 px-5 py-4 border-b border-white/[0.04] bg-[#090a0f]/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#dfb271]/10 to-[#bf9d62]/30 border border-[#dfb271]/40 flex items-center justify-center shadow-[0_0_10px_rgba(223,178,113,0.15)]">
                  <ValkyrieIcon className="w-4 h-4 text-[#dfb271]" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-[12px] text-white tracking-widest uppercase">
                    LAURA AI
                  </h4>
                  <p className="text-[9px] font-mono tracking-wider text-primary-gold/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    EXECUTIVE ADVISOR
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] flex-shrink-0 ${
                      msg.sender === 'user'
                        ? 'bg-white/5 border-white/10 text-gray-300'
                        : 'bg-[#dfb271]/10 border-[#dfb271]/30 text-[#dfb271]'
                    }`}>
                      {msg.sender === 'user' ? <User className="w-3 h-3" /> : <ValkyrieIcon className="w-3 h-3 text-[#dfb271]" />}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-xs font-sans leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-[#dfb271] text-[#090a0f] font-semibold rounded-tr-none'
                        : 'bg-white/[0.02] border border-white/[0.05] text-gray-200 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      {/* Interactive Redirect Action for Booking Packages */}
                      {msg.sender === 'laura' && (msg.text.includes('Standard Tier') || msg.text.includes('select your package') || msg.text.includes('premium packages') || msg.text.includes('packages')) && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-2.5">
                          <button
                            onClick={() => {
                              setActivePlan('ELITE CREATOR');
                              if (loggedInUser) {
                                if (loggedInUser === 'admin') setView('admin');
                                else if (loggedInUser === 'editor') setView('client');
                                else setView('customer');
                              } else {
                                setView('login');
                              }
                              setIsOpen(false);
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-[#dfb271] text-[#090a0f] font-bold text-[10px] tracking-wider uppercase hover:brightness-110 active:scale-[0.98] transition cursor-pointer text-center"
                          >
                            Book Elite Session
                          </button>
                          <button
                            onClick={() => {
                              setActivePlan('ASSET STARTER');
                              if (loggedInUser) {
                                if (loggedInUser === 'admin') setView('admin');
                                else if (loggedInUser === 'editor') setView('client');
                                else setView('customer');
                              } else {
                                setView('login');
                              }
                              setIsOpen(false);
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white font-bold text-[10px] tracking-wider uppercase active:scale-[0.98] transition cursor-pointer text-center"
                          >
                            Select Asset Starter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Animation */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#dfb271]/10 border border-[#dfb271]/30 flex items-center justify-center">
                      <ValkyrieIcon className="w-3 h-3 text-[#dfb271]" />
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl rounded-tl-none px-4 py-3 flex space-x-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dfb271]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dfb271]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#dfb271]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions Slider */}
            {messages.length === 1 && !isTyping && (
              <div className="px-4 py-2 border-t border-white/[0.03] overflow-x-auto flex space-x-2 scrollbar-none bg-[#090a0f]/50 relative z-10 select-none">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug.text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.01] hover:border-[#dfb271]/40 text-[10px] text-gray-400 hover:text-white transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{sug.label}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 text-[#dfb271]" />
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="relative z-10 p-4 border-t border-white/[0.04] bg-[#090a0f]"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask Laura about services, tiers..."
                  className="w-full px-4 py-3 bg-[#0d0e14] border border-white/[0.06] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#dfb271]/50 focus:ring-1 focus:ring-[#dfb271]/20 transition-all pr-12"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-[#dfb271] to-[#bf9d62] text-[#090a0f] hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
