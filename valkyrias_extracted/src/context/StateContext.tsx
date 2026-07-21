import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, ActionItem, ChatMessage, Deliverable, PortfolioItem, ActiveView, Plan, Note } from '../types';
import { supabase } from '../supabaseClient';
import * as api from '../api';

interface StateContextType {
  view: ActiveView;
  setView: (view: ActiveView) => void;
  loggedInUser: 'admin' | 'client' | 'editor' | null;
  login: (role: 'admin' | 'client' | 'editor') => void;
  logout: () => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  actionItems: ActionItem[];
  setActionItems: React.Dispatch<React.SetStateAction<ActionItem[]>>;
  chatMessages: ChatMessage[];
  addChatMessage: (sender: 'editor' | 'client' | 'admin', message: string, projectId?: string) => void;
  deliverables: Deliverable[];
  addDeliverable: (filename: string, size: string, projectId?: string) => void;
  uploadDeliverable: (file: File, projectId?: string) => Promise<Deliverable | null>;
  deleteDeliverable: (id: string, storagePath?: string) => Promise<void>;
  portfolioItems: PortfolioItem[];
  addPortfolioItem: (item: Omit<PortfolioItem, 'id'>) => void;
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
  setStorageUsed: (val: number) => void;
  approveMilestone: (projectId: string) => void;
  resolveActionItem: (id: string, action: 'resolved' | 'accepted') => void;
  processPayment: (amount: number) => void;
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  updatePlan: (id: string, updated: Partial<Plan>) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Reliance Jewels - Festive Edition',
    client: 'Tanishq',
    editor: 'Marcus Vane',
    budget: 450000,
    progress: 75,
    status: 'Active',
    version: 'v2.4_Stable',
    deadline: 'Oct 24, 2026',
    storage: '1.2 TB',
    category: 'Commercial Production',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv9ia9ZyviGKeh2NBac0Q-fhDrDpPre147XUh8QfZ314ZRaP6N3NS26RR3KXCk2CYnqjuRtHFTEKKTATxAV8WFQr8KhUm5LsJ94pMnvhWfeGPuqQq2Aa0qbdh_ecql5qgnHX0BlQ2k36lFBSdKwKYYbBYLXVYIjyAErAy9zOBZyiL-jjay5j3WcAhUJJ7feNTjm0kBMtYkeBoC0MS2HBIvsDqT4RQjVRMVm9GFX8TOn-e7K30vnt-W',
    contributors: ['Marcus Vane']
  },
  {
    id: 'p2',
    title: 'Lumina Fashion Week — Campaign Film',
    client: 'Lumina',
    editor: 'Marcus Vane',
    budget: 350000,
    progress: 85,
    status: 'Active',
    version: 'v1.2',
    deadline: 'Sep 15, 2026',
    storage: '0.8 TB',
    category: 'Color Grading',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdan9U0Sji1_fF1wcbwAjsa04JZAqABFU8oy0bit3YqJAZINCHrjGydGOK70baNjLxhFMyFp9Qvo6NNR-frUQKRi7J3WvaH8mM0hH1bnf3xWNIGg4Nk_h0LeNTareJfcHKKXpW00BFkBOPobrmCDEYD84Zun3h1m_Mt6dxlfCJzX8N74QKt8UT-M6qZDruq4oRgh86nW8UhJybw7NYqSnxzw6R9u9WEJjaukwxl0Zyd_G1tKz8cPZz',
    contributors: ['Marcus Vane', 'Alex Ross', 'Maya Lin']
  },
  {
    id: 'p3',
    title: 'Elysium City — VFX Breakdown',
    client: 'Valkyrias Creative',
    editor: 'Marcus Vane',
    budget: 135000,
    progress: 32,
    status: 'Active',
    version: 'v0.8',
    deadline: 'Nov 30, 2026',
    storage: '1.5 TB',
    category: '3D Composition',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCut1fVmFOwwS_BXATfCwIb3T-9dIVMsJyZ7CXsJ36lUxgPd-6RNqHm2sKAlSeaCBzw3ozLf-IgfnlnIKpYAOrv1tH9aiRVkQpc2AQB7COt75o6LVQZAAcv8KmHU57TIFRn3fqvILvHXEHkRXy32giLimh8OhndAif0Mj1pXEQgO4FmzOXdDG2h7m2h3bJhUHWcD6YtIp7ypdqQBorAw-FIv34VRSxjKLPr1oJroHVjp7r74nJ3HVB0',
    contributors: ['Marcus Vane']
  }
];

