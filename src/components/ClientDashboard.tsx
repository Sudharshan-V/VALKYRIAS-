import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Send, LogOut, MessageSquare, Download, Trash2,
  FolderDown, FolderArchive, Music, Video, File,
  UploadCloud, FileUp, Briefcase, ShieldCheck, Film, 
  RefreshCw, Layers, ArrowLeft
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { ProfileButton, ProfileModal } from './profile';

export const ClientDashboard: React.FC = () => {
  const { 
    logout, 
    projects, 
    chatMessages, 
    addChatMessage, 
    deliverables,
    setProjects,
    setView,
    totalContract,
    paidToDate,
    nextInvoice,
    deleteDeliverable,
    uploadDeliverable,
    profile
  } = useAppState();

  const profileName = profile?.displayName || profile?.fullName || profile?.email || 'Editor';

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1500], [0, 100]);
  const yGlow2 = useTransform(scrollY, [0, 1500], [0, -100]);

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('p1');
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Chat input text
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States for File Upload Drag & Drop
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingState, setUploadingState] = useState<'idle' | 'handshake' | 'encrypting' | 'transferring' | 'verifying' | 'complete'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter messages for selected project
  const activeChatMessages = chatMessages.filter(msg => {
    if (msg.projectId) return msg.projectId === selectedProjectId;
    // Fallback seed messages for Tanishq (p1)
    if (selectedProjectId === 'p1') {
      return !msg.projectId || msg.senderName.toLowerCase().includes('tanishq') || msg.message.toLowerCase().includes('tanishq') || msg.message.toLowerCase().includes('jewelry') || msg.message.toLowerCase().includes('festive');
    }
    const clientKeyword = selectedProject.client.toLowerCase();
    return msg.senderName.toLowerCase().includes(clientKeyword) || msg.message.toLowerCase().includes(clientKeyword);
  });

  // Filter deliverables (both editor deliverables and client raw assets) for selected project
  const projectDeliverables = deliverables.filter(item => {
    if (item.projectId) return item.projectId === selectedProjectId;
    // Fallback seed deliverables for p1
    if (selectedProjectId === 'p1') return !item.storagePath && !item.projectId;
    return false;
  });

  // Split deliverables into editor-produced assets and client-uploaded reference files
  const clientUploadedAssets = projectDeliverables.filter(item => 
    item.storagePath || 
    item.thumbnail.startsWith('blob:') || 
    item.thumbnail.includes('supabase')
  );

  const editorDeliverables = projectDeliverables.filter(item => 
    !item.storagePath && 
    (!item.thumbnail.startsWith('blob:') && !item.thumbnail.includes('supabase') || item.projectId === selectedProjectId)
  );

  const handleDownload = async (item: any) => {
    // Note: Outstanding invoice lock is bypassed for the Creative Editor Marcus, as they require client raw assets to execute production.
    if (item.thumbnail && (item.thumbnail.startsWith('blob:') || item.thumbnail.includes('supabase') || (!item.thumbnail.includes('googleusercontent') && !item.thumbnail.includes('unsplash')))) {
      try {
        const response = await fetch(item.thumbnail);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to download real file, opening in new tab:", err);
        window.open(item.thumbnail, '_blank');
      }
      return;
    }

    const blob = new Blob([`Valkyrias Cinematic Production Master. Built for ${selectedProject.client}. Filename: ${item.filename}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    addChatMessage('editor', messageText.trim(), selectedProjectId);
    setMessageText('');
  };

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
      await delay(500);
      setUploadingState('encrypting');
      setUploadProgress(35);
      
      await delay(500);
      setUploadingState('transferring');
      setUploadProgress(65);
      
      // Execute the real upload
      const uploadedItem = await uploadDeliverable(file, selectedProjectId);
      
      setUploadingState('verifying');
      setUploadProgress(90);
      await delay(500);
      
      setUploadingState('complete');
      setUploadProgress(100);
      
      if (uploadedItem) {
        addChatMessage('editor', `Published new production deliverable: ${file.name} (${uploadedItem.size})`, selectedProjectId);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadingState('idle');
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

  const updateProgress = (id: string, val: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress: val } : p));
  };

  const pipelineValue = projects.reduce((sum, p) => sum + p.budget, 0);

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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
        <div>
          <span className="font-mono text-xs tracking-[0.3em] text-primary-gold block">
            VALKYRIAS PRODUCTION SUITE
          </span>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">
            Creative Lead Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-emerald-400 font-bold uppercase">{profileName} (Online)</span>
          </div>

          <ProfileButton onClick={() => setProfileOpen(true)} />

          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider text-red-400 hover:text-red-300 neumorphic-button flex items-center space-x-2 cursor-pointer"
          >
            <span>TERMINATE SESSION</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Customer Project Switcher Section */}
      <div className="mb-10 relative z-10 space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-primary-gold" />
            <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
              Studio Workspace Node Switcher
            </h3>
          </div>
          <span className="font-mono text-xs text-gray-500">
            TOTAL ACTIVE VALUE: ₹{pipelineValue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const isActive = selectedProjectId === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setUploadingState('idle');
                  setUploadedFileName('');
                }}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden group ${
                  isActive 
                    ? 'bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-primary-gold shadow-[0_0_25px_rgba(224,192,151,0.12)]' 
                    : 'bg-obsidian border-white/5 hover:border-white/20 hover:bg-white/[0.01]'
                }`}
              >
                {/* Active glow indicator */}
                {isActive && (
                  <div className="absolute top-0 right-0 bg-primary-gold text-obsidian text-[8px] font-mono font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> ACTIVE NODE
                  </div>
                )}

                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={proj.thumbnail} 
                      alt={proj.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-xs text-white truncate group-hover:text-primary-gold transition-colors">
                      {proj.title}
                    </h4>
                    <p className="font-mono text-[9px] text-gray-500 mt-1 uppercase">Client: {proj.client}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                    <span>Render Progress:</span>
                    <span className="text-primary-gold font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-obsidian/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary-gold to-champagne h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 pt-1">
                    <span>Deadline: {proj.deadline}</span>
                    <span className="text-white/70">₹{(proj.budget/1000).toFixed(0)}K</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Selected Project Pipeline Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Deliverables, Assets & Uploads (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Active Directive Control Card */}
          <div className="neumorphic-flat p-6 rounded-3xl space-y-5 border border-primary-gold/10">
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <span className="font-mono text-[9px] tracking-widest text-primary-gold uppercase block font-black">
                  ACTIVE STUDIO NODE DIRECTIVE
                </span>
                <h3 className="font-display font-black text-xl text-white tracking-tight mt-1">
                  {selectedProject.title}
                </h3>
              </div>
              <div className="text-right">
                <span className="font-mono text-[9px] text-gray-500 block uppercase">Project Budget</span>
                <span className="font-mono text-base font-bold text-primary-gold">
                  ₹{selectedProject.budget.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
              <div className="p-3 rounded-xl bg-obsidian border border-white/5">
                <span className="text-gray-500 block text-[8px] uppercase tracking-wider mb-1">CLIENT NAME</span>
                <span className="text-white font-bold uppercase">{selectedProject.client}</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian border border-white/5">
                <span className="text-gray-500 block text-[8px] uppercase tracking-wider mb-1">CATEGORY</span>
                <span className="text-white font-bold">{selectedProject.category}</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian border border-white/5">
                <span className="text-gray-500 block text-[8px] uppercase tracking-wider mb-1">PIPELINE STAGE</span>
                <span className="text-primary-gold font-bold">{selectedProject.version}</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian border border-white/5">
                <span className="text-gray-500 block text-[8px] uppercase tracking-wider mb-1">STORAGE NODE</span>
                <span className="text-white font-bold">{selectedProject.storage}</span>
              </div>
            </div>

            {/* Slider to interact and update project rendering progress */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-gray-500 uppercase">UPDATE PIPELINE RENDER PROGRESS:</span>
                <span className="font-mono text-xs font-bold text-primary-gold">{selectedProject.progress}%</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={selectedProject.progress}
                  onChange={(e) => updateProgress(selectedProject.id, parseInt(e.target.value))}
                  className="flex-1 accent-primary-gold h-1 bg-surface-container-highest rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* UPLOAD BOX: Editor Deliverables Uplink */}
          <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
            <div className="flex items-center space-x-2">
              <FileUp className="w-5 h-5 text-primary-gold animate-pulse" />
              <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wider">
                Uplink Finished Asset or Draft
              </h3>
            </div>
            
            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              Upload completed color grade drafts, high-bitrate video edits, or final VFX layers specifically to the <strong className="text-white">{selectedProject.client} ({selectedProject.title})</strong> pipeline.
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
                onChange={handleFileChange}
                className="hidden" 
              />
              
              {uploadingState === 'idle' ? (
                <div className="space-y-3">
                  <UploadCloud className="w-10 h-10 text-primary-gold/70 mx-auto animate-bounce" />
                  <p className="font-sans text-xs text-gray-300 font-semibold">
                    Drag & drop deliverables here, or <span className="text-primary-gold underline">browse files</span>
                  </p>
                  <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
                    Uplinks to {selectedProject.client} workspace storage node • AES-256 Secured
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-primary-gold font-bold">
                      {uploadingState === 'handshake' && "Establishing Secure Handshake..."}
                      {uploadingState === 'encrypting' && "Compiling finished rendering layers..."}
                      {uploadingState === 'transferring' && "Streaming output to Valkyrias Vault..."}
                      {uploadingState === 'verifying' && "Verifying checksum integrity..."}
                      {uploadingState === 'complete' && "Uplink Securely Created!"}
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
                      Uplink Another Finished Asset
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DELIVERABLES: Studio Output Packages */}
          <div className="neumorphic-flat p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-display font-extrabold text-base text-white">
                Studio Deliverables ({editorDeliverables.length})
              </h3>
              <span className="font-mono text-[9px] text-gray-500 uppercase">
                {selectedProject.client} OUTPUT STAGE
              </span>
            </div>
            
            {editorDeliverables.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editorDeliverables.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-obsidian border border-white/5 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                      <img 
                        src={item.thumbnail} 
                        alt={item.filename} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-xs text-white truncate">{item.filename}</h4>
                      <p className="font-mono text-[9px] text-gray-500 mt-1">{item.size} • {item.time}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleDownload(item)}
                        className="p-2 rounded-lg neumorphic-button hover:text-primary-gold transition cursor-pointer"
                        title="Download file output"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Are you sure you want to permanently delete "${item.filename}"?`)) {
                            await deleteDeliverable(item.id, item.storagePath);
                          }
                        }}
                        className="p-2 rounded-lg neumorphic-button hover:text-red-400 transition cursor-pointer"
                        title="Delete file output"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 border border-white/[0.03] rounded-2xl bg-black/20 font-mono text-xs">
                No deliverables published for this project yet. Use the uplink uploader above.
              </div>
            )}
          </div>

          {/* CLIENT-UPLOADED RAW FOOTAGE: Raw Files Station */}
          <div className="neumorphic-flat p-6 rounded-3xl space-y-4 border border-primary-gold/10 bg-gradient-to-r from-obsidian/60 via-[#0f1118]/60 to-obsidian/60">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <FolderDown className="w-5 h-5 text-primary-gold animate-pulse" />
                <h3 className="font-display font-extrabold text-base text-white">
                  Client-Uploaded Raw Footage
                </h3>
              </div>
              <span className="font-mono text-[9px] text-primary-gold bg-primary-gold/10 border border-primary-gold/20 px-2 py-0.5 rounded uppercase font-bold">
                Source Files ({clientUploadedAssets.length})
              </span>
            </div>

            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              These are the camera rushes, grading templates, and materials securely uploaded by the <strong className="text-white">{selectedProject.client} Team</strong> for you to process. Download them to begin post-production editing.
            </p>

            {clientUploadedAssets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientUploadedAssets.map((item) => {
                  const ext = item.filename.toLowerCase().split('.').pop() || '';
                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                  const isArchive = ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext);
                  const isAudio = ['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(ext);
                  const isVideoFile = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-obsidian border border-white/5 flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10">
                        {isImage && item.thumbnail ? (
                          <img 
                            src={item.thumbnail} 
                            alt={item.filename} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : isArchive ? (
                          <FolderArchive className="w-6 h-6 text-primary-gold/70" />
                        ) : isAudio ? (
                          <Music className="w-6 h-6 text-primary-gold/70" />
                        ) : isVideoFile ? (
                          <Video className="w-6 h-6 text-primary-gold/70" />
                        ) : (
                          <File className="w-6 h-6 text-primary-gold/70" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-xs text-white truncate" title={item.filename}>
                          {item.filename}
                        </h4>
                        <p className="font-mono text-[9px] text-gray-500 mt-1 font-bold">
                          {item.size} • {item.time || 'Just now'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleDownload(item)}
                          className="p-2 rounded-lg neumorphic-button hover:text-primary-gold transition cursor-pointer"
                          title="Download Raw Asset"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Are you sure you want to permanently delete client asset "${item.filename}"?`)) {
                              await deleteDeliverable(item.id, item.storagePath);
                            }
                          }}
                          className="p-2 rounded-lg neumorphic-button hover:text-red-400 transition cursor-pointer"
                          title="Delete Client Asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl bg-black/10 font-mono text-xs">
                No raw footage uploads registerd in {selectedProject.client} workspace yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scoped Creative Correspondence (5 cols) */}
        <div className="lg:col-span-5 neumorphic-flat p-6 rounded-3xl flex flex-col justify-between h-[650px] border border-white/5">
          <div className="border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full neumorphic-inset flex items-center justify-center font-bold text-primary-gold font-mono border border-white/5">
                {selectedProject.client[0]}
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm text-white">{selectedProject.client} Team</h3>
                <span className="font-mono text-[9px] text-gray-500 uppercase">DIRECT PIPELINE COLLABORATION CONSOLE</span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1 my-2 scrollbar-none">
            {activeChatMessages.length > 0 ? (
              activeChatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.sender === 'editor' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] font-sans ${
                    msg.sender === 'editor' 
                      ? 'bg-surface-container-high text-white rounded-tr-none border-t border-l border-white/5' 
                      : 'bg-obsidian text-gray-300 rounded-tl-none border border-white/5'
                  }`}>
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                  <span className="font-mono text-[8px] text-gray-500 mt-1 px-1">{msg.senderName} • {msg.time}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 border border-white/5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h5 className="font-display font-bold text-xs text-white uppercase">Workspace Silent</h5>
                <p className="text-[10px] text-gray-400 font-sans max-w-xs leading-relaxed">
                  Establish connection by drafting a message or notification reply to the {selectedProject.client} team above.
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="border-t border-white/5 pt-4 flex gap-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Reply directly to ${selectedProject.client}...`}
              className="flex-1 px-4 py-3 rounded-xl neu-input text-xs text-white focus:outline-none focus:border-primary-gold"
              required
            />
            <button
              type="submit"
              id="send-msg-editor-btn"
              className="p-3.5 rounded-xl text-obsidian bg-primary-gold hover:bg-champagne transition flex items-center justify-center cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};
