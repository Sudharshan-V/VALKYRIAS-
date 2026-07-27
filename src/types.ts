export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  isPopular: boolean;
  sourceType?: 'service' | 'package';
  sourceServiceId?: string;
  customQuote?: boolean;
}

export type ActiveView = 'landing' | 'login' | 'admin' | 'client' | 'customer' | 'checkout' | 'reset-password';

export interface SiteSettings {
  brandDescription: string;
  websiteUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  vimeoUrl: string;
  supportEmail: string;
  privacyEmail: string;
  contactPhone: string;
  address: string;
  privacyPolicy: string;
  termsConditions: string;
  effectiveDate: string;
  updatedAt?: string | null;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  editor: string;
  budget: number;
  progress: number;
  status: 'Active' | 'Completed' | 'Pending';
  version: string;
  deadline: string;
  storage: string;
  category: string;
  thumbnail: string;
  contributors?: string[];
  orderStatus?: OrderStatus;
  conversationId?: string;
  clientId?: string;
  assignedEditorId?: string;
  serviceId?: string;
  servicePackageId?: string;
  requirements?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'accepted';
  type: 'feedback' | 'order' | 'message';
  budget?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'editor' | 'client' | 'admin';
  senderName: string;
  senderAvatarUrl?: string | null;
  message: string;
  time: string;
  projectId?: string;
}

export interface Deliverable {
  id: string;
  filename: string;
  time: string;
  size: string;
  thumbnail: string;
  storagePath?: string;
  projectId?: string;
  category?: FileCategory;
  contentType?: string;
  sizeBytes?: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  image: string;
  description?: string;
  software?: string;
  clientName?: string;
  duration?: string;
  published?: boolean;
}

export interface Note {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  category: string;
  is_ai_summarized: boolean;
  created_at?: string;
}

export interface AppState {
  view: ActiveView;
  loggedInUser: 'admin' | 'client' | 'editor' | null;
  projects: Project[];
  actionItems: ActionItem[];
  chatMessages: ChatMessage[];
  deliverables: Deliverable[];
  portfolioItems: PortfolioItem[];
  notes: Note[];
  totalContract: number;
  paidToDate: number;
  nextInvoice: number;
  activePlan: string | null;
  storageUsed: number; // in TB
  storageTotal: number; // in TB
}

export type ProfileRole = 'CLIENT' | 'EDITOR' | 'ADMIN';

export type ClientType =
  | 'INDIVIDUAL'
  | 'BUSINESS'
  | 'AGENCY'
  | 'NON_PROFIT'
  | 'OTHER';

export type PreferredCommunication =
  | 'EMAIL'
  | 'PHONE'
  | 'WHATSAPP'
  | 'VIDEO_CALL'
  | 'OTHER';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'UNAVAILABLE';

export interface ClientProfileResponse {
  companyName: string | null;
  clientType: ClientType | null;
  preferredCommunication: PreferredCommunication | null;
  defaultProjectCategory: string | null;
}

