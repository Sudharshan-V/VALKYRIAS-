import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  ShieldAlert, KeyRound, CheckCircle, ArrowLeft,
  Mail, UserPlus, LogIn, User, Chrome, ShieldCheck, Lock
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { supabase } from '../supabaseClient';
import { ApiError } from '../api';
import { ValkyriasLoader } from './common/ValkyriasLoader';
import { LegalDocumentModal } from './common/LegalDocumentModal';
import { safeLower } from '../utils/safeText';

const MISSING_SESSION_MESSAGE = 'Supabase accepted the sign-in, but no authenticated session was created. Please try again.';
type PortalRole = 'admin' | 'client' | 'editor';

function profileRole(role: PortalRole): 'ADMIN' | 'CLIENT' | 'EDITOR' {
  return role.toUpperCase() as 'ADMIN' | 'CLIENT' | 'EDITOR';
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Network failure: unable to reach the Spring Boot backend. Confirm that it is running and try again.';
    }
    if (error.status === 401) {
      return 'Your Supabase session is missing or expired. Please sign in again.';
    }
    if (error.status === 403) {
      return error.message || 'This account is not authorized for the selected portal.';
    }
    return `Supabase sign-in succeeded, but your backend profile could not be loaded: ${error.message}`;
  }

  const authError = error as { code?: string; message?: string } | null;
  const code = safeLower(authError?.code);
  const message = authError?.message ?? '';
  const normalizedMessage = safeLower(message);

  if (code === 'invalid_credentials' || normalizedMessage.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your Supabase credentials and try again.';
  }
  if (code === 'email_not_confirmed' || normalizedMessage.includes('email not confirmed')) {
    return 'Your email address is not confirmed. Open the Supabase confirmation email before signing in.';
  }
  if (message === MISSING_SESSION_MESSAGE || normalizedMessage.includes('no authenticated session')) {
    return MISSING_SESSION_MESSAGE;
  }
  if (normalizedMessage.includes('failed to fetch') || normalizedMessage.includes('network')) {
    return 'Network failure: unable to contact the authentication service. Check your connection and try again.';
  }

  return message || 'An unexpected authentication error occurred. Please try again.';
}

