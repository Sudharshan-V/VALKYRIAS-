import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  TrendingUp, Layers, CheckCircle2, AlertCircle, Plus, Sparkles, 
  Trash2, DollarSign, ArrowUpRight, ShoppingBag, FolderGit2, LogOut, ExternalLink, ArrowLeft, Edit3, Award
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';

export const AdminDashboard: React.FC = () => {
  const { 
    logout, 
    projects, 
    actionItems, 
    resolveActionItem, 
    portfolioItems, 
    addPortfolioItem,
    totalContract,
    setView,
    plans,
    updatePlan
  } = useAppState();

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1500], [0, 100]);
  const yGlow2 = useTransform(scrollY, [0, 1500], [0, -100]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('PHOTO EDITING');
  const [newImage, setNewImage] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuBs0yIhqcnx03pXDe_0-1jj_ZbCfLYo5AzD1jtpNqUZ3yKWfBWKQtZveOdskUpuAnxk9XvbfzJRCpGFszLfJpFRRQTSAoco5MJXzuwXAjnUFXimOwQh7uIvY3cxg1vSi5HKkxzPoys5WkhTEhx0jwrWTDEo8r-TCzCLrogzeUMiLp0yyWKHs1LN1D3450bb_-upESCNGY6goirC_Jd-Hs8zlXSbItiinHvNuEc2GzAH_djvb49_W9Bu');
  const [successToast, setSuccessToast] = useState('');

  // Dynamic Plan Editor States
  const [selectedPlanId, setSelectedPlanId] = useState('plan1');
  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const [planName, setPlanName] = useState(currentPlan?.name || '');
  const [planPrice, setPlanPrice] = useState(currentPlan?.price || '');
  const [planDesc, setPlanDesc] = useState(currentPlan?.desc || '');
  const [planFeatures, setPlanFeatures] = useState(currentPlan?.features.join(', ') || '');
  const [planSuccessToast, setPlanSuccessToast] = useState('');

  // Update form inputs when selected package shifts
  useEffect(() => {
    if (currentPlan) {
      setPlanName(currentPlan.name);
      setPlanPrice(currentPlan.price);
      setPlanDesc(currentPlan.desc);
      setPlanFeatures(currentPlan.features.join(', '));
    }
  }, [selectedPlanId]);

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArray = planFeatures
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    updatePlan(selectedPlanId, {
      name: planName,
      price: planPrice,
      desc: planDesc,
      features: featuresArray
    });

    setPlanSuccessToast(`Package "${planName}" updated successfully in Investment Mastery section!`);
    setTimeout(() => setPlanSuccessToast(''), 4000);
  };

  // Count active jobs dynamically
  const photoEditingCount = projects.filter(p => p.category.toLowerCase().includes('photo') || p.category.toLowerCase().includes('retouch')).length + 26;
  const thumbnailCount = projects.filter(p => p.category.toLowerCase().includes('thumb')).length + 22;
  const businessCardCount = projects.filter(p => p.category.toLowerCase().includes('card') || p.category.toLowerCase().includes('print')).length + 11;
  const totalActiveJobs = photoEditingCount + thumbnailCount + businessCardCount;

  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    
    addPortfolioItem({
      title: newTitle,
      category: newCategory,
      image: newImage
    });

    setSuccessToast(`Portfolio Item "${newTitle}" published successfully!`);
    setNewTitle('');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const pendingActions = actionItems.filter(item => item.status === 'pending');

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

      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <span className="font-mono text-xs tracking-[0.3em] text-primary-gold block">
            VALKYRIAS ADMINISTRATIVE CONSOLE
          </span>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">
            Studio Command Center
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('landing')}
            className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider text-primary-gold hover:text-white neumorphic-button flex items-center space-x-2"
          >
            <span>PREVIEW LANDING</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider text-red-400 hover:text-red-300 neumorphic-button flex items-center space-x-2"
          >
            <span>TERMINATE SESSION</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Statistics & Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
        {/* Metric Card 1: Revenue */}
        <div className="neumorphic-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
              <span>ESTIMATED REVENUE</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-mono text-2xl md:text-3xl font-extrabold text-white">
              ₹1,02,45,000.00
            </p>
          </div>
          <div className="flex items-center space-x-1.5 mt-4">
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              +12.4%
            </span>
            <span className="text-[10px] text-gray-500 font-sans">
              since past financial quarter
            </span>
          </div>
        </div>

        {/* Metric Card 2: Active Orders */}
        <div className="neumorphic-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
              <span>ACTIVE PIPELINE JOBS</span>
              <ShoppingBag className="w-4 h-4 text-primary-gold" />
            </div>
            <p className="font-mono text-2xl md:text-3xl font-extrabold text-primary-gold">
              {totalActiveJobs} Active
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-mono text-gray-500">
            <div>
              <span className="text-white block font-bold">{photoEditingCount}</span> Photo Edit
            </div>
            <div>
              <span className="text-white block font-bold">{thumbnailCount}</span> Thumbnail
            </div>
            <div>
              <span className="text-white block font-bold">{businessCardCount}</span> Card
            </div>
          </div>
        </div>

        {/* Metric Card 3: Total Contract Value */}
        <div className="neumorphic-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
              <span>ACTIVE CONTRACT VOLUME</span>
              <FolderGit2 className="w-4 h-4 text-primary-gold" />
            </div>
            <p className="font-mono text-2xl md:text-3xl font-extrabold text-white">
              ₹{(totalContract).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-primary-gold animate-ping" />
            <span>Tracking {projects.length} complex custom portals</span>
          </div>
        </div>

        {/* Dynamic Interactive Revenue Bar Chart (Simulated) */}
        <div className="neumorphic-card p-6 rounded-2xl flex flex-col justify-between lg:col-span-1">
          <span className="font-mono text-[9px] tracking-widest text-primary-gold block uppercase font-bold mb-3">
            Peak Load Frequency Chart
          </span>
          <div className="neumorphic-inset p-3.5 rounded-xl space-y-2">
            <div className="h-16 flex items-end gap-1 px-1">
              {[45, 60, 32, 70, 50, 95, 65, 80, 42, 90].map((val, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-primary-gold/15 to-primary-gold rounded-t relative group" style={{ height: `${val}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-container-high border border-white/5 p-1 rounded text-[8px] font-mono opacity-0 group-hover:opacity-100 transition duration-200">
                    {val}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] font-mono text-gray-500">
              <span>WK 1</span>
              <span>WK 5</span>
              <span>WK 10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Action Required & Creative Portfolio Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Action Required Items List */}
        <div className="lg:col-span-7 neumorphic-flat p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-primary-gold" />
              <h3 className="font-display font-extrabold text-lg text-white">Administrative Actions Required</h3>
            </div>
            <span className="font-mono text-xs text-primary-gold bg-primary-gold/10 px-2 py-0.5 rounded border border-primary-gold/20">
              {pendingActions.length} PENDING
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {pendingActions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center text-gray-500 font-mono text-xs"
                >
                  🎉 All Administrative Operations are cleared! No actions required.
                </motion.div>
              ) : (
                pendingActions.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-xl bg-obsidian border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          item.type === 'feedback' 
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                            : item.type === 'order' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {item.type}
                        </span>
                        <h4 className="font-display font-bold text-sm text-white">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {item.type === 'order' ? (
                        <button
                          onClick={() => resolveActionItem(item.id, 'accepted')}
                          id={`accept-btn-${item.id}`}
                          className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider text-obsidian bg-gradient-to-r from-primary-gold to-champagne hover:opacity-95 transition cursor-pointer"
                        >
                          Accept & Provision
                        </button>
                      ) : (
                        <button
                          onClick={() => resolveActionItem(item.id, 'resolved')}
                          id={`resolve-btn-${item.id}`}
                          className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider text-primary-gold neumorphic-button hover:border-primary-gold/40 transition cursor-pointer"
                        >
                          Resolve Revision
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Creative Portfolio Publisher Panel */}
        <div className="lg:col-span-5 neumorphic-flat p-6 rounded-3xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-4">
            <Sparkles className="w-5 h-5 text-primary-gold" />
            <h3 className="font-display font-extrabold text-lg text-white">Publish Studio Portfolio</h3>
          </div>

          <form onSubmit={handleAddPortfolio} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-gray-400 block font-bold">PORTFOLIO ITEM TITLE</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Masterclass Grading Vol. XII"
                className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-gray-400 block font-bold">CATEGORY</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white bg-obsidian"
                >
                  <option value="PHOTO EDITING">PHOTO EDITING</option>
                  <option value="THUMBNAIL">THUMBNAIL</option>
                  <option value="BUSINESS CARD">BUSINESS CARD</option>
                  <option value="VIDEO PRODUCTION">VIDEO PRODUCTION</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-gray-400 block font-bold">ASSET PHOTO REFERENCE</label>
                <select
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white bg-obsidian"
                >
                  <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuBs0yIhqcnx03pXDe_0-1jj_ZbCfLYo5AzD1jtpNqUZ3yKWfBWKQtZveOdskUpuAnxk9XvbfzJRCpGFszLfJpFRRQTSAoco5MJXzuwXAjnUFXimOwQh7uIvY3cxg1vSi5HKkxzPoys5WkhTEhx0jwrWTDEo8r-TCzCLrogzeUMiLp0yyWKHs1LN1D3450bb_-upESCNGY6goirC_Jd-Hs8zlXSbItiinHvNuEc2GzAH_djvb49_W9Bu">Retouch</option>
                  <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuDWerZoPgjhJLKEZ5urBuPH_8bSeFNccPDT2DvYJhZ7N-dYqQQPNgRv4NLG7bdm8Vcvyu9yfYJ2G1-PBNOuIzdbd2uskLtXlfDkQffa-KOa-rcj-8raF5r6a3kWFkpelFB75rYImSt5rqs19rgfKghq6exj4aXLNrgoNlLms72Cc1-TM_hfFCX_wHle0n9u0A68dHYFBQFT8QnjelOzbB_iyry748iWO0xt68_hDH5IqPBMO60sveO7">Thumbnail</option>
                  <option value="https://lh3.googleusercontent.com/aida-public/AB6AXuABhcb24YtrFDJ-N5nxrvMruYFJYVBFJwiTf0YHqLUb_fA4FYKrkSSFhT4kIFkPtE8mPMp6_3xGEDIUto3B320QjhKBpIhd0FQT3lQv5AVBbZixWn3MbiFeh-96ayvupiJZqx_NiF2Kf6VgV9OInCRUX1fwdvGMpZdLSpzItO0AWNUqrEYk5sxMo0nyZz2NyppeKH8Cu1LOYeu_SfXxFYpPCCCvFDfa2vWcoDBRHewabS6QNlf6wlF5">Premium Business Card</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              id="publish-portfolio-btn"
              className="w-full py-3 rounded-lg text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-md cursor-pointer"
            >
              PUBLISH LIVE SHOWCASE
            </button>
          </form>

          {/* Success Toast */}
          <AnimatePresence>
            {successToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successToast}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Investment in Mastery - Tier Packages Editor Section */}
      <div className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-6 relative overflow-hidden z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-primary-gold" />
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">Investment in Mastery — Package Editor</h3>
              <p className="text-[11px] text-gray-500 font-mono uppercase">Modify package details shown in the active sales funnel</p>
            </div>
          </div>

          {/* Plan Selector tabs */}
          <div className="flex bg-obsidian p-1 rounded-xl border border-white/5 gap-1">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition cursor-pointer ${
                  selectedPlanId === p.id
                    ? 'bg-primary-gold text-obsidian shadow-[0_0_10px_rgba(223,178,113,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleUpdatePlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-gray-400 block font-bold">PACKAGE DISPLAY NAME</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. ELITE CREATOR"
                className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-gray-400 block font-bold">PACKAGE PRICE (₹ INR OR 'CUSTOM')</label>
              <input
                type="text"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                placeholder="e.g. 5,500"
                className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-gray-400 block font-bold">PACKAGE DESCRIPTION</label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Enter compelling description of what this package represents..."
                className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white min-h-[90px]"
                required
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-gray-400 block font-bold">
                CORE FEATURES (COMMA-SEPARATED VALUES)
              </label>
              <textarea
                value={planFeatures}
                onChange={(e) => setPlanFeatures(e.target.value)}
                placeholder="e.g. Full Cinematic Edit, Unlimited Retouching, Brand Identity Kit"
                className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white min-h-[155px]"
                required
              />
              <span className="text-[10px] text-gray-500 font-mono">
                Separate features with a comma (e.g. Feature A, Feature B)
              </span>
            </div>

            <button
              type="submit"
              id="update-plan-btn"
              className="w-full py-3 rounded-lg text-xs font-bold tracking-wider text-obsidian bg-gradient-to-r from-primary-gold to-champagne hover:opacity-95 transition shadow-lg cursor-pointer uppercase flex items-center justify-center space-x-2"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>COMMIT PACKAGE CHANGES</span>
            </button>
          </div>
        </form>

        {/* Plan Success Toast */}
        <AnimatePresence>
          {planSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{planSuccessToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Analytics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-white/5 text-xs text-gray-500 font-mono">
        <div>
          <span className="text-gray-400 font-bold block uppercase">Global Trend Indicator</span>
          <span>Photo Editing (+45% YoY Growth)</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Accelerated Sector</span>
          <span>Thumbnails (Viral Video Surge)</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Operational Retention</span>
          <span>Business Cards (Consistent orders)</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Avg Financial Value</span>
          <span>Current Average order: ₹4,500</span>
        </div>
      </div>
    </div>
  );
};