export interface EditorProfileResponse {
  professionalTitle: string | null;
  experienceYears: number | null;
  skills: string[];
  softwareUsed: string[];
  languages: string[];
  startingPrice: number | null;
  hourlyRate: number | null;
  deliveryTime: string | null;
  availabilityStatus: AvailabilityStatus | null;
  portfolioSummary: string | null;
  certifications: string[];
  location: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

export interface ProfileResponse {
  applicationUserId: string;
  supabaseUserId: string;
  email: string;
  role: ProfileRole;
  accountStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'REJECTED';
  profileComplete: boolean;
  fullName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  phoneNumber: string | null;
  country: string | null;
  timezone: string | null;
  bio: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  clientProfile: ClientProfileResponse | null;
  editorProfile: EditorProfileResponse | null;
}

export interface ClientProfileRequest {
  companyName: string | null;
  clientType: ClientType | null;
  preferredCommunication: PreferredCommunication | null;
  defaultProjectCategory: string | null;
}

export interface EditorProfileRequest {
  professionalTitle: string | null;
  experienceYears: number | null;
  skills: string[];
  softwareUsed: string[];
  languages: string[];
  startingPrice: number | null;
  hourlyRate: number | null;
  deliveryTime: string | null;
  availabilityStatus: AvailabilityStatus | null;
  portfolioSummary: string | null;
  certifications: string[];
  location: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

export interface ProfileUpdateRequest {
  fullName: string;
  displayName: string | null;
  phoneNumber: string | null;
  country: string | null;
  timezone: string | null;
  bio: string | null;
  clientProfile?: ClientProfileRequest;
  editorProfile?: EditorProfileRequest;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error?: string;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export type OrderStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'EDITOR_ASSIGNED' | 'ACCEPTED'
  | 'IN_PROGRESS' | 'PREVIEW_READY' | 'REVISION_REQUESTED' | 'APPROVED'
  | 'PAYMENT_PENDING' | 'PAID' | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type FileCategory = 'CLIENT_ASSET' | 'CHAT_ATTACHMENT' | 'PREVIEW' | 'DELIVERABLE' | 'PORTFOLIO_MEDIA';
export type PaymentStatus = 'PENDING' | 'REQUIRES_ACTION' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface ServicePackageResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  deliveryDays: number | null;
  features: string[];
}

export interface ServiceResponse {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  currency: string;
  deliveryEstimate: string | null;
  requiredClientInformation: string[];
  active: boolean;
  packages: ServicePackageResponse[];
}

export interface OrderResponse {
  id: string;
  clientId: string;
  clientName: string;
  assignedEditorId: string | null;
  assignedEditorName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  servicePackageId: string | null;
  servicePackageName: string | null;
  title: string;
  requirements: string | null;
  status: OrderStatus;
  budget: number | null;
  currency: string;
  progress: number;
  deadline: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  conversationId: string | null;
}

export interface AssignmentResponse {
  id: string;
  orderId: string;
  orderTitle: string;
  editorId: string;
  editorName: string;
  assignedById: string;
  status: AssignmentStatus;
  responseNote: string | null;
  assignedAt: string;
  respondedAt: string | null;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  messageType: string;
  createdAt: string;
  editedAt: string | null;
  clientRequestId: string | null;
}

export interface FileResponse {
  id: string;
  orderId: string;
  uploadedById: string;
  uploadedByName: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  category: FileCategory;
  createdAt: string;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  orderAmount: number;
  depositAmount: number;
  discountAmount: number;
  gstAmount: number;
  couponCode: string | null;
  currency: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  checkoutKey: string | null;
}

export interface PaymentQuoteResponse {
  orderId: string;
  orderAmount: number;
  depositAmount: number;
  discountAmount: number;
  discountPercent: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  couponCode: string | null;
}

export interface CouponResponse {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResponse {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface PortalDashboardResponse {
  orders: OrderResponse[];
  pendingAssignments: AssignmentResponse[];
  notifications: NotificationResponse[];
  unreadNotifications: number;
  paidTotal: number;
  outstandingTotal: number;
  activeOrders: number;
  completedOrders: number;
}

export interface AdminUserResponse {
  id: string;
  supabaseUserId: string | null;
  name: string;
  email: string;
  role: ProfileRole;
  accountStatus: ProfileResponse['accountStatus'];
  createdAt: string;
}

export interface AvailableEditorResponse {
  userId: string;
  name: string;
  email: string;
  accountStatus: ProfileResponse['accountStatus'];
  availabilityStatus: string;
  skills: string[];
  activeOrderCount: number;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  clientCount: number;
  editorCount: number;
  pendingEditorApprovals: number;
  totalOrders: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  verifiedRevenue: number;
  recentOrders: OrderResponse[];
  recentUsers: AdminUserResponse[];
  recentActivity: Array<{
    id: string;
    actorId: string | null;
    actorName: string;
    eventType: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus | null;
    details: string;
    createdAt: string;
  }>;
  recentContactMessages: Array<{
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    submittedAt: string;
  }>;
  paymentStates: {
    pending: number;
    requiresAction: number;
    paid: number;
    failed: number;
    refunded: number;
    cancelled: number;
  };
}
