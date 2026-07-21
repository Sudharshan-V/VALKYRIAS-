export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  isPopular: boolean;
}

export type ActiveView = 'landing' | 'login' | 'admin' | 'client' | 'customer' | 'checkout';

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
  email: string;
  role: ProfileRole;
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
