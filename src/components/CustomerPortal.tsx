import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  CheckCircle2, Clock, Play, Send, CreditCard, ChevronRight, 
  ExternalLink, LogOut, MessageSquare, Download, AlertCircle, FileSpreadsheet,
  Lock, Unlock, ShieldAlert, UploadCloud, RefreshCw, ShieldCheck, FileUp, Info, Eye, EyeOff,
  Layers, Database, Shield, ArrowLeft, Trash2
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';

export const CustomerPortal: React.FC = () => {
  const { 
    logout, 
    projects, 
    chatMessages, 
    addChatMessage, 
    totalContract, 
    paidToDate, 
    nextInvoice,
    approveMilestone,
    setView,
    deliverables,
    addDeliverable,
    uploadDeliverable,
    deleteDeliverable,
    notes,
    addNote,
    deleteNote,
    activePlan,
    setActivePlan
  } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1500], [0, 100]);
  const yGlow2 = useTransform(scrollY, [0, 1500], [0, -100]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'deliverable' | 'notes'>('overview');
  
  // Notes-related local states
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('Creative Design');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [noteErrorMsg, setNoteErrorMsg] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    setIsCreatingNote(true);
    setNoteErrorMsg(null);
    try {
      const result = await addNote(newNoteTitle.trim(), newNoteContent.trim(), newNoteCategory);
      if (!result.success) {
        setNoteErrorMsg(result.error || "Free plan limit reached. Upgrade to Pro to create unlimited notes.");
        setShowLimitModal(true);
      } else {
        // Clear inputs on success
        setNewNoteTitle('');
        setNewNoteContent('');
      }
    } catch (err) {
      console.error("Failed to create note:", err);
      setNoteErrorMsg("An unexpected error occurred.");
    } finally {
      setIsCreatingNote(false);
    }
  };

  // Selected project for granular details/milestones (defaults to p1, i.e., Reliance Jewels)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('p1');
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  if (!projects || projects.length === 0 || !selectedProject) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-primary-gold animate-spin" />
        <p className="text-gray-400 font-mono text-[10px] tracking-widest uppercase">INITIALIZING SECURE STUDIO TUNNEL...</p>
      </div>
    );
  }

  const [messageText, setMessageText] = useState('');
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States for File Upload Drag & Drop
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingState, setUploadingState] = useState<'idle' | 'handshake' | 'encrypting' | 'transferring' | 'verifying' | 'complete'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Secure Watermarked Video Player
  const [shieldActive, setShieldActive] = useState(true);
  const [violationAlert, setViolationAlert] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [paymentLockModal, setPaymentLockModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Map project category to different secure cinematic stock videos to give a real streaming feel!
  const getProjectVideoUrl = (id: string) => {
    switch (id) {
      case 'p2': // Lumina Fashion Campaign
        return 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-light-modeling-41807-large.mp4';
      case 'p3': // Elysium City VFX
        return 'https://assets.mixkit.co/videos/preview/mixkit-matrix-style-code-screen-running-34289-large.mp4';
      default: // Reliance Jewels
        return 'https://assets.mixkit.co/videos/preview/mixkit-luxury-gold-jewelry-pieces-42352-large.mp4';
    }
  };

  // Simulated download of completed files or project master
  const downloadFile = async (filename: string) => {
    if (nextInvoice > 0) {
      setPaymentLockModal(true);
      return;
    }

    // Try to find if this is a real deliverable with a signed URL / storage path
    const realDel = deliverables.find(d => d.filename === filename);
    if (realDel && realDel.thumbnail && (realDel.thumbnail.startsWith('blob:') || realDel.thumbnail.includes('supabase') || (!realDel.thumbnail.includes('googleusercontent') && !realDel.thumbnail.includes('unsplash')))) {
      try {
        const response = await fetch(realDel.thumbnail);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to download real file, opening in new tab:", err);
        window.open(realDel.thumbnail, '_blank');
      }
      return;
    }

    const blob = new Blob([`Valkyrias Cinematic Production Master. Built for Tanishq (Reliance Jewels). Filename: ${filename}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut listener for PrintScreen, Command+Shift+3/4/5 screenshot, Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || 
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
          (e.ctrlKey && e.key === 'p') ||
          (e.metaKey && e.key === 'p')) {
        e.preventDefault();
        setViolationAlert(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Blur window protection - auto-lock preview
  useEffect(() => {
    const handleBlur = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setShieldActive(true);
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // File drag-over triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startSimulatedUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startSimulatedUpload(e.target.files[0]);
    }
  };

  const startSimulatedUpload = async (file: File) => {
    setUploadedFileName(file.name);
    setUploadingState('handshake');
    setUploadProgress(10);
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      await delay(600);
      setUploadingState('encrypting');
      setUploadProgress(35);
      
      await delay(600);
      setUploadingState('transferring');
      setUploadProgress(65);
      
      // Execute the real upload to Supabase Storage
      const uploadedItem = await uploadDeliverable(file, selectedProject.id);
      
      setUploadingState('verifying');
      setUploadProgress(90);
      await delay(600);
      
      setUploadingState('complete');
      setUploadProgress(100);
      
      if (uploadedItem) {
        addChatMessage('client', `Securely uploaded raw reference: ${file.name} (${uploadedItem.size})`, selectedProject.id);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadingState('idle');
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    addChatMessage('client', messageText.trim(), selectedProject.id);
    setMessageText('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleApprove = () => {
    approveMilestone(selectedProject.id);
    setShowApprovalSuccess(true);
    setTimeout(() => setShowApprovalSuccess(false), 3000);
  };

  // Milestone mapping based on the selected project's progress
  const milestones = [
    { title: 'Footage Received', desc: 'All raw files securely uploaded', status: 'completed', time: 'Completed 2d ago' },
    { title: 'First Cut (Draft v1)', desc: 'Rough edit with sync sound', status: 'completed', time: 'Completed 1d ago' },
    { 
      title: 'Color Grading', 
      desc: 'Selective masks, contrast balancing', 
      status: selectedProject.progress >= 50 ? 'completed' : 'in-progress',
      time: selectedProject.progress >= 50 ? 'Completed' : 'Active Pass' 
    },
    { 
      title: 'Sound Design & Foley', 
      desc: 'Ambient FX & soundtrack mixing', 
      status: selectedProject.progress >= 75 ? 'completed' : selectedProject.progress >= 50 ? 'in-progress' : 'pending',
      time: selectedProject.progress >= 75 ? 'Completed' : selectedProject.progress >= 50 ? 'Active Pass' : 'Pending Review'
    },
    { 
      title: 'Final HQ Delivery', 
      desc: 'ProRes 422 MASTER export', 
      status: selectedProject.progress >= 100 ? 'completed' : 'pending',
      time: selectedProject.progress >= 100 ? 'Approved' : 'Pending final approval'
    }
  ];

  return (
    <div className="min-h-screen bg-obsidian text-gray-200 font-sans p-6 md:p-12 relative overflow-hidden">
      {/* Cinematic purple and blue ambient glows with scroll parallax */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <motion.div style={{ y: yGlow1 }} className="absolute top-[-15%] right-[-15%] w-[700px] h-[700px] rounded-full bg-purple-500/5 blur-[140px]" />
        <motion.div style={{ y: yGlow2 }} className="absolute bottom-[-15%] left-[-15%] w-[700px] h-[700px] rounded-full bg-blue-500/5 blur-[140px]" />
      </div>

      {/* Return Button inside main body */}
      <div className="max-w-7xl mx-auto mb-6 relative z-10 flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={() => setView('landing')}
          className="flex items-center space-x-2 text-xs font-mono text-gray-500 hover:text-primary-gold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO HOME</span>
        </button>
        <ValkyriasLogo size="sm" />
      </div>

      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 relative z-10">
        <div>
          <span className="font-mono text-xs tracking-[0.3em] text-primary-gold block">
            VALKYRIAS CUSTOMER INTERFACE
          </span>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">
            Client Project Portal
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <span className="font-mono text-[9px] text-gray-500 block uppercase">CLIENT PROFILE</span>
            <span className="text-sm font-semibold text-white">Tanishq (Reliance Jewels)</span>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider text-red-400 hover:text-red-300 neumorphic-button flex items-center space-x-2 cursor-pointer"
          >
            <span>TERMINATE SESSION</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Neumorphic Style */}
      <div className="flex border-b border-white/5 mb-8 relative z-10 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest relative transition-all duration-300 border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'text-primary-gold border-primary-gold bg-white/[0.02]'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Overview Dashboard
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest relative transition-all duration-300 border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'projects'
              ? 'text-primary-gold border-primary-gold bg-white/[0.02]'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Projects Hub ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('deliverable')}
          className={`px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest relative transition-all duration-300 border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'deliverable'
              ? 'text-primary-gold border-primary-gold bg-white/[0.02]'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Deliverables & Uplink
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest relative transition-all duration-300 border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'notes'
              ? 'text-primary-gold border-primary-gold bg-white/[0.02]'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/[0.01]'
          }`}
        >
          Creative Notes ({notes.length})
        </button>
      </div>

      {/* Main Tab Content Routing */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Welcome Message Panel */}
              <div className="neumorphic-flat p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
                  <ShieldCheck className="w-32 h-32 text-primary-gold" />
                </div>
                <div className="max-w-3xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-[9px] tracking-widest text-emerald-400 uppercase font-bold">
                      SECURE PIPELINE CONNECTED
                    </span>
                  </div>
                  <h3 className="font-display font-black text-2xl text-white">
                    Welcome back, Tanishq Team
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-sans font-light">
                    Your studio post-production workspace is synchronized. From this secure control panel, you can monitor current rendering milestones, view encrypted watermarked draft screenings, review recent direct chat correspondence with Marcus, and retrieve your final master compilations.
                  </p>
                </div>
              </div>

              {/* Grid: Primary Stream Review & Direct Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left column: Main Active Screening Player & Quick Stats */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Watermarked Video Player Container */}
                  <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="flex items-center space-x-2">
                        <Play className="w-4.5 h-4.5 text-primary-gold" />
                        <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                          Active Review Draft Stream: <span className="text-primary-gold font-normal">{selectedProject.title}</span>
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                        DRM STENCIL ACTIVE
                      </span>
                    </div>

                    {/* Shared Secure Video Screen Component */}
                    <div className="relative aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden group shadow-xl select-none">
                      
                      {/* Dynamic Background Watermark */}
                      {!shieldActive && !violationAlert && (
                        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex flex-wrap justify-center items-center opacity-10 select-none rotate-12 scale-125">
                          {Array.from({ length: 12 }).map((_, idx) => (
                            <span key={idx} className="text-[9px] font-mono text-white p-6 tracking-widest uppercase shrink-0 select-none">
                              VALKYRIAS DRAFT • suthajee8@gmail.com • COPY RESTRICTED • IP: 192.168.1.108
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Floating Watermark */}
                      {!shieldActive && !violationAlert && (
                        <div className="absolute z-20 pointer-events-none select-none px-3 py-1.5 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-primary-gold font-bold shadow-md animate-watermark-float">
                          🔒 PREVIEW FOR suthajee8@gmail.com • VALKYRIAS SECURE DOCK
                        </div>
                      )}

                      {/* Video element */}
                      <video
                        ref={videoRef}
                        src={getProjectVideoUrl(selectedProject.id)}
                        loop
                        playsInline
                        className={`w-full h-full object-cover select-none transition-all duration-500 ${
                          shieldActive || violationAlert ? 'blur-md brightness-50 grayscale scale-105 pointer-events-none' : ''
                        }`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />

                      {/* Custom Overlay Controls */}
                      {!shieldActive && !violationAlert && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-20">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => {
                                if (videoRef.current) {
                                  if (isPlaying) videoRef.current.pause();
                                  else videoRef.current.play().catch(() => {});
                                }
                              }}
                              className="p-2.5 rounded-full bg-primary-gold text-obsidian hover:bg-champagne transition shadow-md cursor-pointer animate-pulse"
                            >
                              {isPlaying ? (
                                <span className="w-3 h-3 block border-l-4 border-r-4 border-obsidian mx-auto" />
                              ) : (
                                <Play className="w-3 h-3 fill-obsidian ml-0.5" />
                              )}
                            </button>

                            <div className="flex items-center space-x-3 text-[10px] font-mono text-gray-300">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                BUFFER STATE: SECURE OK
                              </span>
                              <button 
                                onClick={() => setShieldActive(true)}
                                className="text-primary-gold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>LOCK RECOVERY</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Decryption Shield Locked */}
                      {shieldActive && !violationAlert && (
                        <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-30">
                          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/30 flex items-center justify-center text-primary-gold mb-3 animate-pulse">
                            <Lock className="w-5 h-5" />
                          </div>
                          <h4 className="font-display font-extrabold text-xs text-white mb-1 uppercase tracking-widest">
                            DRM Encrypted Stream Locked
                          </h4>
                          <p className="text-[11px] text-gray-400 max-w-sm mx-auto font-sans font-light leading-relaxed mb-4">
                            Pipeline authorization is required for active DRM sessions under <span className="text-primary-gold font-mono">suthajee8@gmail.com</span>.
                          </p>
                          <button
                            onClick={() => {
                              setShieldActive(false);
                              setTimeout(() => {
                                videoRef.current?.play().catch(() => {});
                              }, 100);
                            }}
                            className="px-4 py-2 rounded-full text-[9px] font-bold tracking-widest text-obsidian bg-primary-gold hover:bg-champagne transition-all duration-300 shadow-md uppercase cursor-pointer"
                          >
                            De-Crypt Stream & Play
                          </button>
                        </div>
                      )}

                      {/* Screen violation Alert overlay */}
                      {violationAlert && (
                        <div className="absolute inset-0 bg-red-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-40 animate-pulse">
                          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-3 animate-bounce">
                            <ShieldAlert className="w-6 h-6" />
                          </div>
                          <h4 className="font-display font-black text-xs text-white mb-1 uppercase tracking-wider">
                            🚨 SCREEN CAPTURE SHIELD VIOLATION!
                          </h4>
                          <p className="text-[11px] text-red-200 max-w-sm mx-auto font-sans font-light leading-relaxed mb-4">
                            Session screen recording or capture detected. Direct rendering line has been closed under secure auditing flags.
                          </p>
                          <button
                            onClick={() => {
                              setViolationAlert(false);
                              setShieldActive(true);
                            }}
                            className="px-4 py-2 rounded-full text-[9px] font-bold tracking-widest text-white bg-red-600 hover:bg-red-500 transition duration-300 shadow-md uppercase cursor-pointer"
                          >
                            Re-verify & Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick stats panel */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl neumorphic-flat text-center">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Active Projects</span>
                      <span className="font-display font-black text-xl text-white">{projects.length}</span>
                    </div>
                    <div className="p-4 rounded-2xl neumorphic-flat text-center">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Completed Deliverables</span>
                      <span className="font-display font-black text-xl text-primary-gold">{deliverables.length}</span>
                    </div>
                    <div className="p-4 rounded-2xl neumorphic-flat text-center">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Encrypted Files Size</span>
                      <span className="font-display font-black text-xl text-white">17.0 GB</span>
                    </div>
                    <div className="p-4 rounded-2xl neumorphic-flat text-center">
                      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Pipeline Health</span>
                      <span className="font-display font-black text-xl text-emerald-400">99.8%</span>
                    </div>
                  </div>

                  {/* Active Pipelines Grid Showcase */}
                  <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                        Post-Production Pipelines Overview
                      </h4>
                      <span className="font-mono text-[9px] text-gray-500">CLICK TO MANAGE IN DETAIL</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {projects.map((proj) => (
                        <div 
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab('projects');
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                            selectedProjectId === proj.id 
                              ? 'bg-white/[0.02] border-primary-gold/40 shadow-md' 
                              : 'bg-obsidian border-white/5 hover:bg-white/[0.01]'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                              <img src={proj.thumbnail} alt={proj.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-display font-extrabold text-xs text-white truncate">{proj.title}</h5>
                              <span className="font-mono text-[8px] text-gray-500 block uppercase truncate">{proj.category}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-gray-500">Render Stage:</span>
                              <span className="text-primary-gold font-bold">{proj.progress}%</span>
                            </div>
                            <div className="w-full bg-obsidian rounded-full h-1 overflow-hidden">
                              <div className="bg-primary-gold h-1 rounded-full" style={{ width: `${proj.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column: Financial Summary Ledger & Chat Console */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Financials Overview Card */}
                  <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                    <h4 className="font-display font-extrabold text-base text-white border-b border-white/5 pb-3 uppercase tracking-wider">
                      Financial Account Ledger
                    </h4>
                    
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>TOTAL CONTRACT VALUE</span>
                        <span className="text-white font-bold">₹{totalContract.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-400">
                        <span>ESCROW CLEARED</span>
                        <span className="text-white font-bold">₹{paidToDate.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-400 pt-3 border-t border-white/5">
                        <span>OUTSTANDING INVOICE</span>
                        <span className={`font-bold ${nextInvoice > 0 ? 'text-primary-gold' : 'text-emerald-400'}`}>
                          ₹{nextInvoice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {nextInvoice > 0 ? (
                      <button
                        onClick={() => setView('checkout')}
                        className="w-full py-3.5 rounded-xl text-xs font-mono font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>PAY OUTSTANDING INVOICE</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-mono text-center">
                        🎉 Balance Settled! No Outstanding Payments.
                      </div>
                    )}
                  </div>

                  {/* direct compact chat tool */}
                  <div className="neumorphic-flat p-6 rounded-3xl flex flex-col justify-between h-[360px]">
                    <div className="border-b border-white/5 pb-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-primary-gold" />
                        <h4 className="font-display font-extrabold text-xs text-white uppercase tracking-wider">Direct Editor Correspondence</h4>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 px-1 my-1 max-h-[220px]">
                      {chatMessages.filter(msg => {
                        if (msg.projectId) return msg.projectId === selectedProjectId;
                        if (selectedProjectId === 'p1') {
                          return !msg.projectId || msg.senderName.toLowerCase().includes('tanishq') || msg.message.toLowerCase().includes('tanishq');
                        }
                        const clientKeyword = selectedProject.client.toLowerCase();
                        return msg.senderName.toLowerCase().includes(clientKeyword) || msg.message.toLowerCase().includes(clientKeyword);
                      }).map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`p-2.5 rounded-xl text-[10px] max-w-[85%] font-sans ${
                            msg.sender === 'client' 
                              ? 'bg-surface-container-high text-white rounded-tr-none' 
                              : 'bg-obsidian text-gray-300 rounded-tl-none border border-white/5'
                          }`}>
                            <p className="leading-relaxed">{msg.message}</p>
                          </div>
                          <span className="font-mono text-[7px] text-gray-500 mt-0.5 px-1">{msg.senderName}</span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="border-t border-white/5 pt-2 flex gap-2">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Reply to Marcus..."
                        className="flex-1 px-3 py-2 rounded-lg neu-input text-[11px] text-white"
                        required
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-lg text-obsidian bg-primary-gold hover:bg-champagne transition flex items-center justify-center cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: PROJECTS HUB */}
          {activeTab === 'projects' && (
            <motion.div
              key="projects-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Sidebar: Projects Selector List (col-span-4) */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="font-display font-black text-lg text-white border-b border-white/5 pb-2 uppercase tracking-wider">
                  Post-Production Pipelines ({projects.length})
                </h3>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        // reset video player states to trigger key reload
                        setShieldActive(true);
                        setIsPlaying(false);
                      }}
                      className={`p-4 rounded-2xl transition-all duration-300 cursor-pointer text-left ${
                        selectedProjectId === proj.id
                          ? 'neumorphic-inset border border-primary-gold/40 shadow-inner'
                          : 'neumorphic-flat hover:bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex-shrink-0 border border-white/5">
                          <img 
                            src={proj.thumbnail} 
                            alt={proj.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            proj.status === 'Completed' 
                              ? 'bg-emerald-500/15 text-emerald-400' 
                              : 'bg-primary-gold/15 text-primary-gold'
                          }`}>
                            {proj.status}
                          </span>
                          <h4 className="font-display font-black text-xs text-white mt-1.5 truncate leading-tight">
                            {proj.title}
                          </h4>
                          <span className="font-sans text-[10px] text-gray-500 block uppercase truncate mt-0.5">
                            {proj.category}
                          </span>
                        </div>
                      </div>

                      {/* Render Progress Slider Indicator */}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-400">
                          <span>Progress:</span>
                          <span className="text-white font-bold">{proj.progress}%</span>
                        </div>
                        <div className="w-full bg-obsidian rounded-full h-1 overflow-hidden">
                          <div 
                            className="bg-primary-gold h-1 rounded-full transition-all duration-500" 
                            style={{ width: `${proj.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area: Selected Project Milestones & Specs (col-span-8) */}
              <div className="lg:col-span-8 space-y-8">
                {/* Specs card of Selected project */}
                <div className="neumorphic-flat p-6 rounded-3xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 mb-6 gap-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-primary-gold animate-pulse" />
                        <span className="font-mono text-[9px] tracking-widest text-primary-gold uppercase font-bold">
                          DETAILED SPECIFICATIONS
                        </span>
                      </div>
                      <h3 className="font-display font-black text-2xl text-white">
                        {selectedProject.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedProject.category} • Pipeline Overseer: <strong className="text-white">{selectedProject.editor}</strong>
                      </p>
                    </div>

                    <div className="text-right font-mono text-xs text-gray-400 space-y-1">
                      <div>VERSION: <span className="text-white font-bold">{selectedProject.version}</span></div>
                      <div>DEADLINE: <span className="text-primary-gold font-bold">{selectedProject.deadline}</span></div>
                    </div>
                  </div>

                  {/* Specs Quick Matrix */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl neumorphic-inset">
                      <span className="text-gray-500 block text-[9px] tracking-wider mb-1">BUDGET ALLOCATED</span>
                      <span className="text-white font-bold text-sm">₹{selectedProject.budget.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-4 rounded-xl neumorphic-inset">
                      <span className="text-gray-500 block text-[9px] tracking-wider mb-1">RENDER PROGRESS</span>
                      <span className="text-primary-gold font-bold text-sm">{selectedProject.progress}%</span>
                    </div>
                    <div className="p-4 rounded-xl neumorphic-inset">
                      <span className="text-gray-500 block text-[9px] tracking-wider mb-1">STORAGE IN NODE</span>
                      <span className="text-white font-bold text-sm">{selectedProject.storage}</span>
                    </div>
                    <div className="p-4 rounded-xl neumorphic-inset">
                      <span className="text-gray-500 block text-[9px] tracking-wider mb-1">PIPELINE HEALTH</span>
                      <span className="text-emerald-400 font-bold text-sm">OPTIMAL</span>
                    </div>
                  </div>
                </div>

                {/* Milestone Pipeline tracker */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-white">Project Milestones Pipeline</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Approve individual post-production stages below.</p>
                    </div>
                    
                    {selectedProject.progress < 100 ? (
                      <button
                        onClick={handleApprove}
                        className="px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-md flex items-center space-x-1.5 cursor-pointer self-start md:self-auto"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>APPROVE CURRENT MILESTONE</span>
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center space-x-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>PROJECT FINALIZED & COMPLETED</span>
                      </span>
                    )}
                  </div>

                  {/* Interactive Milestones Map */}
                  <div className="relative pl-6 border-l-2 border-white/5 space-y-6">
                    {milestones.map((milestone, i) => (
                      <div key={i} className="relative group">
                        {/* Bullet point indicator */}
                        <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          milestone.status === 'completed' 
                            ? 'bg-primary-gold border-primary-gold shadow-[0_0_8px_rgba(224,192,151,0.5)]' 
                            : milestone.status === 'in-progress' 
                              ? 'bg-obsidian border-primary-gold animate-pulse' 
                              : 'bg-obsidian border-white/10'
                        }`}>
                          {milestone.status === 'completed' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-obsidian" />
                          )}
                        </span>

                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                          <div>
                            <h4 className={`font-display font-bold text-sm leading-none ${
                              milestone.status === 'completed' ? 'text-white' : 'text-gray-400'
                            }`}>
                              {milestone.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{milestone.desc}</p>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full self-start md:self-auto border ${
                            milestone.status === 'completed' 
                              ? 'bg-primary-gold/15 text-primary-gold border-primary-gold/20' 
                              : milestone.status === 'in-progress' 
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse' 
                                : 'bg-white/5 text-gray-500 border-white/5'
                          }`}>
                            {milestone.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Toast Alert on Approval Success */}
                  <AnimatePresence>
                    {showApprovalSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="p-3.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 animate-bounce" />
                        <span>Rendering stage upgraded. Project post-production progress set to {selectedProject.progress}%.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Secure Watermarked Preview Player specifically mapped to this project */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-primary-gold" />
                      <h3 className="font-display font-extrabold text-sm text-white">
                        Watermarked Pipeline Screening: {selectedProject.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 font-sans font-light leading-relaxed">
                    Review unreleased color balances, grade layers, and raw assets below. DRM watermark overlays render details matched to suthajee8@gmail.com dynamically.
                  </p>

                  <div className="relative aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden group shadow-2xl select-none">
                    
                    {/* Watermark grid */}
                    {!shieldActive && !violationAlert && (
                      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex flex-wrap justify-center items-center opacity-15 select-none rotate-12 scale-125">
                        {Array.from({ length: 16 }).map((_, idx) => (
                          <span key={idx} className="text-[10px] font-mono text-white p-6 tracking-widest uppercase shrink-0 select-none">
                            VALKYRIAS DRAFT • suthajee8@gmail.com • COPY RESTRICTED • IP: 192.168.1.108
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Floating watermark */}
                    {!shieldActive && !violationAlert && (
                      <div className="absolute z-20 pointer-events-none select-none px-3 py-1.5 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-primary-gold font-bold shadow-md animate-watermark-float">
                        🔒 PREVIEW FOR suthajee8@gmail.com • VALKYRIAS REVIEW MASTER
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      src={getProjectVideoUrl(selectedProject.id)}
                      loop
                      playsInline
                      className={`w-full h-full object-cover select-none transition-all duration-500 ${
                        shieldActive || violationAlert ? 'blur-md brightness-50 grayscale scale-105 pointer-events-none' : ''
                      }`}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />

                    {/* Controls overlay */}
                    {!shieldActive && !violationAlert && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-20">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                if (isPlaying) videoRef.current.pause();
                                else videoRef.current.play().catch(() => {});
                              }
                            }}
                            className="p-2.5 rounded-full bg-primary-gold text-obsidian hover:bg-champagne transition shadow-md cursor-pointer animate-pulse"
                          >
                            {isPlaying ? (
                              <span className="w-3 h-3 block border-l-4 border-r-4 border-obsidian mx-auto" />
                            ) : (
                              <Play className="w-3 h-3 fill-obsidian ml-0.5" />
                            )}
                          </button>

                          <div className="flex items-center space-x-3 text-[10px] font-mono text-gray-300">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              BUFFER STATE: OK
                            </span>
                            <button 
                              onClick={() => setShieldActive(true)}
                              className="text-primary-gold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>LOCK PIPELINE</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Locked shield overlay */}
                    {shieldActive && !violationAlert && (
                      <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-30">
                        <div className="w-14 h-14 rounded-full bg-primary-gold/10 border border-primary-gold/30 flex items-center justify-center text-primary-gold mb-4 animate-pulse">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="font-display font-extrabold text-sm text-white mb-2 uppercase tracking-widest">
                          Secure Decryption Stream Locked
                        </h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans font-light leading-relaxed mb-5">
                          Stream encrypted under AES-128 key matching <span className="text-primary-gold font-mono">suthajee8@gmail.com</span>. Click below to verify credentials and establish secure rendering pipeline.
                        </p>
                        <button
                          onClick={() => {
                            setShieldActive(false);
                            setTimeout(() => {
                              videoRef.current?.play().catch(() => {});
                            }, 100);
                          }}
                          className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[2px] text-obsidian bg-primary-gold hover:bg-champagne transition-all duration-300 shadow-lg uppercase cursor-pointer"
                        >
                          Authenticate & Resume Stream
                        </button>
                      </div>
                    )}

                    {/* Screen violation Alert overlay */}
                    {violationAlert && (
                      <div className="absolute inset-0 bg-red-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center z-40 animate-pulse">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 animate-bounce">
                          <ShieldAlert className="w-7 h-7" />
                        </div>
                        <h4 className="font-display font-black text-sm text-white mb-2 uppercase tracking-wider">
                          🚨 CRYPTOGRAPHIC SHIELD VIOLATION!
                        </h4>
                        <p className="text-xs text-red-200 max-w-sm mx-auto font-sans font-light leading-relaxed mb-5">
                          An unauthorized screenshot or screen-sharing attempt was captured. The pipeline has been closed and fully logged under suthajee8@gmail.com for copyright auditing.
                        </p>
                        <button
                          onClick={() => {
                            setViolationAlert(false);
                            setShieldActive(true);
                          }}
                          className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[2px] text-white bg-red-600 hover:bg-red-500 transition-all duration-300 shadow-lg uppercase cursor-pointer"
                        >
                          Dismiss & Re-Authorize Stream
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: DELIVERABLES & UPLINK */}
          {activeTab === 'deliverable' && (
            <motion.div
              key="deliverable-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Asset Uplink Drag-Drop & Files List (col-span-7) */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Drag and Drop Uploader */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                  <div className="flex items-center space-x-2">
                    <FileUp className="w-5 h-5 text-primary-gold animate-pulse" />
                    <h3 className="font-display font-extrabold text-base text-white">
                      Secure Raw Asset Uplink
                    </h3>
                  </div>
                  
                  <p className="text-xs text-gray-400 font-sans font-light leading-relaxed">
                    Upload uncompressed camera rushes, reference design briefs, log-profile references, or soundtracks. Upload streams are encrypted on flight with localized AES-256 keys.
                  </p>

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      dragActive 
                        ? 'border-primary-gold bg-primary-gold/10 shadow-[0_0_20px_rgba(224,192,151,0.15)]' 
                        : 'border-white/10 bg-obsidian hover:border-white/20 hover:bg-white/[0.01]'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      multiple 
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                    
                    {uploadingState === 'idle' ? (
                      <div className="space-y-3">
                        <UploadCloud className="w-10 h-10 text-primary-gold/70 mx-auto animate-bounce" />
                        <p className="font-sans text-xs text-gray-300 font-semibold">
                          Drag & drop assets here, or <span className="text-primary-gold underline">browse files</span>
                        </p>
                        <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                          Supports .MP4, .MOV, .ZIP, .LUT (Max 15GB) • AES-256 Encrypted
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-primary-gold font-bold">
                            {uploadingState === 'handshake' && "Establishing Encrypted Handshake..."}
                            {uploadingState === 'encrypting' && "Compiling and Encrypting Packets..."}
                            {uploadingState === 'transferring' && "Streaming to Valkyrias S3 Storage Vault..."}
                            {uploadingState === 'verifying' && "Verifying SHA-256 Checksums..."}
                            {uploadingState === 'complete' && "Uplink Securely Established!"}
                          </span>
                          <span className="text-gray-400">{uploadProgress}%</span>
                        </div>
                        
                        <div className="w-full bg-obsidian rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              uploadingState === 'complete' ? 'bg-emerald-400' : 'bg-primary-gold animate-pulse'
                            }`}
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        
                        <p className="font-mono text-[9px] text-gray-400 truncate">
                          {uploadedFileName || "Processing..."}
                        </p>
                        
                        {uploadingState === 'complete' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadingState('idle');
                              setUploadedFileName('');
                            }}
                            className="mt-2 text-[10px] font-mono text-primary-gold hover:underline uppercase tracking-wider cursor-pointer"
                          >
                            Upload Another File
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivered assets log */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                      Uplinked Assets & Deliverables Log
                    </h4>
                    <span className="font-mono text-[9px] text-gray-500">REAL-TIME SYNC LOG</span>
                  </div>

                  {deliverables.filter(del => {
                    if (del.projectId) return del.projectId === selectedProjectId;
                    if (selectedProjectId === 'p1') return !del.storagePath && !del.projectId;
                    return false;
                  }).length > 0 ? (
                    <div className="space-y-3">
                      {deliverables.filter(del => {
                        if (del.projectId) return del.projectId === selectedProjectId;
                        if (selectedProjectId === 'p1') return !del.storagePath && !del.projectId;
                        return false;
                      }).map((del) => (
                        <div 
                          key={del.id} 
                          className="flex justify-between items-center p-3 rounded-xl bg-obsidian border border-white/5 text-xs hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <span className="w-2 h-2 rounded-full bg-primary-gold animate-pulse flex-shrink-0" />
                            <span className="text-gray-300 font-sans truncate font-medium">{del.filename}</span>
                          </div>
                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="font-mono text-[10px] text-gray-500 mr-2">{del.size}</span>
                            <button 
                              onClick={() => downloadFile(del.filename)}
                              className="text-primary-gold hover:text-white transition flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>RETR</span>
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete "${del.filename}" from Supabase Storage and database?`)) {
                                  await deleteDeliverable(del.id, del.storagePath);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer font-bold ml-2"
                              title="Delete Deliverable"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>DEL</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 font-mono text-xs">
                      No assets currently registered in this workspace node.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Final Master Container Downloads & Session Telemetry (col-span-5) */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* Master ZIP Package Container */}
                {selectedProject.progress >= 100 ? (
                  <div className="bg-gradient-to-r from-emerald-950/20 via-primary-gold/10 to-champagne/10 border border-primary-gold/30 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                      <Download className="w-24 h-24 text-primary-gold" />
                    </div>
                    <div className="space-y-3 relative z-10">
                      <h4 className="font-display font-black text-white text-sm">🎉 VALKYRIAS PRODUCTION MASTER COIL IS READY!</h4>
                      <p className="text-xs text-gray-300 max-w-lg mx-auto font-sans font-light leading-relaxed">
                        All creative post-production milestones for <strong className="text-white">{selectedProject.title}</strong> are successfully approved. Finalized grading, VFX comps, and sound masters are packaged.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => downloadFile(`Valkyrias_${selectedProject.title.replace(/\s+/g, '_')}_FINAL_MASTER_ProRes422.zip`)}
                          className="px-6 py-3 rounded-full text-xs font-mono font-bold tracking-[2px] text-obsidian bg-primary-gold hover:bg-champagne hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl flex items-center justify-center space-x-2 mx-auto uppercase cursor-pointer"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          <span>Download Final Master (34.8 GB ZIP)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="neumorphic-flat p-6 rounded-3xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h4 className="font-display font-black text-white text-xs uppercase tracking-wider">
                      Master Container Locked
                    </h4>
                    <p className="text-xs text-gray-400 font-sans font-light leading-relaxed">
                      The final uncompressed master package is securely locked and encrypted under the hood. Complete and approve all milestones (100% render stage) for <strong className="text-white">{selectedProject.title}</strong> to release the decryption key and retrieve the high-quality package.
                    </p>
                    <div className="bg-obsidian border border-white/5 p-3 rounded-xl text-[10px] font-mono text-gray-500">
                      Current: {selectedProject.progress}% rendered • Approvals Pending
                    </div>
                  </div>
                )}

                {/* Telemetry log for dynamic watermarking metrics */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                  <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                    DRM & Decryption Telemetry
                  </h4>
                  
                  <div className="space-y-3 font-mono text-[10px] text-gray-400">
                    <div className="flex justify-between items-center">
                      <span>DECRYPTION TARGET</span>
                      <span className="text-white font-bold">suthajee8@gmail.com</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>LOCAL SESSION IP</span>
                      <span className="text-white">192.168.1.108</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>STENCIL TYPE</span>
                      <span className="text-primary-gold font-bold">DYNAMIC OVERLAY</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>SCREENBLOCK HOOKS</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> ATTACHED / SECURE
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                      <span>KEYSTREAM EXPIRED</span>
                      <span className="text-gray-500">NEVER (AUTHORIZED NODE)</span>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: CREATIVE NOTES */}
          {activeTab === 'notes' && (
            <motion.div
              key="notes-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Note Compositor Form & Plan Limits (col-span-5) */}
              <div className="lg:col-span-5 space-y-8">
                <div className="neumorphic-flat p-6 rounded-3xl space-y-6">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <Layers className="w-5 h-5 text-primary-gold animate-pulse" />
                    <h3 className="font-display font-extrabold text-base text-white">
                      Creative Notes Compositor
                    </h3>
                  </div>

                  <form onSubmit={handleCreateNote} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                        Note Title
                      </label>
                      <input
                        type="text"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        placeholder="e.g., Color Grading Warmth Adjustment"
                        required
                        disabled={isCreatingNote}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-gold transition font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                        Content / Creative Brief
                      </label>
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Detail your creative adjustments, audio preferences, or reference elements here..."
                        required
                        disabled={isCreatingNote}
                        rows={5}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-gold transition font-sans resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
                        Creative Segment / Category
                      </label>
                      <select
                        value={newNoteCategory}
                        onChange={(e) => setNewNoteCategory(e.target.value)}
                        disabled={isCreatingNote}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-gold transition font-sans appearance-none cursor-pointer"
                      >
                        <option value="Creative Design" className="bg-obsidian">Creative Design</option>
                        <option value="Cinematic Editing" className="bg-obsidian">Cinematic Editing</option>
                        <option value="VFX Composition" className="bg-obsidian">VFX Composition</option>
                        <option value="Audio Design" className="bg-obsidian">Audio Design</option>
                        <option value="General Feedback" className="bg-obsidian">General Feedback</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingNote}
                      className="w-full py-3.5 rounded-xl text-xs font-mono font-bold tracking-[2px] text-obsidian bg-primary-gold hover:bg-champagne hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer uppercase flex items-center justify-center space-x-2 shadow-lg shadow-primary-gold/10 disabled:opacity-50"
                    >
                      <span>{isCreatingNote ? "UPLINKING NOTE..." : "PUBLISH CREATIVE NOTE"}</span>
                    </button>
                  </form>
                </div>

                {/* SaaS Plan & Storage metrics block */}
                <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                      Workspace Subscription Status
                    </h4>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                      activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter'
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                    }`}>
                      {activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter' ? 'PRO PLAN' : 'FREE PREVIEW'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-gray-400">
                        <span>CREATIVE NOTES LIMIT</span>
                        <span className="font-bold text-white">
                          {activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter' 
                            ? `${notes.length} / Unlimited` 
                            : `${notes.length} / 3 notes`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            notes.length >= 3 && !(activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter')
                              ? 'bg-red-500'
                              : 'bg-primary-gold'
                          }`}
                          style={{ 
                            width: activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter' 
                              ? '100%' 
                              : `${Math.min(100, (notes.length / 3) * 100)}%` 
                          }}
                        />
                      </div>
                      {!(activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter') && (
                        <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                          Free preview accounts are allocated exactly 3 active creative notes. Upgrade to create unlimited team collaborations.
                        </p>
                      )}
                    </div>

                    {!(activePlan && activePlan !== 'plan1' && activePlan !== 'Asset Starter') && (
                      <button
                        onClick={async () => {
                          await setActivePlan('Elite Creator');
                          addChatMessage('admin', "System log: Workspace upgraded to ELITE CREATOR package. Note limitations released.");
                        }}
                        className="w-full py-3 rounded-xl border border-primary-gold/30 hover:border-primary-gold text-primary-gold bg-primary-gold/5 hover:bg-primary-gold/10 text-xs font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer text-center uppercase"
                      >
                        UPGRADE WORKSPACE TO ELITE
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Active Notes List (col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
                    <span>Workspace Notes List</span>
                    <span className="text-xs font-normal font-mono text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                      {notes.length} Active
                    </span>
                  </h3>
                </div>

                {notes.length === 0 ? (
                  <div className="neumorphic-flat p-12 text-center rounded-3xl space-y-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="font-display font-black text-white text-sm uppercase tracking-wider">
                      Workspace is Silent
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans font-light leading-relaxed">
                      Create your first creative note to direct our post-production team or summarize adjustments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => {
                      // Custom colors based on Category
                      let catColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                      if (note.category === "Creative Design") catColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
                      else if (note.category === "Cinematic Editing") catColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      else if (note.category === "VFX Composition") catColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                      else if (note.category === "Audio Design") catColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                      return (
                        <motion.div
                          key={note.id}
                          layoutId={note.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="neumorphic-flat p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 relative group"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[8px] font-mono px-2 py-0.5 rounded border uppercase font-bold shrink-0 ${catColor}`}>
                                  {note.category}
                                </span>
                                {note.is_ai_summarized && (
                                  <span className="text-[8px] font-mono text-primary-gold bg-primary-gold/10 border border-primary-gold/20 px-2 py-0.5 rounded uppercase font-bold shrink-0">
                                    AI Summarized
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display font-extrabold text-sm text-white group-hover:text-primary-gold transition-colors duration-300">
                                {note.title}
                              </h4>
                              <p className="text-xs text-gray-400 leading-relaxed font-sans font-light">
                                {note.content}
                              </p>
                            </div>

                            <button
                              onClick={() => deleteNote(note.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition duration-300 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Security / Payment Lock Overlay */}
        {paymentLockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[32px] p-8 bg-surface-container border-2 border-red-500/20 shadow-2xl shadow-red-500/5 text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-6">
                <Lock className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="font-display font-black text-xl text-white tracking-tight uppercase mb-3">
                Master Asset Retrieval Locked
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-sans mb-6">
                We have registered outstanding production invoices for this workspace. To unlock the cryptographic decryption key and download your premium files, please settle the remaining balance.
              </p>

              {/* Invoice summary table */}
              <div className="bg-obsidian border border-white/5 p-4 rounded-2xl mb-8 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-gray-500">
                  <span>OUTSTANDING INVOICE</span>
                  <span className="text-red-400 font-extrabold">₹{nextInvoice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gray-500 border-t border-white/5 pt-2 mt-2">
                  <span>ESCROW ACQUIRED</span>
                  <span className="text-emerald-400">₹{paidToDate.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setPaymentLockModal(false);
                    setView('checkout');
                  }}
                  className="w-full py-3.5 rounded-full text-xs font-mono font-bold tracking-[2px] text-obsidian bg-primary-gold hover:bg-champagne hover:scale-[1.02] transition-all cursor-pointer uppercase flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>PAY OUTSTANDING INVOICE</span>
                </button>
                <button
                  onClick={() => setPaymentLockModal(false)}
                  className="w-full py-3 rounded-full text-xs font-mono font-bold tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  RETURN TO WORKSPACE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SaaS Plan Limit Alert Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[32px] p-8 bg-surface-container border-2 border-primary-gold/20 shadow-2xl shadow-primary-gold/5 text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-primary-gold/10 border border-primary-gold/30 flex items-center justify-center text-primary-gold mx-auto mb-6">
                <ShieldAlert className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="font-display font-black text-xl text-white tracking-tight uppercase mb-3">
                Free Plan Limit Reached
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed font-sans mb-8">
                Free plan limit reached. Upgrade to Pro to create unlimited notes. Elevate your creative pipeline with our Elite package features including zero latency rendering.
              </p>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    await setActivePlan('Elite Creator');
                    addChatMessage('admin', "System log: Workspace upgraded to ELITE CREATOR package. Note limitations released.");
                    setShowLimitModal(false);
                  }}
                  className="w-full py-3.5 rounded-full text-xs font-mono font-bold tracking-[2px] text-obsidian bg-primary-gold hover:bg-champagne hover:scale-[1.02] transition-all cursor-pointer uppercase flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>UPGRADE TO PRO WORKSPACE</span>
                </button>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-3 rounded-full text-xs font-mono font-bold tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  DISMISS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
};