export const LoginPortal: React.FC = () => {
  const { login, setView, authError, clearAuthError, siteSettings } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1000], [0, 80]);
  const yGlow2 = useTransform(scrollY, [0, 1000], [0, -80]);

  // Unified login step flow: 'select_role' -> 'enter_credentials'
  const [loginStep, setLoginStep] = useState<'select_role' | 'enter_credentials'>('select_role');
  const [selectedRole, setSelectedRole] = useState<PortalRole>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(() => localStorage.getItem('valkyrias_legal_accepted') === siteSettings.effectiveDate);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    if (!authError) return;
    setErrorMsg(loginErrorMessage(new Error(authError)));
    clearAuthError();
    setLoginStep('enter_credentials');
  }, [authError, clearAuthError]);

  useEffect(() => {
    setLegalAccepted(localStorage.getItem('valkyrias_legal_accepted') === siteSettings.effectiveDate);
  }, [siteSettings.effectiveDate]);

  const persistLegalAcceptance = () => {
    localStorage.setItem('valkyrias_legal_accepted', siteSettings.effectiveDate);
  };

  const requireLegalAcceptance = (): boolean => {
    if (legalAccepted) return true;
    setErrorMsg('Please accept the Terms and Conditions and Privacy Policy before signing in.');
    return false;
  };

  const roles = [
    {
      id: 'client' as const,
      name: 'Client Portal',
      desc: 'Review your own project progress, files, conversations, and verified invoices',
      badge: 'Customer Access'
    },
    {
      id: 'editor' as const,
      name: 'Editor Pipeline',
      desc: 'Manage assigned projects, authorized assets, previews, and deliverables',
      badge: 'Creative Editor'
    },
    {
      id: 'admin' as const,
      name: 'Admin Command Center',
      desc: 'Manage services, users, assignments, workflows, and verified reporting',
      badge: 'Full Permissions'
    }
  ];

  const handleSelectRoleStep = (roleId: PortalRole) => {
    setSelectedRole(roleId);
    setEmail('');
    setPassword('');
    setErrorMsg('');
    setSignupSuccessMessage('');
    setLoginStep('enter_credentials');
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireLegalAcceptance()) return;
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (isSignUpMode && !name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSignupSuccessMessage('');
    persistLegalAcceptance();

    try {
      if (isSignUpMode) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              requested_role: 'CLIENT',
            }
          }
        });

        if (error) {
          throw error;
        } else {
          setPassword('');
          setName('');
          if (data.session?.access_token) {
            await login('CLIENT');
            setSuccessMsg('Account Created!');
            setIsSuccess(true);
          } else {
            setSignupSuccessMessage("Your account has been created. Please check your email and verify your address before logging in.");
            setIsSignUpMode(false);
          }
        }
      } else {
        // Sign In Flow
        setSignupSuccessMessage('');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (!data.session?.access_token) {
          throw new Error(MISSING_SESSION_MESSAGE);
        }

        // signInWithPassword persists the Supabase session. Spring Boot then
        // verifies its access token and supplies the authoritative account role.
        await login(profileRole(selectedRole));
        setSuccessMsg('Access Granted!');
        setIsSuccess(true);
      }
    } catch (error: unknown) {
      setErrorMsg(loginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!requireLegalAcceptance()) return;
    setIsLoading(true);
    setErrorMsg('');
    setSignupSuccessMessage('');
    persistLegalAcceptance();
    localStorage.setItem('valkyrias_selected_role', profileRole(selectedRole));
    sessionStorage.setItem('valkyrias_oauth_pending', '1');
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}?auth_callback=google`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      sessionStorage.removeItem('valkyrias_oauth_pending');
      localStorage.removeItem('valkyrias_selected_role');
      setErrorMsg(loginErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-200 font-sans flex flex-col justify-between py-12 px-6 relative overflow-hidden">
      {/* Cinematic purple and blue ambient glows with scroll parallax */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: yGlow1 }} className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
        <motion.div style={{ y: yGlow2 }} className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4 mb-2 relative z-10">
        <button
          onClick={() => {
            if (loginStep === 'enter_credentials') {
              setLoginStep('select_role');
            } else {
              setView('landing');
            }
          }}
          className="flex items-center space-x-2 text-xs font-mono text-gray-500 hover:text-primary-gold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{loginStep === 'enter_credentials' ? 'BACK TO ROLES' : 'RETURN TO HOME'}</span>
        </button>

        <ValkyriasLogo size="md" />

        <div className="font-mono text-[10px] tracking-widest text-primary-gold font-bold">
          SECURE LOG v3.02
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full mx-auto py-8 relative z-10 transition-all duration-300 max-w-xl">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="neumorphic-flat p-8 rounded-[28px] text-center space-y-6 border border-emerald-500/30 bg-surface-container-low/80 backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none" />

              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: [0, 1.15, 1], rotate: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/5 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                >
                  <motion.svg
                    className="w-10 h-10 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.3, duration: 0.6, ease: "easeInOut" }}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </motion.div>
              </div>

              <div className="space-y-2 relative z-10">
                <motion.h3
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display font-black text-2xl text-white tracking-tight uppercase"
                >
                  {successMsg}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase font-bold"
                >
                  SUPABASE SECURE KEY CONFIRMED • SESSION INITIALIZED
                </motion.p>
              </div>

              <div className="space-y-2 relative z-10 pt-2">
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/[0.02]">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.2, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
                <p className="font-mono text-[9px] text-gray-500 tracking-wider">
                  Connecting to Valkyrias command center...
                </p>
              </div>
            </motion.div>
          ) : loginStep === 'select_role' ? (
            /* STEP 1: SELECT PORTAL ENTRY ROLE */
            <motion.div
              key="select-role-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-surface-container-low/70 backdrop-blur-xl space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-2.5 bg-primary-gold/10 border border-primary-gold/20 text-primary-gold rounded-full">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  Select Portal Entry
                </h2>
                <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
                  Select your authorized studio entry level to load corresponding credentials, milestone pipelines, and workspace tools.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRoleStep(role.id)}
                    className="w-full group text-left p-5 rounded-2xl border border-white/5 hover:border-primary-gold/30 bg-obsidian/40 hover:bg-primary-gold/[0.02] transition-all duration-300 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-display font-black text-sm text-white group-hover:text-primary-gold transition-colors duration-300">
                          {role.name}
                        </span>
                        <span className="font-mono text-[8px] px-2 py-0.5 bg-white/5 rounded text-gray-400 uppercase font-bold">
                          {role.badge}
                        </span>
                      </div>
                    </div>
                    <LogIn className="w-4 h-4 text-gray-600 group-hover:text-primary-gold transition-all duration-300 transform group-hover:translate-x-1 shrink-0" />
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('client');
                    setEmail('');
                    setPassword('');
                    setIsSignUpMode(true);
                    setLoginStep('enter_credentials');
                  }}
                  className="text-xs font-sans text-gray-500 hover:text-primary-gold transition cursor-pointer"
                >
                  Register new client profile instead
                </button>
              </div>
            </motion.div>
          ) : (
            /* STEP 2: ENTER PASSWORD / CREDENTIALS */
            <motion.div
              key="enter-credentials-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-surface-container-low/70 backdrop-blur-xl space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-2.5 bg-primary-gold/10 border border-primary-gold/20 text-primary-gold rounded-full">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  {isSignUpMode ? 'Register Client Profile' : 'Authorize Identity'}
                </h2>
                <p className="text-xs text-gray-400 font-mono tracking-wider max-w-sm mx-auto uppercase">
                  {isSignUpMode
                    ? 'Secure Registration Gateway'
                    : `Entry Level: ${roles.find(r => r.id === selectedRole)?.name}`}
                </p>
              </div>

              {/* Email/Password Auth Form */}
              <form onSubmit={handleAuthAction} className="space-y-5">
                {signupSuccessMessage && !isSignUpMode && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start space-x-2.5">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{signupSuccessMessage}</span>
                  </div>
                )}

                {isSignUpMode && (
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                        required={isSignUpMode}
                      />
                    </div>
                  </div>
                )}

                {isSignUpMode && (
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                      Account Role
                    </label>
                    <div className="w-full px-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans">
                      Client Portal
                    </div>
                    <p className="text-[10px] text-gray-500">Public registration always creates a client account. Editor and administrator access is assigned by a trusted administrator.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                      Password
                    </label>
                    {!isSignUpMode && (
                      <button
                        type="button"
                        onClick={() => setView('reset-password')}
                        className="font-mono text-[10px] tracking-wider text-gray-500 hover:text-primary-gold transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl neu-input text-xs text-white font-sans focus:border-primary-gold/35 focus:ring-1 focus:ring-primary-gold/30 outline-none transition"
                      required
                    />
                  </div>
                </div>


                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-obsidian/40 p-3.5 text-left">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => {
                      setLegalAccepted(event.target.checked);
                      setErrorMsg('');
                      if (event.target.checked) persistLegalAcceptance();
                      else localStorage.removeItem('valkyrias_legal_accepted');
                    }}
                    className="mt-0.5 h-4 w-4 accent-primary-gold"
                  />
                  <span className="text-[11px] leading-relaxed text-gray-400">
                    I have read and agree to the{' '}
                    <button type="button" onClick={() => setLegalModal('terms')} className="font-semibold text-primary-gold hover:text-white">Terms and Conditions</button>
                    {' '}and{' '}
                    <button type="button" onClick={() => setLegalModal('privacy')} className="font-semibold text-primary-gold hover:text-white">Privacy Policy</button>.
                  </span>
                </label>

                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !legalAccepted}
                    className="w-full py-4 rounded-xl text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <ValkyriasLoader compact label="Authorizing session" />
                        <span>SYNCHRONIZING SECURE TUNNEL...</span>
                      </>
                    ) : isSignUpMode ? (
                      <>
                        <UserPlus className="w-4.5 h-4.5" />
                        <span>CREATE SECURE PROFILE</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4.5 h-4.5" />
                        <span>AUTHORIZE SECURE SESSION</span>
                      </>
                    )}
                  </button>

                  {!isSignUpMode && (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading || !legalAccepted}
                      className="w-full py-3.5 rounded-xl text-xs font-bold tracking-wider text-white bg-white/5 hover:bg-white/10 border border-white/10 transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Chrome className="w-4 h-4" />
                      <span>CONTINUE WITH GOOGLE</span>
                    </button>
                  )}
                </div>

                <div className="text-center pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSignUpMode) {
                        setSelectedRole('client');
                      }
                      setIsSignUpMode(!isSignUpMode);
                      setErrorMsg('');
                      setSignupSuccessMessage('');
                    }}
                    className="text-gray-500 hover:text-primary-gold transition cursor-pointer"
                  >
                    {isSignUpMode
                      ? 'Have an authorized account? Sign In'
                      : "Don't have an account? Sign Up"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(false);
                      setLoginStep('select_role');
                      setErrorMsg('');
                      setSignupSuccessMessage('');
                    }}
                    className="text-primary-gold/80 hover:text-primary-gold transition cursor-pointer font-mono text-[10px]"
                  >
                    SELECT ANOTHER ROLE
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LegalDocumentModal
        open={legalModal === 'terms'}
        title="Terms and Conditions"
        content={siteSettings.termsConditions}
        onClose={() => setLegalModal(null)}
      />
      <LegalDocumentModal
        open={legalModal === 'privacy'}
        title="Privacy Policy"
        content={siteSettings.privacyPolicy}
        onClose={() => setLegalModal(null)}
      />

      {/* Footer Disclaimer */}
      <div className="max-w-4xl w-full mx-auto text-center space-y-2 relative z-10">
        <p className="font-sans text-[10px] text-gray-600 leading-normal">
          Authorized personnel only. Valkyrias secure endpoints log IP sessions, active keys, and visual payloads. Unauthorized attempts will be prosecuted under section 43(A) of the Cyber Protection Directive.
        </p>
      </div>
    </div>
  );
};
