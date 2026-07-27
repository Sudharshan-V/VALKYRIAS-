import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  ShieldCheck, ArrowLeft,
  ArrowRight,
  ShoppingCart, Lock, Mail, AlertTriangle, Sparkles, TicketPercent, Check
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { MediaThumbnail } from './common/MediaThumbnail';
import { ValkyriasLoader } from './common/ValkyriasLoader';
import { ProfileAvatar } from './profile/ProfileAvatar';
import { NotificationMenu } from './common/NotificationMenu';
import type { PaymentQuoteResponse, PaymentResponse } from '../types';
import { getPaymentQuote, verifyRazorpayPayment } from '../api/paymentApi';

type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const loadRazorpayCheckout = async () => {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay Checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.head.appendChild(script);
  });
};

export const CheckoutPage: React.FC = () => {
  const { theme } = useTheme();
  const {
    setView,
    nextInvoice,
    activePlan,
    setActivePlan,
    processPayment,
    projects,
    profile,
    plans,
    refreshData,
  } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1000], [0, 80]);
  const yGlow2 = useTransform(scrollY, [0, 1000], [0, -80]);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');

  // General Contact Info
  const [email, setEmail] = useState(profile?.email || '');

  // Input Errors State
  const [errors, setErrors] = useState<{ email?: string }>({});

  // Checkout Processing States
  const [status, setStatus] = useState<'idle' | 'processing' | 'pending'>('idle');
  const [processingStep, setProcessingStep] = useState(0);
  const [createdPayment, setCreatedPayment] = useState<PaymentResponse | null>(null);
  const [quote, setQuote] = useState<PaymentQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const processingSteps = [
    "Submitting a payment initiation request to the backend..."
  ];

  useEffect(() => setProcessingStep(0), [status]);

  // Determine Product Name & Subtotal
  const payableOrder = projects.find((project) => project.orderStatus === 'PAYMENT_PENDING' || project.orderStatus === 'APPROVED');
  const selectedPlan = plans.find((plan) => plan.id === activePlan);
  const planName = payableOrder?.title || selectedPlan?.name || 'No payable order selected';
  const categoryName = payableOrder?.category || 'Order payment';
  const orderAmount = quote?.orderAmount || payableOrder?.budget || nextInvoice || 0;
  const depositAmount = quote?.depositAmount || 0;
  const discountAmount = quote?.discountAmount || 0;
  const tax = quote?.gstAmount || 0;
  const total = quote?.totalAmount || 0;

  useEffect(() => {
    if (!payableOrder?.id) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setCouponMessage(null);
    void getPaymentQuote(payableOrder.id)
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch((error) => {
        if (!cancelled) {
          setCouponMessage({ type: 'error', text: error instanceof Error ? error.message : 'Payment quote could not be loaded.' });
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => { cancelled = true; };
  }, [payableOrder?.id]);

  const applyCoupon = async () => {
    if (!payableOrder || !couponInput.trim()) return;
    setQuoteLoading(true);
    setCouponMessage(null);
    try {
      const result = await getPaymentQuote(payableOrder.id, couponInput);
      setQuote(result);
      setAppliedCoupon(result.couponCode || '');
      setCouponInput(result.couponCode || couponInput.trim().toUpperCase());
      setCouponMessage({
        type: 'success',
        text: `${Number(result.discountPercent).toLocaleString('en-IN')}% coupon applied.`,
      });
    } catch (error) {
      setAppliedCoupon('');
      setCouponMessage({ type: 'error', text: error instanceof Error ? error.message : 'Coupon could not be applied.' });
    } finally {
      setQuoteLoading(false);
    }
  };

  const removeCoupon = async () => {
    if (!payableOrder) return;
    setQuoteLoading(true);
    setCouponMessage(null);
    try {
      setQuote(await getPaymentQuote(payableOrder.id));
      setAppliedCoupon('');
      setCouponInput('');
    } catch (error) {
      setCouponMessage({ type: 'error', text: error instanceof Error ? error.message : 'Payment quote could not be refreshed.' });
    } finally {
      setQuoteLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    if (!value) {
      setErrors({ email: 'Email address is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setErrors({ email: 'Please enter a valid email address' });
    } else {
      setErrors({});
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setErrors(newErrors);

    if (hasError) {
      // Trigger subtle vibration/shake effect or simply stop submission
      return;
    }

    if (!payableOrder) {
      setErrors({ email: 'No server-approved order is ready for payment.' });
      return;
    }

    setStatus('processing');
    try {
      if (!quote) throw new Error('Wait for the secure payment quote to load.');
      const payment = await processPayment(appliedCoupon || undefined);
      if (!payment.providerOrderId || !payment.checkoutKey) {
        throw new Error('Razorpay checkout details were not returned by the server.');
      }
      await loadRazorpayCheckout();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error('Razorpay Checkout is unavailable.');

      await new Promise<void>((resolve, reject) => {
        const checkout = new Razorpay({
          key: payment.checkoutKey,
          amount: Math.round(Number(payment.amount) * 100),
          currency: payment.currency,
          name: 'Valkyrias Creative Agency',
          description: planName,
          order_id: payment.providerOrderId,
          prefill: { email, name: profile?.displayName || profile?.fullName || '' },
          theme: {
            color: theme === 'light' ? '#805921' : '#bf9d62',
            backdrop_color: theme === 'light' ? '#eee5d6' : '#090a0f',
          },
          method: {
            card: paymentMethod === 'card',
            upi: paymentMethod === 'upi',
            netbanking: paymentMethod === 'netbanking',
          },
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled before completion.')),
          },
          handler: async (result: RazorpayResult) => {
            try {
              const verified = await verifyRazorpayPayment(payment.id, {
                razorpayOrderId: result.razorpay_order_id,
                razorpayPaymentId: result.razorpay_payment_id,
                razorpaySignature: result.razorpay_signature,
              });
              setCreatedPayment(verified);
              await refreshData();
              resolve();
            } catch (verificationError) {
              reject(verificationError);
            }
          },
        });
        checkout.open();
      });
      setStatus('pending');
    } catch (error) {
      setStatus('idle');
      setErrors({ email: error instanceof Error ? error.message : 'Payment initiation failed.' });
    }
  };

  const handleDownloadReceipt = () => {
    if (!createdPayment) return;
    const paymentRecordId = createdPayment.id;
    const receiptContent = `===========================================================
                  VALKYRIAS CREATIVE AGENCY
                     PAYMENT RECEIPT
===========================================================
Payment record: ${paymentRecordId}
Request Date: ${new Date(createdPayment.createdAt).toLocaleString()}
Payment Status: ${createdPayment.status}

BILL TO:
-----------------------------------------------------------
Client: ${profile?.displayName || profile?.fullName || 'Authenticated client'}
Email Identifier: ${email}
Preferred provider channel: ${paymentMethod === 'card' ? 'Card' : paymentMethod === 'upi' ? 'UPI' : 'Net banking'}

ACQUISITION SUMMARY:
-----------------------------------------------------------
Item description: ${planName} (${categoryName})
Full project value: ₹${Number(createdPayment.orderAmount).toLocaleString('en-IN')}
Security deposit (20%): ₹${Number(createdPayment.depositAmount).toLocaleString('en-IN')}
Coupon${createdPayment.couponCode ? ` (${createdPayment.couponCode})` : ''}: -₹${Number(createdPayment.discountAmount).toLocaleString('en-IN')}
GST (18%): ₹${Number(createdPayment.gstAmount).toLocaleString('en-IN')}
-----------------------------------------------------------
AMOUNT PAID: ₹${Number(createdPayment.amount).toLocaleString('en-IN')}

===========================================================
Thank you for co-authoring your brand vision with Valkyrias.
Razorpay signature verified by the Valkyrias backend.
===========================================================`;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Valkyrias_Razorpay_Receipt_${planName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  if (status === 'pending') {
    return (
      <div className="h-screen w-screen bg-obsidian text-gray-200 font-sans relative overflow-hidden flex flex-col justify-center items-center p-4 md:p-8 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-fixed-dim/5 blur-[120px]" />
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
          className="relative max-w-5xl w-full bg-surface-container/95 border border-white/[0.08] rounded-[32px] p-6 md:p-8 shadow-2xl z-10 overflow-y-auto md:overflow-visible max-h-full"
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
                  <div className="relative z-10 w-10 h-10 rounded-full bg-surface-container border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
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
                  <span className="font-mono text-[9px] tracking-[0.25em] text-primary-gold uppercase font-bold block">
                    SECURITY DEPOSIT VERIFIED
                  </span>
                  <h2 className="font-display font-black text-2xl text-white tracking-tight leading-none">
                    Deposit Complete.
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans font-light">
                    Razorpay confirmed the 20% security deposit and the backend verified its cryptographic signature. Your project can now continue.
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
                  className="group relative w-full h-[54px] rounded-xl bg-gradient-to-r from-primary-gold via-champagne to-primary-fixed-dim hover:brightness-110 text-black font-mono font-black tracking-[0.22em] text-xs transition-all duration-300 shadow-[0_0_25px_rgba(223,178,113,0.3)] hover:shadow-[0_0_45px_rgba(223,178,113,0.55)] hover:scale-[1.01] cursor-pointer overflow-hidden flex items-center justify-center space-x-2 border-0"
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
                  CHECK THE ORDER FOR PAYMENT STATUS UPDATES
                </div>
              </div>
            </div>

            {/* Right Column: Beautiful compact bill receipt */}
            <div className="md:col-span-7 bg-surface-container-low rounded-2xl border border-primary-gold/20 p-5 md:p-6 space-y-4 relative overflow-hidden shadow-[0_0_40px_rgba(223,178,113,0.05)] flex flex-col justify-between">
              {/* Logo Background with low opacity */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-[85%] h-[85%] flex items-center justify-center opacity-[0.03]">
                  <ValkyriasLogo size="giant" showText={false} centered={true} />
                </div>
              </div>

              {/* Pending verification watermark */}
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
                <span className="font-mono text-[8px] text-primary-gold tracking-[0.3em] uppercase mt-2 block">
                  RAZORPAY PAYMENT RECEIPT
                </span>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] border-b border-white/[0.04] pb-4 relative z-10">
                <div className="space-y-0.5">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">BILL TO CLIENT</span>
                   <p className="text-white font-medium text-left truncate">{profile?.displayName || profile?.fullName || 'Authenticated client'}</p>
                  <p className="text-gray-400 text-[10px] truncate text-left">{email}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block">PAYMENT RECORD</span>
                  <p className="text-white font-mono font-medium truncate">{createdPayment?.id}</p>
                  <span className="text-gray-500 text-[8px] block">{createdPayment ? new Date(createdPayment.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">PAYMENT MODE</span>
                  <p className="text-white font-medium text-left text-[10px] truncate">
                    {paymentMethod === 'card' ? 'Card provider preference' : paymentMethod === 'upi' ? 'UPI provider preference' : 'Bank provider preference'}
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-gray-500 text-[9px] font-mono tracking-wider block">PROVIDER ORDER</span>
                  <p className="text-emerald-400 font-mono font-medium text-[9px] truncate">{createdPayment?.providerOrderId || 'Awaiting provider'}</p>
                </div>
              </div>

              {/* Item Breakdown */}
              <div className="space-y-2 relative z-10">
                <span className="text-gray-500 text-[9px] font-mono tracking-wider block text-left">SPECIFICATIONS</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-300 truncate pr-2">{planName} <span className="text-gray-500">({categoryName})</span></span>
                    <span className="text-white font-medium font-mono shrink-0">₹{Number(createdPayment?.orderAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-white/[0.02]">
                    <span className="text-gray-400">Security deposit (20%)</span>
                    <span className="text-gray-300 font-mono shrink-0">₹{Number(createdPayment?.depositAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {Number(createdPayment?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between py-0.5 border-t border-white/[0.02] text-emerald-400">
                      <span>Coupon {createdPayment?.couponCode ? `(${createdPayment.couponCode})` : ''}</span>
                      <span className="font-mono shrink-0">−₹{Number(createdPayment?.discountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 border-t border-white/[0.02]">
                    <span className="text-gray-400">18% GST</span>
                    <span className="text-gray-300 font-mono shrink-0">₹{Number(createdPayment?.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center bg-white/[0.01] -mx-5 md:-mx-6 px-5 md:px-6 py-2.5 mt-1 relative z-10">
                <div className="text-left">
                  <span className="font-display font-extrabold text-[12px] text-white block">TOTAL VALUE</span>
                  <span className="text-[8px] text-emerald-400 font-mono">RAZORPAY SIGNATURE VERIFIED</span>
                </div>
                <span className="font-sans font-black text-xl text-primary-gold drop-shadow-[0_0_12px_rgba(223,178,113,0.35)] shrink-0">
                  ₹{Number(createdPayment?.amount || total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action: Download statement */}
              <div className="pt-2 flex justify-center relative z-10">
                <button
                  onClick={handleDownloadReceipt}
                  className="w-full py-2.5 rounded-lg border border-primary-gold/30 hover:border-primary-gold text-[10px] font-mono font-bold tracking-[0.12em] text-primary-gold hover:text-white bg-primary-gold/5 hover:bg-primary-gold/15 transition duration-300 flex items-center justify-center space-x-1.5 cursor-pointer shadow-[0_0_15px_rgba(223,178,113,0.05)] hover:shadow-[0_0_20px_rgba(223,178,113,0.15)]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>DOWNLOAD VERIFIED PAYMENT RECEIPT</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-gray-200 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background glows with scroll parallax */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: yGlow1 }} className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-primary-fixed-dim/5 blur-[160px]" />
        <motion.div style={{ y: yGlow2 }} className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[160px]" />
      </div>

      <div>
        {/* Top Navbar */}
        <header className="relative z-10 w-full border-b border-white/[0.04] bg-obsidian/80 backdrop-blur-md px-6 md:px-12 py-4">
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
              <NotificationMenu />

              <button
                type="button"
                onClick={() => setView('customer')}
                aria-label="Return to customer portal"
                className="cursor-pointer rounded-full"
              >
                <ProfileAvatar
                  src={profile?.profileImageUrl}
                  name={profile?.displayName || profile?.fullName || profile?.email || 'User'}
                  className="h-8 w-8 rounded-full border-2 border-primary-fixed-dim/40 bg-surface-container-high text-[10px] font-bold text-primary-gold"
                />
              </button>
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
            className="flex items-center space-x-2 text-xs font-mono text-gray-500 hover:text-primary-gold transition"
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
                    <div className="flex items-center space-x-2 text-primary-gold font-semibold tracking-widest text-[11px]">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>CHECKOUT SECURELY</span>
                    </div>
                    <h1 className="font-display font-black text-4xl text-white tracking-tight leading-none">
                      Complete your Masterpiece.
                    </h1>
                  </div>

                  {/* Order Summary Box */}
                  <div className="neumorphic-flat rounded-[24px] p-6 space-y-6">

                    {/* Thumbnail and title details */}
                    <div className="flex items-center space-x-4">
                      <MediaThumbnail
                        src={payableOrder?.thumbnail}
                        alt={planName}
                        fallback="project"
                        className="h-20 w-20 flex-shrink-0 rounded-[16px] border border-white/[0.05] bg-neutral-900"
                      />
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-base text-white">
                          {planName}
                        </h3>
                        <p className="text-[12px] text-gray-400 font-sans">
                          {categoryName}
                        </p>
                      </div>
                    </div>

                    {/* Coupon entry */}
                    <div className="space-y-2 border-t border-white/[0.04] pt-5">
                      <label htmlFor="checkout-coupon" className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                        <TicketPercent className="h-3.5 w-3.5 text-primary-gold" />
                        Coupon code
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="checkout-coupon"
                          value={couponInput}
                          disabled={quoteLoading || status !== 'idle'}
                          onChange={(event) => {
                            setCouponInput(event.target.value.toUpperCase());
                            if (couponMessage) setCouponMessage(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void applyCoupon();
                            }
                          }}
                          placeholder="ENTER CODE"
                          className="neu-input min-w-0 flex-1 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-white outline-none transition placeholder:text-gray-600 disabled:opacity-50"
                        />
                        {appliedCoupon ? (
                          <button type="button" onClick={() => void removeCoupon()} disabled={quoteLoading} className="rounded-xl border border-white/10 px-4 text-[10px] font-mono font-bold text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50">
                            REMOVE
                          </button>
                        ) : (
                          <button type="button" onClick={() => void applyCoupon()} disabled={quoteLoading || !couponInput.trim()} className="rounded-xl bg-primary-gold px-4 text-[10px] font-mono font-black text-obsidian transition hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40">
                            {quoteLoading ? 'CHECKING…' : 'APPLY'}
                          </button>
                        )}
                      </div>
                      {couponMessage && (
                        <p className={`flex items-center gap-1.5 text-[10px] font-mono ${couponMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {couponMessage.type === 'success' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {couponMessage.text}
                        </p>
                      )}
                    </div>

                    {/* Breakdown Ledger pricing */}
                    <div className="space-y-3.5 border-t border-white/[0.04] pt-5 font-sans text-[13px]">
                      <div className="flex justify-between text-gray-400">
                        <span>Full project value</span>
                        <span className="text-white font-medium">₹{orderAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Security deposit (20%)</span>
                        <span className="text-white font-medium">{quoteLoading && !quote ? '—' : `₹${depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Coupon discount {quote?.couponCode ? `(${quote.couponCode})` : ''}</span>
                          <span className="font-medium">−₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-400">
                        <span>Taxable deposit</span>
                        <span className="text-white font-medium">₹{Math.max(0, depositAmount - discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                          {quoteLoading && !quote ? '—' : `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                        <span className="text-[9px] font-mono tracking-wider text-primary-gold uppercase font-bold block mt-1">
                          20% DEPOSIT · GST INCLUDED
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Encryption Badge banner */}
                  <div className="neumorphic-inset rounded-[20px] p-4 flex items-start space-x-3 text-[11px] leading-relaxed text-gray-400">
                    <ShieldCheck className="w-5 h-5 text-primary-gold flex-shrink-0 mt-0.5" />
                    <span>
                      Secure 256-bit SSL Encrypted Transaction. Your data is protected by industry-leading security protocols.
                    </span>
                  </div>

                </div>

                {/* Right Side: Payment Form Details Card */}
                <div className="lg:col-span-7 neumorphic-flat rounded-[28px] p-8 relative overflow-hidden">

                  {/* Realtime glassmorphism processing overlay / Payment animation */}
                  <AnimatePresence>
                    {status === 'processing' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 bg-surface-container/85 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
                      >
                        <ValkyriasLoader
                          label="Authorizing Transaction"
                          detail={processingSteps[processingStep]}
                        />

                        {/* Safety Disclaimer overlay */}
                        <div className="absolute bottom-6 flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono">
                          <ShieldCheck className="w-4 h-4 text-primary-gold" />
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
                  <div className="neumorphic-inset p-1.5 rounded-[16px] grid grid-cols-3 gap-1 mb-6">
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
                        }}
                        className={`py-2.5 px-3 rounded-[12px] text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
                          paymentMethod === tab.id
                            ? 'bg-surface-container-high text-white border border-primary-gold/20 shadow-md'
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
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) validateEmail(e.target.value);
                          }}
                          onBlur={(e) => validateEmail(e.target.value)}
                          placeholder="your.email@valkyrias.agency"
                          className={`w-full px-5 py-3.5 pl-11 rounded-xl font-sans font-medium text-xs placeholder-gray-500 border focus:outline-none focus:ring-2 transition-all ${
                            errors.email
                              ? 'border-red-500/50 text-red-200 bg-red-950/20 focus:ring-red-500/20'
                              : 'neu-input text-white'
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

                    <div className="neumorphic-inset p-5 rounded-xl border border-primary-gold/20 space-y-2">
                      <div className="flex items-center gap-2 text-primary-gold">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-mono font-bold tracking-wider">RAZORPAY SECURE CHECKOUT</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Your card, UPI, and bank credentials are entered only inside Razorpay Checkout. Valkyrias charges the quoted 20% security deposit plus GST and marks it paid only after server-side signature verification.
                      </p>
                    </div>

                    {/* Provider integration status */}
                    <div className="flex items-center justify-between border-t border-white/[0.04] pt-5">
                      <div className="flex items-center space-x-2 opacity-50 select-none">
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">VISA</div>
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">MC</div>
                        <div className="w-8 h-5 rounded bg-white/10 flex items-center justify-center text-[7px] font-bold font-mono text-white">RUPAY</div>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono font-semibold">
                        <Lock className="w-3.5 h-3.5 text-primary-gold" />
                        <span>SERVER-SIDE VERIFICATION REQUIRED</span>
                      </div>
                    </div>

                    {/* Main Bronze Pay Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={status === 'processing' || quoteLoading || !quote}
                        className="w-full py-4 rounded-xl text-[14px] font-black tracking-widest text-obsidian uppercase bg-gradient-to-r from-primary-gold via-champagne to-primary-fixed-dim hover:brightness-110 active:scale-[0.99] border-0 transition-all shadow-[0_4px_25px_rgba(223,178,113,0.25)] hover:shadow-[0_4px_35px_rgba(223,178,113,0.45)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{quoteLoading && !quote ? 'Loading secure quote…' : `Pay deposit ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
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
      <footer className="relative z-10 w-full border-t border-white/[0.04] bg-obsidian/40 py-8 px-6 text-center space-y-3">
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
