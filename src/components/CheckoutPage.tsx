import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  CreditCard, ShieldCheck, ArrowLeft, RefreshCw, 
  CheckCircle2, QrCode, ArrowRight,
  ShoppingCart, Bell, Lock, Mail, User, Calendar, Hash, AlertTriangle, Check, Sparkles
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';

export const CheckoutPage: React.FC = () => {
  const { 
    setView, 
    nextInvoice, 
    activePlan, 
    setActivePlan,
    processPayment 
  } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1000], [0, 80]);
  const yGlow2 = useTransform(scrollY, [0, 1000], [0, -80]);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  
  // General Contact Info
  const [email, setEmail] = useState('johnathan@valkyrias.agency');
  
  // UPI Info
  const [upiId, setUpiId] = useState('tanishq@paytm');
  const [showQr, setShowQr] = useState(false);
  
  // Card Fields
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('424');
  const [cardName, setCardName] = useState('Johnathan Valkyria');

  // Input Errors State
  const [errors, setErrors] = useState<{
    email?: string;
    cardName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    upiId?: string;
  }>({});

  // Touch/Interaction status to clear errors on change
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Checkout Processing States
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [processingStep, setProcessingStep] = useState(0);

  const processingSteps = [
    "Establishing secure TLS 256-bit tunnel...",
    "Encrypting customer payment credentials...",
    "Routing encrypted payload to Razorpay proxy...",
    "Syncing ledger database balance & final authorization..."
  ];

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Active Plan Ready',
      desc: `Your portal is waiting for the active package: ${activePlan || 'Cinematic Package'}.`,
      time: 'Just now',
      unread: true,
    },
    {
      id: 2,
      title: 'Identity Authorized',
      desc: 'Registered profile has been verified for security access.',
      time: '15 mins ago',
      unread: true,
    },
    {
      id: 3,
      title: 'SSL Decryption Active',
      desc: 'All data channels are monitored via live AES-256 SSL cipher.',
      time: '1 hour ago',
      unread: false,
    }
  ]);

  // Increment processing step automatically during loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing') {
      setProcessingStep(0);
      interval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev < processingSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Determine Product Name & Subtotal
  let planName = 'Cinematic Edit - Ep. 4';
  let categoryName = 'Professional Post-Production';
  let subtotal = 24500;

  if (activePlan) {
    planName = activePlan;
    if (activePlan === 'Thumbnail Suite') {
      categoryName = 'Social Media Growth';
      subtotal = 15000;
    } else if (activePlan === 'Agency Portfolio') {
      categoryName = 'Commercial Production';
      subtotal = 120000;
    } else if (activePlan === 'Cinematic Package') {
      categoryName = 'Professional Post-Production';
      subtotal = 450000;
    }
  } else if (nextInvoice > 0) {
    planName = 'Outstanding Milestone Invoice';
    categoryName = 'Valkyrias Production Milestone';
    subtotal = nextInvoice;
  }

  const processingFee = 450;
  const tax = (subtotal + processingFee) * 0.18;
  const total = subtotal + processingFee + tax;

  // Validation Logic
  const validateField = (fieldName: string, value: string) => {
    const newErrors = { ...errors };

    if (fieldName === 'email') {
      if (!value) {
        newErrors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
    }

    if (paymentMethod === 'card') {
      if (fieldName === 'cardName') {
        if (!value.trim()) {
          newErrors.cardName = 'Cardholder name is required';
        } else if (value.trim().length < 3) {
          newErrors.cardName = 'Name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s.-]+$/.test(value)) {
          newErrors.cardName = 'Name can only contain letters and spaces';
        } else {
          delete newErrors.cardName;
        }
      }

      if (fieldName === 'cardNumber') {
        const clean = value.replace(/\s+/g, '');
        if (!clean) {
          newErrors.cardNumber = 'Card number is required';
        } else if (clean.length !== 16) {
          newErrors.cardNumber = 'Card number must be exactly 16 digits';
        } else if (!/^\d+$/.test(clean)) {
          newErrors.cardNumber = 'Card number must contain only digits';
        } else {
          delete newErrors.cardNumber;
        }
      }

      if (fieldName === 'cardExpiry') {
        if (!value) {
          newErrors.cardExpiry = 'Expiry date is required';
        } else if (!/^\d{2}\/\d{2}$/.test(value)) {
          newErrors.cardExpiry = 'Format must be MM/YY';
        } else {
          const [mStr, yStr] = value.split('/');
          const m = parseInt(mStr, 10);
          const y = parseInt(yStr, 10);

          if (m < 1 || m > 12) {
            newErrors.cardExpiry = 'Month must be 01-12';
          } else {
            const now = new Date();
            const currY = now.getFullYear() % 100; // e.g. 26
            const currM = now.getMonth() + 1; // e.g. 7
            
            if (y < currY || (y === currY && m < currM)) {
              newErrors.cardExpiry = 'Card has expired';
            } else {
              delete newErrors.cardExpiry;
            }
          }
        }
      }

      if (fieldName === 'cardCvv') {
        if (!value) {
          newErrors.cardCvv = 'CVV code is required';
        } else if (value.length < 3 || value.length > 4) {
          newErrors.cardCvv = 'CVV must be 3 or 4 digits';
        } else if (!/^\d+$/.test(value)) {
          newErrors.cardCvv = 'CVV must only contain digits';
        } else {
          delete newErrors.cardCvv;
        }
      }
    } else if (paymentMethod === 'upi') {
      if (fieldName === 'upiId') {
        if (!value) {
          newErrors.upiId = 'UPI VPA address is required';
        } else if (!/^[\w.\-_]+@[\w\-]+$/.test(value)) {
          newErrors.upiId = 'Enter a valid format (e.g. name@bank)';
        } else {
          delete newErrors.upiId;
        }
      }
    }

    setErrors(newErrors);
  };

  const handleBlur = (fieldName: string, value: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  // Keyboard Formats for Card Number (Insert spaces)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const trimmed = rawVal.slice(0, 16);
    const matches = trimmed.match(/.{1,4}/g);
    const formatted = matches ? matches.join(' ') : trimmed;
    setCardNumber(formatted);
    if (touched.cardNumber) {
      validateField('cardNumber', formatted);
    }
  };

  // Keyboard Formats for Expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    
    let formatted = val;
    if (val.length > 2) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(formatted);
    if (touched.cardExpiry) {
      validateField('cardExpiry', formatted);
    }
  };

  // CVV Digits only
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(val);
    if (touched.cardCvv) {
      validateField('cardCvv', val);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all applicable fields first
    const fieldsToValidate = ['email'];
    if (paymentMethod === 'card') {
      fieldsToValidate.push('cardName', 'cardNumber', 'cardExpiry', 'cardCvv');
    } else if (paymentMethod === 'upi') {
      fieldsToValidate.push('upiId');
    }

    const nextTouched = { ...touched };
    fieldsToValidate.forEach(f => {
      nextTouched[f] = true;
    });
    setTouched(nextTouched);

    // Validate everything
    let hasError = false;
    const newErrors: typeof errors = {};

    // Email
    if (!email) {
      newErrors.email = 'Email address is required';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      hasError = true;
    }

    if (paymentMethod === 'card') {
      if (!cardName.trim()) {
        newErrors.cardName = 'Cardholder name is required';
        hasError = true;
      } else if (cardName.trim().length < 3) {
        newErrors.cardName = 'Name must be at least 3 characters';
        hasError = true;
      } else if (!/^[a-zA-Z\s.-]+$/.test(cardName)) {
        newErrors.cardName = 'Name can only contain letters and spaces';
        hasError = true;
      }

      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (!cleanNum) {
        newErrors.cardNumber = 'Card number is required';
        hasError = true;
      } else if (cleanNum.length !== 16) {
        newErrors.cardNumber = 'Card number must be exactly 16 digits';
        hasError = true;
      }

      if (!cardExpiry) {
        newErrors.cardExpiry = 'Expiry date is required';
        hasError = true;
      } else if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        newErrors.cardExpiry = 'Format must be MM/YY';
        hasError = true;
      } else {
        const [mStr, yStr] = cardExpiry.split('/');
        const m = parseInt(mStr, 10);
        const y = parseInt(yStr, 10);
        if (m < 1 || m > 12) {
          newErrors.cardExpiry = 'Month must be 01-12';
          hasError = true;
        } else {
          const now = new Date();
          const currY = now.getFullYear() % 100;
          const currM = now.getMonth() + 1;
          if (y < currY || (y === currY && m < currM)) {
            newErrors.cardExpiry = 'Card has expired';
            hasError = true;
          }
        }
      }

      if (!cardCvv) {
        newErrors.cardCvv = 'CVV is required';
        hasError = true;
      } else if (cardCvv.length < 3 || cardCvv.length > 4) {
        newErrors.cardCvv = 'CVV must be 3 or 4 digits';
        hasError = true;
      }
    } else if (paymentMethod === 'upi') {
      if (!upiId) {
        newErrors.upiId = 'UPI ID is required';
        hasError = true;
      } else if (!/^[\w.\-_]+@[\w\-]+$/.test(upiId)) {
        newErrors.upiId = 'Please enter a valid UPI ID (e.g. name@bank)';
        hasError = true;
      }
    }

    setErrors(newErrors);

    if (hasError) {
      // Trigger subtle vibration/shake effect or simply stop submission
      return;
    }

    // Trigger processing
    setStatus('processing');

    setTimeout(() => {
      setStatus('success');
      processPayment(subtotal);
    }, 3200);
  };

  const handleDownloadInvoice = () => {
    const invoiceNum = `VALK-INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceContent = `===========================================================
                  VALKYRIAS CREATIVE AGENCY
                     OFFICIAL BILL INVOICE
===========================================================
Invoice Ref: ${invoiceNum}
Transaction Date: 2026-07-19
Payment Status: FULLY SETTLED / PAID

BILL TO:
-----------------------------------------------------------
Client/Cardholder: ${cardName || 'Valued Client'}
Email Identifier: ${email}
Payment channel: ${paymentMethod === 'card' ? 'Credit Card' : paymentMethod === 'upi' ? 'UPI Network' : 'Bank Redirect'}

ACQUISITION SUMMARY:
-----------------------------------------------------------
Item description: ${planName} (${categoryName})
Subtotal rate: ₹${subtotal.toLocaleString('en-IN')}
Taxes & Levies (18% GST): ₹${tax.toLocaleString('en-IN')}
Security Processing fee: ₹${processingFee.toLocaleString('en-IN')}
-----------------------------------------------------------
GRAND TOTAL SETTLED: ₹${total.toLocaleString('en-IN')}

===========================================================
Thank you for co-authoring your brand vision with Valkyrias.
Securely verified on the Ethereum / Valkyrias private ledger.
===========================================================`;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Valkyrias_Invoice_${planName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPlanImage = () => {
    if (activePlan === 'Thumbnail Suite') {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWerZoPgjhJLKEZ5urBuPH_8bSeFNccPDT2DvYJhZ7N-dYqQQPNgRv4NLG7bdm8Vcvyu9yfYJ2G1-PBNOuIzdbd2uskLtXlfDkQffa-KOa-rcj-8raF5r6a3kWFkpelFB75rYImSt5rqs19rgfKghq6exj4aXLNrgoNlLms72Cc1-TM_hfFCX_wHle0n9u0A68dHYFBQFT8QnjelOzbB_iyry748iWO0xt68_hDH5IqPBMO60sveO7';
    }
    if (activePlan === 'Agency Portfolio') {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdan9U0Sji1_fF1wcbwAjsa04JZAqABFU8oy0bit3YqJAZINCHrjGydGOK70baNjLxhFMyFp9Qvo6NNR-frUQKRi7J3WvaH8mM0hH1bnf3xWNIGg4Nk_h0LeNTareJfcHKKXpW00BFkBOPobrmCDEYD84Zun3h1m_Mt6dxlfCJzX8N74QKt8UT-M6qZDruq4oRgh86nW8UhJybw7NYqSnxzw6R9u9WEJjaukwxl0Zyd_G1tKz8cPZz';
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6ZIevJLKrYzQoNiHHESyM4Cs8UZeM8Lnr7FIxU31ZnF_WLR3XmkfKl1jNmus3o74Z1uqGIgQGV4fyPlBqcT0P3lftcBBZODPH9-FmU_9VDb0GgV1cn76W5XmJPbUfS1osPiqKFQa4jd09p1uUvnermWhSpXe4R7O4TA21H2vd14v_1bA8Pxtr5WBAesUCb60k9olrt1S3NS4onRsdI9SsH6j4aTxd8AryPZ8ZpHLjPeeeSXLPvFgG';
  };

  // Generate dynamic particles of success confetti
  const confettiParticles = Array.from({ length: 35 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 2,
    size: 4 + Math.random() * 8,
    color: ['#e0c097', '#10b981', '#3b82f6', '#fddcb1', '#ffffff'][Math.floor(Math.random() * 5)]
  }));

  if (status === 'success') {
    return (
      <div className="h-screen w-screen bg-[#090a0f] text-gray-200 font-sans relative overflow-hidden flex flex-col justify-center items-center p-4 md:p-8 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#bf9d62]/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        </div>

        {/* Confetti Particles Shower */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                opacity: 1, 
                y: -20, 
                x: `${particle.x}%`, 
                scale: Math.random() * 0.4 + 0.6,
                rotate: 0 
              }}
              animate={{ 
                opacity: [1, 1, 0],
                y: '100vh',
                rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
              }}
              transition={{ 
                delay: particle.delay,
                duration: particle.duration,
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: Math.random() > 0.6 ? '50%' : '2px',
              }}
            />
          ))}
        </div>

        {/* Success Dialog Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 95 }}
          className="relative max-w-5xl w-full bg-[#13141a]/95 border border-white/[0.08] rounded-[32px] p-6 md:p-8 shadow-2xl z-10 overflow-y-auto md:overflow-visible max-h-full"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Confirmation Info & CTAs */}
            <div className="md:col-span-5 flex flex-col justify-between py-2 space-y-6 md:space-y-0">
              <div className="space-y-5">
                {/* Checkmark anim */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500 rounded-full"
                  />
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#13141a] border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-[#bf9d62] uppercase font-bold block">
                    TRANSACTION AUTHORIZED
                  </span>
                  <h2 className="font-display font-black text-2xl text-white tracking-tight leading-none">
                    Payment Secured.
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans font-light">
                    Your acquisition payment has been verified by the Valkyrias secure ledger. Your creative workspace and editor pipeline are now fully unlocked.
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                {/* Ultra-Premium "Go to Dashboard" Button */}
                <button
                  onClick={() => {
                    setActivePlan(null);
                    setView('customer');
                    setStatus('idle');
                  }}
                  className="group relative w-full h-[54px] rounded-xl bg-gradient-to-r from-[#dfb271] via-[#fcdca4] to-[#bf9d62] hover:brightness-110 text-black font-mono font-black tracking-[0.22em] text-xs transition-all duration-300 shadow-[0_0_25px_rgba(223,178,113,0.3)] hover:shadow-[0_0_45px_rgba(223,178,113,0.55)] hover:scale-[1.01] cursor-pointer overflow-hidden flex items-center justify-center space-x-2 border-0"
                >
                  <div className="absolute inset-0 w-full h-full overflow-hidden rounded-xl">
                    <motion.div
                      initial={{ left: "-100%" }}
                      animate={{ left: "200%" }}
                      transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", repeatDelay: 1.2 }}
                      className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
                    />
                  </div>
                  <Sparkles className="w-4 h-4 shrink-0 text-black animate-pulse" />
                  <span className="relative z-10">GO TO DASHBOARD</span>
                </button>

                <div className="text-[10px] text-gray-500 font-mono text-center tracking-wider">
                  PORTAL AUTHENTICATION IS READY
                </div>
              </div>
            </div>

            {/* Right Column: Beautiful compact bill receipt */}
            <div className="md:col-span-7 bg-[#0b0c10] rounded-2xl border border-[#dfb271]/20 p-5 md:p-6 space-y-4 relative overflow-hidden shadow-[0_0_40px_rgba(223,178,113,0.05)] flex flex-col justify-between">
              {/* Logo Background with low opacity */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-[85%] h-[85%] flex items-center justify-center opacity-[0.03]">
                  <ValkyriasLogo size="giant" showText={false} centered={true} />
                </div>
              </div>

              {/* PAID Holographic Stamp watermark */}
              <motion.div 
                initial={{ opacity: 0, scale: 2, rotate: -25 }}
                animate={{ opacity: 0.15, scale: 1, rotate: -12 }}
                transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
                className="absolute right-6 top-6 border-4 border-emerald-400 text-emerald-400 font-display font-black text-2xl px-3 py-1 rounded-xl uppercase select-none pointer-events-none tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.1)] z-10"
              >
                PAID
              </motion.div>

              {/* Header */}
              <div className="border-b border-white/[0.05] pb-4 flex flex-col items-center justify-center relative z-10">
                <ValkyriasLogo size="lg" centered={true} />
                <span className="font-mono text-[8px] text-[#dfb271] tracking-[0.3em] uppercase mt-2 block">
                  OFFICIAL ACQUISITION STATEMENT
                </span>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] border-b border-white/[0.04] pb-4 relative z-10">
                <div className="space-y-0.5">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">BILL TO CLIENT</span>
                  <p className="text-white font-medium text-left truncate">{cardName || 'Valued Client'}</p>
                  <p className="text-gray-400 text-[10px] truncate text-left">{email}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block">INVOICE NUMBER</span>
                  <p className="text-white font-mono font-medium truncate">VALK-INV-2026-{Math.floor(1000 + Math.random() * 9000)}</p>
                  <span className="text-gray-500 text-[8px] block">DATE: 2026-07-19</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">PAYMENT MODE</span>
                  <p className="text-white font-medium text-left text-[10px] truncate">
                    {paymentMethod === 'card' 
                      ? `Credit Card (•••• ${cardNumber.replace(/\s/g, '').slice(-4)})` 
                      : paymentMethod === 'upi' 
                        ? `UPI (${upiId})` 
                        : 'Net Banking'}
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block">TRANSACTION HASH</span>
                  <p className="text-emerald-400 font-mono font-medium text-[9px] truncate">TXN-VALK-{Math.floor(100000 + Math.random() * 900000)}</p>
                </div>
              </div>

              {/* Item Breakdown */}
              <div className="space-y-2 relative z-10">
                <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">SPECIFICATIONS</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-300 truncate pr-2">{planName} <span className="text-gray-500">({categoryName})</span></span>
                    <span className="text-white font-medium font-mono shrink-0">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-white/[0.02]">
                    <span className="text-gray-400">18% GST</span>
                    <span className="text-gray-300 font-mono shrink-0">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-white/[0.02]">
                    <span className="text-gray-400">Ledger Processing Fee</span>
                    <span className="text-gray-300 font-mono shrink-0">₹{processingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center bg-white/[0.01] -mx-5 md:-mx-6 px-5 md:px-6 py-2.5 mt-1 relative z-10">
                <div className="text-left">
                  <span className="font-display font-extrabold text-[12px] text-white block">TOTAL VALUE</span>
                  <span className="text-[8px] text-emerald-400 font-mono">AUTHORIZED & CAPTURED</span>
                </div>
                <span className="font-sans font-black text-xl text-[#dfb271] drop-shadow-[0_0_12px_rgba(223,178,113,0.35)] shrink-0">
                  ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action: Download statement */}
              <div className="pt-2 flex justify-center relative z-10">
                <button
                  onClick={handleDownloadInvoice}
                  className="w-full py-2.5 rounded-lg border border-[#dfb271]/30 hover:border-[#dfb271] text-[10px] font-mono font-bold tracking-[0.12em] text-[#dfb271] hover:text-white bg-[#dfb271]/5 hover:bg-[#dfb271]/15 transition duration-300 flex items-center justify-center space-x-1.5 cursor-pointer shadow-[0_0_15px_rgba(223,178,113,0.05)] hover:shadow-[0_0_20px_rgba(223,178,113,0.15)]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>DOWNLOAD OFFICIAL INVOICE</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-200 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background glows with scroll parallax */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: yGlow1 }} className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#bf9d62]/5 blur-[160px]" />
        <motion.div style={{ y: yGlow2 }} className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[160px]" />
      </div>

      <div>
        {/* Top Navbar */}
        <header className="relative z-10 w-full border-b border-white/[0.04] bg-[#090a0f]/80 backdrop-blur-md px-6 md:px-12 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div 
              onClick={() => {
                setActivePlan(null);
                setView('landing');
              }}
              className="flex items-center cursor-pointer"
            >
              <ValkyriasLogo size="md" />
            </div>

            {/* Navigation items */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => setView('landing')} 
                className="text-[13px] font-medium text-gray-400 hover:text-white transition cursor-pointer"
              >
                Showcase
              </button>
              <button 
                onClick={() => setView('landing')} 
                className="text-[13px] font-medium text-gray-400 hover:text-white transition cursor-pointer"
              >
                Services
              </button>
              <button 
                onClick={() => setView('customer')} 
                className="text-[13px] font-semibold text-white transition cursor-pointer flex items-center space-x-1"
              >
                <span>Portal</span>
              </button>
            </nav>

            {/* Notification and Profile */}
            <div className="flex items-center space-x-5 relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-[-10px] sm:right-0 top-12 w-[290px] sm:w-80 bg-[#13141a] border border-white/[0.08] rounded-2xl shadow-2xl p-4 z-50 space-y-3 max-w-[calc(100vw-32px)] overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 gap-2">
                      <span className="font-display font-extrabold text-[11px] text-white uppercase tracking-wider block truncate">
                        Alert Notifications
                      </span>
                      {notifications.some(n => n.unread) && (
                        <button 
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, unread: false })));
                          }}
                          className="text-[10px] font-mono font-bold text-[#bf9d62] hover:text-[#cca05d] transition cursor-pointer flex-shrink-0"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500 font-sans">
                          No notifications available.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              setNotifications(notifications.map(n => n.id === notif.id ? { ...n, unread: false } : n));
                            }}
                            className={`p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                              notif.unread 
                                ? 'bg-[#181921] border-white/[0.05] hover:bg-[#20222c]' 
                                : 'bg-[#0b0d14]/50 border-transparent hover:bg-[#0b0d14] opacity-75'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-xs font-bold font-sans break-words block leading-snug ${notif.unread ? 'text-[#dfb271]' : 'text-gray-300'}`}>
                                {notif.title}
                              </span>
                              {notif.unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed font-sans break-words whitespace-normal">
                              {notif.desc}
                            </p>
                            <span className="text-[8px] font-mono text-gray-500 block mt-1.5 uppercase">
                              {notif.time}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                onClick={() => setView('customer')} 
                className="w-8 h-8 rounded-full border-2 border-[#bf9d62]/40 overflow-hidden cursor-pointer"
              >
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuABhcb24YtrFDJ-N5nxrvMruYFJYVBFJwiTf0YHqLUb_fA4FYKrkSSFhT4kIFkPtE8mPMp6_3xGEDIUto3B320QjhKBpIhd0FQT3lQv5AVBbZixWn3MbiFeh-96ayvupiJZqx_NiF2Kf6VgV9OInCRUX1fwdvGMpZdLSpzItO0AWNUqrEYk5sxMo0nyZz2NyppeKH8Cu1LOYeu_SfXxFYpPCCCvFDfa2vWcoDBRHewabS6QNlf6wlF5" 
                  alt="Profile" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </header>

        {/* Return Button inside main body */}
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-2 relative z-10">
          <button
            onClick={() => {
              setActivePlan(null);
              setView('customer');
            }}
            className="flex items-center space-x-2 text-xs font-mono text-gray-500 hover:text-[#bf9d62] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO PORTAL</span>
          </button>
        </div>

        {/* Main Content Form Section */}
        <main className="max-w-6xl mx-auto px-6 py-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key="checkout-main"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                
                {/* Left Side: Order details */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Hero Headings */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#bf9d62] font-semibold tracking-widest text-[11px]">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>CHECKOUT SECURELY</span>
                    </div>
                    <h1 className="font-display font-black text-4xl text-white tracking-tight leading-none">
                      Complete your Masterpiece.
                    </h1>
                  </div>

                  {/* Order Summary Box */}
                  <div className="bg-[#13141a] rounded-[24px] border border-white/[0.04] p-6 space-y-6 shadow-xl">
                    
                    {/* Thumbnail and title details */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-[16px] bg-neutral-900 border border-white/[0.05] overflow-hidden flex-shrink-0">
                        <img 
                          src={getPlanImage()} 
                          alt="Cinematic Thumbnail" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-base text-white">
                          {planName}
                        </h3>
                        <p className="text-[12px] text-gray-400 font-sans">
                          {categoryName}
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Ledger pricing */}
                    <div className="space-y-3.5 border-t border-white/[0.04] pt-5 font-sans text-[13px]">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span className="text-white font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Processing Fee</span>
                        <span className="text-white font-medium">₹{processingFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>GST (18%)</span>
                        <span className="text-white font-medium">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Grand Total Row */}
                    <div className="border-t border-white/[0.04] pt-5 flex items-baseline justify-between">
                      <span className="font-display font-bold text-base text-white">Total Amount</span>
                      <div className="text-right">
                        <span className="font-sans font-black text-[28px] text-white tracking-tight leading-none block">
                          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] font-mono tracking-wider text-[#bf9d62] uppercase font-bold block mt-1">
                          INCLUSIVE OF ALL TAXES
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Encryption Badge banner */}
                  <div className="bg-[#13141a]/60 rounded-[20px] border border-white/[0.03] p-4 flex items-start space-x-3 text-[11px] leading-relaxed text-gray-400">
                    <ShieldCheck className="w-5 h-5 text-[#bf9d62] flex-shrink-0 mt-0.5" />
                    <span>
                      Secure 256-bit SSL Encrypted Transaction. Your data is protected by industry-leading security protocols.
                    </span>
                  </div>

                </div>

                {/* Right Side: Payment Form Details Card */}
                <div className="lg:col-span-7 bg-[#13141a] rounded-[28px] border border-white/[0.04] p-8 shadow-2xl relative overflow-hidden">
                  
                  {/* Realtime glassmorphism processing overlay / Payment animation */}
                  <AnimatePresence>
                    {status === 'processing' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 bg-[#13141aa0] backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
                      >
                        {/* Golden Double-Ring Halo Loader */}
                        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                          {/* Pulsing glow aura */}
                          <motion.div 
                            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[#bf9d62] rounded-full filter blur-xl"
                          />
                          
                          {/* Outer dashed spinning ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                            className="absolute inset-0 border-4 border-dashed border-[#bf9d62]/60 rounded-full"
                          />
                          
                          {/* Inner clean spinning ring (opposing direction) */}
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="absolute inset-2 border-2 border-solid border-[#bf9d62] border-t-transparent border-b-transparent rounded-full"
                          />
                          
                          {/* Centered pulsing Lock icon */}
                          <motion.div
                            animate={{ scale: [0.92, 1.08, 0.92] }}
                            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                            className="absolute z-10 w-12 h-12 rounded-full bg-[#1e1f29] border border-[#bf9d62]/30 flex items-center justify-center text-[#bf9d62] shadow-lg"
                          >
                            <Lock className="w-5 h-5" />
                          </motion.div>
                        </div>

                        {/* Text and dynamic progress stages */}
                        <div className="space-y-3 max-w-sm">
                          <h3 className="font-display font-black text-lg text-white tracking-tight">
                            Authorizing Transaction
                          </h3>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans min-h-[36px]">
                            {processingSteps[processingStep]}
                          </p>
                          <div className="flex justify-center space-x-1 pt-2">
                            {processingSteps.map((_, i) => (
                              <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  i === processingStep 
                                    ? 'w-6 bg-[#bf9d62]' 
                                    : i < processingStep 
                                      ? 'w-2 bg-emerald-500' 
                                      : 'w-2 bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Safety Disclaimer overlay */}
                        <div className="absolute bottom-6 flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono">
                          <ShieldCheck className="w-4 h-4 text-[#bf9d62]" />
                          <span>SECURE DECRYPTED PROTOCOL ACTIVE</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-display font-extrabold text-lg text-white">
                      Payment Details
                    </h2>
                  </div>

                  {/* Gateway tab selectors */}
                  <div className="bg-[#090a0f] p-1.5 rounded-[16px] border border-white/[0.02] grid grid-cols-3 gap-1 mb-6">
                    {[
                      { id: 'card' as const, label: 'Card Payment' },
                      { id: 'upi' as const, label: 'UPI / Razorpay' },
                      { id: 'netbanking' as const, label: 'Net Banking' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(tab.id);
                          setErrors({});
                          setTouched({});
                        }}
                        className={`py-2.5 px-3 rounded-[12px] text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
                          paymentMethod === tab.id
                            ? 'bg-[#181921] text-white border border-[#bf9d62]/20 shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                    
                    {/* Common Field: Email Address */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                          EMAIL ADDRESS (FOR RECEIPT)
                        </label>
                        {touched.email && !errors.email && (
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                            <Check className="w-3 h-3" /> <span>Valid</span>
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (touched.email) validateField('email', e.target.value);
                          }}
                          onBlur={(e) => handleBlur('email', e.target.value)}
                          placeholder="your.email@valkyrias.agency"
                          className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                            errors.email 
                              ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                              : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                          }`}
                        />
                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.email ? 'text-red-500' : 'text-gray-400'}`} />
                      </div>
                      {errors.email && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                        >
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{errors.email}</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Card Method Fields */}
                    {paymentMethod === 'card' && (
                      <div className="space-y-5">
                        
                        {/* Name on Card */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                              CARDHOLDER NAME
                            </label>
                            {touched.cardName && !errors.cardName && (
                              <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                                <Check className="w-3 h-3" /> <span>Valid</span>
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => {
                                setCardName(e.target.value);
                                if (touched.cardName) validateField('cardName', e.target.value);
                              }}
                              onBlur={(e) => handleBlur('cardName', e.target.value)}
                              placeholder="Johnathan Valkyria"
                              className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                                errors.cardName 
                                  ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                                  : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                              }`}
                            />
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.cardName ? 'text-red-500' : 'text-gray-400'}`} />
                          </div>
                          {errors.cardName && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{errors.cardName}</span>
                            </motion.div>
                          )}
                        </div>

                        {/* Credit Card Number */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                              CARD NUMBER
                            </label>
                            {touched.cardNumber && !errors.cardNumber && (
                              <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                                <Check className="w-3 h-3" /> <span>Valid</span>
                              </span>
                            )}
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              onBlur={(e) => handleBlur('cardNumber', e.target.value)}
                              placeholder="0000 0000 0000 0000"
                              className={`w-full px-5 py-3.5 pl-11 pr-20 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                                errors.cardNumber 
                                  ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                                  : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                              }`}
                            />
                            <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.cardNumber ? 'text-red-500' : 'text-gray-400'}`} />
                            
                            {/* Visual Card Brand Overlays */}
                            <div className="absolute right-4 flex items-center space-x-1.5 pointer-events-none">
                              <div className="w-7 h-5 rounded bg-gray-200 border border-gray-300 flex items-center justify-center text-[7px] font-mono text-gray-700 font-bold select-none">
                                VISA
                              </div>
                              <div className="w-7 h-5 rounded bg-gray-200 border border-gray-300 flex items-center justify-center text-[7px] font-mono text-gray-700 font-bold select-none">
                                MC
                              </div>
                            </div>
                          </div>
                          {errors.cardNumber && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{errors.cardNumber}</span>
                            </motion.div>
                          )}
                        </div>

                        {/* Expiry & CVV */}
                        <div className="grid grid-cols-2 gap-5">
                          {/* Expiry */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                                EXPIRY DATE
                              </label>
                              {touched.cardExpiry && !errors.cardExpiry && (
                                <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                                  <Check className="w-3 h-3" /> <span>Valid</span>
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                onBlur={(e) => handleBlur('cardExpiry', e.target.value)}
                                placeholder="MM/YY"
                                className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                                  errors.cardExpiry 
                                    ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                                    : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                                }`}
                              />
                              <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.cardExpiry ? 'text-red-500' : 'text-gray-400'}`} />
                            </div>
                            {errors.cardExpiry && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                              >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.cardExpiry}</span>
                              </motion.div>
                            )}
                          </div>

                          {/* CVV */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                                CVV
                              </label>
                              {touched.cardCvv && !errors.cardCvv && (
                                <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                                  <Check className="w-3 h-3" /> <span>Valid</span>
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="password"
                                maxLength={4}
                                value={cardCvv}
                                onChange={handleCvvChange}
                                onBlur={(e) => handleBlur('cardCvv', e.target.value)}
                                placeholder="•••"
                                className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                                  errors.cardCvv 
                                    ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                                    : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                                }`}
                              />
                              <Hash className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.cardCvv ? 'text-red-500' : 'text-gray-400'}`} />
                            </div>
                            {errors.cardCvv && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                              >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>{errors.cardCvv}</span>
                              </motion.div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* UPI Method Fields */}
                    {paymentMethod === 'upi' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                              VIRTUAL PAYMENT ADDRESS (VPA)
                            </label>
                            {touched.upiId && !errors.upiId && (
                              <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-0.5">
                                <Check className="w-3 h-3" /> <span>Valid</span>
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={upiId}
                                onChange={(e) => {
                                  setUpiId(e.target.value);
                                  if (touched.upiId) validateField('upiId', e.target.value);
                                }}
                                onBlur={(e) => handleBlur('upiId', e.target.value)}
                                placeholder="username@bank"
                                className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                                  errors.upiId 
                                    ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20' 
                                    : 'border-white/[0.06] bg-[#0b0d14] text-white focus:border-[#bf9d62]/50 focus:ring-[#bf9d62]/20'
                                }`}
                                required={!showQr}
                              />
                              <QrCode className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.upiId ? 'text-red-500' : 'text-gray-400'}`} />
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowQr(!showQr)}
                              className="px-4 py-3.5 rounded-xl text-xs font-bold text-[#bf9d62] bg-[#181921] border border-white/[0.04] hover:bg-[#20222c] transition flex items-center space-x-1 cursor-pointer"
                            >
                              <QrCode className="w-4 h-4" />
                              <span>{showQr ? 'Hide QR' : 'Generate QR'}</span>
                            </button>
                          </div>
                          {errors.upiId && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center space-x-1 text-red-400 text-[10px] font-mono mt-1"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{errors.upiId}</span>
                            </motion.div>
                          )}
                        </div>

                        {showQr && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-6 bg-[#090a0f] border border-white/[0.04] rounded-xl flex flex-col items-center justify-center space-y-3"
                          >
                            <div className="p-4 rounded-xl bg-white flex items-center justify-center shadow-lg relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#bf9d62]/10 to-transparent animate-[pulse_2s_infinite]" />
                              <div className="w-32 h-32 border-4 border-black p-1 flex flex-wrap relative z-10">
                                {Array.from({ length: 4 }).map((_, r) => (
                                  <div key={r} className="w-full flex">
                                    {Array.from({ length: 4 }).map((_, c) => (
                                      <div 
                                        key={c} 
                                        className={`flex-1 aspect-square m-1 rounded ${
                                          (r + c) % 2 === 0 ? 'bg-black' : 'bg-transparent'
                                        }`} 
                                      />
                                    ))}
                                  </div>
                                ))}
                                <div className="absolute top-1 left-1 w-5 h-5 border-4 border-black bg-white" />
                                <div className="absolute top-1 right-1 w-5 h-5 border-4 border-black bg-white" />
                                <div className="absolute bottom-1 left-1 w-5 h-5 border-4 border-black bg-white" />
                              </div>
                            </div>
                            <p className="font-mono text-[9px] text-gray-500 tracking-wider">
                              SCAN SECURELY: GPAY, PHONEPE, BHIM UPI
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Net Banking Method Fields */}
                    {paymentMethod === 'netbanking' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
                            CHOOSE FINANCIAL BANK
                          </label>
                          <select className="w-full px-5 py-3.5 rounded-xl bg-[#090a0f] text-white border border-white/[0.06] text-xs focus:outline-none focus:ring-2 focus:ring-[#bf9d62]/40">
                            <option value="hdfc">HDFC Bank (Corporate Premium)</option>
                            <option value="icici">ICICI Bank Infinity Netbanking</option>
                            <option value="sbi">State Bank of India (SBI Global)</option>
                            <option value="axis">Axis Bank Prime Netbanking</option>
                          </select>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                          Upon hitting Pay Now, you will be securely redirected to authorize your credentials directly via your official banking proxy gateway.
                        </p>
                      </div>
                    )}

                    {/* Logos, PCI-DSS compliance labels */}
                    <div className="flex items-center justify-between border-t border-white/[0.04] pt-5">
                      <div className="flex items-center space-x-2 opacity-50 select-none">
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">VISA</div>
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">MC</div>
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">RUPAY</div>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono font-semibold">
                        <Lock className="w-3.5 h-3.5 text-[#bf9d62]" />
                        <span>PCI-DSS SECURE</span>
                      </div>
                    </div>

                    {/* Main Bronze Pay Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'processing'}
                        className="w-full py-4 rounded-xl text-[14px] font-black tracking-widest text-[#0b0d14] uppercase bg-gradient-to-r from-[#dfb271] via-[#f4d9b1] to-[#cca05d] hover:brightness-110 active:scale-[0.99] border-0 transition-all shadow-[0_4px_25px_rgba(223,178,113,0.25)] hover:shadow-[0_4px_35px_rgba(223,178,113,0.45)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>Pay Now ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                  </form>

                </div>

              </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.04] bg-[#090a0f]/40 py-8 px-6 text-center space-y-3">
        <div className="flex justify-center items-center space-x-6 text-xs text-gray-500 font-sans">
          <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
          <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
          <span className="hover:text-white cursor-pointer transition">Contact</span>
        </div>
        <p className="text-[10px] text-gray-600 font-mono">
          © 2024 Valkyrias Creative Agency. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
