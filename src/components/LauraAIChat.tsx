import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Send, X } from 'lucide-react';
import { useAppState } from '../context/StateContext';
import { listServices } from '../api/serviceApi';
import type { ServiceResponse } from '../types';
import { useContainedAutoScroll } from '../hooks/useContainedAutoScroll';
import { ValkyriasLoader } from './common/ValkyriasLoader';
import { ProfileAvatar } from './profile/ProfileAvatar';
import { safeLower } from '../utils/safeText';

interface LauraMessage {
  id: string;
  sender: 'laura' | 'user';
  text: string;
  showPlans?: boolean;
}

type LauraTopic = 'services' | 'pricing' | 'booking' | 'portal' | 'uploads' | 'preview' | 'payment' | 'profile' | 'support';

interface LauraResponse {
  text: string;
  showPlans?: boolean;
  topic?: LauraTopic;
}

const ValkyrieIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 6v11M12 6L8 10M12 6l4 4M7 14h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const suggestions = [
  { label: 'Our Services', text: 'What services does Valkyrias offer?' },
  { label: 'Active Packages', text: 'Show me the current pricing packages.' },
  { label: 'Book a Project', text: 'How do I start a project?' },
  { label: 'Portal Help', text: 'How does my portal work?' },
];

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export const LauraAIChat: React.FC = () => {
  const { setView, setActivePlan, loggedInUser, profile, plans } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<LauraMessage[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const responseTimerRef = useRef<number | null>(null);
  const lastTopicRef = useRef<LauraTopic | null>(null);
  const lastMessageKey = isTyping ? 'typing' : messages.at(-1)?.id;
  const chatScrollRef = useContainedAutoScroll<HTMLDivElement>(lastMessageKey, isOpen);

  const openChat = () => {
    setIsOpen(true);
    setMessages((current) => current.length > 0 ? current : [{
      id: crypto.randomUUID(),
      sender: 'laura',
      text: `Hello${profile?.displayName || profile?.fullName ? `, ${profile.displayName || profile.fullName}` : ''}. I’m Laura, the VALKYRIAS portal guide. I can explain published services, packages, project workflow, uploads, previews, revisions, and payment status.`,
    }]);
  };

  useEffect(() => {
    const handleOpen = () => openChat();
    window.addEventListener('open-laura-ai', handleOpen);
    return () => window.removeEventListener('open-laura-ai', handleOpen);
  }, [profile?.displayName, profile?.fullName]);

  useEffect(() => {
    void listServices().then(setServices).catch(() => setServices([]));
  }, []);

  useEffect(() => () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
  }, []);

  const publishedCatalog = (): string => {
    if (services.length > 0) {
      return services.flatMap((service) => service.packages.length > 0
        ? service.packages.map((item) =>
          `• ${service.name} — ${item.name}: ${item.currency} ${Number(item.price).toLocaleString('en-IN')}${item.deliveryDays ? `, about ${item.deliveryDays} day${item.deliveryDays === 1 ? '' : 's'}` : ''}`,
        )
        : [`• ${service.name}: ${service.currency} ${Number(service.basePrice).toLocaleString('en-IN')}`])
        .join('\n');
    }

    if (plans.length > 0) {
      return plans.map((plan) => `• ${plan.name}: ₹${plan.price} per ${plan.period}`).join('\n');
    }

    return '';
  };

  const getSmartResponse = (input: string): LauraResponse => {
    const originalText = safeLower(input.trim());
    const followUpTerms = ['tell me more', 'more details', 'explain more', 'how does that work', 'what next', 'what should i do next', 'and then'];
    const topicHints: Record<LauraTopic, string> = {
      services: 'services editing offer',
      pricing: 'pricing package cost how much',
      booking: 'start project create order booking',
      portal: 'portal dashboard account',
      uploads: 'upload files assets deliverables',
      preview: 'preview revision approval watermark',
      payment: 'payment invoice status',
      profile: 'profile photo avatar details',
      support: 'support contact help',
    };
    const text = includesAny(originalText, followUpTerms) && lastTopicRef.current
      ? `${originalText} ${topicHints[lastTopicRef.current]}`
      : originalText;
    const catalog = publishedCatalog();

    if (includesAny(text, ['hello', 'hi', 'hey', 'good morning', 'good evening', 'laura'])) {
      return {
        text: 'Hello. Ask me about services, packages, starting an order, uploading files, reviewing a preview, requesting revisions, or checking payment and delivery status.',
      };
    }

    if (includesAny(text, ['price', 'pricing', 'package', 'plan', 'cost', 'rate', 'tier', 'how much'])) {
      return catalog
        ? { text: `These are the currently published options:\n\n${catalog}\n\nSelect a package below to continue. The final payable amount always comes from the server-approved order.`, showPlans: true, topic: 'pricing' }
        : { text: 'No active service package is published at the moment. The Admin Portal must publish a service and package before a client can create an order.', topic: 'pricing' };
    }

    if (includesAny(text, ['service', 'what do you do', 'editing', 'offer', 'work'])) {
      if (catalog) {
        return { text: `VALKYRIAS currently publishes these editing services and packages:\n\n${catalog}\n\nOpen a package to create a secure order request.`, showPlans: true, topic: 'services' };
      }
      return { text: 'VALKYRIAS is an editing-service platform for secure project requests, editor assignment, client asset upload, watermarked preview review, revisions, payment verification, and final delivery. No active catalog entries are published right now.', topic: 'services' };
    }

    if (includesAny(text, ['book', 'start project', 'create order', 'hire', 'begin project', 'new order'])) {
      if (loggedInUser === 'client') {
        return { text: 'Open the Client Portal, choose NEW ORDER, select a published service, enter the project title and requirements, then submit it. The administrator reviews the request and assigns an editor.', showPlans: true, topic: 'booking' };
      }
      if (loggedInUser === 'editor') {
        return { text: 'Editors cannot create client orders. Your Editor Portal shows only orders assigned to your account. Accept an assignment before production work begins.', topic: 'booking' };
      }
      if (loggedInUser === 'admin') {
        return { text: 'The Admin Portal publishes services and packages, reviews submitted orders, and assigns an available editor. Client orders must be created from a CLIENT account.', topic: 'booking' };
      }
      return { text: 'Choose a published package, sign in as CLIENT, then submit the order requirements. The order will remain pending until an administrator reviews it.', showPlans: true, topic: 'booking' };
    }

    if (includesAny(text, ['portal', 'dashboard', 'login', 'sign in', 'my account'])) {
      if (!loggedInUser) {
        return { text: 'Select PORTAL on the landing page and sign in. The backend role decides which portal opens: CLIENT, EDITOR, or ADMIN.', topic: 'portal' };
      }
      const roleHelp = loggedInUser === 'client'
        ? 'Your Client Portal contains your own orders, files, previews, revisions, invoices, messages, and final downloads.'
        : loggedInUser === 'editor'
          ? 'Your Editor Portal contains assigned orders, client assets, progress controls, preview upload, deliverables, and project messages.'
          : 'Your Admin Portal contains users, services, packages, submitted orders, editor assignment, reporting, and system notifications.';
      return { text: `${roleHelp} Your profile name and photo are shared from the authenticated profile record.`, topic: 'portal' };
    }

    if (includesAny(text, ['upload', 'file', 'asset', 'footage', 'deliverable'])) {
      if (loggedInUser === 'client') {
        return { text: 'After your order reaches the permitted workflow stage, upload source assets inside that order. Files are stored through the backend and remain scoped to the order participants.', topic: 'uploads' };
      }
      if (loggedInUser === 'editor') {
        return { text: 'Open an assigned project, download the client assets, then upload either PREVIEW or DELIVERABLE. A PREVIEW is sent for client review; the final DELIVERABLE remains payment-gated.', topic: 'uploads' };
      }
      return { text: 'Files must be uploaded from the relevant Client or Editor order workspace. Laura does not upload or delete files on your behalf.', topic: 'uploads' };
    }

    if (includesAny(text, ['preview', 'revision', 'approve', 'watermark'])) {
      return { text: 'The editor uploads a PREVIEW and marks it ready. The client can review the watermarked stream, approve it, or submit a revision request. Approval moves the order toward payment; Laura cannot approve an order herself.', topic: 'preview' };
    }

    if (includesAny(text, ['payment', 'pay', 'invoice', 'razorpay', 'upi', 'card'])) {
      return { text: 'Use only the payment action inside an APPROVED or PAYMENT PENDING order. A payment must be created and verified by the backend before the order becomes PAID. Never send card, UPI PIN, OTP, or banking credentials in this chat.', topic: 'payment' };
    }

    if (includesAny(text, ['profile', 'photo', 'avatar', 'name', 'bio'])) {
      return { text: 'Open your profile button in the portal header. You can update shared account details and your role-specific fields there. The saved display name and profile photo should update across the landing page and portal header.', topic: 'profile' };
    }

    if (includesAny(text, ['contact', 'support', 'help', 'human'])) {
      return { text: 'For project-specific help, use the conversation inside the order so the client and assigned editor keep the context together. For account or catalog issues, contact the administrator through the platform support channel.', topic: 'support' };
    }

    return {
      text: 'I could not confidently match that request. Try asking about services, packages, creating an order, uploading assets, preview approval, revisions, payment status, final delivery, or profile settings.',
    };
  };

  const handleSendMessage = (textToSend: string) => {
    const normalized = textToSend.trim();
    if (!normalized || isTyping) return;

    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      sender: 'user',
      text: normalized,
    }]);
    setInputText('');
    setIsTyping(true);

    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
    responseTimerRef.current = window.setTimeout(() => {
      const response = getSmartResponse(normalized);
      if (response.topic) lastTopicRef.current = response.topic;
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        sender: 'laura',
        text: response.text,
        showPlans: response.showPlans,
      }]);
      setIsTyping(false);
      responseTimerRef.current = null;
    }, 320);
  };

  const openSelectedPlan = (planId: string) => {
    setActivePlan(planId);
    if (loggedInUser === 'admin') setView('admin');
    else if (loggedInUser === 'editor') setView('client');
    else if (loggedInUser === 'client') setView('customer');
    else setView('login');
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="fixed bottom-24 right-6 z-40 w-[350px] sm:w-[380px] h-[520px] bg-obsidian border border-primary-gold/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(223,178,113,0.12),transparent)] pointer-events-none z-0" />

            <div className="relative z-10 px-5 py-4 border-b border-white/[0.04] bg-obsidian/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-gold/10 to-primary-fixed-dim/30 border border-primary-gold/40 flex items-center justify-center shadow-[0_0_10px_rgba(223,178,113,0.15)]">
                  <ValkyrieIcon className="w-4 h-4 text-primary-gold" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-[12px] text-white tracking-widest uppercase">LAURA AI</h4>
                  <p className="text-[9px] font-mono tracking-wider text-primary-gold/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    PORTAL GUIDE
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition cursor-pointer" aria-label="Close Laura AI">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-2.5 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {message.sender === 'user' ? (
                      <ProfileAvatar
                        src={profile?.profileImageUrl}
                        name={profile?.displayName || profile?.fullName || profile?.email || 'User'}
                        className="h-6 w-6 rounded-full border border-white/10 bg-white/5 text-[7px] font-black text-gray-300"
                      />
                    ) : (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary-gold/30 bg-primary-gold/10 text-primary-gold">
                        <ValkyrieIcon className="w-3 h-3 text-primary-gold" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-xs font-sans leading-relaxed shadow-md ${message.sender === 'user' ? 'bg-primary-gold text-obsidian font-semibold rounded-tr-none' : 'bg-white/[0.02] border border-white/[0.05] text-gray-200 rounded-tl-none'}`}>
                      <p className="whitespace-pre-line">{message.text}</p>
                      {message.sender === 'laura' && message.showPlans && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-2.5">
                          {plans.slice(0, 5).map((plan, index) => (
                            <button
                              key={plan.id}
                              onClick={() => openSelectedPlan(plan.id)}
                              className={`w-full py-1.5 px-3 rounded-lg font-bold text-[10px] tracking-wider uppercase active:scale-[0.98] transition cursor-pointer text-center ${index === 0 ? 'bg-primary-gold text-obsidian hover:brightness-110' : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white'}`}
                            >
                              Select {plan.name}
                            </button>
                          ))}
                          {plans.length === 0 && <p className="text-[10px] text-gray-500">No active service package is currently available.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary-gold/10 border border-primary-gold/30 flex items-center justify-center">
                      <ValkyrieIcon className="w-3 h-3 text-primary-gold" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                      <ValkyriasLoader compact label="Laura is preparing a response" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Preparing response</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && !isTyping && (
              <div className="px-4 py-2 border-t border-white/[0.03] overflow-x-auto flex space-x-2 scrollbar-none bg-obsidian/50 relative z-10 select-none">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.label} onClick={() => handleSendMessage(suggestion.text)} className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.01] hover:border-primary-gold/40 text-[10px] text-gray-400 hover:text-white transition cursor-pointer flex items-center gap-1">
                    <span>{suggestion.label}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 text-primary-gold" />
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(inputText); }} className="relative z-10 p-4 border-t border-white/[0.04] bg-obsidian">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="Ask Laura about your workflow..."
                  className="neu-input w-full px-4 py-3 bg-surface-container-low border border-white/[0.06] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-gold/50 focus:ring-1 focus:ring-primary-gold/20 transition-all pr-12"
                />
                <button type="submit" disabled={!inputText.trim() || isTyping} className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-primary-gold to-primary-fixed-dim text-obsidian hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center justify-center" aria-label="Send message">
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