const DEFAULT_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'act1',
    title: 'Feedback: Portrait Batch #42',
    description: 'Photo editing revision: Color balance adjustment.',
    status: 'pending',
    type: 'feedback'
  },
  {
    id: 'act2',
    title: 'New Order: Thumbnail Master',
    description: 'Series of 10 YouTube Thumbnails. ₹15,000 budget.',
    status: 'pending',
    type: 'order',
    budget: 15000
  },
  {
    id: 'act3',
    title: 'Message from "Corporate Hub"',
    description: '"Re-print requested for Business Cards. 500 units."',
    status: 'pending',
    type: 'message'
  }
];

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'c1',
    sender: 'editor',
    senderName: 'Marcus Vane',
    message: 'Hi Tanishq! Just uploaded the second pass of the grading. Let me know if the warmth is okay for the festive theme.',
    time: '11:04 AM'
  },
  {
    id: 'c2',
    sender: 'client',
    senderName: 'Tanishq',
    message: 'Hey! Looking good. Can we push the gold tones in the jewelry pieces just a bit more? They need to pop!',
    time: '11:15 AM'
  },
  {
    id: 'c3',
    sender: 'editor',
    senderName: 'Marcus Vane',
    message: 'Understood. Working on the selective mask for the ornaments now. Will update in an hour.',
    time: '11:20 AM'
  }
];

const DEFAULT_DELIVERABLES: Deliverable[] = [
  {
    id: 'd1',
    filename: 'Commercial_V3_Color.mp4',
    time: 'Delivered 2 hours ago',
    size: '4.2 GB',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6ZIevJLKrYzQoNiHHESyM4Cs8UZeM8Lnr7FIxU31ZnF_WLR3XmkfKl1jNmus3o74Z1uqGIgQGV4fyPlBqcT0P3lftcBBZODPH9-FmU_9VDb0GgV1cn76W5XmJPbUfS1osPiqKFQa4jd09p1uUvnermWhSpXe4R7O4TA21H2vd14v_1bA8Pxtr5WBAesUCb60k9olrt1S3NS4onRsdI9SsH6j4aTxd8AryPZ8ZpHLjPeeeSXLPvFgG'
  },
  {
    id: 'd2',
    filename: 'Asset_Pack_HDR.zip',
    time: 'Delivered Yesterday',
    size: '12.8 GB',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMzJ7c3cDDbAjT9rjyD_l4_KIlbT_dSLZ5krAL2TOwVVbYu5J-LzNEZkV04uKfUJ-GhSBdmPSr0R37ZKtIn4Fy_aVgrsngzVKeC9bN5ET3VTofBcE_aLgGrIWFqfvvEIT0Vem8c8t8E4WnNjB5lPwWudmjIPhyACQQgWepy9Xqni92yX2LgUzmMgxljLVz9uoImna8jlr5-CSYoIY-3C2HuIcl_xFpJlHkvZQ6Bch3JL9O3CeOkcr'
  }
];

const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'port1',
    title: 'Royal Palace Wedding Teaser',
    category: 'CINEMATIC WEDDING FILM',
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=600&auto=format&fit=crop',
    description: 'A grand Royal Indian wedding trailer edited with breathtaking slow-motion sweeps, customized selective saffron/gold color grading, and heavy multi-layered traditional soundscapes.',
    software: 'DaVinci Resolve Studio & Premiere Pro',
    clientName: 'Mehta Royal Weddings Jaipur',
    duration: '3 Minutes Teaser'
  },
  {
    id: 'port2',
    title: 'CarryMinati BGMI Epic Roast Master',
    category: 'HIGH-CTR GAMING THUMBNAIL',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    description: 'An aggressive, ultra high-contrast thumbnail designed to optimize dynamic CTR for the Indian gaming audience, complete with hyper-saturated neon glows, custom expressive typography, and 3D graphic layering.',
    software: 'Adobe Photoshop CC',
    clientName: 'CarryMinati Gaming Channel',
    duration: 'Static Asset'
  },
  {
    id: 'port3',
    title: 'Tanishq Imperial Festive Gold Ad',
    category: 'JEWELRY RE-TOUCH & CAMPAIGN',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop',
    description: 'Premium print and digital commercial retouching for Tanishqs high-end diamond and traditional solid gold necklace line. Features detailed metal specular highlighting, flawless gem refraction correction, and custom light leak enhancements.',
    software: 'Photoshop CC & Lightroom Pro',
    clientName: 'Reliance Jewels / Tanishq India',
    duration: 'Ultra-HD Campaign File'
  }
];

