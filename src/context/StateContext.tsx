import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  ActionItem,
  ActiveView,
  AdminDashboardResponse,
  ChatMessage,
  Deliverable,
  FileCategory,
  FileResponse,
  Note,
  OrderResponse,
  Plan,
  PortfolioItem,
  ProfileResponse,
  ProfileRole,
  Project,
  ServiceResponse,
  PaymentResponse,
  SiteSettings,
} from '../types';
import { supabase } from '../supabaseClient';
import * as coreApi from '../api';
import * as dashboardApi from '../api/dashboardApi';
import * as serviceApi from '../api/serviceApi';
import * as orderApi from '../api/orderApi';
import * as conversationApi from '../api/conversationApi';
import * as fileApi from '../api/fileApi';
import * as notificationApi from '../api/notificationApi';
import * as paymentApi from '../api/paymentApi';
import * as portfolioApi from '../api/portfolioApi';
import * as siteSettingsApi from '../api/siteSettingsApi';
import { DEFAULT_SITE_SETTINGS } from '../content/legalDocuments';
import { clampProgress, safeLower, safePortalRole, safeProfileRole } from '../utils/safeText';

interface StateContextType {
  view: ActiveView;
  setView: (view: ActiveView) => void;
  loggedInUser: 'admin' | 'client' | 'editor' | null;
  profile: ProfileResponse | null;
  authError: string | null;
  clearAuthError: () => void;
  login: (selectedRole?: ProfileRole) => Promise<void>;
  completePasswordRecovery: () => Promise<void>;
  refreshProfile: () => Promise<ProfileResponse>;
  cacheProfile: (profile: ProfileResponse | null) => void;
  logout: () => Promise<void>;
  dataLoading: boolean;
  dataError: string | null;
  adminDashboard: AdminDashboardResponse | null;
  refreshData: () => Promise<void>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  updateProjectProgress: (projectId: string, progress: number) => void;
  actionItems: ActionItem[];
  setActionItems: React.Dispatch<React.SetStateAction<ActionItem[]>>;
  chatMessages: ChatMessage[];
  addChatMessage: (sender: 'editor' | 'client' | 'admin', message: string, projectId?: string) => void;
  deliverables: Deliverable[];
  addDeliverable: (filename: string, size: string, projectId?: string) => void;
  uploadDeliverable: (file: File, projectId?: string, category?: FileCategory, onProgress?: (percentage: number) => void) => Promise<Deliverable | null>;
  deleteDeliverable: (id: string, storagePath?: string) => Promise<void>;
  portfolioItems: PortfolioItem[];
  addPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => Promise<PortfolioItem>;
  deletePortfolioItem: (id: string) => Promise<void>;
  siteSettings: SiteSettings;
  saveSiteSettings: (settings: SiteSettings) => Promise<SiteSettings>;
  notes: Note[];
  addNote: (title: string, content: string, category?: string) => Promise<{ success: boolean; error?: string }>;
  deleteNote: (id: string) => Promise<void>;
  totalContract: number;
  paidToDate: number;
  nextInvoice: number;
  activePlan: string | null;
  setActivePlan: (plan: string | null) => void;
  storageUsed: number;
  storageTotal: number;
  setStorageUsed: (value: number) => void;
  approveMilestone: (projectId: string) => void;
  resolveActionItem: (id: string, action: 'resolved' | 'accepted') => void;
  processPayment: (couponCode?: string) => Promise<PaymentResponse>;
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  updatePlan: (id: string, updated: Partial<Plan>) => Promise<void>;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

const mergeSiteSettings = (incoming?: Partial<SiteSettings> | null): SiteSettings => {
  const source = incoming || {};
  return Object.fromEntries(
    Object.entries(DEFAULT_SITE_SETTINGS).map(([key, fallback]) => {
      const value = source[key as keyof SiteSettings];
      return [key, typeof value === 'string' && value.trim() ? value : fallback];
    }),
  ) as unknown as SiteSettings;
};


const isPasswordRecoveryUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
};

