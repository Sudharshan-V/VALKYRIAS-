import React, { useCallback, useState, useEffect } from 'react';
import { useAppState } from '../context/StateContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  TrendingUp, Layers, CheckCircle2, AlertCircle, Plus, Sparkles,
  Trash2, ShoppingBag, FolderGit2, LogOut, ExternalLink, ArrowLeft, Edit3, Award, TicketPercent, Copy, Upload, Save, Globe2
} from 'lucide-react';
import { ValkyriasLogo } from './ValkyriasLogo';
import { ProfileButton, ProfileModal } from './profile';
import * as adminApi from '../api/adminApi';
import * as orderApi from '../api/orderApi';
import * as serviceApi from '../api/serviceApi';
import type { AdminUserResponse, AvailableEditorResponse, CouponResponse, ServiceResponse, SiteSettings } from '../types';
import { MediaThumbnail } from './common/MediaThumbnail';
import { ValkyriasLoader } from './common/ValkyriasLoader';
import { NotificationMenu } from './common/NotificationMenu';
import { ConfirmDialog } from './common/ConfirmDialog';
import { portfolioImageToDataUrl } from '../utils/imageFile';

const AdminDashboardContent: React.FC = () => {
  const {
    logout,
    projects,
    actionItems,
    portfolioItems,
    addPortfolioItem,
    deletePortfolioItem,
    siteSettings,
    saveSiteSettings,
    totalContract,
    setView,
    plans,
    updatePlan,
    profile,
    refreshData,
    adminDashboard,
  } = useAppState();

  const profileName = profile?.displayName || profile?.fullName || profile?.email || 'Administrator';

  const { scrollY } = useScroll();
  const yGlow1 = useTransform(scrollY, [0, 1500], [0, 100]);
  const yGlow2 = useTransform(scrollY, [0, 1500], [0, -100]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('PHOTO EDITING');
  const [newImage, setNewImage] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSoftware, setNewSoftware] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [availableEditors, setAvailableEditors] = useState<AvailableEditorResponse[]>([]);
  const [managedUsers, setManagedUsers] = useState<AdminUserResponse[]>([]);
  const [selectedEditors, setSelectedEditors] = useState<Record<string, string>>({});
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [notificationUserId, setNotificationUserId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [siteSettingsDraft, setSiteSettingsDraft] = useState<SiteSettings>(siteSettings);
  const [siteSettingsBusy, setSiteSettingsBusy] = useState(false);
  const [siteSettingsMessage, setSiteSettingsMessage] = useState<string | null>(null);

  const [deleteUserTarget, setDeleteUserTarget] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  // Service catalog creation states. The previous UI could only edit an
  // existing package, which left a new database with no client-order entry
  // point. These controls create the first active service and package.
  const [catalogServices, setCatalogServices] = useState<ServiceResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogAction, setCatalogAction] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null);

  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('VIDEO EDITING');
  const [serviceBasePrice, setServiceBasePrice] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceDeliveryEstimate, setServiceDeliveryEstimate] = useState('');
  const [serviceRequirements, setServiceRequirements] = useState('');
  const [firstPackageName, setFirstPackageName] = useState('STANDARD');
  const [firstPackagePrice, setFirstPackagePrice] = useState('');
  const [firstPackageDeliveryDays, setFirstPackageDeliveryDays] = useState('7');
  const [firstPackageFeatures, setFirstPackageFeatures] = useState('');

  const [packageServiceId, setPackageServiceId] = useState('');
  const [newPackageTier, setNewPackageTier] = useState<'STANDARD' | 'PREMIUM' | 'ELITE' | 'CUSTOM'>('STANDARD');
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackagePrice, setNewPackagePrice] = useState('');
  const [newPackageDeliveryDays, setNewPackageDeliveryDays] = useState('7');
  const [newPackageDescription, setNewPackageDescription] = useState('');
  const [newPackageFeatures, setNewPackageFeatures] = useState('');

  // Dynamic Plan Editor States
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0];
  const elitePlan = plans.find((plan) =>
    plan.sourceType === 'package' && /(^|\s)elite(\s|$)/i.test(plan.name.trim())
  );

  const [planName, setPlanName] = useState(currentPlan?.name || '');
  const [planPrice, setPlanPrice] = useState(currentPlan?.price || '');
  const [planDesc, setPlanDesc] = useState(currentPlan?.desc || '');
  const [planFeatures, setPlanFeatures] = useState(currentPlan?.features.join(', ') || '');
  const [planSuccessToast, setPlanSuccessToast] = useState('');

  useEffect(() => {
    setSiteSettingsDraft(siteSettings);
  }, [siteSettings]);

  const updateSiteDraft = (field: keyof SiteSettings, value: string) => {
    setSiteSettingsDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSiteSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSiteSettingsBusy(true);
    setSiteSettingsMessage(null);
    try {
      const saved = await saveSiteSettings(siteSettingsDraft);
      setSiteSettingsDraft(saved);
      setSiteSettingsMessage('Landing footer, contact links and legal documents were updated.');
    } catch (error) {
      setSiteSettingsMessage(error instanceof Error ? error.message : 'Site settings could not be saved.');
    } finally {
      setSiteSettingsBusy(false);
    }
  };

  const handlePortfolioFile = async (file?: File) => {
    if (!file) return;
    setPortfolioBusy(true);
    setPortfolioError(null);
    try {
      setNewImage(await portfolioImageToDataUrl(file));
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'The selected image could not be processed.');
    } finally {
      setPortfolioBusy(false);
    }
  };

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const services = await serviceApi.listServices();
      setCatalogServices(services);
      setPackageServiceId((current) => services.some((service) => service.id === current) ? current : (services[0]?.id || ''));
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'The service catalog could not be loaded.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  // Update form inputs when selected package shifts
  useEffect(() => {
    if (currentPlan) {
      setPlanName(currentPlan.name);
      setPlanPrice(currentPlan.price);
      setPlanDesc(currentPlan.desc);
      setPlanFeatures(currentPlan.features.join(', '));
    }
  }, [currentPlan]);

  useEffect(() => {
    if (plans.length > 0 && !plans.some((plan) => plan.id === selectedPlanId)) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  const refreshAvailableEditors = useCallback(async () => {
    try {
      setAvailableEditors(await adminApi.listAvailableEditors());
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : 'Available editors could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void refreshAvailableEditors();
  }, [refreshAvailableEditors]);

  const refreshManagedUsers = useCallback(async () => {
    try {
      setManagedUsers(await adminApi.listUsers());
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : 'Users could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void refreshManagedUsers();
  }, [refreshManagedUsers]);

  const refreshCoupons = useCallback(async () => {
    try {
      setCoupons(await adminApi.listCoupons());
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Coupons could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void refreshCoupons();
  }, [refreshCoupons]);

  useEffect(() => {
    if (managedUsers.length > 0 && !managedUsers.some((user) => user.id === notificationUserId)) {
      setNotificationUserId(managedUsers[0].id);
    }
  }, [managedUsers, notificationUserId]);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan || currentPlan.sourceType !== 'package') {
      setPlanSuccessToast('Add a package to this service before editing package-specific pricing.');
      return;
    }
    const featuresArray = planFeatures
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    try {
      await updatePlan(selectedPlanId, {
        name: planName,
        price: planPrice,
        desc: planDesc,
        features: featuresArray,
        customQuote: planPrice.trim().toUpperCase() === 'CUSTOM'
      });
      await refreshCatalog();
      setPlanSuccessToast(`Package "${planName}" updated successfully.`);
    } catch (error) {
      setPlanSuccessToast(error instanceof Error ? error.message : 'The package could not be updated.');
    }
    setTimeout(() => setPlanSuccessToast(''), 4000);
  };

  const parseAmount = (value: string) => Number(value.replaceAll(',', '').trim());
  const commaList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

  const handleCreateService = async (event: React.FormEvent) => {
    event.preventDefault();
    const basePrice = parseAmount(serviceBasePrice);
    const packagePrice = parseAmount(firstPackagePrice);
    const deliveryDays = Number(firstPackageDeliveryDays);
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(packagePrice) || packagePrice < 0) {
      setCatalogError('Enter valid non-negative prices for the service and first package.');
      return;
    }
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1) {
      setCatalogError('Package delivery days must be a whole number greater than zero.');
      return;
    }

    setCatalogAction('service:create');
    setCatalogError(null);
    setCatalogSuccess(null);
    try {
      const createdService = await serviceApi.createService({
        name: serviceName.trim(),
        description: serviceDescription.trim() || null,
        category: serviceCategory.trim(),
        basePrice,
        currency: 'INR',
        deliveryEstimate: serviceDeliveryEstimate.trim() || null,
        requiredClientInformation: commaList(serviceRequirements),
        active: true,
      });
      const createdPackage = await serviceApi.addServicePackage(createdService.id, {
        name: firstPackageName.trim(),
        description: serviceDescription.trim() || null,
        price: packagePrice,
        currency: 'INR',
        deliveryDays,
        features: commaList(firstPackageFeatures),
        active: true,
        displayOrder: 0,
      });
      await refreshData();
      await refreshCatalog();
      setSelectedPlanId(createdPackage.id);
      setServiceName('');
      setServiceBasePrice('');
      setServiceDescription('');
      setServiceDeliveryEstimate('');
      setServiceRequirements('');
      setFirstPackageName('STANDARD');
      setFirstPackagePrice('');
      setFirstPackageDeliveryDays('7');
      setFirstPackageFeatures('');
      setCatalogSuccess(`Service "${createdService.name}" and its first package are now active in the Client Portal.`);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'The service could not be created.');
    } finally {
      setCatalogAction(null);
    }
  };

  const handleAddPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    const price = parseAmount(newPackagePrice);
    const deliveryDays = Number(newPackageDeliveryDays);
    if (!packageServiceId) {
      setCatalogError('Create an active service before adding another package.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setCatalogError('Enter a valid non-negative package price.');
      return;
    }
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1) {
      setCatalogError('Package delivery days must be a whole number greater than zero.');
      return;
    }

    setCatalogAction('package:create');
    setCatalogError(null);
    setCatalogSuccess(null);
    try {
      const createdPackage = await serviceApi.addServicePackage(packageServiceId, {
        name: newPackageName.trim(),
        description: newPackageDescription.trim() || null,
        price,
        currency: 'INR',
        deliveryDays,
        features: commaList(newPackageFeatures),
        active: true,
        displayOrder: catalogServices.find((service) => service.id === packageServiceId)?.packages.length || 0,
      });
      await refreshData();
      await refreshCatalog();
      setSelectedPlanId(createdPackage.id);
      setNewPackageTier('STANDARD');
      setNewPackageName('');
      setNewPackagePrice('');
      setNewPackageDeliveryDays('7');
      setNewPackageDescription('');
      setNewPackageFeatures('');
      setCatalogSuccess(`Package "${createdPackage.name}" is now available to clients.`);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'The package could not be created.');
    } finally {
      setCatalogAction(null);
    }
  };

  const selectPackageTier = (tier: 'STANDARD' | 'PREMIUM' | 'ELITE' | 'CUSTOM') => {
    setNewPackageTier(tier);
    if (tier === 'CUSTOM') {
      setNewPackageName('CUSTOM PROJECT');
      setNewPackagePrice('0');
    } else {
      setNewPackageName(tier);
    }
  };

  const prepareElitePackage = () => {
    if (elitePlan) {
      setSelectedPlanId(elitePlan.id);
      document.getElementById('package-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setNewPackageTier('ELITE');
    setNewPackageName('ELITE');
    setNewPackageDeliveryDays('3');
    setNewPackageDescription('Premium end-to-end production with priority scheduling and elevated creative direction.');
    setNewPackageFeatures('Priority production, Advanced color grading, Sound design, 4K master delivery, 5 revision rounds');
    setCatalogError(null);
    setCatalogSuccess('Elite package template prepared. Set the price and publish it under the selected service.');
    document.getElementById('add-package-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteUser = (user: { id: string; name: string; email: string; role: string }) => {
    setDeleteUserTarget(user);
  };

  const confirmDeleteUser = () => {
    if (!deleteUserTarget) return;
    const user = deleteUserTarget;
    const actionId = `delete-user:${user.id}`;
    void runAdminAction(actionId, () => adminApi.deleteUser(user.id)
      .then(() => {
        setSuccessToast(`User "${user.name}" was permanently removed.`);
        window.setTimeout(() => setSuccessToast(''), 4000);
      }))
      .finally(() => setDeleteUserTarget(null));
  };

  const handleCreateCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const discountPercent = Number(couponDiscount);
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
      setCouponError('Discount must be greater than 0% and less than 100%.');
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const created = await adminApi.createCoupon({
        code: couponCode.trim() || undefined,
        discountPercent,
        active: true,
        expiresAt: couponExpiry ? new Date(couponExpiry).toISOString() : null,
      });
      setCouponCode('');
      setCouponDiscount('');
      setCouponExpiry('');
      setCouponSuccess(`Coupon ${created.code} created with ${created.discountPercent}% off.`);
      await refreshCoupons();
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Coupon could not be created.');
    } finally {
      setCouponBusy(false);
    }
  };

  const toggleCoupon = async (coupon: CouponResponse) => {
    setCouponBusy(true);
    setCouponError(null);
    try {
      await adminApi.setCouponActive(coupon.id, !coupon.active);
      await refreshCoupons();
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Coupon status could not be updated.');
    } finally {
      setCouponBusy(false);
    }
  };

  // These values are returned by backend aggregate queries, not calculated from the recent-order UI list.
  const totalActiveJobs = adminDashboard?.activeOrders || 0;
  const pendingOrderCount = adminDashboard?.pendingOrders || 0;
  const completedOrderCount = adminDashboard?.completedOrders || 0;
  const cancelledOrderCount = adminDashboard?.cancelledOrders || 0;

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newImage.trim()) {
      setPortfolioError('Enter a title and choose an image from your system or provide an image URL.');
      return;
    }

    setPortfolioBusy(true);
    setPortfolioError(null);
    try {
      await addPortfolioItem({
        title: newTitle.trim(),
        category: newCategory.trim(),
        image: newImage.trim(),
        description: newDescription.trim(),
        software: newSoftware.trim(),
        clientName: newClientName.trim(),
        duration: newDuration.trim(),
        published: true,
      });
      setSuccessToast(`Portfolio Item "${newTitle}" published successfully!`);
      setNewTitle('');
      setNewImage('');
      setNewDescription('');
      setNewSoftware('');
      setNewClientName('');
      setNewDuration('');
      window.setTimeout(() => setSuccessToast(''), 3000);
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Portfolio item could not be published.');
    } finally {
      setPortfolioBusy(false);
    }
  };

  const handleDeletePortfolio = async (id: string, title: string) => {
    setPortfolioBusy(true);
    setPortfolioError(null);
    try {
      await deletePortfolioItem(id);
      setSuccessToast(`Portfolio Item "${title}" deleted.`);
      window.setTimeout(() => setSuccessToast(''), 3000);
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : 'Portfolio item could not be deleted.');
    } finally {
      setPortfolioBusy(false);
    }
  };

  const pendingActions = actionItems.filter(item => item.status === 'pending');

  const runAdminAction = async (orderId: string, action: () => Promise<unknown>) => {
    setAdminActionId(orderId);
    setAdminActionError(null);
    try {
      await action();
      await Promise.all([refreshData(), refreshAvailableEditors(), refreshManagedUsers()]);
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : 'The administrative action failed.');
    } finally {
      setAdminActionId(null);
    }
  };

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

        <div className="flex max-w-full flex-wrap items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="font-mono text-[9px] text-gray-500 block uppercase">ADMIN PROFILE</span>
            <span className="text-sm font-semibold text-white">{profileName}</span>
          </div>

          <NotificationMenu />

          <ProfileButton onClick={() => setProfileOpen(true)} />

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

      {plans.length === 0 && (
        <div className="max-w-7xl mx-auto mb-8 relative z-10 p-4 rounded-2xl bg-amber-950/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">No active client services are published</p>
              <p className="text-[10px] text-amber-400 mt-1">Clients cannot create orders until an active service and package are added.</p>
            </div>
          </div>
          <button type="button" onClick={() => document.getElementById('service-catalog-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-4 py-2.5 rounded-xl bg-primary-gold text-obsidian text-[10px] font-mono font-bold tracking-wider cursor-pointer shrink-0">OPEN CATALOG MANAGER</button>
        </div>
      )}

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
              ₹{totalContract.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center space-x-1.5 mt-4">
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              VERIFIED
            </span>
            <span className="text-[10px] text-gray-500 font-sans">
              from paid payment records
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
              <span className="text-white block font-bold">{pendingOrderCount}</span> Pending
            </div>
            <div>
              <span className="text-white block font-bold">{completedOrderCount}</span> Completed
            </div>
            <div>
              <span className="text-white block font-bold">{cancelledOrderCount}</span> Cancelled
            </div>
          </div>
        </div>

        {/* Metric Card 3: User aggregate */}
        <div className="neumorphic-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
              <span>REGISTERED USERS</span>
              <FolderGit2 className="w-4 h-4 text-primary-gold" />
            </div>
            <p className="font-mono text-2xl md:text-3xl font-extrabold text-white">
              {adminDashboard?.totalUsers || 0}
            </p>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-primary-gold animate-ping" />
            <span>{adminDashboard?.clientCount || 0} clients • {adminDashboard?.editorCount || 0} editors</span>
          </div>
        </div>

        {/* Dynamic revenue visualization backed by verified payment aggregates */}
        <div className="neumorphic-card p-6 rounded-2xl flex flex-col justify-between lg:col-span-1">
          <span className="font-mono text-[9px] tracking-widest text-primary-gold block uppercase font-bold mb-3">
            Recent Order Progress
          </span>
          <div className="neumorphic-inset p-3.5 rounded-xl space-y-2">
            <div className="h-16 flex items-end gap-1 px-1">
              {(projects.length > 0 ? projects.slice(0, 10).map((project) => project.progress) : [0]).map((val, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-primary-gold/15 to-primary-gold rounded-t relative group" style={{ height: `${val}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-container-high border border-white/5 p-1 rounded text-[8px] font-mono opacity-0 group-hover:opacity-100 transition duration-200">
                    {val}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] font-mono text-gray-500">
              <span>RECENT</span>
              <span>{projects.length} ORDERS</span>
              <span>LATEST</span>
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

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      {item.type === 'order' ? (
                        <>
                          {(() => {
                            const orderId = item.id.split(':', 2)[1];
                            const order = projects.find((project) => project.id === orderId);
                            return (
                              <>
                                {order?.orderStatus === 'SUBMITTED' && (
                                  <button disabled={adminActionId === orderId} onClick={() => void runAdminAction(orderId, () => orderApi.markUnderReview(orderId))} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary-gold border border-primary-gold/30 disabled:opacity-50 cursor-pointer">MARK UNDER REVIEW</button>
                                )}
                                {(order?.orderStatus === 'SUBMITTED' || order?.orderStatus === 'UNDER_REVIEW') && (
                                  <>
                                    <select value={selectedEditors[orderId] || ''} onChange={(event) => setSelectedEditors((current) => ({ ...current, [orderId]: event.target.value }))} className="neu-select px-3 py-1.5 rounded-lg text-[10px] text-white">
                                      <option value="">SELECT ACTIVE EDITOR</option>
                                      {availableEditors.map((editor) => <option key={editor.userId} value={editor.userId}>{editor.name} • {editor.activeOrderCount} active • {editor.availabilityStatus}</option>)}
                                    </select>
                                    <button disabled={adminActionId === orderId || !selectedEditors[orderId]} onClick={() => void runAdminAction(orderId, () => orderApi.assignEditor(orderId, selectedEditors[orderId]))} className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider text-obsidian bg-gradient-to-r from-primary-gold to-champagne disabled:opacity-50 cursor-pointer">ASSIGN EDITOR</button>
                                  </>
                                )}
                                {order?.orderStatus === 'EDITOR_ASSIGNED' && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-mono font-bold">ASSIGNED TO {order.editor.toUpperCase()} • WAITING FOR ACCEPTANCE</span>
                                  </div>
                                )}
                                {(order?.orderStatus === 'SUBMITTED' || order?.orderStatus === 'UNDER_REVIEW') && (
                                  <button disabled={adminActionId === orderId} onClick={() => void runAdminAction(orderId, () => orderApi.rejectOrder(orderId))} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 border border-red-500/30 disabled:opacity-50 cursor-pointer">REJECT</button>
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <button
                          disabled
                          id={`resolve-btn-${item.id}`}
                          className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider text-primary-gold neumorphic-button hover:border-primary-gold/40 transition cursor-pointer"
                        >
                          Notification
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {adminActionError && <div className="mt-4 p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-300">{adminActionError}</div>}
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
                  className="neu-select w-full px-3.5 py-2.5 rounded-lg text-xs text-white"
                >
                  <option value="PHOTO EDITING">PHOTO EDITING</option>
                  <option value="THUMBNAIL">THUMBNAIL</option>
                  <option value="BUSINESS CARD">BUSINESS CARD</option>
                  <option value="VIDEO PRODUCTION">VIDEO PRODUCTION</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-gray-400 block font-bold">IMAGE URL (OPTIONAL)</label>
                <input
                  type="url"
                  value={newImage.startsWith('data:image/') ? '' : newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://published-media.example/asset"
                  className="neu-select w-full px-3.5 py-2.5 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary-gold/30 bg-primary-gold/5 px-4 py-3 text-[10px] font-mono font-bold text-primary-gold hover:bg-primary-gold/10">
              <Upload className="h-4 w-4" />
              <span>{portfolioBusy ? 'PROCESSING IMAGE...' : 'CHOOSE PORTFOLIO IMAGE FROM SYSTEM'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={portfolioBusy} onChange={(event) => void handlePortfolioFile(event.target.files?.[0])} />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} placeholder="Client / brand" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              <input value={newSoftware} onChange={(event) => setNewSoftware(event.target.value)} placeholder="Software used" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              <input value={newDuration} onChange={(event) => setNewDuration(event.target.value)} placeholder="Project duration" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Portfolio description" className="col-span-2 min-h-20 w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white resize-y" />
            </div>

            {portfolioError && <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">{portfolioError}</div>}

            {newImage && (
              <div className="rounded-2xl border border-white/5 bg-obsidian/60 p-3">
                <p className="mb-2 font-mono text-[9px] font-bold tracking-wider text-gray-500">THUMBNAIL PREVIEW</p>
                <MediaThumbnail
                  src={newImage}
                  alt={newTitle || 'Portfolio preview'}
                  fallback="logo"
                  className="h-36 w-full rounded-xl border border-white/10"
                />
              </div>
            )}

            <button
              type="submit"
              id="publish-portfolio-btn"
              disabled={portfolioBusy}
              className="w-full py-3 rounded-lg text-xs font-bold tracking-wider text-obsidian bg-primary-gold hover:bg-champagne transition shadow-md cursor-pointer"
            >
              {portfolioBusy ? 'PUBLISHING...' : 'PUBLISH LIVE SHOWCASE'}
            </button>
          </form>

          {portfolioItems.length > 0 && (
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] font-bold tracking-wider text-gray-500">PUBLISHED THUMBNAILS</p>
                <span className="font-mono text-[9px] text-primary-gold">{portfolioItems.length} ITEMS</span>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto overscroll-contain pr-1">
                {portfolioItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/5 bg-obsidian p-2">
                    <MediaThumbnail
                      src={item.image}
                      alt={item.title}
                      fallback="logo"
                      className="h-20 w-full rounded-lg border border-white/5"
                    />
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-white" title={item.title}>{item.title}</p>
                        <p className="truncate font-mono text-[8px] text-gray-500">{item.category}</p>
                      </div>
                      <button type="button" disabled={portfolioBusy} onClick={() => void handleDeletePortfolio(item.id, item.title)} className="shrink-0 rounded-lg border border-red-500/25 bg-red-500/10 p-1.5 text-red-300 disabled:opacity-50" title="Delete portfolio item"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      <div className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-5 relative z-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="font-display font-extrabold text-lg text-white">User Access Management</h3>
            <p className="text-[10px] text-gray-500 font-mono">ROLES AND ACCOUNT STATUS ARE WRITTEN THROUGH ADMIN-ONLY APIS</p>
          </div>
          <span className="text-[10px] font-mono text-primary-gold">{adminDashboard?.pendingEditorApprovals || 0} PENDING EDITORS</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {managedUsers.map((user) => (
            <div key={user.id} className="p-4 rounded-xl bg-obsidian border border-white/5 flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] font-mono text-gray-500 truncate">{user.email}</p>
                <p className="text-[9px] font-mono text-primary-gold mt-1">{user.role} • {user.accountStatus}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.role === 'CLIENT' && <button disabled={adminActionId === `user:${user.id}`} onClick={() => void runAdminAction(`user:${user.id}`, () => adminApi.updateUserAccess(user.id, { role: 'EDITOR', accountStatus: 'ACTIVE' }))} className="px-3 py-1.5 rounded-lg border border-primary-gold/30 text-primary-gold text-[9px] font-mono cursor-pointer disabled:opacity-50">ASSIGN EDITOR ROLE</button>}
                {user.role === 'EDITOR' && user.accountStatus !== 'ACTIVE' && <button disabled={adminActionId === `user:${user.id}`} onClick={() => void runAdminAction(`user:${user.id}`, () => adminApi.updateUserAccess(user.id, { accountStatus: 'ACTIVE' }))} className="px-3 py-1.5 rounded-lg bg-primary-gold text-obsidian text-[9px] font-mono font-bold cursor-pointer disabled:opacity-50">APPROVE EDITOR</button>}
                {user.accountStatus === 'ACTIVE' && user.role !== 'ADMIN' && <button disabled={adminActionId === `user:${user.id}`} onClick={() => void runAdminAction(`user:${user.id}`, () => adminApi.updateUserAccess(user.id, { accountStatus: 'SUSPENDED' }))} className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-[9px] font-mono cursor-pointer disabled:opacity-50">SUSPEND</button>}
                {user.accountStatus === 'SUSPENDED' && <button disabled={adminActionId === `user:${user.id}`} onClick={() => void runAdminAction(`user:${user.id}`, () => adminApi.updateUserAccess(user.id, { accountStatus: 'ACTIVE' }))} className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 text-[9px] font-mono cursor-pointer disabled:opacity-50">RESTORE</button>}
                {user.id !== profile?.applicationUserId && (
                  <button
                    type="button"
                    disabled={adminActionId === `delete-user:${user.id}`}
                    onClick={() => handleDeleteUser(user)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[9px] font-mono font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {adminActionId === `delete-user:${user.id}` ? 'REMOVING...' : user.role === 'ADMIN' ? 'DELETE ADMIN' : 'DELETE USER'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-8 relative z-10">
        <div className="neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-5">
          <div className="border-b border-white/5 pb-4">
            <h3 className="font-display font-extrabold text-lg text-white">Support & Payment State</h3>
            <p className="text-[10px] text-gray-500 font-mono">PERSISTED CONTACT MESSAGES AND PAYMENT RECORD COUNTS</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['PENDING', adminDashboard?.paymentStates.pending || 0],
              ['ACTION', adminDashboard?.paymentStates.requiresAction || 0],
              ['PAID', adminDashboard?.paymentStates.paid || 0],
              ['FAILED', adminDashboard?.paymentStates.failed || 0],
              ['REFUNDED', adminDashboard?.paymentStates.refunded || 0],
              ['CANCELLED', adminDashboard?.paymentStates.cancelled || 0],
            ].map(([label, count]) => (
              <div key={label} className="p-3 rounded-xl bg-obsidian border border-white/5">
                <p className="text-primary-gold font-mono font-bold">{count}</p>
                <p className="text-[8px] text-gray-500 font-mono">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {(adminDashboard?.recentContactMessages || []).length === 0 ? (
              <p className="p-5 text-center text-xs text-gray-500 font-mono">NO CONTACT OR SUPPORT MESSAGES</p>
            ) : adminDashboard?.recentContactMessages.map((message) => (
              <div key={message.id} className="p-4 rounded-xl bg-obsidian border border-white/5 space-y-1">
                <div className="flex justify-between gap-3">
                  <p className="text-xs font-bold text-white truncate">{message.subject}</p>
                  <span className="text-[8px] font-mono text-gray-500 shrink-0">{new Date(message.submittedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[9px] font-mono text-primary-gold truncate">{message.name} • {message.email}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!notificationUserId || !notificationTitle.trim() || !notificationBody.trim()) return;
            void runAdminAction('notification:create', () => adminApi.createSystemNotification({
              userId: notificationUserId,
              type: 'ADMIN_MESSAGE',
              title: notificationTitle.trim(),
              body: notificationBody.trim(),
            }).then((response) => {
              setNotificationTitle('');
              setNotificationBody('');
              return response;
            }));
          }}
          className="neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-5"
        >
          <div className="border-b border-white/5 pb-4">
            <h3 className="font-display font-extrabold text-lg text-white">Create System Notification</h3>
            <p className="text-[10px] text-gray-500 font-mono">ADMIN-ONLY PERSISTED USER NOTIFICATION</p>
          </div>
          <select value={notificationUserId} onChange={(event) => setNotificationUserId(event.target.value)} className="neu-select w-full px-4 py-3 rounded-xl text-xs text-white" required>
            {managedUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
          </select>
          <input value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} maxLength={200} placeholder="Notification title" className="w-full px-4 py-3 rounded-xl neu-input text-xs text-white" required />
          <textarea value={notificationBody} onChange={(event) => setNotificationBody(event.target.value)} maxLength={2000} placeholder="Message for this user" className="w-full min-h-28 px-4 py-3 rounded-xl neu-input text-xs text-white resize-y" required />
          <button disabled={adminActionId === 'notification:create' || !notificationUserId} className="w-full py-3 rounded-xl bg-primary-gold text-obsidian text-xs font-bold cursor-pointer disabled:opacity-50">SEND PERSISTED NOTIFICATION</button>
        </form>
      </div>

      {/* Coupon Manager */}
      <div className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-6 relative z-10">
        <div className="flex flex-col gap-3 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-gold/20 bg-primary-gold/10 text-primary-gold">
              <TicketPercent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">Coupon Manager</h3>
              <p className="text-[10px] text-gray-500 font-mono">GENERATE CHECKOUT DISCOUNTS FOR SECURITY DEPOSITS</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-primary-gold">{coupons.filter((coupon) => coupon.active).length} ACTIVE</span>
        </div>

        {couponError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{couponError}</span>
          </div>
        )}
        {couponSuccess && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{couponSuccess}</span>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-5">
          <form onSubmit={handleCreateCoupon} className="space-y-4 rounded-2xl border border-white/5 bg-obsidian/70 p-5 xl:col-span-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-gold">Create coupon</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">Leave the code blank to generate a secure VK code automatically.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="font-mono text-[9px] font-bold text-gray-400">CUSTOM CODE (OPTIONAL)</span>
              <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} minLength={4} maxLength={32} pattern="[A-Za-z0-9_-]{4,32}" placeholder="AUTO-GENERATE" className="neu-input w-full rounded-xl px-4 py-3 font-mono text-xs uppercase text-white" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="font-mono text-[9px] font-bold text-gray-400">DISCOUNT (%)</span>
                <input required type="number" min="0.01" max="99.99" step="0.01" value={couponDiscount} onChange={(event) => setCouponDiscount(event.target.value)} placeholder="10" className="neu-input w-full rounded-xl px-4 py-3 text-xs text-white" />
              </label>
              <label className="block space-y-1.5">
                <span className="font-mono text-[9px] font-bold text-gray-400">EXPIRY (OPTIONAL)</span>
                <input type="datetime-local" value={couponExpiry} onChange={(event) => setCouponExpiry(event.target.value)} className="neu-input w-full rounded-xl px-3 py-3 text-[10px] text-white" />
              </label>
            </div>
            <button type="submit" disabled={couponBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-gold to-champagne py-3 text-xs font-black tracking-wider text-obsidian transition disabled:opacity-50">
              <Plus className="h-4 w-4" />
              {couponBusy ? 'GENERATING…' : 'GENERATE COUPON'}
            </button>
          </form>

          <div className="space-y-3 xl:col-span-3">
            {coupons.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-obsidian/40 p-6 text-center text-xs font-mono text-gray-500">
                NO COUPONS GENERATED YET
              </div>
            ) : coupons.map((coupon) => {
              const expired = Boolean(coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now());
              return (
                <div key={coupon.id} className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-obsidian/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black tracking-wider text-white">{coupon.code}</span>
                      <button type="button" title="Copy coupon code" onClick={() => void navigator.clipboard.writeText(coupon.code)} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/5 hover:text-primary-gold">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] font-mono font-bold ${coupon.active && !expired ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-gray-500'}`}>
                        {expired ? 'EXPIRED' : coupon.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">
                      <span className="font-bold text-primary-gold">{coupon.discountPercent}% OFF</span>
                      {' · '}
                      {coupon.expiresAt ? `Expires ${new Date(coupon.expiresAt).toLocaleString()}` : 'No expiry'}
                    </p>
                  </div>
                  <button type="button" disabled={couponBusy || expired} onClick={() => void toggleCoupon(coupon)} className={`rounded-xl border px-4 py-2 text-[9px] font-mono font-bold transition disabled:opacity-40 ${coupon.active ? 'border-red-500/25 text-red-300 hover:bg-red-500/10' : 'border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10'}`}>
                    {coupon.active ? 'DISABLE' : 'ENABLE'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Service Catalog Manager */}
      <div id="service-catalog-manager" className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-6 relative overflow-hidden z-10 scroll-mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-primary-gold" />
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">Service Catalog Manager</h3>
              <p className="text-[11px] text-gray-500 font-mono uppercase">Publish the services clients use to create new orders</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
            <span>{catalogLoading ? 'SYNCING...' : `${catalogServices.length} ACTIVE SERVICES`}</span>
            <button type="button" onClick={() => void refreshCatalog()} className="px-3 py-2 rounded-lg neumorphic-button text-primary-gold cursor-pointer">REFRESH</button>
          </div>
        </div>

        {catalogError && (
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{catalogError}</span>
          </div>
        )}
        {catalogSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{catalogSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form onSubmit={handleCreateService} className="rounded-2xl bg-obsidian/70 border border-white/5 p-5 md:p-6 space-y-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary-gold uppercase">Create service + first package</p>
              <p className="text-[10px] text-gray-500 mt-1">This immediately creates a selectable order option in the Client Portal.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">SERVICE NAME</span>
                <input required minLength={2} maxLength={120} value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Video Editing" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">CATEGORY</span>
                <input required maxLength={100} value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} placeholder="VIDEO EDITING" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white uppercase" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">BASE PRICE (₹)</span>
                <input required inputMode="decimal" value={serviceBasePrice} onChange={(event) => setServiceBasePrice(event.target.value)} placeholder="5000" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">DELIVERY ESTIMATE</span>
                <input maxLength={100} value={serviceDeliveryEstimate} onChange={(event) => setServiceDeliveryEstimate(event.target.value)} placeholder="5–7 business days" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[9px] text-gray-400 font-bold">SERVICE DESCRIPTION</span>
              <textarea maxLength={3000} value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder="Describe the service clients will purchase." className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white min-h-24 resize-y" />
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[9px] text-gray-400 font-bold">CLIENT INFORMATION REQUIRED (COMMA-SEPARATED)</span>
              <input value={serviceRequirements} onChange={(event) => setServiceRequirements(event.target.value)} placeholder="Reference links, Target duration, Brand guidelines" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
            </label>

            <div className="border-t border-white/5 pt-4 grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">FIRST PACKAGE NAME</span>
                <input required maxLength={120} value={firstPackageName} onChange={(event) => setFirstPackageName(event.target.value)} placeholder="STANDARD" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white uppercase" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">PACKAGE PRICE (₹)</span>
                <input required inputMode="decimal" value={firstPackagePrice} onChange={(event) => setFirstPackagePrice(event.target.value)} placeholder="5000" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">DELIVERY DAYS</span>
                <input required type="number" min={1} value={firstPackageDeliveryDays} onChange={(event) => setFirstPackageDeliveryDays(event.target.value)} className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">PACKAGE FEATURES</span>
                <input required value={firstPackageFeatures} onChange={(event) => setFirstPackageFeatures(event.target.value)} placeholder="Color grading, Sound mix, 2 revisions" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
            </div>

            <button type="submit" disabled={catalogAction !== null} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-gold to-champagne text-obsidian text-xs font-bold tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              <span>{catalogAction === 'service:create' ? 'PUBLISHING...' : 'PUBLISH SERVICE & PACKAGE'}</span>
            </button>
          </form>

          <form id="add-package-form" onSubmit={handleAddPackage} className="rounded-2xl bg-obsidian/70 border border-white/5 p-5 md:p-6 space-y-4 scroll-mt-24">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary-gold uppercase">Add another package</p>
              <p className="text-[10px] text-gray-500 mt-1">Create additional price tiers under an existing active service.</p>
            </div>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[9px] text-gray-400 font-bold">SERVICE</span>
              <select required value={packageServiceId} onChange={(event) => setPackageServiceId(event.target.value)} disabled={catalogServices.length === 0} className="neu-select w-full px-3.5 py-2.5 rounded-lg text-xs text-white disabled:opacity-50">
                {catalogServices.length === 0 && <option value="">NO ACTIVE SERVICES</option>}
                {catalogServices.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.packages.length} packages)</option>)}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[9px] text-gray-400 font-bold">PACKAGE TIER</span>
              <select
                value={newPackageTier}
                onChange={(event) => selectPackageTier(event.target.value as 'STANDARD' | 'PREMIUM' | 'ELITE' | 'CUSTOM')}
                className="neu-select w-full px-3.5 py-2.5 rounded-lg text-xs text-white"
              >
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="ELITE">ELITE</option>
                <option value="CUSTOM">CUSTOM NAME PACKAGE</option>
              </select>
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">PACKAGE NAME</span>
                <input required maxLength={120} value={newPackageName} onChange={(event) => {
                  setNewPackageName(event.target.value);
                  if (event.target.value.trim().toUpperCase() !== newPackageTier) setNewPackageTier('CUSTOM');
                }} placeholder="PREMIUM" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white uppercase" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">PRICE (₹ — USE 0 FOR CUSTOM QUOTE)</span>
                <input required inputMode="decimal" value={newPackagePrice} onChange={(event) => setNewPackagePrice(event.target.value)} placeholder={newPackageTier === 'CUSTOM' ? '0' : '10000'} className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">DELIVERY DAYS</span>
                <input required type="number" min={1} value={newPackageDeliveryDays} onChange={(event) => setNewPackageDeliveryDays(event.target.value)} className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] text-gray-400 font-bold">FEATURES</span>
                <input required value={newPackageFeatures} onChange={(event) => setNewPackageFeatures(event.target.value)} placeholder="4K delivery, 3 revisions" className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" />
              </label>
            </div>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[9px] text-gray-400 font-bold">PACKAGE DESCRIPTION</span>
              <textarea maxLength={3000} value={newPackageDescription} onChange={(event) => setNewPackageDescription(event.target.value)} placeholder="Describe what is included in this package." className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white min-h-24 resize-y" />
            </label>

            <button type="submit" disabled={catalogAction !== null || catalogServices.length === 0} className="w-full py-3 rounded-xl neumorphic-button text-primary-gold text-xs font-bold tracking-wider disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              <span>{catalogAction === 'package:create' ? 'ADDING...' : 'ADD PACKAGE TO SERVICE'}</span>
            </button>

            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="font-mono text-[9px] text-gray-500 uppercase">Published catalog</p>
              {catalogServices.length === 0 ? (
                <p className="text-[10px] text-gray-600">No active services. Use the form on the left to publish the first one.</p>
              ) : catalogServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-obsidian/30 border border-white/5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{service.name}</p>
                    <p className="text-[9px] font-mono text-gray-500">{service.category} • ₹{Number(service.basePrice).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-mono text-primary-gold">{service.packages.length} PACKAGES</span>
                </div>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Public Website, Footer and Legal Settings */}
      <form onSubmit={handleSaveSiteSettings} className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-6 relative z-10">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Globe2 className="h-5 w-5 text-primary-gold" />
          <div>
            <h3 className="font-display font-extrabold text-lg text-white">Landing Footer, Contact & Legal Settings</h3>
            <p className="text-[10px] text-gray-500 font-mono">UPDATE INSTAGRAM, YOUTUBE, VIMEO, EMAIL, PHONE, ADDRESS, PRIVACY AND TERMS</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {([
            ['websiteUrl', 'WEBSITE URL'], ['instagramUrl', 'INSTAGRAM URL'], ['youtubeUrl', 'YOUTUBE URL'], ['vimeoUrl', 'VIMEO URL'],
            ['supportEmail', 'GENERAL SUPPORT EMAIL'], ['privacyEmail', 'PRIVACY / GRIEVANCE EMAIL'], ['contactPhone', 'CONTACT PHONE'], ['effectiveDate', 'LEGAL EFFECTIVE DATE'],
          ] as Array<[keyof SiteSettings, string]>).map(([field, label]) => (
            <label key={field} className="space-y-1.5">
              <span className="font-mono text-[9px] text-gray-400 font-bold">{label}</span>
              <input value={String(siteSettingsDraft[field] || '')} onChange={(event) => updateSiteDraft(field, event.target.value)} className="w-full px-3.5 py-2.5 rounded-lg neu-input text-xs text-white" required={field === 'supportEmail' || field === 'privacyEmail' || field === 'contactPhone' || field === 'effectiveDate'} />
            </label>
          ))}
        </div>

        <label className="space-y-1.5 block">
          <span className="font-mono text-[9px] text-gray-400 font-bold">FOOTER BRAND DESCRIPTION</span>
          <textarea value={siteSettingsDraft.brandDescription} onChange={(event) => updateSiteDraft('brandDescription', event.target.value)} className="w-full min-h-20 px-3.5 py-2.5 rounded-lg neu-input text-xs text-white resize-y" required />
        </label>
        <label className="space-y-1.5 block">
          <span className="font-mono text-[9px] text-gray-400 font-bold">BUSINESS ADDRESS</span>
          <textarea value={siteSettingsDraft.address} onChange={(event) => updateSiteDraft('address', event.target.value)} className="w-full min-h-20 px-3.5 py-2.5 rounded-lg neu-input text-xs text-white resize-y" required />
        </label>
        <div className="grid lg:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="font-mono text-[9px] text-gray-400 font-bold">TERMS AND CONDITIONS</span>
            <textarea value={siteSettingsDraft.termsConditions} onChange={(event) => updateSiteDraft('termsConditions', event.target.value)} className="w-full min-h-[360px] px-3.5 py-2.5 rounded-lg neu-input text-xs text-white resize-y" required />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[9px] text-gray-400 font-bold">PRIVACY POLICY</span>
            <textarea value={siteSettingsDraft.privacyPolicy} onChange={(event) => updateSiteDraft('privacyPolicy', event.target.value)} className="w-full min-h-[360px] px-3.5 py-2.5 rounded-lg neu-input text-xs text-white resize-y" required />
          </label>
        </div>
        {siteSettingsMessage && <div className="rounded-xl border border-primary-gold/20 bg-primary-gold/5 p-3 text-xs text-primary-gold">{siteSettingsMessage}</div>}
        <button type="submit" disabled={siteSettingsBusy} className="w-full py-3 rounded-xl bg-primary-gold text-obsidian text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" />
          {siteSettingsBusy ? 'SAVING WEBSITE DETAILS...' : 'SAVE WEBSITE DETAILS & LEGAL DOCUMENTS'}
        </button>
      </form>

      {/* Investment in Mastery - Tier Packages Editor Section */}
      <div id="package-editor" className="mt-8 neumorphic-flat p-6 md:p-8 rounded-[32px] space-y-6 relative overflow-hidden z-10 scroll-mt-24">
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
            {plans.length === 0 && <span className="px-3 py-1.5 text-[9px] font-mono text-gray-600">NO PACKAGES</span>}
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

        {plans.length === 0 && (
          <div className="p-4 rounded-xl bg-obsidian border border-white/5 text-xs text-gray-500">
            Publish a service and its first package in the Service Catalog Manager above. The package will then appear here for editing.
          </div>
        )}

        {currentPlan && currentPlan.sourceType !== 'package' && (
          <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-500/20 text-xs text-amber-300">
            This catalog item currently uses the service base price. Add a package to the service above before using the package editor.
          </div>
        )}

        <div className="rounded-2xl border border-primary-gold/20 bg-gradient-to-br from-primary-gold/[0.10] via-surface-container-high to-obsidian p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-gold/25 bg-primary-gold/10 text-primary-gold">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-primary-gold">Elite tier</p>
                <h4 className="mt-1 font-display text-base font-black text-white">
                  {elitePlan ? elitePlan.name : 'Elite package not published yet'}
                </h4>
                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-gray-400">
                  {elitePlan
                    ? `${elitePlan.price === 'CUSTOM' ? 'Custom pricing' : `₹${elitePlan.price}`} • ${elitePlan.features.length} premium features`
                    : 'Create a premium Elite option with priority production, elevated finishing and additional revisions.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={prepareElitePackage}
              className="neumorphic-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-mono font-bold tracking-wider text-primary-gold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {elitePlan ? 'EDIT ELITE PACKAGE' : 'PREPARE ELITE PACKAGE'}
            </button>
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
                disabled={!currentPlan || currentPlan.sourceType !== 'package'}
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
                disabled={!currentPlan || currentPlan.sourceType !== 'package'}
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
                disabled={!currentPlan || currentPlan.sourceType !== 'package'}
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
                disabled={!currentPlan || currentPlan.sourceType !== 'package'}
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
              disabled={!currentPlan || currentPlan.sourceType !== 'package'}
              className="w-full py-3 rounded-lg text-xs font-bold tracking-wider text-obsidian bg-gradient-to-r from-primary-gold to-champagne hover:opacity-95 transition shadow-lg cursor-pointer uppercase flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <span>{pendingOrderCount} pending orders</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Accelerated Sector</span>
          <span>{completedOrderCount} completed orders</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Operational Retention</span>
          <span>{cancelledOrderCount} cancelled orders</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold block uppercase">Avg Financial Value</span>
          <span>{adminDashboard?.totalUsers || 0} total users • {adminDashboard?.editorCount || 0} editors</span>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteUserTarget)}
        title={deleteUserTarget?.role === 'ADMIN' ? 'Permanently remove this administrator?' : 'Permanently remove this user?'}
        description={(
          <>
            <span className="font-semibold text-white">{deleteUserTarget?.name}</span>
            {' '}({deleteUserTarget?.email}) will lose both their application profile and Supabase sign-in account. This action cannot be undone.
          </>
        )}
        confirmLabel={deleteUserTarget?.role === 'ADMIN' ? 'Delete administrator' : 'Delete user'}
        busy={Boolean(deleteUserTarget && adminActionId === `delete-user:${deleteUserTarget.id}`)}
        onCancel={() => setDeleteUserTarget(null)}
        onConfirm={confirmDeleteUser}
      />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { dataLoading, dataError, refreshData } = useAppState();
  if (dataLoading) {
    return <ValkyriasLoader fullPage label="Loading admin portal" detail="Synchronizing users, services, orders, and reporting" />;
  }
  if (dataError) {
    return <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-4 text-gray-300"><p>{dataError}</p><button onClick={() => void refreshData()} className="neumorphic-button px-5 py-3 rounded-xl text-primary-gold">RETRY</button></div>;
  }
  return <AdminDashboardContent />;
};