const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan1",
    name: "ASSET STARTER",
    price: "2,500",
    period: "asset",
    desc: "Perfect for single YouTube or reel editors. Single high-impact Video Edit, Photo Retouches, and 1 high-CTR Thumbnail.",
    features: [
      "Single Video Edit (1m)",
      "5 Photo Retouches",
      "Thumbnail Design"
    ],
    isPopular: false
  },
  {
    id: "plan2",
    name: "ELITE CREATOR",
    price: "5,500",
    period: "project",
    desc: "Full premium cinematic video edit, unlimited picture/photo retouching, with bespoke color grading & audio master class.",
    features: [
      "Full Cinematic Edit",
      "Unlimited Retouching",
      "Signature Color Science",
      "Brand Identity Kit"
    ],
    isPopular: true
  },
  {
    id: "plan3",
    name: "BESPOKE ENTERPRISE",
    price: "Custom",
    period: "",
    desc: "Full-scale commercial productions with global distribution rights and dedicated creative direction.",
    features: [
      "Complete Campaign Dev",
      "Industrial Design Assets",
      "Custom Post Production Team"
    ],
    isPopular: false
  }
];

const DEFAULT_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Brand Vision & Aesthetics',
    content: 'Focus on high-contrast gold elements and deep obsidian black textures. Keep visual transitions smooth with minimal scale-up effects.',
    category: 'Creative Design',
    is_ai_summarized: true
  },
  {
    id: 'n2',
    title: 'Sound Design Guidelines',
    content: 'Utilize low-frequency sub-bass drones and cinematic swells during milestone highlights to establish emotional resonance.',
    category: 'Cinematic Editing',
    is_ai_summarized: false
  }
];

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ActiveView>('landing');
  const [loggedInUser, setLoggedInUser] = useState<'admin' | 'client' | 'editor' | null>(null);
  
  // 1. Core States
  const [projects, setProjectsInternal] = useState<Project[]>(DEFAULT_PROJECTS);
  const [actionItems, setActionItemsInternal] = useState<ActionItem[]>(DEFAULT_ACTION_ITEMS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(DEFAULT_CHAT_MESSAGES);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(DEFAULT_DELIVERABLES);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO_ITEMS);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  
  // Financials and Storage
  const [totalContract, setTotalContract] = useState<number>(1240000);
  const [paidToDate, setPaidToDate] = useState<number>(790000);
  const [nextInvoice, setNextInvoice] = useState<number>(450000);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState<number>(1.2);
  const [storageTotal, setStorageTotal] = useState<number>(2.0);

  // Helper function to reset back to offline/demo defaults on sign out
  const resetToDefaults = () => {
    setProjectsInternal(DEFAULT_PROJECTS);
    setActionItemsInternal(DEFAULT_ACTION_ITEMS);
    setChatMessages(DEFAULT_CHAT_MESSAGES);
    setDeliverables(DEFAULT_DELIVERABLES);
    setPortfolioItems(DEFAULT_PORTFOLIO_ITEMS);
    setPlans(DEFAULT_PLANS);
    setNotes(DEFAULT_NOTES);
    setTotalContract(1240000);
    setPaidToDate(790000);
    setNextInvoice(450000);
    setActivePlan(null);
    setStorageUsed(1.2);
    setStorageTotal(2.0);
  };

  // Helper function to load data from Spring Boot API or Supabase
  const loadUserData = async (userId: string) => {
    try {
      // Fetch dynamic data from Spring Boot API
      const springProjects = await api.fetchProjects(userId);
      if (springProjects && springProjects.length > 0) {
        setProjectsInternal(springProjects);
      }
      const springNotes = await api.fetchNotes(userId);
      if (springNotes && springNotes.length > 0) {
        setNotes(springNotes);
      }

      // 1. App Settings
      let { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (settingsError) {
        console.warn("App settings not found or table error, using defaults:", settingsError);
        // Fallback to default values
        setTotalContract(1240000);
        setPaidToDate(790000);
        setNextInvoice(450000);
        setActivePlan(null);
        setStorageUsed(1.2);
        setStorageTotal(2.0);

        // If PGRST116 (does not exist but table exists), try to seed it
        if (settingsError.code === 'PGRST116') {
          const defaultSettings = {
            id: userId,
            total_contract: 1240000,
            paid_to_date: 790000,
            next_invoice: 450000,
            active_plan: null,
            storage_used: 1.2,
            storage_total: 2.0
          };
          await supabase.from('app_settings').insert(defaultSettings);
        }
      } else if (settingsData) {
        setTotalContract(settingsData.total_contract ?? 1240000);
        setPaidToDate(settingsData.paid_to_date ?? 790000);
        setNextInvoice(settingsData.next_invoice ?? 450000);
        setActivePlan(settingsData.active_plan);
        setStorageUsed(Number(settingsData.storage_used) || 1.2);
        setStorageTotal(Number(settingsData.storage_total) || 2.0);
      }

      // 2. Projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (projectsError) {
        console.warn("Projects table error, using default mock projects:", projectsError);
        setProjectsInternal(DEFAULT_PROJECTS);
      } else if (projectsData && projectsData.length > 0) {
        setProjectsInternal(projectsData.map((p: any) => ({
          id: p.id,
          title: p.title || '',
          client: p.client || '',
          editor: p.editor || '',
          budget: Number(p.budget) || 0,
          progress: Number(p.progress) || 0,
          status: p.status || 'Active',
          version: p.version || 'v1.0',
          deadline: p.deadline || '',
          storage: p.storage || '0 GB',
          category: p.category || '',
          thumbnail: p.thumbnail || '',
          contributors: p.contributors || []
        })));
      } else {
        // Seed default projects for this user
        const defaultProjectsSeed = DEFAULT_PROJECTS.map(p => ({
          id: p.id,
          user_id: userId,
          title: p.title,
          client: p.client,
          editor: p.editor,
          budget: p.budget,
          progress: p.progress,
          status: p.status,
          version: p.version,
          deadline: p.deadline,
          storage: p.storage,
          category: p.category,
          thumbnail: p.thumbnail,
          contributors: p.contributors || []
        }));
        const { error: seedError } = await supabase.from('projects').insert(defaultProjectsSeed);
        if (seedError) {
          console.error("Failed to seed projects, using defaults:", seedError);
        }
        setProjectsInternal(DEFAULT_PROJECTS);
      }

      // 3. Action Items
      const { data: actionItemsData, error: actionItemsError } = await supabase
        .from('action_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (actionItemsError) {
        console.warn("Action items table error, using default mock action items:", actionItemsError);
        setActionItemsInternal(DEFAULT_ACTION_ITEMS);
      } else if (actionItemsData && actionItemsData.length > 0) {
        setActionItemsInternal(actionItemsData.map((item: any) => ({
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          status: item.status || 'pending',
          type: item.type || 'feedback',
          budget: item.budget ? Number(item.budget) : undefined
        })));
      } else {
        const defaultActionItemsSeed = DEFAULT_ACTION_ITEMS.map(item => ({
          id: item.id,
          user_id: userId,
          title: item.title,
          description: item.description,
          status: item.status,
          type: item.type,
          budget: item.budget
        }));
        const { error: seedError } = await supabase.from('action_items').insert(defaultActionItemsSeed);
        if (seedError) {
          console.error("Failed to seed action items, using defaults:", seedError);
        }
        setActionItemsInternal(DEFAULT_ACTION_ITEMS);
      }

      // 4. Chat Messages
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.warn("Chat messages table error, using default mock chats:", chatError);
        setChatMessages(DEFAULT_CHAT_MESSAGES);
      } else if (chatData && chatData.length > 0) {
        setChatMessages(chatData.map((msg: any) => {
          let projectId: string | undefined = undefined;
          if (msg.id.startsWith('chat-')) {
            const parts = msg.id.split('-');
            if (parts.length >= 3) {
              projectId = parts[1];
            }
          }
          return {
            id: msg.id,
            sender: msg.sender || 'client',
            senderName: msg.sender_name || 'Client',
            message: msg.message || '',
            time: msg.time || '',
            projectId
          };
        }));
      } else {
        const defaultChatSeed = DEFAULT_CHAT_MESSAGES.map(msg => ({
          id: msg.id,
          user_id: userId,
          sender: msg.sender,
          sender_name: msg.senderName,
          message: msg.message,
          time: msg.time
        }));
        const { error: seedError } = await supabase.from('chat_messages').insert(defaultChatSeed);
        if (seedError) {
          console.error("Failed to seed chat messages, using defaults:", seedError);
        }
        setChatMessages(DEFAULT_CHAT_MESSAGES);
      }

      // 5. Deliverables
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (deliverablesError) {
        console.warn("Deliverables table error, using default mock deliverables:", deliverablesError);
        setDeliverables(DEFAULT_DELIVERABLES);
      } else if (deliverablesData && deliverablesData.length > 0) {
        const mapped = await Promise.all(deliverablesData.map(async (d: any) => {
          let signedUrl = d.thumbnail || '';
          let isRealStoragePath = d.thumbnail && !d.thumbnail.startsWith('http');
          if (isRealStoragePath) {
            try {
              const { data: signedData, error: signedError } = await supabase.storage
                .from('app-files')
                .createSignedUrl(d.thumbnail, 60 * 60 * 24); // 24 hours
              if (!signedError && signedData) {
                signedUrl = signedData.signedUrl;
              }
            } catch (err) {
              console.error("Failed to get signed URL for deliverable thumbnail", err);
            }
          }
          let projectId: string | undefined = undefined;
          if (d.id.startsWith('d-')) {
            const parts = d.id.split('-');
            if (parts.length >= 3) {
              projectId = parts[1];
            }
          }
          return {
            id: d.id,
            filename: d.filename || '',
            time: d.time || '',
            size: d.size || '',
            thumbnail: signedUrl,
            storagePath: isRealStoragePath ? d.thumbnail : undefined,
            projectId
          };
        }));
        setDeliverables(mapped);
      } else {
        const defaultDeliverablesSeed = DEFAULT_DELIVERABLES.map(d => ({
          id: d.id,
          user_id: userId,
          filename: d.filename,
          time: d.time,
          size: d.size,
          thumbnail: d.thumbnail
        }));
        const { error: seedError } = await supabase.from('deliverables').insert(defaultDeliverablesSeed);
        if (seedError) {
          console.error("Failed to seed deliverables, using defaults:", seedError);
        }
        setDeliverables(DEFAULT_DELIVERABLES);
      }

      // 6. Portfolio Items
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (portfolioError) {
        console.warn("Portfolio items table error, using default mock portfolio:", portfolioError);
        setPortfolioItems(DEFAULT_PORTFOLIO_ITEMS);
      } else if (portfolioData && portfolioData.length > 0) {
        setPortfolioItems(portfolioData.map((p: any) => ({
          id: p.id,
          title: p.title || '',
          category: p.category || '',
          image: p.image || '',
          description: p.description || '',
          software: p.software || '',
          clientName: p.client_name || '',
          duration: p.duration || ''
        })));
      } else {
        const defaultPortfolioSeed = DEFAULT_PORTFOLIO_ITEMS.map(p => ({
          id: p.id,
          user_id: userId,
          title: p.title,
          category: p.category,
          image: p.image,
          description: p.description,
          software: p.software,
          client_name: p.clientName,
          duration: p.duration
        }));
        const { error: seedError } = await supabase.from('portfolio_items').insert(defaultPortfolioSeed);
        if (seedError) {
          console.error("Failed to seed portfolio items, using defaults:", seedError);
        }
        setPortfolioItems(DEFAULT_PORTFOLIO_ITEMS);
      }

      // 7. Plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (plansError) {
        console.warn("Plans table error, using default mock plans:", plansError);
        setPlans(DEFAULT_PLANS);
      } else if (plansData && plansData.length > 0) {
        setPlans(plansData.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          price: p.price || '',
          period: p.period || '',
          desc: p.description || '',
          features: p.features || [],
          isPopular: p.is_popular || false
        })));
      } else {
        const defaultPlansSeed = DEFAULT_PLANS.map(p => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          price: p.price,
          period: p.period,
          description: p.desc,
          features: p.features,
          is_popular: p.isPopular
        }));
        const { error: seedError } = await supabase.from('plans').insert(defaultPlansSeed);
        if (seedError) {
          console.error("Failed to seed plans, using defaults:", seedError);
        }
        setPlans(DEFAULT_PLANS);
      }

      // 8. Notes
      try {
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (notesError) {
          console.warn("Notes table error, using default mock notes:", notesError);
          setNotes(DEFAULT_NOTES);
        } else if (notesData && notesData.length > 0) {
          setNotes(notesData.map((n: any) => ({
            id: n.id,
            user_id: n.user_id,
            title: n.title || '',
            content: n.content || '',
            category: n.category || 'General',
            is_ai_summarized: n.is_ai_summarized || false,
            created_at: n.created_at
          })));
        } else {
          const defaultNotesSeed = DEFAULT_NOTES.map(n => ({
            id: n.id,
            user_id: userId,
            title: n.title,
            content: n.content,
            category: n.category,
            is_ai_summarized: n.is_ai_summarized
          }));
          const { error: seedError } = await supabase.from('notes').insert(defaultNotesSeed);
          if (seedError) {
            console.error("Failed to seed notes, using defaults:", seedError);
          }
          setNotes(DEFAULT_NOTES);
        }
      } catch (e) {
        console.warn("Could not load notes from Supabase, falling back to default notes", e);
        setNotes(DEFAULT_NOTES);
      }

    } catch (error) {
      console.error("Error loading user data from Supabase:", error);
    }
  };

  // State sync wrapper for projects
  const setProjects: React.Dispatch<React.SetStateAction<Project[]>> = (value) => {
    setProjectsInternal((prev) => {
      const next = typeof value === 'function' ? (value as Function)(prev) : value;
      // Async sync in background
      next.forEach(async (p: Project) => {
        await api.saveProject({
          id: p.id,
          userId: '00000000-0000-0000-0000-000000000000',
          title: p.title,
          client: p.client,
          editor: p.editor,
          budget: p.budget,
          progress: p.progress,
          status: p.status,
          version: p.version,
          deadline: p.deadline,
          storage: p.storage,
          category: p.category,
          thumbnail: p.thumbnail,
          contributors: JSON.stringify(p.contributors || [])
        });
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const userId = session.user.id;
          next.forEach(async (p: Project) => {
            await supabase.from('projects').upsert({
              id: p.id,
              user_id: userId,
              title: p.title,
              client: p.client,
              editor: p.editor,
              budget: p.budget,
              progress: p.progress,
              status: p.status,
              version: p.version,
              deadline: p.deadline,
              storage: p.storage,
              category: p.category,
              thumbnail: p.thumbnail,
              contributors: p.contributors || []
            }, { onConflict: 'id' });
          });
        }
      });
      return next;
    });
  };

  // State sync wrapper for action items
  const setActionItems: React.Dispatch<React.SetStateAction<ActionItem[]>> = (value) => {
    setActionItemsInternal((prev) => {
      const next = typeof value === 'function' ? (value as Function)(prev) : value;
      // Async sync in background
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const userId = session.user.id;
          next.forEach(async (item: ActionItem) => {
            await supabase.from('action_items').upsert({
              id: item.id,
              user_id: userId,
              title: item.title,
              description: item.description,
              status: item.status,
              type: item.type,
              budget: item.budget
            }, { onConflict: 'id' });
          });
        }
      });
      return next;
    });
  };

  // Restore initial session on mount and handle state subscription
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const email = session.user.email;
        let mappedRole: 'admin' | 'client' | 'editor' = 'client';
        const storedRole = localStorage.getItem('valkyrias_selected_role');
        if (storedRole === 'admin' || storedRole === 'editor' || storedRole === 'client') {
          mappedRole = storedRole as any;
        } else if (email === 'admin@valkyrias.co') {
          mappedRole = 'admin';
        } else if (email === 'marcus.vane@valkyrias.co') {
          mappedRole = 'editor';
        }
        setLoggedInUser(mappedRole);
        setView(currentView => {
          if (currentView === 'login' || currentView === 'landing') {
            if (mappedRole === 'admin') return 'admin';
            if (mappedRole === 'editor') return 'client';
            if (mappedRole === 'client') return 'customer';
          }
          return currentView;
        });
        loadUserData(session.user.id);
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const email = session.user.email;
        let mappedRole: 'admin' | 'client' | 'editor' = 'client';
        const storedRole = localStorage.getItem('valkyrias_selected_role');
        if (storedRole === 'admin' || storedRole === 'editor' || storedRole === 'client') {
          mappedRole = storedRole as any;
        } else if (email === 'admin@valkyrias.co') {
          mappedRole = 'admin';
        } else if (email === 'marcus.vane@valkyrias.co') {
          mappedRole = 'editor';
        }
        setLoggedInUser(mappedRole);
        setView(currentView => {
          if (currentView === 'login') {
            if (mappedRole === 'admin') return 'admin';
            if (mappedRole === 'editor') return 'client';
            if (mappedRole === 'client') return 'customer';
          }
          return currentView;
        });
        loadUserData(session.user.id);
      } else {
        setLoggedInUser(null);
        resetToDefaults();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Protect private views on active view change
  useEffect(() => {
    const checkViewAuth = async () => {
      const privateViews: ActiveView[] = ['admin', 'client', 'customer', 'checkout'];
      if (privateViews.includes(view)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setView('login');
        }
      }
    };
    checkViewAuth();
  }, [view]);

  // Set view dynamically when logged in
  const login = (role: 'admin' | 'client' | 'editor') => {
    localStorage.setItem('valkyrias_selected_role', role);
    setLoggedInUser(role);
    if (role === 'admin') setView('admin');
    else if (role === 'editor') setView('client');
    else if (role === 'client') setView('customer');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('valkyrias_selected_role');
    setLoggedInUser(null);
    setView('landing');
    resetToDefaults();
  };

  const addChatMessage = async (sender: 'editor' | 'client' | 'admin', message: string, projectId?: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let senderName = sender === 'editor' ? 'Marcus Vane' : sender === 'client' ? 'Tanishq' : 'Admin';
    if (sender === 'client' && projectId) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) senderName = proj.client;
    }
    const newId = projectId ? `chat-${projectId}-${Date.now()}` : `chat-${Date.now()}`;
    const newMsgObj = {
      id: newId,
      sender,
      senderName,
      message,
      time,
      projectId
    };

    setChatMessages((prev) => [...prev, newMsgObj]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('chat_messages').insert({
        id: newId,
        user_id: session.user.id,
        sender,
        sender_name: senderName,
        message,
        time
      });
    }
  };

  const addDeliverable = async (filename: string, size: string, projectId?: string) => {
    const newId = projectId ? `d-${projectId}-${Date.now()}` : `d-${Date.now()}`;
    const newDelivObj = {
      id: newId,
      filename,
      time: 'Just now',
      size,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvMzJ7c3cDDbAjT9rjyD_l4_KIlbT_dSLZ5krAL2TOwVVbYu5J-LzNEZkV04uKfUJ-GhSBdmPSr0R37ZKtIn4Fy_aVgrsngzVKeC9bN5ET3VTofBcE_aLgGrIWFqfvvEIT0Vem8c8t8E4WnNjB5lPwWudmjIPhyACQQgWepy9Xqni92yX2LgUzmMgxljLVz9uoImna8jlr5-CSYoIY-3C2HuIcl_xFpJlHkvZQ6Bch3JL9O3CeOkcr',
      projectId
    };

    setDeliverables((prev) => [newDelivObj, ...prev]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('deliverables').insert({
        id: newId,
        user_id: session.user.id,
        filename,
        time: newDelivObj.time,
        size,
        thumbnail: newDelivObj.thumbnail
      });
    }
  };

  const uploadDeliverable = async (file: File, projectId?: string): Promise<Deliverable | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active user session for upload");
      return null;
    }
    const userId = session.user.id;
    const newId = projectId ? `d-${projectId}-${Date.now()}` : `d-${Date.now()}`;
    const extension = file.name.split('.').pop() || 'bin';
    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const filePath = `${userId}/deliverables/${newId}/${uuid}.${extension}`;

    // Upload to Supabase Storage in "app-files" bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('app-files')
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

    const signedUrl = signedData?.signedUrl || '';
    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";

    const newDelivObj: Deliverable = {
      id: newId,
      filename: file.name,
      time: 'Just now',
      size: sizeStr,
      thumbnail: signedUrl,
      storagePath: filePath,
      projectId
    };

    // Add to local state
    setDeliverables((prev) => [newDelivObj, ...prev]);

    // Insert into deliverables database table
    const { error: dbError } = await supabase.from('deliverables').insert({
      id: newId,
      user_id: userId,
      filename: file.name,
      time: newDelivObj.time,
      size: sizeStr,
      thumbnail: filePath
    });

    if (dbError) {
      console.error("Database insert error for deliverable:", dbError);
    }

    return newDelivObj;
  };

  const deleteDeliverable = async (id: string, storagePath?: string) => {
    // 1. Remove from database
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error: dbError } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', id);
      if (dbError) {
        console.error("Failed to delete deliverable reference from database:", dbError);
      }
    }

    // 2. Remove from storage if path exists
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('app-files')
        .remove([storagePath]);
      if (storageError) {
        console.error("Failed to remove file from Supabase Storage:", storageError);
      }
    }

    // 3. Remove from local state
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>) => {
    const newId = `port-${Date.now()}`;
    const newPortObj = {
      ...item,
      id: newId
    };

    setPortfolioItems((prev) => [...prev, newPortObj]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('portfolio_items').insert({
        id: newId,
        user_id: session.user.id,
        title: item.title,
        category: item.category,
        image: item.image,
        description: item.description,
        software: item.software,
        client_name: item.clientName,
        duration: item.duration
      });
    }
  };

  const updatePlan = async (id: string, updated: Partial<Plan>) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, ...updated } : plan))
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const planToUpdate = plans.find(p => p.id === id);
      if (!planToUpdate) return;
      const fullUpdated = { ...planToUpdate, ...updated };

      await supabase
        .from('plans')
        .update({
          name: fullUpdated.name,
          price: fullUpdated.price,
          period: fullUpdated.period,
          description: fullUpdated.desc,
          features: fullUpdated.features,
          is_popular: fullUpdated.isPopular
        })
        .eq('id', id)
        .eq('user_id', session.user.id);
    }
  };

  const approveMilestone = async (projectId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const newProgress = Math.min(targetProject.progress + 25, 100);

    setProjectsInternal((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, progress: newProgress } : p))
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('projects')
        .update({ progress: newProgress })
        .eq('id', projectId)
        .eq('user_id', session.user.id);
    }
  };

  const resolveActionItem = async (id: string, action: 'resolved' | 'accepted') => {
    setActionItemsInternal((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const userId = session.user.id;
      await supabase
        .from('action_items')
        .update({ status: action })
        .eq('id', id)
        .eq('user_id', userId);

      const foundItem = actionItems.find((item) => item.id === id);
      if (action === 'accepted' && foundItem && foundItem.type === 'order') {
        const budget = foundItem.budget || 15000;
        const newProjId = `p-${Date.now()}`;
        const newProjectObj: Project = {
          id: newProjId,
          title: foundItem.title,
          client: 'Corporate Hub',
          editor: 'Marcus Vane',
          budget,
          progress: 10,
          status: 'Active',
          version: 'v1.0_Draft',
          deadline: '30 Days',
          storage: '0.1 TB',
          category: 'Thumbnail Design',
          thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBReHYMQojs2TFkxz3bnDCQCH2vKXMgyMnjWtmm1wp320kUku1gr-PqCc7UA9ESWbeX2f0MPLO_y1jjxYcH7C8Qo46-4ilG7A4kPJX4vdmxrW3oB_P2D4FsEDpPBxbcdu_ztTk9E7Uu8jANL7zX8K9318eYKfYJ93Lke2xbx9BrAHPxcYhOO0UKI6xbftmSbEVtWgjI0HkrlKgti7P8V1LsK7evWfXF6D_93iezqtKork7GrsZo7HoV',
          contributors: ['Marcus Vane']
        };

        setProjectsInternal((prev) => [...prev, newProjectObj]);

        await supabase.from('projects').insert({
          id: newProjId,
          user_id: userId,
          title: newProjectObj.title,
          client: newProjectObj.client,
          editor: newProjectObj.editor,
          budget: newProjectObj.budget,
          progress: newProjectObj.progress,
          status: newProjectObj.status,
          version: newProjectObj.version,
          deadline: newProjectObj.deadline,
          storage: newProjectObj.storage,
          category: newProjectObj.category,
          thumbnail: newProjectObj.thumbnail,
          contributors: newProjectObj.contributors
        });

        const newTotalContract = totalContract + budget;
        setTotalContract(newTotalContract);

        await supabase
          .from('app_settings')
          .update({ total_contract: newTotalContract })
          .eq('id', userId);
      }
    }
  };

  const processPayment = async (amount: number) => {
    const newPaidToDate = paidToDate + amount;
    const newNextInvoice = Math.max(0, nextInvoice - amount);

    setPaidToDate(newPaidToDate);
    setNextInvoice(newNextInvoice);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('app_settings')
        .update({
          paid_to_date: newPaidToDate,
          next_invoice: newNextInvoice
        })
        .eq('id', session.user.id);
    }
  };

  const customSetStorageUsed = async (val: number) => {
    setStorageUsed(val);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('app_settings')
        .update({ storage_used: val })
        .eq('id', session.user.id);
    }
  };

  const customSetActivePlan = async (plan: string | null) => {
    setActivePlan(plan);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('app_settings')
        .update({ active_plan: plan })
        .eq('id', session.user.id);
    }
  };

  const addNote = async (title: string, content: string, category: string = 'General'): Promise<{ success: boolean; error?: string }> => {
    const isPro = activePlan !== null && activePlan !== 'plan1' && activePlan !== 'Asset Starter';
    
    // Live count verification from Supabase to prevent frontend bypass
    let currentCount = notes.length;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      try {
        const { count, error } = await supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        
        if (!error && count !== null) {
          currentCount = count;
        }
      } catch (e) {
        console.warn("Could not fetch notes count from Supabase, using local state:", e);
      }
    }

    if (!isPro && currentCount >= 3) {
      console.warn("Create blocked: Free plan limit reached (count: " + currentCount + ").");
      return { 
        success: false, 
        error: "Free plan limit reached. Upgrade to Pro to create unlimited notes." 
      };
    }

    const newNoteId = `n-${Date.now()}`;
    const newNote: Note = {
      id: newNoteId,
      title,
      content,
      category,
      is_ai_summarized: false,
      created_at: new Date().toISOString()
    };

    setNotes(prev => [...prev, newNote]);

    if (session) {
      try {
        await supabase.from('notes').insert({
          id: newNoteId,
          user_id: session.user.id,
          title,
          content,
          category,
          is_ai_summarized: false
        });
      } catch (e) {
        console.error("Database note save failed:", e);
      }
    }

    return { success: true };
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        await supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);
      } catch (e) {
        console.error("Failed to delete note from Supabase:", e);
      }
    }
  };

  return (
    <StateContext.Provider
      value={{
        view,
        setView,
        loggedInUser,
        login,
        logout,
        projects,
        setProjects,
        actionItems,
        setActionItems,
        chatMessages,
        addChatMessage,
        deliverables,
        addDeliverable,
        uploadDeliverable,
        deleteDeliverable,
        portfolioItems,
        addPortfolioItem,
        notes,
        addNote,
        deleteNote,
        totalContract,
        paidToDate,
        nextInvoice,
        activePlan,
        setActivePlan: customSetActivePlan,
        storageUsed,
        storageTotal,
        setStorageUsed: customSetStorageUsed,
        approveMilestone,
        resolveActionItem,
        processPayment,
        plans,
        setPlans,
        updatePlan
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