const routeForRole = (role: ProfileRole): ActiveView => {
  if (role === 'ADMIN') return 'admin';
  if (role === 'EDITOR') return 'client';
  return 'customer';
};

const uiStatus = (status: OrderResponse['status']): Project['status'] => {
  if (status === 'COMPLETED') return 'Completed';
  if (['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'EDITOR_ASSIGNED'].includes(status)) return 'Pending';
  return 'Active';
};

const orderToProject = (order: OrderResponse): Project => ({
  id: order.id,
  title: order.title,
  client: order.clientName,
  editor: order.assignedEditorName || 'Unassigned',
  budget: Number(order.budget || 0),
  progress: order.progress,
  status: uiStatus(order.status),
  version: `v${order.version}`,
  deadline: order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Not scheduled',
  storage: 'Calculated from files',
  category: order.serviceName || 'Custom service',
  thumbnail: '',
  contributors: order.assignedEditorName ? [order.assignedEditorName] : [],
  orderStatus: order.status,
  conversationId: order.conversationId || undefined,
  clientId: order.clientId,
  assignedEditorId: order.assignedEditorId || undefined,
  serviceId: order.serviceId || undefined,
  servicePackageId: order.servicePackageId || undefined,
  requirements: order.requirements,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const bytesLabel = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const fileToDeliverable = (file: FileResponse, thumbnail = ''): Deliverable => ({
  id: file.id,
  filename: file.originalFilename,
  time: new Date(file.createdAt).toLocaleString(),
  size: bytesLabel(file.sizeBytes),
  thumbnail,
  storagePath: file.id,
  projectId: file.orderId,
  category: file.category,
  contentType: file.contentType,
  sizeBytes: file.sizeBytes,
});

const servicesToPlans = (services: ServiceResponse[]): Plan[] => services.flatMap<Plan>((service) => {
  if (service.packages.length === 0) {
    return [{
      id: service.id,
      name: service.name,
      price: Number(service.basePrice).toLocaleString('en-IN'),
      period: 'project',
      desc: service.description || '',
      features: service.requiredClientInformation,
      isPopular: false,
      sourceType: 'service' as const,
      sourceServiceId: service.id,
    }];
  }
  return service.packages.map((item, index) => {
    const numericPrice = Number(item.price || 0);
    const customQuote = numericPrice === 0;
    return {
      id: item.id,
      name: item.name || 'Custom package',
      price: customQuote ? 'CUSTOM' : numericPrice.toLocaleString('en-IN'),
      period: customQuote ? 'quote' : 'project',
      desc: item.description || service.description || '',
      features: Array.isArray(item.features) ? item.features : [],
      isPopular: index === 0 && !customQuote,
      sourceType: 'package' as const,
      sourceServiceId: service.id,
      customQuote,
    };
  });
});

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ActiveView>('landing');
  const [loggedInUser, setLoggedInUser] = useState<'admin' | 'client' | 'editor' | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardResponse | null>(null);
  const [projects, setProjectsInternal] = useState<Project[]>([]);
  const [actionItems, setActionItemsInternal] = useState<ActionItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [plans, setPlansInternal] = useState<Plan[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalContract, setTotalContract] = useState(0);
  const [paidToDate, setPaidToDate] = useState(0);
  const [nextInvoice, setNextInvoice] = useState(0);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal] = useState(0);
  const profileHydrationRef = useRef<{ userId: string; selectedRole?: ProfileRole; promise: Promise<void> } | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reloadTimerRef = useRef<number | null>(null);
  const activeProfileRef = useRef<ProfileResponse | null>(null);
  const dataHydratedRef = useRef(false);
  const progressUpdateTimersRef = useRef<Map<string, number>>(new Map());

  const clearBusinessData = useCallback(() => {
    dataHydratedRef.current = false;
    setDataLoading(false);
    setProjectsInternal([]);
    setActionItemsInternal([]);
    setChatMessages([]);
    setDeliverables([]);
    setNotes([]);
    setTotalContract(0);
    setPaidToDate(0);
    setNextInvoice(0);
    setStorageUsed(0);
    setDataError(null);
    setAdminDashboard(null);
  }, []);

  const refreshPublicContent = useCallback(async () => {
    const [servicesResult, portfolioResult, settingsResult] = await Promise.allSettled([
      serviceApi.listServices(),
      portfolioApi.listPublicPortfolio(),
      siteSettingsApi.getPublicSiteSettings(),
    ]);

    if (servicesResult.status === 'fulfilled') {
      setPlansInternal(servicesToPlans(servicesResult.value));
    }
    if (portfolioResult.status === 'fulfilled') {
      setPortfolioItems(Array.isArray(portfolioResult.value) ? portfolioResult.value : []);
    }
    if (settingsResult.status === 'fulfilled') {
      setSiteSettings(mergeSiteSettings(settingsResult.value));
    }
  }, []);

  useEffect(() => {
    void refreshPublicContent();
  }, [refreshPublicContent]);

  const loadDataForProfile = useCallback(async (
    current: ProfileResponse,
    showLoader = !dataHydratedRef.current,
  ) => {
    if (showLoader) setDataLoading(true);
    setDataError(null);

    try {
      const [services, dashboard, currentNotes, currentPortfolio] = await Promise.all([
        serviceApi.listServices(),
        current.role === 'ADMIN' ? dashboardApi.getAdminDashboard()
          : current.role === 'EDITOR' ? dashboardApi.getEditorDashboard()
            : dashboardApi.getClientDashboard(),
        coreApi.fetchNotes().catch(() => []),
        coreApi.publicRequest<PortfolioItem[]>('/portfolio-items/public').catch(() => []),
      ]);

      const orders = 'recentOrders' in dashboard ? dashboard.recentOrders : dashboard.orders;
      setPlansInternal(servicesToPlans(services));
      setNotes(currentNotes);
      setPortfolioItems(currentPortfolio);

      if ('recentOrders' in dashboard) {
        setAdminDashboard(dashboard);
        setTotalContract(Number(dashboard.verifiedRevenue || 0));
        setPaidToDate(Number(dashboard.verifiedRevenue || 0));
        setNextInvoice(0);
        setActionItemsInternal(dashboard.recentOrders
          .filter((order) => ['SUBMITTED', 'UNDER_REVIEW', 'EDITOR_ASSIGNED'].includes(order.status))
          .map((order) => ({
            id: `order:${order.id}`,
            title: order.title,
            description: order.status === 'EDITOR_ASSIGNED'
              ? `${order.clientName} • Assigned to ${order.assignedEditorName || 'editor'} • Waiting for acceptance`
              : `${order.clientName} • ${order.status.replaceAll('_', ' ')}`,
            status: 'pending',
            type: 'order',
            budget: Number(order.budget || 0),
          })));
      } else {
        setAdminDashboard(null);
        setTotalContract(orders
          .filter((order) => order.status !== 'CANCELLED')
          .reduce((sum, order) => sum + Number(order.budget || 0), 0));
        setPaidToDate(Number(dashboard.paidTotal || 0));
        setNextInvoice(Number(dashboard.outstandingTotal || 0));

        const assignmentActions: ActionItem[] = dashboard.pendingAssignments.map((assignment) => ({
          id: `assignment:${assignment.orderId}`,
          title: assignment.orderTitle,
          description: 'A new editor assignment is waiting for your response.',
          status: 'pending',
          type: 'order',
        }));
        const notificationActions: ActionItem[] = dashboard.notifications
          .filter((notification) => !notification.readAt)
          .map((notification) => ({
            id: `notification:${notification.id}`,
            title: notification.title,
            description: notification.body,
            status: 'pending',
            type: notification.type === 'NEW_MESSAGE' ? 'message' : 'feedback',
          }));
        setActionItemsInternal([...assignmentActions, ...notificationActions]);
      }

      const resources = await Promise.all(orders.map(async (order) => {
        const [files, messages] = await Promise.all([
          fileApi.listOrderFiles(order.id).catch(() => []),
          order.conversationId
            ? conversationApi.listMessages(order.conversationId, 0, 100)
              .then((page) => page.items)
              .catch(() => [])
            : Promise.resolve([]),
        ]);
        return { order, files, messages };
      }));

      const imageFiles = resources.flatMap(({ files }) => files)
        .filter((file) => safeLower(file.contentType).startsWith('image/'));
      const thumbnailResults = await Promise.all(imageFiles.map(async (file) => {
        try {
          const download = await fileApi.getFileDownload(file.id);
          return [file.id, download.signedUrl] as const;
        } catch {
          return [file.id, ''] as const;
        }
      }));
      const thumbnailByFileId = new Map(thumbnailResults);
      const thumbnailByOrderId = new Map<string, string>();
      const categoryPriority: Record<FileCategory, number> = {
        PREVIEW: 0,
        DELIVERABLE: 1,
        PORTFOLIO_MEDIA: 2,
        CLIENT_ASSET: 3,
        CHAT_ATTACHMENT: 4,
      };

      for (const { order, files } of resources) {
        const preferred = files
          .filter((file) => thumbnailByFileId.get(file.id))
          .sort((a, b) => categoryPriority[a.category] - categoryPriority[b.category])[0];
        if (preferred) thumbnailByOrderId.set(order.id, thumbnailByFileId.get(preferred.id) || '');
      }

      setProjectsInternal(orders.map((order) => ({
        ...orderToProject(order),
        thumbnail: thumbnailByOrderId.get(order.id) || '',
      })));
      setDeliverables(resources.flatMap(({ files }) => files.map((file) =>
        fileToDeliverable(file, thumbnailByFileId.get(file.id) || ''),
      )));
      setStorageUsed(resources.flatMap(({ files }) => files)
        .reduce((sum, file) => sum + file.sizeBytes, 0) / 1024 ** 3);
      setChatMessages(resources.flatMap(({ order, messages }) => [...messages].reverse().map((message) => ({
        id: message.id,
        sender: message.senderId === current.applicationUserId
          ? safePortalRole(current.role)
          : current.role === 'CLIENT' ? 'editor' : 'client',
        senderName: message.senderName,
        senderAvatarUrl: message.senderAvatarUrl
          || (message.senderId === current.applicationUserId ? current.profileImageUrl : null),
        message: message.content,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        projectId: order.id,
      }))));

      dataHydratedRef.current = true;
    } catch (error) {
      if (!dataHydratedRef.current) clearBusinessData();
      setDataError(error instanceof Error ? error.message : 'Application data could not be loaded.');
    } finally {
      if (showLoader) setDataLoading(false);
    }
  }, [clearBusinessData]);

  const refreshData = useCallback(async () => {
    if (activeProfileRef.current) await loadDataForProfile(activeProfileRef.current, false);
  }, [loadDataForProfile]);

  const stopRealtime = useCallback(() => {
    if (reloadTimerRef.current !== null) window.clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = null;
    if (realtimeChannelRef.current) void supabase.removeChannel(realtimeChannelRef.current);
    realtimeChannelRef.current = null;
  }, []);

  const startRealtime = useCallback((current: ProfileResponse) => {
    stopRealtime();
    const scheduleRefresh = () => {
      if (reloadTimerRef.current !== null) window.clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = window.setTimeout(() => void loadDataForProfile(current, false), 200);
    };
    let channel = supabase.channel(`application:${current.supabaseUserId}`);
    for (const table of ['orders', 'order_assignments', 'conversation_messages', 'message_reads', 'file_records', 'revision_requests', 'notifications', 'payments', 'order_events']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh);
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') scheduleRefresh();
    });
    realtimeChannelRef.current = channel;
  }, [loadDataForProfile, stopRealtime]);

  const refreshProfile = async () => {
    const loaded = await coreApi.getMyProfile();
    activeProfileRef.current = loaded;
    setProfile(loaded);
    return loaded;
  };

  const establishAuthenticatedSession = useCallback((userId: string, selectedRole?: ProfileRole): Promise<void> => {
    const inFlight = profileHydrationRef.current;
    if (inFlight?.userId === userId && inFlight.selectedRole === selectedRole) return inFlight.promise;
    const promise = (async () => {
      try {
        setAuthError(null);
        clearBusinessData();
        const loaded = await coreApi.getMyProfile(selectedRole);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user.id !== userId) return;
        activeProfileRef.current = loaded;
        setProfile(loaded);
        setLoggedInUser(safePortalRole(loaded.role));
        const redirectView = routeForRole(loaded.role);
        const oauthPending = sessionStorage.getItem('valkyrias_oauth_pending') === '1';
        setView((current) => (current === 'login' || oauthPending) ? redirectView : current);
        sessionStorage.removeItem('valkyrias_oauth_pending');
        localStorage.removeItem('valkyrias_selected_role');
        if (typeof window !== 'undefined' && (window.location.search.includes('auth_callback=google') || window.location.search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await loadDataForProfile(loaded, true);
        startRealtime(loaded);
      } catch (error) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user.id === userId) {
          activeProfileRef.current = null;
          setProfile(null);
          setLoggedInUser(null);
          clearBusinessData();
          const oauthPending = sessionStorage.getItem('valkyrias_oauth_pending') === '1';
          const message = error instanceof Error ? error.message : 'The authenticated profile could not be loaded.';
          if (oauthPending) {
            setAuthError(message);
            sessionStorage.removeItem('valkyrias_oauth_pending');
            localStorage.removeItem('valkyrias_selected_role');
            setView('login');
          } else {
            setView((current) => {
              // A stored Supabase session is restored automatically when the app starts.
              // If profile hydration fails during that background restore, keep the public
              // landing page visible instead of forcing visitors into the login screen.
              if (current === 'landing' || current === 'reset-password') return current;
              return 'login';
            });
          }
        }
        throw error;
      }
    })();
    profileHydrationRef.current = { userId, selectedRole, promise };
    void promise.finally(() => {
      if (profileHydrationRef.current?.promise === promise) profileHydrationRef.current = null;
    });
    return promise;
  }, [clearBusinessData, loadDataForProfile, startRealtime]);

  useEffect(() => {
    if (isPasswordRecoveryUrl()) {
      setView('reset-password');
    } else {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        const pendingRole = sessionStorage.getItem('valkyrias_oauth_pending') === '1'
          ? safeProfileRole(localStorage.getItem('valkyrias_selected_role'), 'CLIENT')
          : undefined;
        void establishAuthenticatedSession(session.user.id, pendingRole).catch(() => undefined);
      });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
        return;
      }
      if (session) {
        const pendingRole = sessionStorage.getItem('valkyrias_oauth_pending') === '1'
          ? safeProfileRole(localStorage.getItem('valkyrias_selected_role'), 'CLIENT')
          : undefined;
        window.setTimeout(() => void establishAuthenticatedSession(session.user.id, pendingRole).catch(() => undefined), 0);
      } else {
        stopRealtime();
        activeProfileRef.current = null;
        setProfile(null);
        setLoggedInUser(null);
        clearBusinessData();
        setView((current) => ['admin', 'client', 'customer', 'checkout'].includes(current) ? 'login' : current);
      }
    });
    return () => { subscription.unsubscribe(); stopRealtime(); };
  }, [clearBusinessData, establishAuthenticatedSession, stopRealtime]);

  useEffect(() => {
    if (!['admin', 'client', 'customer', 'checkout'].includes(view)) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setView('login');
      else if (profile && ['admin', 'client', 'customer'].includes(view)) {
        const allowed = routeForRole(profile.role);
        if (view !== allowed) setView(allowed);
      }
    });
  }, [profile, view]);

  const login = async (selectedRole?: ProfileRole) => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw error ?? new Error('No authenticated Supabase session is available.');
    await establishAuthenticatedSession(session.user.id, selectedRole);
  };

  const completePasswordRecovery = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw error ?? new Error('No authenticated Supabase session is available.');
    await establishAuthenticatedSession(session.user.id);
  };

  const logout = async () => {
    profileHydrationRef.current = null;
    stopRealtime();
    clearBusinessData();
    activeProfileRef.current = null;
    await supabase.auth.signOut();
    localStorage.removeItem('valkyrias_selected_role');
    setProfile(null);
    setLoggedInUser(null);
    setAuthError(null);
    setView('landing');
    await refreshPublicContent();
  };

  const setProjects: React.Dispatch<React.SetStateAction<Project[]>> = (value) => {
    setProjectsInternal(value);
  };

  const updateProjectProgress = (projectId: string, value: number) => {
    const progress = clampProgress(value);
    setProjectsInternal((previous) => previous.map((project) =>
      project.id === projectId ? { ...project, progress } : project,
    ));

    const existingTimer = progressUpdateTimersRef.current.get(projectId);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(() => {
      progressUpdateTimersRef.current.delete(projectId);
      void orderApi.updateProgress(projectId, progress)
        .then((updatedOrder) => {
          setProjectsInternal((previous) => previous.map((project) =>
            project.id === projectId
              ? { ...project, ...orderToProject(updatedOrder), thumbnail: project.thumbnail }
              : project,
          ));
          setDataError(null);
        })
        .catch((error) => {
          setDataError(error instanceof Error ? error.message : 'Progress update failed.');
          void refreshData();
        });
    }, 450);
    progressUpdateTimersRef.current.set(projectId, timer);
  };

  useEffect(() => () => {
    for (const timer of progressUpdateTimersRef.current.values()) window.clearTimeout(timer);
    progressUpdateTimersRef.current.clear();
  }, []);


  const setActionItems: React.Dispatch<React.SetStateAction<ActionItem[]>> = (value) => setActionItemsInternal(value);

  const addChatMessage = (_sender: 'editor' | 'client' | 'admin', message: string, projectId?: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project?.conversationId) {
      setDataError('This order does not have an active conversation yet.');
      return;
    }
    void conversationApi.sendMessage(project.conversationId, message)
      .then(refreshData)
      .catch((error) => setDataError(error instanceof Error ? error.message : 'Message could not be sent.'));
  };

  const addDeliverable = (_filename: string, _size: string, _projectId?: string) => {
    setDataError('Choose a real file to upload. File records cannot be created without Storage content.');
  };

  const uploadDeliverable = async (
    file: File,
    projectId?: string,
    requestedCategory?: FileCategory,
    onProgress?: (percentage: number) => void,
  ): Promise<Deliverable | null> => {
    if (!projectId || !loggedInUser) return null;
    const category = requestedCategory || (loggedInUser === 'client' ? 'CLIENT_ASSET' : loggedInUser === 'editor' ? 'PREVIEW' : 'DELIVERABLE');
    const stored = await fileApi.uploadOrderFile(projectId, category, file, onProgress);
    await refreshData();
    return fileToDeliverable(stored);
  };

  const deleteDeliverable = async (id: string, storagePath?: string) => {
    await fileApi.deleteFile(storagePath || id);
    await refreshData();
  };

  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>): Promise<PortfolioItem> => {
    const saved = await portfolioApi.createPortfolioItem(item);
    await refreshPublicContent();
    return saved;
  };

  const deletePortfolioItem = async (id: string) => {
    await portfolioApi.deletePortfolioItem(id);
    await refreshPublicContent();
  };

  const saveSiteSettings = async (settings: SiteSettings): Promise<SiteSettings> => {
    const saved = await siteSettingsApi.updateSiteSettings(settings);
    setSiteSettings(mergeSiteSettings(saved));
    return saved;
  };

  const addNote = async (title: string, content: string, category = 'General') => {
    try {
      await coreApi.authenticatedRequest<Note>('/notes', {
        method: 'POST',
        body: JSON.stringify({ id: crypto.randomUUID(), title, content, category, isAiSummarized: false }),
      });
      await refreshData();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Note could not be saved.' };
    }
  };

  const deleteNote = async (id: string) => {
    await coreApi.authenticatedRequest<void>(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refreshData();
  };

  const approveMilestone = (projectId: string) => {
    void orderApi.approvePreview(projectId).then(refreshData)
      .catch((error) => setDataError(error instanceof Error ? error.message : 'Preview could not be approved.'));
  };

  const resolveActionItem = (id: string, action: 'resolved' | 'accepted') => {
    const [kind, resourceId] = id.split(':', 2);
    const request = kind === 'assignment'
      ? orderApi.respondToAssignment(resourceId, action === 'accepted')
      : kind === 'notification'
        ? notificationApi.markNotificationRead(resourceId)
        : Promise.reject(new Error('Assign an editor from the order management action before accepting this order.'));
    void request.then(refreshData).catch((error) => setDataError(error instanceof Error ? error.message : 'Action could not be completed.'));
  };

  const processPayment = async (couponCode?: string): Promise<PaymentResponse> => {
    const payable = projects.find((project) => project.orderStatus === 'PAYMENT_PENDING' || project.orderStatus === 'APPROVED');
    if (!payable) {
      throw new Error('No server-approved order is currently ready for payment.');
    }
    const payment = await paymentApi.initiatePayment(payable.id, 'RAZORPAY', couponCode);
    await refreshData();
    return payment;
  };

  const cacheProfile = useCallback((value: ProfileResponse | null) => {
    activeProfileRef.current = value;
    setProfile(value);
  }, []);

  const setPlans: React.Dispatch<React.SetStateAction<Plan[]>> = (value) => setPlansInternal(value);
  const updatePlan = async (id: string, updated: Partial<Plan>) => {
    const current = plans.find((plan) => plan.id === id);
    if (!current || current.sourceType !== 'package') {
      throw new Error('Add a package to this service before editing package-specific pricing.');
    }
    const merged = { ...current, ...updated };
    const price = merged.customQuote || merged.price.trim().toUpperCase() === 'CUSTOM'
      ? 0
      : Number(merged.price.replaceAll(',', ''));
    await serviceApi.updateServicePackage(id, {
      name: merged.name,
      description: merged.desc,
      price: Number.isFinite(price) ? price : 0,
      currency: 'INR',
      deliveryDays: null,
      features: merged.features,
      active: true,
      displayOrder: 0,
    });
    await refreshData();
  };

  return <StateContext.Provider value={{
    view, setView, loggedInUser, profile, authError, clearAuthError: () => setAuthError(null), login, completePasswordRecovery, refreshProfile,
    cacheProfile,
    logout, dataLoading, dataError, adminDashboard, refreshData,
    projects, setProjects, updateProjectProgress, actionItems, setActionItems, chatMessages, addChatMessage,
    deliverables, addDeliverable, uploadDeliverable, deleteDeliverable,
    portfolioItems, addPortfolioItem, deletePortfolioItem, siteSettings, saveSiteSettings, notes, addNote, deleteNote,
    totalContract, paidToDate, nextInvoice, activePlan, setActivePlan,
    storageUsed, storageTotal, setStorageUsed,
    approveMilestone, resolveActionItem, processPayment,
    plans, setPlans, updatePlan,
  }}>{children}</StateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
};
