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
