import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  ShieldAlert, KeyRound, CheckCircle, ArrowLeft,
  Mail, ShieldCheck, Eye, EyeOff, Check, X, Send, LogIn,
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { supabase } from '../supabaseClient';
import { ValkyriasLoader } from './common/ValkyriasLoader';
import { safeLower } from '../utils/safeText';

function friendlyAuthError(error: unknown): string {
  const authError = error as { message?: string } | null;
  const message = authError?.message ?? '';
  const normalized = safeLower(message);
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Network failure: unable to reach Supabase Auth. Check your connection and try again.';
  }
  if (normalized.includes('same password') || normalized.includes('should be different')) {
    return 'Your new password must be different from your current password.';
  }
  return message || 'An unexpected error occurred. Please try again.';
}

/**
 * Two real modes, driven by StateContext / Supabase — not a manual token form:
 *
 * - 'request': the person doesn't have a live recovery session yet. They enter their
 *   email and we call supabase.auth.resetPasswordForEmail, which sends the actual
 *   Supabase recovery link.
 * - 'update': StateContext routed here because Supabase's client detected a recovery
 *   link in the URL and fired a PASSWORD_RECOVERY session. The person is already
 *   authenticated for the sole purpose of setting a new password, so we just ask for
 *   the new password and call supabase.auth.updateUser — no token to type in.
 */
export const ResetPasswordScreen: React.FC = () => {
  const { setView, completePasswordRecovery } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1000], [0, 80]);
  const yGlow2 = useTransform(scrollY, [0, 1000], [0, -80]);

  const [mode, setMode] = useState<'request' | 'update' | 'requested' | 'done'>(() => {
    // If Supabase already delivered a recovery session (StateContext only routes here
    // when it did), go straight to the "set a new password" step.
    return 'request';
  });

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // StateContext always lands us on this screen via the PASSWORD_RECOVERY event when
  // there is already a live recovery session, so default straight to "update" in that
  // case rather than showing the request-email step again.
  React.useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setMode('update');
    });
    return () => { active = false; };
  }, []);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasNumber && hasSpecial && passwordsMatch;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccessMsg(`If an account exists for ${email}, a password reset link has been sent. Open it on this device to continue.`);
      setMode('requested');
    } catch (error) {
      setErrorMsg(friendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setErrorMsg(!passwordsMatch ? 'Passwords do not match.' : 'Please fulfill all password strength requirements.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMode('done');
    } catch (error) {
      setErrorMsg(friendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToDashboard = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await completePasswordRecovery();
    } catch (error) {
      setErrorMsg(friendlyAuthError(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-200 font-sans flex flex-col justify-between py-6 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: yGlow1 }} className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
        <motion.div style={{ y: yGlow2 }} className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4 mb-2 relative z-10">
        <button
          onClick={() => setView('login')}
          className="flex items-center space-x-2 text-xs font-mono text-gray-500 hover:text-primary-gold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO LOGIN</span>
        </button>
        <ValkyriasLogo size="md" />
        <div className="font-mono text-[10px] tracking-widest text-primary-gold font-bold">
          SECURE RESET
        </div>
      </div>

      <div className="w-full mx-auto py-8 relative z-10 max-w-xl">
        <AnimatePresence mode="wait">
          {mode === 'done' ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="neumorphic-flat p-8 rounded-[28px] text-center space-y-6 border border-emerald-500/30 bg-surface-container-low/80 backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none" />
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/5 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
              <div className="space-y-2 relative z-10">
                <h3 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  Password Updated
                </h3>
                <p className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase font-bold">
                  Your Supabase credentials have been changed
                </p>
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center space-x-2 text-left">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleContinueToDashboard}
                disabled={isLoading}
                className="w-full py-4 rounded-xl text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <ValkyriasLoader compact label="Processing password request" />
                    <span>SIGNING YOU IN...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4.5 h-4.5" />
                    <span>CONTINUE TO YOUR DASHBOARD</span>
                  </>
                )}
              </button>
            </motion.div>
          ) : mode === 'update' ? (
            <motion.div
              key="update"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-surface-container-low/70 backdrop-blur-xl space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-2.5 bg-primary-gold/10 border border-primary-gold/20 text-primary-gold rounded-full">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  Create New Password
                </h2>
                <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
                  You followed a valid Supabase recovery link. Set a new password to finish resetting your account.
                </p>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-300 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="neumorphic-inset p-3.5 rounded-xl space-y-2">
                  <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider block font-bold">
                    Security Requirements
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>Min. 8 Characters</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasUpper ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>1 Uppercase Letter</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>1 Number</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>1 Special Character</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <ValkyriasLoader compact label="Processing password request" />
                      <span>UPDATING PASSWORD...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4.5 h-4.5" />
                      <span>CONFIRM PASSWORD RESET</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* mode === 'request' or 'requested': ask for the email to send a real recovery link */
            <motion.div
              key="request"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-surface-container-low/70 backdrop-blur-xl space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-2.5 bg-primary-gold/10 border border-primary-gold/20 text-primary-gold rounded-full">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  Reset Password
                </h2>
                <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
                  Enter your account email. Supabase will send a real recovery link — opening it on this device brings you straight back here to set a new password.
                </p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-5">
                {successMsg && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <ValkyriasLoader compact label="Processing password request" />
                      <span>SENDING RESET LINK...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND RESET LINK</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center space-y-2 relative z-10">
        <p className="font-sans text-[10px] text-gray-600 leading-normal">
          Password resets are handled entirely by Supabase Auth. Links are single-use and expire after a short window.
        </p>
      </div>
    </div>
  );
};
