import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  ShieldAlert, KeyRound, CheckCircle, ArrowLeft, RefreshCw, 
  Mail, UserPlus, LogIn, User, Chrome, ShieldCheck, Copy, Shield, Lock, Layers
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { supabase } from '../supabaseClient';
import * as api from '../api';

export const LoginPortal: React.FC = () => {
  const { login, setView } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1000], [0, 80]);
  const yGlow2 = useTransform(scrollY, [0, 1000], [0, -80]);

  // Unified login step flow: 'select_role' -> 'enter_credentials'
  const [loginStep, setLoginStep] = useState<'select_role' | 'enter_credentials'>('select_role');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'client' | 'editor'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('tanishq@reliancejewels.com');
  const [password, setPassword] = useState('valkyrias2026');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const roles = [
    {
      id: 'client' as const,
      name: 'Client Portal',
      desc: 'Tanishq (Reliance Jewels) — Review cinematic cuts, video drafts & invoices',
      defaultInput: 'tanishq@reliancejewels.com',
      badge: 'Customer Access'
    },
    {
      id: 'editor' as const,
      name: 'Editor Pipeline',
      desc: 'Marcus Vane — Upload raw reference video, manage deliverables & tasks',
      defaultInput: 'marcus.vane@valkyrias.co',
      badge: 'Creative Editor'
    },
    {
      id: 'admin' as const,
      name: 'Admin Command Center',
      desc: 'Root Administration — Manage portfolio entries, user settings & databases',
      defaultInput: 'admin@valkyrias.co',
      badge: 'Full Permissions'
    }
  ];

  const handleSelectRoleStep = (roleId: 'admin' | 'client' | 'editor', defaultEmail: string) => {
    setSelectedRole(roleId);
    setEmail(defaultEmail);
    setPassword('valkyrias2026'); // Seeded testing password
    setErrorMsg('');
    setSignupSuccessMessage('');
    setLoginStep('enter_credentials');
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
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

    try {
      if (isSignUpMode) {
        // Sign Up Flow via Spring Boot REST
        const data = await api.register({
          name,
          email,
          password,
          role: selectedRole
        });

        if (!data || data.status !== 'success') {
          setErrorMsg('Registration failed.');
          setIsLoading(false);
        } else {
          setPassword('');
          setName('');
          setSignupSuccessMessage("Your account has been created. You can now authorize your session and log in.");
          setIsSignUpMode(false);
          setIsLoading(false);
        }
      } else {
        // Sign In Flow via Spring Boot REST
        setSignupSuccessMessage('');
        const data = await api.login({
          email,
          password
        });

        if (!data || data.status !== 'success') {
          setErrorMsg('Invalid email or password.');
          setIsLoading(false);
        } else {
          setSuccessMsg('Access Granted!');
          setIsSuccess(true);
          setTimeout(() => {
            let mappedRole: 'admin' | 'client' | 'editor' = 'client';
            const backendRole = (data.user?.role || '').toLowerCase();
            if (backendRole === 'admin') mappedRole = 'admin';
            else if (backendRole === 'editor') mappedRole = 'editor';
            login(mappedRole, data.token, data.user);
          }, 2500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authorization error occurred.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSignupSuccessMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected Google OAuth error occurred.');
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
              className="neumorphic-flat p-8 rounded-[28px] text-center space-y-6 border border-emerald-500/30 bg-[#0d0e14]/80 backdrop-blur-xl relative overflow-hidden"
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
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-[#0d0e14]/70 backdrop-blur-xl space-y-6"
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
                    onClick={() => handleSelectRoleStep(role.id, role.defaultInput)}
                    className="w-full group text-left p-5 rounded-2xl border border-white/5 hover:border-primary-gold/30 bg-black/40 hover:bg-primary-gold/[0.02] transition-all duration-300 cursor-pointer flex items-center justify-between gap-4"
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
              className="neumorphic-flat p-8 rounded-[28px] border border-white/5 bg-[#0d0e14]/70 backdrop-blur-xl space-y-6"
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
                  <label className="font-mono text-[10px] tracking-wider text-gray-400 block uppercase font-bold">
                    Password
                  </label>
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

                {/* Pre-fill hint for standard sandbox evaluation */}
                {!isSignUpMode && (email === 'tanishq@reliancejewels.com' || email === 'marcus.vane@valkyrias.co' || email === 'admin@valkyrias.co') && (
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-gray-400 font-sans leading-relaxed flex items-start gap-2.5">
                    <span className="text-primary-gold font-bold">Demo Hub:</span>
                    <span>Sandbox credentials preloaded. Click Authorize to access directly, or modify the password if custom testing is desired.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
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
                      disabled={isLoading}
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

      {/* Footer Disclaimer */}
      <div className="max-w-4xl w-full mx-auto text-center space-y-2 relative z-10">
        <p className="font-sans text-[10px] text-gray-600 leading-normal">
          Authorized personnel only. Valkyrias secure endpoints log IP sessions, active keys, and visual payloads. Unauthorized attempts will be prosecuted under section 43(A) of the Cyber Protection Directive.
        </p>
      </div>
    </div>
  );
};
