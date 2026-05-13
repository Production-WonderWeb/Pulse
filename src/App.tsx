/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  LayoutDashboard, 
  Warehouse, 
  Briefcase, 
  Clock, 
  Calendar, 
  Settings,
  Bell,
  Plus,
  User as UserIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Wrench,
  Users,
  LocateFixed,
  FileText,
  Download,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Truck,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { X, Trash2, Edit3, Save, Scan, Upload } from 'lucide-react';
import { GanttChart } from './components/GanttChart';
import { ImageUpload } from './components/ImageUpload';
import { TimeClockView } from './components/TimeClockView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { CalendarView } from './components/CalendarView';
import { QRCodeScanner, DownloadQRCode } from './components/QRCodeManager';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format, parseISO, min as minDateFn, max as maxDateFn } from 'date-fns';
import { MaintenanceService } from './services/MaintenanceService';
import { 
  User, 
  Equipment, 
  Project, 
  MaintenanceTask, 
  UserRole,
  Client,
  Vendor,
  Freelancer,
  HiredEquipment,
  ProjectResourceAssignment,
  LeaveRequest,
  AttendanceRecord,
  CalendarConfig,
  LeaveType,
  LeaveStatus
} from './types/index';
import { cn, formatDate } from './lib/utils';

// --- Data Utilities ---
const emptyData = [
  { name: 'Mon', hours: 0 },
  { name: 'Tue', hours: 0 },
  { name: 'Wed', hours: 0 },
  { name: 'Thu', hours: 0 },
  { name: 'Fri', hours: 0 },
  { name: 'Sat', hours: 0 },
  { name: 'Sun', hours: 0 },
];

const PulseLogo = ({ className }: { className?: string }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-brand-blue text-white font-black text-xs", className)}>
        W
      </div>
    );
  }

  return (
    <img 
      src="https://wonderweb.ae/wp-content/uploads/2023/10/WonderWebLogo-Colorful.png" 
      alt="WonderWeb Logo" 
      className={className}
      onError={(e) => {
        const target = e.currentTarget;
        const fallbackUrl = "https://wonderweb.ae/wp-content/uploads/2021/04/WonderWeb-Logo.png";
        if (target.src !== fallbackUrl) {
          target.src = fallbackUrl;
        } else {
          setError(true);
        }
      }}
    />
  );
};

// --- PDF Export Utility ---
const generateProjectPDF = async (project: Project, client?: Client, assignments?: ProjectResourceAssignment[], resources?: {
  users: User[],
  equipment: Equipment[],
  freelancers: Freelancer[],
  hired: any[]
}) => {
  const doc = new jsPDF();
  const primaryColor = '#3b82f6';
  const secondaryColor = '#6b7280';
  
  // Brand Header
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT MOBILIZATION BRIEF', 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`REF: ${project.id} | ${format(new Date(), 'dd MMM yyyy')}`, 105, 32, { align: 'center' });

  // Project Info
  doc.setTextColor('#1f2937');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PROJECT SPECIFICATIONS', 15, 55);
  doc.line(15, 57, 195, 57);

  doc.setFontSize(10);
  doc.text('PROJECT NAME:', 15, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(project.name, 50, 65);

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT:', 15, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.name || 'N/A', 50, 72);

  if (project.clientContactId) {
    const contact = client?.contacts?.find(c => c.id === project.clientContactId);
    if (contact) {
      doc.setFont('helvetica', 'bold');
      doc.text('CONTACT:', 15, 79);
      doc.setFont('helvetica', 'normal');
      doc.text(`${contact.name} (${contact.role}) | ${contact.email} | ${contact.phone}`, 50, 79);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.text('CATEGORY:', 15, 86);
  doc.setFont('helvetica', 'normal');
  doc.text(project.category, 50, 86);

  doc.setFont('helvetica', 'bold');
  doc.text('LOCATION:', 15, 93);
  doc.setFont('helvetica', 'normal');
  doc.text(project.location.address, 50, 93);

  if (project.location.mapLink) {
    doc.setFont('helvetica', 'bold');
    doc.text('MAP LINK:', 15, 100);
    doc.setTextColor(primaryColor);
    doc.text(project.location.mapLink, 50, 100, { maxWidth: 140 });
    doc.setTextColor('#1f2937');
  }

  // Event Timeline
  let yPos = 115;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. OPERATIONAL TIMELINE', 15, yPos);
  doc.line(15, yPos + 2, 195, yPos + 2);
  yPos += 12;

  doc.setFontSize(9);
  if (project.eventDates && project.eventDates.length > 0) {
    project.eventDates.forEach((ed) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(ed.label.toUpperCase() || 'PHASE', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDate(ed.date)} | ${ed.startTime} - ${ed.endTime}`, 70, yPos);
      yPos += 7;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(project.startDate)} - ${formatDate(project.endDate)}`, 15, yPos);
    yPos += 7;
  }

  // Resource Allocation
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RESOURCE MATRIX', 15, yPos);
  doc.line(15, yPos + 2, 195, yPos + 2);
  yPos += 12;

  doc.setFontSize(8);
  doc.setFillColor(243, 244, 246);
  doc.rect(15, yPos - 5, 180, 7, 'F');
  doc.text('RESOURCE', 18, yPos);
  doc.text('TYPE', 70, yPos);
  doc.text('DESCRIPTION / ASSIGNMENT', 110, yPos);
  yPos += 10;

  assignments?.forEach((ass) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    let resourceName = 'Unknown';
    let detail = '';

    if (ass.resourceType === 'staff') {
      resourceName = resources?.users.find(u => u.id === ass.resourceId)?.name || 'Staff';
    } else if (ass.resourceType === 'equipment') {
      resourceName = resources?.equipment.find(e => e.id === ass.resourceId)?.name || 'Asset';
    } else if (ass.resourceType === 'freelancer') {
      resourceName = resources?.freelancers.find(f => f.id === ass.resourceId)?.name || 'Freelancer';
    } else if (ass.resourceType === 'vendor_service') {
      const vendor = resources?.hired.find(v => v.id === ass.resourceId);
      resourceName = vendor?.name || 'Vendor';
      const service = vendor?.services?.find((s: any) => s.id === ass.serviceId);
      detail = service ? `${service.name} (${service.type})` : '';
    }

    const edLabel = ass.dateId ? project.eventDates?.find(d => d.id === ass.dateId)?.label : 'Full Project';

    doc.setFont('helvetica', 'bold');
    doc.text(resourceName, 18, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text((ass.resourceType || '').split('_').join(' ').toUpperCase(), 70, yPos);
    doc.text(`${detail ? detail + ' | ' : ''}${edLabel || 'Assigned'}`, 110, yPos);
    
    yPos += 7;
    doc.setDrawColor(243, 244, 246);
    doc.line(15, yPos - 3, 195, yPos - 3);
    yPos += 4;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor);
    doc.text(`Generated by WONDERWEB PULSE | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_Mobilization_Brief.pdf`);
};

// --- Sub-components ---

const BottomNav = ({ activeTab, setActiveTab, role }: { activeTab: string, setActiveTab: (t: string) => void, role: UserRole }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dash', roles: ['Administrator', 'Admin', 'Manager'] as UserRole[] },
    { id: 'inventory', icon: Warehouse, label: 'Fleet', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'resources', icon: Users, label: 'CRM', roles: ['Administrator', 'Admin', 'Manager'] as UserRole[] },
    { id: 'projects', icon: Briefcase, label: 'Jobs', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'timeclock', icon: Clock, label: 'Time', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'calendar', icon: Calendar, label: 'Cal', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'admin', icon: Settings, label: 'Adm', roles: ['Administrator', 'Admin'] as UserRole[] },
  ].filter(t => t.roles.includes(role));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-morphism border-t border-[var(--border-color)] px-2 pb-safe pt-2 z-50 rounded-t-3xl shadow-2xl">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            id={`nav-tab-${tab.id}`}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-all relative",
              activeTab === tab.id ? "text-brand-blue scale-110" : "text-[var(--text-secondary)]"
            )}
          >
            <tab.icon size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute -bottom-1 w-6 h-1 bg-brand-blue rounded-full shadow-lg shadow-brand-blue/40"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

const Sidebar = ({ activeTab, setActiveTab, role, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, role: UserRole, onLogout: () => void }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Administrator', 'Admin', 'Manager'] as UserRole[] },
    { id: 'inventory', icon: Warehouse, label: 'Fleet', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'resources', icon: Users, label: 'CRM Hub', roles: ['Administrator', 'Admin', 'Manager'] as UserRole[] },
    { id: 'projects', icon: Briefcase, label: 'Projects', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'timeclock', icon: Clock, label: 'Time Clock', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'calendar', icon: Calendar, label: 'Calendar', roles: ['Administrator', 'Admin', 'Manager', 'Staff'] as UserRole[] },
    { id: 'admin', icon: Settings, label: 'Settings', roles: ['Administrator', 'Admin'] as UserRole[] },
  ].filter(t => t.roles.includes(role));

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] h-screen sticky top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/5 overflow-hidden">
          <PulseLogo className="w-full h-full p-1" />
        </div>
        <h1 className="text-xl font-black tracking-tighter text-[var(--text-primary)]">WONDERWEB PULSE</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === tab.id 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            )}
          >
            <tab.icon size={20} className={cn(
              "transition-transform duration-200",
              activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="text-sm font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)] mt-auto">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-bold text-sm"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const Header = ({ title, user, theme, toggleTheme, onLogout, onUpdateUser }: { title: string, user: User, theme: 'light' | 'dark', toggleTheme: () => void, onLogout?: () => void, onUpdateUser?: (updated: User) => void }) => {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-xl px-4 md:px-8 py-4 flex justify-between items-center border-b border-[var(--border-color)]">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
           <PulseLogo className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-black text-[var(--text-primary)] uppercase tracking-tight leading-none">{title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] bg-brand-green/10 text-brand-green px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{user.role}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Active System</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">{user.name}</span>
          <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">{user.email}</span>
        </div>

        <div 
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)] shadow-sm cursor-pointer overflow-hidden relative group"
        >
          {user.imageUrl ? (
            <img 
              src={user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff`} 
              alt={user.name} 
              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <UserIcon size={20} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] p-1.5 rounded-xl border border-[var(--border-color)]">
          <button 
            onClick={toggleTheme}
            className="p-1.5 text-[var(--text-secondary)] hover:text-brand-blue hover:bg-[var(--bg-primary)] rounded-lg transition-all"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <BarChart3 size={18} /> : <BarChart3 size={18} />}
          </button>
          <button 
            className="p-1.5 text-[var(--text-secondary)] hover:text-brand-orange hover:bg-[var(--bg-primary)] rounded-lg transition-all relative"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange border-2 border-[var(--bg-secondary)] rounded-full"></span>
          </button>
        </div>
      </div>

      {showRoleSwitcher && (
        <div className="absolute top-16 right-4 md:right-8 bg-[var(--bg-secondary)] shadow-2xl border border-[var(--border-color)] rounded-2xl p-2 z-50 w-64 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-[var(--border-color)]">
             <ImageUpload 
               label="Profile Avatar"
               value={user.imageUrl || ''}
               onChange={(val) => {
                  if (onUpdateUser) {
                    onUpdateUser({ ...user, imageUrl: val });
                  }
               }}
               maxSizeInKB={5120}
             />
          </div>
          <div className="pt-2 border-t border-[var(--border-color)] md:hidden">
            <button 
              onClick={onLogout}
              className="w-full text-left px-4 py-3 text-red-500 font-bold text-xs uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

// --- Resources View for Backend Data ---
const ResourcesView = ({ 
  clients, 
  vendors, 
  freelancers,
  staff,
  onUpdateStaff,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onAddFreelancer,
  onUpdateFreelancer,
  onDeleteFreelancer
}: { 
  clients: Client[], 
  vendors: Vendor[], 
  freelancers: Freelancer[],
  staff: User[],
  onUpdateStaff: (s: User) => void,
  onAddClient: (c: Omit<Client, 'id'>) => void,
  onUpdateClient: (c: Client) => void,
  onDeleteClient: (id: string) => void,
  onAddVendor: (v: Omit<Vendor, 'id'>) => void,
  onUpdateVendor: (v: Vendor) => void,
  onDeleteVendor: (id: string) => void,
  onAddFreelancer: (f: Omit<Freelancer, 'id'>) => void,
  onUpdateFreelancer: (f: Freelancer) => void,
  onDeleteFreelancer: (id: string) => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'vendors' | 'freelancers' | 'staff'>('staff');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [clientForm, setClientForm] = useState<Omit<Client, 'id'>>({ 
    name: '', 
    contacts: [{ id: '1', name: '', role: '', email: '', phone: '' }], 
    createdAt: new Date().toISOString() 
  });
  const [vendorForm, setVendorForm] = useState<Omit<Vendor, 'id'>>({ 
    name: '', 
    contacts: [{ id: '1', name: '', role: '', email: '', phone: '' }], 
    services: [{ id: '1', name: '', type: 'Service', description: '' }] 
  });
  const [freelancerForm, setFreelancerForm] = useState<Omit<Freelancer, 'id'>>({ name: '', role: '', email: '', phone: '', dailyRate: 0, notes: '', contactDetails: '' });
  const [staffForm, setStaffForm] = useState<Partial<User>>({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactRelation: ''
  });

  const filteredItems = (() => {
    const s = search.toLowerCase();
    if (activeSubTab === 'clients') return clients.filter(c => c.name.toLowerCase().includes(s) || (c.contacts || []).some(ct => ct.name.toLowerCase().includes(s)));
    if (activeSubTab === 'vendors') return vendors.filter(v => v.name.toLowerCase().includes(s) || (v.contacts || []).some(ct => ct.name.toLowerCase().includes(s)));
    if (activeSubTab === 'staff') return staff.filter(f => f.name.toLowerCase().includes(s) || (f.role || '').toLowerCase().includes(s) || (f.email || '').toLowerCase().includes(s));
    return freelancers.filter(f => f.name.toLowerCase().includes(s) || f.role.toLowerCase().includes(s));
  })();

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeSubTab === 'clients') setClientForm({ ...item });
    if (activeSubTab === 'vendors') setVendorForm({ ...item });
    if (activeSubTab === 'freelancers') setFreelancerForm({ ...item, dailyRate: Number(item.dailyRate) });
    if (activeSubTab === 'staff') setStaffForm({ 
      name: item.name || '',
      phone: item.phone || '',
      whatsapp: item.whatsapp || '',
      address: item.address || '',
      emergencyContact: item.emergencyContact || '',
      emergencyContactName: item.emergencyContactName || '',
      emergencyContactRelation: item.emergencyContactRelation || '',
      imageUrl: item.imageUrl || item.avatar_url || ''
    });
    setIsModalOpen(true);
  };

  const resetForms = () => {
    setEditingItem(null);
    setClientForm({ name: '', contacts: [{ id: '1', name: '', role: '', email: '', phone: '' }], createdAt: new Date().toISOString() });
    setVendorForm({ name: '', contacts: [{ id: '1', name: '', role: '', email: '', phone: '' }], services: [{ id: '1', name: '', type: 'Service', description: '' }] });
    setFreelancerForm({ name: '', role: '', email: '', phone: '', dailyRate: 0, notes: '', contactDetails: '' });
    setStaffForm({
      name: '',
      phone: '',
      whatsapp: '',
      address: '',
      emergencyContact: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      imageUrl: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSubTab === 'clients') {
      editingItem ? onUpdateClient({ ...clientForm, id: editingItem.id } as Client) : onAddClient(clientForm);
    } else if (activeSubTab === 'vendors') {
      editingItem ? onUpdateVendor({ ...vendorForm, id: editingItem.id } as Vendor) : onAddVendor(vendorForm);
    } else if (activeSubTab === 'staff') {
      if (editingItem) onUpdateStaff({ ...editingItem, ...staffForm });
    } else {
      editingItem ? onUpdateFreelancer({ ...freelancerForm, id: editingItem.id } as Freelancer) : onAddFreelancer(freelancerForm);
    }
    setIsModalOpen(false);
    resetForms();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this record?')) {
      if (activeSubTab === 'clients') onDeleteClient(id);
      if (activeSubTab === 'vendors') onDeleteVendor(id);
      if (activeSubTab === 'freelancers') onDeleteFreelancer(id);
    }
  };

  const renderCard = (item: any) => {
    const isClient = activeSubTab === 'clients';
    const isVendor = activeSubTab === 'vendors';
    const isFreelancer = activeSubTab === 'freelancers';
    const isStaff = activeSubTab === 'staff';

    return (
      <div 
        key={item.id}
        className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-[var(--border-color)] space-y-4"
      >
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center text-brand-blue border border-[var(--border-color)] overflow-hidden shrink-0">
              {isStaff && (item.imageUrl || item.avatar_url) ? (
                <img 
                  src={item.imageUrl || item.avatar_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=2563eb&color=fff`;
                  }}
                />
              ) : isClient ? (
                <UserIcon size={18} />
              ) : isVendor ? (
                <Truck size={18} />
              ) : isStaff ? (
                <UserIcon size={18} />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{item.name}</h3>
              <p className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
                {isClient ? `${(item.contacts || []).length} Contacts` : isVendor ? `${(item.contacts || []).length} Contacts | ${(item.services || []).length} Services` : item.role}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleEdit(item)}
              className="p-2 text-[var(--text-secondary)] hover:text-brand-blue transition-colors"
            >
              <Edit3 size={16} />
            </button>
            {!isStaff && (
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            {isStaff && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg",
                  item.isOnboarded ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"
                )}>
                  {item.isOnboarded ? 'VERIFIED' : 'PENDING'}
                </span>
                <span className="text-[8px] bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-1 rounded-lg font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  {item.role}
                </span>
              </div>
            )}
          </div>
        </div>

        {isStaff && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-brand-blue/60" />
              <span className="text-[10px] text-[var(--text-primary)] font-bold truncate">{item.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-brand-blue/60" />
              <span className="text-[10px] text-[var(--text-primary)] font-bold">{item.phone || 'NO PHONE'}</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <MapPin size={12} className="text-brand-blue/60" />
              <span className="text-[10px] text-[var(--text-secondary)] font-medium line-clamp-1">{item.address || 'NO ADDRESS PROVIDED'}</span>
            </div>
             <div className="flex flex-col gap-1 sm:col-span-2 pt-2 border-t border-[var(--border-color)]/20 mt-1">
                <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={10} />
                  Emergency: {item.emergencyContactName || 'EMERGENCY CONTACT'} ({item.emergencyContactRelation || 'RELATION'}) - {item.emergencyContact || 'MISSING'}
                </span>
                {item.whatsapp && item.whatsapp !== item.phone && (
                  <span className="text-[8px] font-black text-brand-green uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare size={10} />
                    WhatsApp: {item.whatsapp}
                  </span>
                )}
             </div>
          </div>
        )}

        {!isFreelancer && !isStaff && (
          <div className="space-y-3">
            {(item.contacts || []).slice(0, 1).map((ct: any) => (
              <div key={ct.id} className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-brand-grey" />
                  <span className="text-[10px] text-[var(--text-secondary)] truncate">{ct.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-brand-grey" />
                  <span className="text-[10px] text-[var(--text-secondary)]">{ct.phone}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isFreelancer && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-brand-grey" />
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{item.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-brand-grey" />
              <span className="text-[10px] text-[var(--text-secondary)]">{item.phone}</span>
            </div>
          </div>
        )}

        {isFreelancer && (
          <div className="pt-3 border-t border-[var(--border-color)]/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Daily Rate</span>
            <span className="text-xs font-black text-brand-green">AED {item.dailyRate}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] sticky top-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
          {(['staff', 'clients', 'vendors', 'freelancers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveSubTab(tab); setSearch(''); }}
              className={cn(
                "flex-1 py-2 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
                activeSubTab === tab ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-3 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder={`SEARCH ${activeSubTab.toUpperCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-brand-blue transition-colors text-[var(--text-primary)]"
            />
          </div>
          <button 
            onClick={() => { resetForms(); setIsModalOpen(true); }}
            className="bg-brand-blue text-white px-4 rounded-2xl shadow-xl shadow-brand-blue/10 flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              {renderCard(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); resetForms(); }}
        title={`${editingItem ? 'Update' : 'Add'} ${(activeSubTab || '').slice(0, -1)}`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Company/Full Name</label>
            <input 
              required
              value={activeSubTab === 'clients' ? clientForm.name : activeSubTab === 'vendors' ? vendorForm.name : activeSubTab === 'staff' ? staffForm.name : freelancerForm.name}
              onChange={(e) => {
                if (activeSubTab === 'clients') setClientForm({...clientForm, name: e.target.value});
                if (activeSubTab === 'vendors') setVendorForm({...vendorForm, name: e.target.value});
                if (activeSubTab === 'freelancers') setFreelancerForm({...freelancerForm, name: e.target.value});
                if (activeSubTab === 'staff') setStaffForm({...staffForm, name: e.target.value});
              }}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
              placeholder="Name"
            />
          </div>

          {activeSubTab === 'staff' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                    placeholder="+971 -- --- ----"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">WhatsApp</label>
                  <input 
                    value={staffForm.whatsapp}
                    onChange={(e) => setStaffForm({...staffForm, whatsapp: e.target.value})}
                    placeholder="+971 -- --- ----"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Residential Address</label>
                <textarea 
                  required
                  value={staffForm.address}
                  onChange={(e) => setStaffForm({...staffForm, address: e.target.value})}
                  placeholder="Full Address"
                  rows={2}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue resize-none"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]/20">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-orange ml-1">Emergency Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Contact Name</label>
                    <input 
                      required
                      value={staffForm.emergencyContactName}
                      onChange={(e) => setStaffForm({...staffForm, emergencyContactName: e.target.value})}
                      placeholder="Jane Doe"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Relationship</label>
                    <input 
                      required
                      value={staffForm.emergencyContactRelation}
                      onChange={(e) => setStaffForm({...staffForm, emergencyContactRelation: e.target.value})}
                      placeholder="Spouse, etc."
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Emergency Phone</label>
                  <input 
                    required
                    value={staffForm.emergencyContact}
                    onChange={(e) => setStaffForm({...staffForm, emergencyContact: e.target.value})}
                    placeholder="+971 -- --- ----"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <ImageUpload 
                label="Staff Avatar"
                value={staffForm.imageUrl}
                onChange={(val) => setStaffForm({...staffForm, imageUrl: val})}
                maxSizeInKB={5120}
              />
            </div>
          )}

          {(activeSubTab === 'clients' || activeSubTab === 'vendors') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Contacts</h4>
                <button 
                  type="button"
                  onClick={() => {
                    const newContact = { id: Math.random().toString(), name: '', role: '', email: '', phone: '' };
                    if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: [...clientForm.contacts, newContact]});
                    else setVendorForm({...vendorForm, contacts: [...vendorForm.contacts, newContact]});
                  }}
                  className="p-1 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="space-y-4">
                {((activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts) || []).map((contact, idx) => (
                  <div key={contact.id} className="p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] space-y-3 relative">
                    <button 
                      type="button"
                      onClick={() => {
                        const currentContacts = (activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts) || [];
                        const newList = currentContacts.filter((_, i) => i !== idx);
                        if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: newList});
                        else setVendorForm({...vendorForm, contacts: newList});
                      }}
                      className="absolute top-2 right-2 text-red-500 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        required
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) => {
                          const newList = [...(activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts)];
                          newList[idx].name = e.target.value;
                          if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: newList});
                          else setVendorForm({...vendorForm, contacts: newList});
                        }}
                        className="bg-transparent border-b border-[var(--border-color)] py-1 text-xs focus:border-brand-blue outline-none"
                      />
                      <input 
                        required
                        placeholder="Role"
                        value={contact.role}
                        onChange={(e) => {
                          const newList = [...(activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts)];
                          newList[idx].role = e.target.value;
                          if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: newList});
                          else setVendorForm({...vendorForm, contacts: newList});
                        }}
                        className="bg-transparent border-b border-[var(--border-color)] py-1 text-xs focus:border-brand-blue outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        required
                        type="email"
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => {
                          const newList = [...(activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts)];
                          newList[idx].email = e.target.value;
                          if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: newList});
                          else setVendorForm({...vendorForm, contacts: newList});
                        }}
                        className="bg-transparent border-b border-[var(--border-color)] py-1 text-xs focus:border-brand-blue outline-none"
                      />
                      <input 
                        required
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) => {
                          const newList = [...(activeSubTab === 'clients' ? clientForm.contacts : vendorForm.contacts)];
                          newList[idx].phone = e.target.value;
                          if (activeSubTab === 'clients') setClientForm({...clientForm, contacts: newList});
                          else setVendorForm({...vendorForm, contacts: newList});
                        }}
                        className="bg-transparent border-b border-[var(--border-color)] py-1 text-xs focus:border-brand-blue outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'vendors' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Offerings (Service/Equipment)</h4>
                <button 
                  type="button"
                  onClick={() => setVendorForm({...vendorForm, services: [...vendorForm.services, { id: Math.random().toString(), name: '', type: 'Service' }]})}
                  className="p-1 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {(vendorForm.services || []).map((service, idx) => (
                  <div key={service.id} className="flex gap-2 items-center">
                    <select 
                      value={service.type}
                      onChange={(e) => {
                        const newList = [...vendorForm.services];
                        newList[idx].type = e.target.value as any;
                        setVendorForm({...vendorForm, services: newList});
                      }}
                      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2 py-2 text-[10px] outline-none"
                    >
                      <option value="Service">SVC</option>
                      <option value="Equipment">EQ</option>
                    </select>
                    <input 
                      required
                      placeholder="e.g. Crane Rental"
                      value={service.name}
                      onChange={(e) => {
                        const newList = [...vendorForm.services];
                        newList[idx].name = e.target.value;
                        setVendorForm({...vendorForm, services: newList});
                      }}
                      className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs focus:border-brand-blue outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => setVendorForm({...vendorForm, services: (vendorForm.services || []).filter((_, i) => i !== idx)})}
                      className="text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'freelancers' && (
             <>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Role</label>
                  <input 
                    required
                    value={freelancerForm.role}
                    onChange={(e) => setFreelancerForm({...freelancerForm, role: e.target.value})}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                    placeholder="Stage Tech"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Daily Rate (AED)</label>
                  <input 
                    required
                    type="number"
                    value={freelancerForm.dailyRate}
                    onChange={(e) => setFreelancerForm({...freelancerForm, dailyRate: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Email</label>
                  <input required type="email" value={freelancerForm.email} onChange={(e) => setFreelancerForm({...freelancerForm, email: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Phone</label>
                  <input required type="tel" value={freelancerForm.phone} onChange={(e) => setFreelancerForm({...freelancerForm, phone: e.target.value})} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs" />
                </div>
              </div>
             </>
          )}

          <button 
            type="submit"
            className="w-full bg-brand-blue text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] transition-all mt-4"
          >
            {editingItem ? 'Execute Update' : 'Initialize Record'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- View Components ---

const ProjectsView = ({ 
  role, 
  projects, 
  clients,
  users,
  equipment,
  vendors,
  freelancers,
  assignments,
  onUpdateAssignments,
  onAdd, 
  onUpdate, 
  onDelete 
}: { 
  role: UserRole, 
  projects: Project[],
  clients: Client[],
  users: User[],
  equipment: Equipment[],
  vendors: Vendor[],
  freelancers: Freelancer[],
  assignments: ProjectResourceAssignment[],
  onUpdateAssignments: (projectId: string, a: Omit<ProjectResourceAssignment, 'id' | 'projectId'>[]) => void,
  onAdd: (p: Omit<Project, 'id'>) => void,
  onUpdate: (p: Project) => void,
  onDelete: (id: string) => void
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState<Omit<Project, 'id' | 'tasks'>>({
    name: '',
    clientId: '',
    clientContactId: '',
    category: '',
    description: '',
    location: { address: '', mapLink: '' },
    status: 'planning',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    eventDates: [{ id: '1', label: 'Main Event', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '18:00' }],
    timingNotes: '',
    assignedStaff: [],
    imageUrl: ''
  });

  const [projectAssignments, setProjectAssignments] = useState<Omit<ProjectResourceAssignment, 'id' | 'projectId'>[]>([]);

  const filteredProjects = useMemo(() => projects.filter(p => {
    const searchLower = search.toLowerCase();
    const projectName = (p.name || '').toLowerCase();
    const clientName = (clients.find(c => c.id === p.clientId)?.name || '').toLowerCase();
    
    const matchesSearch = projectName.includes(searchLower) || clientName.includes(searchLower);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [projects, search, clients, statusFilter]);

  const handleExportPDF = (project: Project) => {
    const client = clients.find(c => c.id === project.clientId);
    const projAssignments = assignments.filter(a => a.projectId === project.id);
    generateProjectPDF(project, client, projAssignments, {
      users,
      equipment,
      freelancers,
      hired: vendors
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectId = editingProject ? editingProject.id : `PRJ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Calculate min/max dates from eventDates for summary
    const dates = (formData.eventDates || []).map(d => d.date).filter(Boolean);
    const sortedDates = dates.sort();
    const startDate = sortedDates[0] || formData.startDate;
    const endDate = sortedDates[sortedDates.length - 1] || formData.endDate;

    const newProject: Project = { 
      ...formData, 
      startDate,
      endDate,
      id: projectId 
    } as Project;

    if (editingProject) {
      onUpdate(newProject);
    } else {
      onAdd(newProject);
    }

    // Update global assignments via the new robust handler
    onUpdateAssignments(projectId, projectAssignments);

    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      ...project,
      clientContactId: project.clientContactId || '',
      description: project.description || '',
      location: { ...project.location },
      eventDates: (project.eventDates && project.eventDates.length > 0) ? [...project.eventDates] : [{ id: '1', label: 'Main Event', date: project.startDate, startTime: '09:00', endTime: '18:00' }],
      timingNotes: project.timingNotes || '',
      assignedStaff: [...(project.assignedStaff || [])],
      imageUrl: project.imageUrl || '',
      tasks: project.tasks || []
    });
    setProjectAssignments(assignments.filter(a => a.projectId === project.id).map(({id, projectId, ...rest}) => rest));
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setSearch('');
    setStatusFilter('all');
    setFormData({
      name: '',
      clientId: '',
      clientContactId: '',
      category: '',
      description: '',
      location: { address: '', mapLink: '' },
      status: 'planning',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      eventDates: [{ id: '1', label: 'Main Event', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '18:00' }],
      timingNotes: '',
      assignedStaff: [],
      tasks: [],
      imageUrl: ''
    });
    setProjectAssignments([]);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const headers = ['id', 'name', 'clientId', 'clientContactId', 'category', 'status', 'startDate', 'endDate', 'description', 'imageUrl'];
    const csvContent = [
      headers.join(','),
      ...projects.map(p => headers.map(h => `"${(p as any)[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const newItems = lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const item: any = {};
        headers.forEach((h, i) => {
          item[h] = values[i];
        });
        return item as Project;
      });

      newItems.forEach(item => {
        if (item.id && projects.some(p => p.id === item.id)) {
          onUpdate(item);
        } else {
          const { id, ...rest } = item;
          // default missing info
          rest.location = rest.location || { address: '', mapLink: '' };
          onAdd(rest);
        }
      });
      alert(`Imported ${newItems.length} projects successfully.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-3 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="SEARCH PROJECTS OR CLIENTS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-brand-blue transition-colors text-[var(--text-primary)]"
            />
          </div>
          {(role === 'Administrator' || role === 'Manager') && (
            <>
              <button 
                onClick={handleExportCSV}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 rounded-2xl transition-colors hover:border-brand-blue flex items-center justify-center"
                title="Export CSV"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 rounded-2xl transition-colors hover:border-brand-blue flex items-center justify-center"
                title="Import CSV"
              >
                <Upload size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                accept=".csv" 
                className="hidden" 
              />
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-brand-blue text-white px-4 rounded-2xl shadow-xl shadow-brand-blue/10 flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'planning', 'active', 'on-hold', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                statusFilter === status 
                  ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20" 
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-brand-blue/30"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-[var(--bg-secondary)] rounded-3xl border-2 border-dashed border-[var(--border-color)]">
              <div className="w-16 h-16 bg-[var(--bg-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
                <Briefcase size={32} className="text-[var(--text-secondary)] opacity-20" />
              </div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">No projects detected</h3>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-[0.1em] mt-2 max-w-[200px] mx-auto leading-relaxed">
                {projects.length > 0 
                  ? "Adjust filters or search parameters to reveal encrypted project data."
                  : "The project database is currently empty. Initialize your first operation."}
              </p>
              {projects.length > 0 && (
                <button 
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="mt-6 px-6 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : filteredProjects.map(project => {
            const client = clients.find(c => c.id === project.clientId);
            const contact = client?.contacts?.find(ct => ct.id === project.clientContactId);
            const projAssignments = assignments.filter(a => a.projectId === project.id);
            
            return (
              <div 
                key={project.id}
                className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-sm"
              >
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 overflow-hidden shrink-0">
                        {project.imageUrl ? (
                          <img 
                            src={project.imageUrl || `https://picsum.photos/seed/${project.id}/400/300`} 
                            alt={project.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <Briefcase size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">{project.name}</h3>
                        <p className="text-[9px] text-brand-blue font-black uppercase tracking-widest">
                          {client?.name} {contact ? `(${contact.name})` : ''}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 text-[8px] font-black rounded border uppercase tracking-widest",
                      project.status === 'active' ? "bg-brand-green/10 text-brand-green border-brand-green/20" : 
                      project.status === 'planning' ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" : 
                      "bg-brand-grey/10 text-brand-grey border-brand-grey/20"
                    )}>
                      {project.status}
                    </div>
                  </div>

                  <div className="space-y-2 py-3 border-y border-[var(--border-color)]/30">
                    <div className="flex items-center gap-2">
                      <MapPin size={10} className="text-brand-grey" />
                      <span className="text-[9px] font-bold text-[var(--text-secondary)] truncate uppercase">{project.location.address}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {(project.eventDates || []).map(ed => (
                        <div key={ed.id} className="flex items-center gap-1.5 bg-[var(--bg-primary)] px-2 py-1 rounded-lg border border-[var(--border-color)]/50">
                          <Calendar size={10} className="text-brand-orange" />
                          <span className="text-[8px] font-black text-[var(--text-primary)] uppercase">
                            {ed.label}: {formatDate(ed.date)} ({ed.startTime}-{ed.endTime})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                        {(project.assignedStaff || []).slice(0, 3).map(id => (
                          <div key={id} className="w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--bg-secondary)] flex items-center justify-center text-[7px] font-black text-[var(--text-secondary)]">
                            {users.find(u => u.id === id)?.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] font-black text-brand-grey uppercase tracking-widest">
                        {projAssignments.length} assigned units
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleExportPDF(project)}
                        className="p-1.5 bg-[var(--bg-primary)] rounded-xl text-brand-blue border border-[var(--border-color)]"
                      >
                        <Download size={14} />
                      </button>
                      {(role === 'Administrator' || role === 'Admin' || role === 'Manager') && (
                        <>
                          <button 
                            onClick={() => handleEdit(project)}
                            className="p-1.5 bg-[var(--bg-primary)] rounded-xl text-[var(--text-secondary)] border border-[var(--border-color)]"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => onDelete(project.id)}
                            className="p-1.5 bg-[var(--bg-primary)] rounded-xl text-red-500 border border-[var(--border-color)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {project.tasks && project.tasks.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border-color)]/30">
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Project Timeline</p>
                      <GanttChart 
                        tasks={project.tasks} 
                        onUpdateTasks={(newTasks) => {
                          const taskDates = newTasks.flatMap(t => [parseISO(t.startDate), parseISO(t.endDate)]);
                          if (taskDates.length === 0) return;
                          
                          const minTaskDate = minDateFn(taskDates);
                          const maxTaskDate = maxDateFn(taskDates);
                          const minTaskDateStr = format(minTaskDate, 'yyyy-MM-dd');
                          const maxTaskDateStr = format(maxTaskDate, 'yyyy-MM-dd');
                          
                          // Also find any event dates that match task names and update them
                          const updatedEventDates = (project.eventDates || []).map(ed => {
                            const matchingTask = newTasks.find(t => t.name.toLowerCase() === ed.label.toLowerCase());
                            if (matchingTask) {
                              return { ...ed, date: matchingTask.startDate };
                            }
                            return ed;
                          });

                          onUpdate({
                            ...project,
                            tasks: newTasks,
                            eventDates: updatedEventDates,
                            startDate: minTaskDateStr < project.startDate ? minTaskDateStr : project.startDate,
                            endDate: maxTaskDateStr > project.endDate ? maxTaskDateStr : project.endDate
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingProject ? "Update Project Master" : "Initialize Project"}
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-2 space-y-8 scrollbar-hide">
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-brand-blue">
               <FileText size={16} />
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Project Identity</h4>
             </div>
             <div className="space-y-4 p-4 bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-color)]">
               <div>
                 <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Project Name</label>
                 <input 
                   required
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs text-[var(--text-primary)] outline-none focus:border-brand-blue"
                   placeholder="Event Title"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Client</label>
                   <select 
                     required
                     value={formData.clientId}
                     onChange={(e) => setFormData({...formData, clientId: e.target.value, clientContactId: ''})}
                     className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                   >
                     <option value="">Select Client</option>
                     {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Contact Person</label>
                   <select 
                     value={formData.clientContactId}
                     onChange={(e) => setFormData({...formData, clientContactId: e.target.value})}
                     className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                     disabled={!formData.clientId}
                   >
                     <option value="">Select Contact</option>
                     {selectedClient?.contacts?.map(ct => <option key={ct.id} value={ct.id}>{ct.name} ({ct.role})</option>)}
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Category</label>
                    <input 
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                      placeholder="e.g. Civil"
                    />
                  </div>
               </div>
               <ImageUpload 
                 label="Project Logo / Hero Image"
                 value={formData.imageUrl || ''}
                 onChange={(val) => setFormData({...formData, imageUrl: val})}
                 aspectRatio="video"
                 maxSizeInKB={5120}
               />
               <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Site Address</label>
                    <input 
                      required
                      value={formData.location.address}
                      onChange={(e) => setFormData({...formData, location: { ...formData.location, address: e.target.value }})}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                      placeholder="Full Address"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Map Link</label>
                    <input 
                      value={formData.location.mapLink}
                      onChange={(e) => setFormData({...formData, location: { ...formData.location, mapLink: e.target.value }})}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-xs outline-none"
                      placeholder="Google Maps URL"
                    />
                  </div>
               </div>
             </div>
          </section>

          <section className="space-y-4">
             <div className="flex justify-between items-center px-1">
               <div className="flex items-center gap-2 text-brand-orange">
                 <Calendar size={16} />
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Project Schedule</h4>
               </div>
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, eventDates: [...formData.eventDates, { id: Math.random().toString(), label: '', date: '', startTime: '', endTime: '' }]})}
                 className="p-1 px-2 bg-brand-orange/10 text-brand-orange rounded-lg text-[8px] font-black uppercase tracking-widest"
               >
                 + Add Date
               </button>
             </div>
             <div className="space-y-3">
                {(formData.eventDates || []).map((ed, idx) => (
                  <div key={ed.id} className="p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] space-y-3 relative">
                    {(formData.eventDates || []).length > 1 && (
                      <button type="button" onClick={() => setFormData({...formData, eventDates: (formData.eventDates || []).filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-red-500">
                        <Trash2 size={12} />
                      </button>
                    )}
                    <input 
                      required
                      placeholder="DATE LABEL (E.G. TECHNICAL REHEARSAL)"
                      value={ed.label}
                      onChange={(e) => {
                        const newList = [...formData.eventDates];
                        newList[idx].label = e.target.value;
                        setFormData({...formData, eventDates: newList});
                      }}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-1 text-[9px] font-black uppercase tracking-widest outline-none focus:border-brand-orange"
                    />
                    <div className="grid grid-cols-3 gap-2">
                       <input 
                        required type="date" value={ed.date}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1.5 text-[10px] outline-none"
                        onChange={(e) => {
                          const newList = [...formData.eventDates];
                          newList[idx].date = e.target.value;
                          setFormData({...formData, eventDates: newList});
                        }}
                       />
                       <input 
                        required type="time" value={ed.startTime}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1.5 text-[10px] outline-none"
                        onChange={(e) => {
                          const newList = [...formData.eventDates];
                          newList[idx].startTime = e.target.value;
                          setFormData({...formData, eventDates: newList});
                        }}
                       />
                       <input 
                        required type="time" value={ed.endTime}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1.5 text-[10px] outline-none"
                        onChange={(e) => {
                          const newList = [...formData.eventDates];
                          newList[idx].endTime = e.target.value;
                          setFormData({...formData, eventDates: newList});
                        }}
                       />
                    </div>
                  </div>
                ))}
             </div>
          </section>

          <section className="space-y-4">
             <div className="flex justify-between items-center px-1">
               <div className="flex items-center gap-2 text-brand-green">
                 <Users size={16} />
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Resource Matrix</h4>
               </div>
               <div className="flex gap-2">
                 <button 
                   type="button"
                   onClick={() => setProjectAssignments([...projectAssignments, { resourceId: '', resourceType: 'staff' }])}
                   className="p-1 px-2 bg-brand-green/10 text-brand-green rounded-lg text-[8px] font-black uppercase tracking-widest"
                 >
                   + Resource
                 </button>
               </div>
             </div>
             
             <div className="space-y-3">
                {(projectAssignments || []).map((ass, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <select 
                          value={ass.resourceType}
                          onChange={(e) => {
                            const newList = [...projectAssignments];
                            newList[idx].resourceType = e.target.value as any;
                            newList[idx].resourceId = '';
                            newList[idx].serviceId = undefined;
                            setProjectAssignments(newList);
                          }}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[9px] outline-none"
                        >
                          <option value="staff">STAFF</option>
                          <option value="equipment">FLEET</option>
                          <option value="vendor_service">VENDOR</option>
                          <option value="freelancer">FREE</option>
                        </select>
                        <select 
                          required
                          value={ass.resourceId}
                          onChange={(e) => {
                            const newList = [...projectAssignments];
                            newList[idx].resourceId = e.target.value;
                            newList[idx].serviceId = undefined;
                            setProjectAssignments(newList);
                          }}
                          className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] outline-none"
                        >
                          <option value="">Select Resource</option>
                          {ass.resourceType === 'staff' && users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          {ass.resourceType === 'equipment' && equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.status})</option>)}
                          {ass.resourceType === 'vendor_service' && vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          {ass.resourceType === 'freelancer' && freelancers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.role})</option>)}
                        </select>
                      </div>

                      {ass.resourceType === 'vendor_service' && ass.resourceId && (
                        <select 
                          required
                          value={ass.serviceId || ''}
                          onChange={(e) => {
                            const newList = [...projectAssignments];
                            newList[idx].serviceId = e.target.value;
                            setProjectAssignments(newList);
                          }}
                          className="w-full bg-[var(--bg-secondary)] border border-brand-green/30 rounded-lg px-2 py-1 text-[10px] outline-none"
                        >
                          <option value="">Select Service/Equipment</option>
                          {(vendors.find(v => v.id === ass.resourceId)?.services || []).map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                          ))}
                        </select>
                      )}

                      <select 
                        value={ass.dateId || ''}
                        onChange={(e) => {
                          const newList = [...projectAssignments];
                          newList[idx].dateId = e.target.value || undefined;
                          setProjectAssignments(newList);
                        }}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[9px] outline-none"
                      >
                         <option value="">All Project Dates</option>
                         {formData.eventDates.map(ed => <option key={ed.id} value={ed.id}>{ed.label} ({ed.date})</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setProjectAssignments((projectAssignments || []).filter((_, i) => i !== idx))} className="text-red-500 mt-2">
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
             </div>
          </section>

          <button 
            type="submit"
            className="w-full bg-brand-blue text-white py-5 rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-blue/30 hover:scale-[1.02] active:scale-95 transition-all mt-8 sticky bottom-0"
          >
            {editingProject ? 'Execute Update' : 'Finalize Initialization'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

const CalendarOldView = () => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 border border-[var(--border-color)] shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">May 2026</h2>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-brand-blue transition-colors">
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <button className="w-9 h-9 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-brand-blue transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex justify-around items-center">
          {days.map((day, i) => (
            <div key={day} className="flex flex-col items-center gap-3">
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{day}</span>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all",
                i === 2 ? "bg-brand-blue text-white shadow-lg" : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
              )}>
                {4 + i}
              </div>
              {i === 2 && <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] pl-2">Timeline Summary</h3>
        
        <div className="space-y-3">
          <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border-l-[6px] border-l-brand-orange border border-[var(--border-color)] shadow-sm flex items-center gap-5">
            <div className="text-center min-w-[55px] border-r border-[var(--border-color)] pr-5">
              <p className="text-base font-black text-[var(--text-primary)] font-mono leading-none">09:00</p>
              <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">am_sync</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight truncate">Maintenance Cycle</p>
              <p className="text-[10px] text-brand-grey font-bold uppercase tracking-widest truncate">EXCAVATOR-X • ST-B</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center text-brand-orange border border-[var(--border-color)]">
              <Wrench size={18} />
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border-l-[6px] border-l-brand-grey border border-[var(--border-color)] shadow-sm flex items-center gap-5 opacity-60">
            <div className="text-center min-w-[55px] border-r border-[var(--border-color)] pr-5">
              <p className="text-base font-black text-[var(--text-primary)] font-mono leading-none">11:30</p>
              <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">pm_site</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight truncate">Site Inspection</p>
              <p className="text-[10px] text-brand-grey font-bold uppercase tracking-widest truncate">BRIDGE • CNTR</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center text-brand-grey border border-[var(--border-color)]">
              <Search size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ 
  statusData, 
  projects, 
  clients,
  staff,
  attendance 
}: { 
  statusData: { name: string, value: number, color: string }[], 
  projects: Project[], 
  clients: Client[],
  staff: User[],
  attendance: AttendanceRecord[]
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const activeStaffCount = staff.filter(s => s.checkInStatus === 'in').length;
  
  return (
    <div className="p-4 md:p-0 space-y-8 pb-24 h-full overflow-y-auto scrollbar-hide">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">Command Center</h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-widest mt-1">Real-time Fleet & Project Intelligence</p>
        </div>
        <div className="bg-brand-green/10 text-brand-green px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-green/20 flex items-center gap-2 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          Systems Optimized
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--text-primary)] p-6 rounded-2xl text-[var(--bg-primary)] shadow-xl relative overflow-hidden group transition-all hover:scale-[1.02]">
          <Clock size={20} className="mb-4" />
          <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.2em]">Personnel Active</p>
          <p className="text-4xl metric-value mt-2">{activeStaffCount}<span className="text-lg font-bold opacity-40 ml-1">/ {staff.length}</span></p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            LIVE DEPLOYMENT
          </div>
        </div>

        <div className="precision-card p-6 group transition-all hover:border-brand-orange">
          <AlertTriangle size={20} className="mb-4 text-brand-orange" />
          <p className="text-[10px] uppercase font-black text-[var(--text-secondary)] tracking-[0.2em]">Critical Alerts</p>
          <p className="text-4xl metric-value text-[var(--text-primary)] mt-2">00</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-brand-orange uppercase tracking-wider">
            SYSTEM STATUS
            <ArrowRight size={12} />
          </div>
        </div>

        <div className="precision-card p-6 transition-all">
          <Briefcase size={20} className="mb-4 text-brand-blue" />
          <p className="text-[10px] uppercase font-black text-[var(--text-secondary)] tracking-[0.2em]">Live Projects</p>
          <p className="text-4xl metric-value text-[var(--text-primary)] mt-2">{projects.length}</p>
          <div className="mt-4 flex -space-x-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center text-[8px] font-black">{i}</div>
            ))}
          </div>
        </div>

        <div className="precision-card p-6 transition-all">
          <Warehouse size={20} className="mb-4 text-brand-grey" />
          <p className="text-[10px] uppercase font-black text-[var(--text-secondary)] tracking-[0.2em]">Utilization</p>
          <p className="text-4xl metric-value text-[var(--text-primary)] mt-2">78<span className="text-lg font-bold text-[var(--text-secondary)] ml-1">%</span></p>
          <div className="mt-4 w-full h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
             <div className="h-full bg-[var(--text-primary)] w-[78%]" />
          </div>
        </div>
      </div>

      {/* Analytics & Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="precision-card p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Fleet Utilization</h3>
              <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.15em] mt-1">Weekly operational hours</p>
            </div>
            <div className="p-2 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
              <BarChart3 size={16} className="text-[var(--text-primary)]" />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emptyData}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'var(--text-primary)', opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-3 py-2 rounded-xl text-xs font-black uppercase shadow-xl">
                          <span className="mr-2">{payload[0].value}</span> HRS
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="hours" 
                  fill="var(--text-primary)" 
                  radius={[4, 4, 4, 4]} 
                  barSize={24} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="precision-card p-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex-1 w-full text-center sm:text-left">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Inventory Health</h3>
            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.15em] mb-6">Service readiness distribution</p>
            <div className="space-y-3">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 bg-[var(--bg-primary)] p-2 px-3 rounded-xl border border-[var(--border-color)]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase flex-1">{item.name}</span>
                  <span className="text-xs font-black text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">
                 {statusData.reduce((acc, curr) => acc + curr.value, 0)}
               </span>
               <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Total Assets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Progress Table */}
      <div className="pb-12">
        <div className="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Operational Progress</h2>
            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-1">Active project tracking</p>
          </div>
          <button className="text-[10px] text-brand-blue font-black uppercase tracking-widest border-b-2 border-brand-blue/20 pb-0.5 hover:border-brand-blue transition-all">
            Full Operations Log
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.slice(0, 4).map(project => (
            <div 
              key={project.id} 
              className="precision-card p-6 hover:border-brand-blue/30 transition-all cursor-pointer group" 
              onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center text-brand-blue border border-[var(--border-color)] group-hover:scale-110 transition-transform">
                      <Briefcase size={20} />
                   </div>
                   <div>
                     <p className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight">{project.name}</p>
                     <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-1">{clients.find(c => c.id === project.clientId)?.name || 'Private Client'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                    project.status === 'planning' ? "bg-amber-500/10 text-amber-500" : "bg-brand-green/10 text-brand-green"
                  )}>
                    {project.status || 'active'}
                  </span>
                  <div className="text-[var(--text-secondary)] group-hover:text-brand-blue transition-colors">
                     {expandedId === project.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                  <span>Progress</span>
                  <span>75%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)]/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    className="h-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em]">Deadline</span>
                    <span className="text-[10px] font-black text-[var(--text-primary)]">{project.endDate || 'TBD'}</span>
                  </div>
                  <div className="w-px h-6 bg-[var(--border-color)]" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em]">Resources</span>
                    <span className="text-[10px] font-black text-[var(--text-primary)]">{project.tasks?.length || 0} Blocks</span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest hover:underline transition-all underline-offset-4">Intelligence</span>
              </div>

              <AnimatePresence>
                {expandedId === project.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 mt-4 border-t border-[var(--border-color)]">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Temporal Matrix</p>
                        <div className="flex gap-2">
                           <div className="w-2 h-2 rounded-full bg-brand-blue" />
                           <div className="w-2 h-2 rounded-full bg-[var(--border-color)]" />
                        </div>
                      </div>
                      <GanttChart tasks={project.tasks || []} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-[var(--bg-secondary)] w-full max-w-sm rounded-[32px] overflow-hidden border border-[var(--border-color)] shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]/50">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-primary)] rounded-full transition-colors text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const CATEGORY_MAP: Record<string, string[]> = {
  'Machinery': ['Excavators', 'Cranes', 'Bulldozers', 'Loaders'],
  'Heavy Machinery': ['Excavators', 'Cranes', 'Bulldozers', 'Loaders'],
  'Power Tools': ['Drills', 'Saws', 'Generators', 'Compressors'],
  'Vehicles': ['Trucks', 'Vans', 'Cars'],
  'Other': ['General', 'Safety', 'Misc']
};

const InventoryView = ({ 
  role, 
  equipment, 
  maintenanceTasks,
  assignments,
  onAdd, 
  onUpdate, 
  onDelete,
  onAddMaintenanceTask,
  onUpdateMaintenanceTask
}: { 
  role: UserRole, 
  equipment: Equipment[], 
  maintenanceTasks: MaintenanceTask[],
  assignments: ProjectResourceAssignment[],
  onAdd: (e: Omit<Equipment, 'id'>) => void,
  onUpdate: (e: Equipment) => void,
  onDelete: (id: string) => void,
  onAddMaintenanceTask: (t: MaintenanceTask) => void,
  onUpdateMaintenanceTask: (t: MaintenanceTask) => void
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [filter, setFilter] = useState('');
  const [isSchedulingMaintenance, setIsSchedulingMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<Partial<MaintenanceTask>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    frequencyDays: 30
  });
  const [formData, setFormData] = useState<Omit<Equipment, 'id'>>({
    name: '',
    category: '',
    subCategory: '',
    serialNumber: '',
    status: 'Available',
    purchaseDate: new Date().toISOString().split('T')[0],
    imageUrl: ''
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleScheduleMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    onAddMaintenanceTask({
      id: `mt-${Date.now()}`,
      equipmentId: selectedEquipment.id,
      title: maintenanceForm.title || 'Maintenance',
      description: maintenanceForm.description || '',
      dueDate: maintenanceForm.dueDate || new Date().toISOString().split('T')[0],
      status: 'pending',
      isRecurring: maintenanceForm.isRecurring || false,
      frequencyDays: maintenanceForm.isRecurring ? maintenanceForm.frequencyDays : undefined
    });
    setIsSchedulingMaintenance(false);
    setMaintenanceForm({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      frequencyDays: 30
    });
  };

  const handleCompleteTask = (task: MaintenanceTask) => {
    onUpdateMaintenanceTask({ ...task, status: 'completed' });
    if (task.isRecurring && selectedEquipment) {
      const nextTask = MaintenanceService.generateNextTask(selectedEquipment, task);
      if (nextTask) {
        onAddMaintenanceTask({ ...nextTask, id: `mt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` });
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['id', 'name', 'category', 'subCategory', 'serialNumber', 'status', 'purchaseDate', 'imageUrl'];
    const csvContent = [
      headers.join(','),
      ...equipment.map(e => headers.map(h => `"${(e as any)[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const newItems = lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const item: any = {};
        headers.forEach((h, i) => {
          item[h] = values[i];
        });
        return item as Equipment;
      });

      newItems.forEach(item => {
        if (item.id && equipment.some(e => e.id === item.id)) {
          onUpdate(item);
        } else {
          const { id, ...rest } = item;
          onAdd(rest);
        }
      });
      alert(`Imported ${newItems.length} items successfully.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    (item.subCategory && item.subCategory.toLowerCase().includes(search.toLowerCase())) ||
    item.serialNumber.toLowerCase().includes(search.toLowerCase())
  ).filter(item => item.name.toLowerCase().includes(filter.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdate({ ...formData, id: editingItem.id } as Equipment);
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: '',
      subCategory: '',
      serialNumber: '',
      status: 'Available',
      purchaseDate: new Date().toISOString().split('T')[0],
      imageUrl: ''
    });
  };

  const handleEdit = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || '',
      serialNumber: item.serialNumber,
      status: item.status,
      purchaseDate: item.purchaseDate,
      imageUrl: item.imageUrl || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 space-y-6 pb-24 h-full overflow-y-auto">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-3 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="FILTER ASSETS..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-brand-blue transition-colors text-[var(--text-primary)]"
          />
        </div>
        <button 
          onClick={() => setIsScanning(true)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 rounded-2xl transition-colors hover:border-brand-blue flex items-center justify-center"
        >
          <Scan size={20} />
        </button>
        {(role === 'Administrator' || role === 'Admin' || role === 'Manager') && (
          <>
            <button 
              onClick={handleExportCSV}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 rounded-2xl transition-colors hover:border-brand-blue flex items-center justify-center"
              title="Export CSV"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] px-4 rounded-2xl transition-colors hover:border-brand-blue flex items-center justify-center"
              title="Import CSV"
            >
              <Upload size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-brand-blue text-white px-4 rounded-2xl shadow-xl shadow-brand-blue/10"
            >
              <Plus size={20} />
            </button>
          </>
        )}
      </div>

<AnimatePresence>
          {filteredEquipment.length > 0 ? filteredEquipment.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedEquipment(item)}
              className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:border-brand-blue transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center text-brand-blue border border-[var(--border-color)] shadow-inner overflow-hidden">
                    <img 
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} 
                      alt={item.name} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{item.name}</h3>
                    <p className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-widest">{item.category}{item.subCategory ? ` / ${item.subCategory}` : ''}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[9px] font-black uppercase tracking-widest",
                  item.status === 'Available' ? "text-brand-green" : 
                  item.status === 'In Use' ? "text-brand-blue" : "text-brand-orange"
                )}>
                  {item.status}
                </div>
              </div>



              <div className="pt-4 border-t border-[var(--border-color)]/50 flex justify-between items-center">
                <button className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-1.5 group">
                  FLIGHT LOGS <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </button>
                {(role === 'Administrator' || role === 'Manager') && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-[var(--text-secondary)] hover:text-brand-blue transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-2 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-color)]">
              <Warehouse size={40} className="mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Zero Assets Detected</p>
            </div>
          )}
        </AnimatePresence>
      <Modal 
        isOpen={!!selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        title={selectedEquipment?.name || ''}
      >
        {selectedEquipment && (
          <div className="space-y-6">
            <div className="flex flex-col items-center border-b border-[var(--border-color)] pb-4 space-y-4">
              <div className="w-32 h-32 rounded-3xl bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-color)] shadow-inner">
                <img 
                  src={selectedEquipment.imageUrl || `https://picsum.photos/seed/${selectedEquipment.id}/200/200`} 
                  alt={selectedEquipment.name} 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <DownloadQRCode data={selectedEquipment.id} name={selectedEquipment.name} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Category</p>
                <p className="font-bold">{selectedEquipment.category}{selectedEquipment.subCategory ? ` / ${selectedEquipment.subCategory}` : ''}</p>
              </div>
              <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase">Serial</p>
                <p className="font-bold font-mono">{selectedEquipment.serialNumber}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Maintenance Schedule</h4>
                {role !== 'Staff' && (
                  <button 
                    onClick={() => setIsSchedulingMaintenance(!isSchedulingMaintenance)}
                    className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:opacity-80"
                  >
                    {isSchedulingMaintenance ? 'Cancel' : '+ Schedule'}
                  </button>
                )}
              </div>
              
              {isSchedulingMaintenance && (
                <form onSubmit={handleScheduleMaintenance} className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] space-y-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Task Title</label>
                    <input 
                      required
                      value={maintenanceForm.title}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, title: e.target.value})}
                      className="w-full bg-transparent border-b border-[var(--border-color)] py-1 text-xs outline-none focus:border-brand-blue"
                      placeholder="e.g. Oil Change"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Due Date</label>
                      <input 
                        type="date"
                        required
                        value={maintenanceForm.dueDate}
                        onChange={(e) => setMaintenanceForm({...maintenanceForm, dueDate: e.target.value})}
                        className="w-full bg-transparent border-b border-[var(--border-color)] py-1 outline-none focus:border-brand-blue"
                      />
                    </div>
                    <div className="flex items-end pb-1 gap-2">
                       <input 
                         type="checkbox"
                         id="isRecurring"
                         checked={maintenanceForm.isRecurring}
                         onChange={(e) => setMaintenanceForm({...maintenanceForm, isRecurring: e.target.checked})}
                       />
                       <label htmlFor="isRecurring" className="text-[10px] font-bold text-[var(--text-primary)]">Recurring?</label>
                    </div>
                  </div>
                  {maintenanceForm.isRecurring && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Frequency (Days)</label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={maintenanceForm.frequencyDays}
                        onChange={(e) => setMaintenanceForm({...maintenanceForm, frequencyDays: parseInt(e.target.value)})}
                        className="w-full bg-transparent border-b border-[var(--border-color)] py-1 text-xs outline-none focus:border-brand-blue"
                      />
                    </div>
                  )}
                  <button type="submit" className="w-full bg-brand-blue text-white font-bold py-2 rounded-xl text-xs hover:opacity-90">
                    Save Task
                  </button>
                </form>
              )}

              {maintenanceTasks.filter(t => t.equipmentId === selectedEquipment.id).length > 0 ? (
                maintenanceTasks.filter(t => t.equipmentId === selectedEquipment.id)
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map(t => {
                  const taskStatusItem = MaintenanceService.getTaskStatus(t.dueDate);
                  const displayStatus = t.status === 'completed' ? 'completed' : taskStatusItem;
                  return (
                    <div key={t.id} className="p-3 bg-[var(--bg-primary)] rounded-lg flex justify-between items-center text-xs border border-[var(--border-color)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{t.title}</span>
                          {t.isRecurring && <span className="text-[8px] bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded uppercase font-black">Recurring</span>}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">Due: {t.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase", 
                          displayStatus === 'completed' ? 'bg-brand-green/10 text-brand-green' : 
                          displayStatus === 'overdue' ? 'bg-red-500/10 text-red-500' :
                          displayStatus === 'due' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        )}>{displayStatus}</span>
                        {displayStatus !== 'completed' && role !== 'Staff' && (
                          <button 
                            onClick={() => handleCompleteTask(t)}
                            className="bg-brand-green/20 text-brand-green p-1.5 rounded hover:bg-brand-green hover:text-white transition-colors"
                            title="Mark Completed"
                          >
                            <Save size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : <p className="text-xs text-[var(--text-secondary)]">No records found</p>}
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Rentals / Assignments</h4>
              {assignments.filter(a => a.resourceId === selectedEquipment.id && a.resourceType === 'equipment').length > 0 ? (
                assignments.filter(a => a.resourceId === selectedEquipment.id && a.resourceType === 'equipment').map(a => (
                  <div key={a.id} className="p-3 bg-[var(--bg-primary)] rounded-lg text-xs">
                    Assignment: Project {a.projectId}
                  </div>
                ))
              ) : <p className="text-xs text-[var(--text-secondary)]">No active assignments</p>}
            </div>
          </div>
        )}
      </Modal>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingItem ? "Edit Asset" : "Register Asset"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Asset Name</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
              placeholder="e.g. Excavator Model X"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Image URL (Optional)</label>
            <input 
              value={formData.imageUrl || ''}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Category</label>
              <input 
                required
                list="category-options"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Machinery"
              />
              <datalist id="category-options">
                {Array.from(new Set([
                  ...Object.keys(CATEGORY_MAP),
                  ...equipment.map(e => e.category).filter(Boolean)
                ])).map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Subcategory</label>
              <input 
                list="subcategory-options"
                value={formData.subCategory || ''}
                onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Excavators"
              />
              <datalist id="subcategory-options">
                {Array.from(new Set([
                  ...(CATEGORY_MAP[formData.category] || []),
                  ...equipment.filter(e => e.category === formData.category).map(e => e.subCategory).filter(Boolean)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ])).map((sub: any) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Serial</label>
              <input 
                required
                value={formData.serialNumber}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue font-mono"
                placeholder="SN-0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-brand-blue appearance-none"
            >
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full bg-brand-blue text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] transition-all mt-4"
          >
            {editingItem ? "Update Asset" : "Authorize Asset"}
          </button>
        </form>
      </Modal>

      {isScanning && (
        <QRCodeScanner 
          onScan={(data) => {
            if (data) {
              const item = equipment.find(e => e.id === data || e.serialNumber === data);
              if (item) {
                setSelectedEquipment(item);
              } else {
                alert('Equipment not found from QR code');
              }
              setIsScanning(false);
            }
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </div>
  );
};



// --- Main App Component ---

export default function App({ initialUser, onLogout }: { initialUser?: User, onLogout?: () => void }) {
  if (!initialUser) return null; // Safe guard for production
  const [user, setUser] = useState<User>(initialUser); 

  // Sync with prop from AuthWrapper
  useEffect(() => {
    if (initialUser) setUser(initialUser);
  }, [initialUser]);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('pulse_active_tab') || 'dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('pulse_theme') as 'light' | 'dark') || 'dark');

  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [hiredEquipment, setHiredEquipment] = useState<HiredEquipment[]>([]);
  const [staff, setStaff] = useState<User[]>([]);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({ workingWeekends: [6, 7], publicHolidays: [] });
  const [assignments, setAssignments] = useState<ProjectResourceAssignment[]>([]);

  // Batch update assignments for a project
  const handleUpdateAssignments = async (projectId: string, newAssignments: Omit<ProjectResourceAssignment, 'id' | 'projectId'>[]) => {
    if (!db) return;
    try {
      // 1. Find all current assignments for this project
      const currentAssIds = assignments
        .filter(a => a.projectId === projectId)
        .map(a => a.id);

      // 2. Delete all current assignments (simplest way to sync state)
      const deletePromises = currentAssIds.map(id => deleteDoc(doc(db, 'assignments', id)));
      await Promise.all(deletePromises);

      // 3. Add new assignments
      const addPromises = newAssignments.map(ass => 
        addDoc(collection(db, 'assignments'), {
          ...ass,
          projectId,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(addPromises);
      
      console.log(`Assignments synced for project ${projectId}`);
    } catch (err) {
      console.error("Error syncing assignments:", err);
    }
  };

  // Persistence effects - REPLACED BY FIREBASE
  useEffect(() => {
    if (!db) return;

    const collections = [
      { name: 'equipment', setter: setEquipment },
      { name: 'projects', setter: setProjects },
      { name: 'clients', setter: setClients },
      { name: 'vendors', setter: setVendors },
      { name: 'freelancers', setter: setFreelancers },
      { name: 'assignments', setter: setAssignments },
      { name: 'maintenanceTasks', setter: setMaintenanceTasks },
      { name: 'attendance', setter: setAttendance },
      { name: 'leaveRequests', setter: setLeaveRequests },
      { name: 'hiredEquipment', setter: setHiredEquipment },
      { name: 'profiles', setter: setStaff }
    ];

    const unsubscribes = collections.map(col => {
      const q = collection(db, col.name);
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          // Prioritize Firestore document ID to ensure updates/deletes work correctly
          return { ...docData, id: doc.id };
        });
        col.setter(data as any);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, col.name);
      });
    });

    return () => unsubscribes.forEach(un => un());
  }, []);

  useEffect(() => {
    localStorage.setItem('pulse_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('pulse_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleUpdateUser = async (updated: User) => {
    try {
      setUser(updated);
      if (db) {
        const profileRef = doc(db, 'profiles', updated.id);
        await updateDoc(profileRef, { 
          avatar_url: updated.imageUrl || '',
          imageUrl: updated.imageUrl || '',
          updatedAt: serverTimestamp()
        });
        console.log("Profile updated successfully");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${updated.id}`);
    }
  };

  const addProject = async (newItem: Project) => {
    try {
      const { id, ...data } = newItem;
      // Using setDoc with the generated ID ensures the ID matches between client and server
      await setDoc(doc(db, 'projects', id), { 
        ...data, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`Project added successfully: ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
    }
  };

  const handleUpdateProject = async (upd: Project) => {
    try {
      const { id, ...data } = upd;
      await updateDoc(doc(db, 'projects', id), {
        ...data,
        updatedAt: serverTimestamp()
      } as any);
      console.log(`Project ${id} updated successfully`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${upd.id}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const currentTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'WONDERWEB PULSE';
      case 'inventory': return 'Fleet';
      case 'resources': return 'CRM Hub';
      case 'projects': return 'Projects';
      case 'timeclock': return 'Time Clock';
      default: return 'WONDERWEB PULSE';
    }
  };

  const equipStatusData = React.useMemo(() => [
    { name: 'Available', value: equipment.filter(e => e.status === 'Available').length, color: '#10b981' },
    { name: 'In Use', value: equipment.filter(e => e.status === 'In Use').length, color: '#3b82f6' },
    { name: 'Repair', value: equipment.filter(e => e.status === 'Under Maintenance').length, color: '#f97316' },
  ], [equipment]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={user.role} 
        onLogout={onLogout} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header 
          title={currentTitle()} 
          user={user} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onLogout={onLogout} 
          onUpdateUser={handleUpdateUser} 
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden md:px-8 pb-32 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full max-w-7xl mx-auto w-full pt-6"
            >
              {activeTab === 'dashboard' && <DashboardView statusData={equipStatusData} projects={projects} clients={clients} staff={staff} attendance={attendance} />}
              {activeTab === 'inventory' && (
                <InventoryView 
                  role={user.role} 
                  equipment={equipment}
                  maintenanceTasks={maintenanceTasks}
                  assignments={assignments}
                  onAdd={async (e) => await addDoc(collection(db, 'equipment'), { ...e, createdAt: serverTimestamp() })}
                  onUpdate={async (upd) => {
                    const { id, ...data } = upd;
                    await updateDoc(doc(db, 'equipment', id), data as any);
                  }}
                  onDelete={async (id) => {
                    if (window.confirm('Delete this asset?')) await deleteDoc(doc(db, 'equipment', id));
                  }}
                  onAddMaintenanceTask={async (t) => {
                    const { id, ...data } = t;
                    await addDoc(collection(db, 'maintenanceTasks'), { ...data, createdAt: serverTimestamp() });
                  }}
                  onUpdateMaintenanceTask={async (t) => {
                    const { id, ...data } = t;
                    await updateDoc(doc(db, 'maintenanceTasks', id), data as any);
                  }}
                />
              )}
              {activeTab === 'resources' && (
                <ResourcesView 
                  clients={clients} 
                  vendors={vendors} 
                  freelancers={freelancers}
                  staff={staff}
                  onUpdateStaff={async (s) => {
                    try {
                      const { id, ...data } = s;
                      const { role, email, ...updatable } = data;
                      const updateData = {
                        ...updatable,
                        avatar_url: updatable.imageUrl || '',
                        imageUrl: updatable.imageUrl || '',
                        updatedAt: serverTimestamp()
                      };
                      await updateDoc(doc(db, 'profiles', id), updateData);
                      console.log(`Staff ${id} updated successfully`);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `profiles/${s.id}`);
                    }
                  }}
                  onAddClient={async (c) => await addDoc(collection(db, 'clients'), { ...c, createdAt: serverTimestamp() })}
                  onUpdateClient={async (c) => {
                    const { id, ...data } = c;
                    await updateDoc(doc(db, 'clients', id), data as any);
                  }}
                  onDeleteClient={async (id) => await deleteDoc(doc(db, 'clients', id))}
                  onAddVendor={async (v) => await addDoc(collection(db, 'vendors'), { ...v, createdAt: serverTimestamp() })}
                  onUpdateVendor={async (v) => {
                    const { id, ...data } = v;
                    await updateDoc(doc(db, 'vendors', id), data as any);
                  }}
                  onDeleteVendor={async (id) => await deleteDoc(doc(db, 'vendors', id))}
                  onAddFreelancer={async (f) => await addDoc(collection(db, 'freelancers'), { ...f, createdAt: serverTimestamp() })}
                  onUpdateFreelancer={async (f) => {
                    const { id, ...data } = f;
                    await updateDoc(doc(db, 'freelancers', id), data as any);
                  }}
                  onDeleteFreelancer={async (id) => await deleteDoc(doc(db, 'freelancers', id))}
                />
              )}
              {activeTab === 'timeclock' && (
                <TimeClockView 
                  user={user} 
                  attendance={attendance} 
                  leaveRequests={leaveRequests}
                  calendarConfig={calendarConfig}
                  onCheckIn={async () => {
                    const record = {
                      staffId: user.id,
                      date: new Date().toISOString().split('T')[0],
                      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      hoursWorked: 0,
                      createdAt: serverTimestamp()
                    };
                    await addDoc(collection(db, 'attendance'), record);
                    await updateDoc(doc(db, 'profiles', user.id), { checkInStatus: 'in', lastCheckIn: record.checkIn });
                  }}
                  onCheckOut={async () => {
                    const today = new Date().toISOString().split('T')[0];
                    const record = attendance.find(a => a.staffId === user.id && a.date === today && !a.checkOut);
                    if (record) {
                      const checkOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      await updateDoc(doc(db, 'attendance', record.id), { checkOut, hoursWorked: 8 }); 
                      await updateDoc(doc(db, 'profiles', user.id), { checkInStatus: 'out' });
                    }
                  }}
                  onRequestLeave={async (req) => {
                    await addDoc(collection(db, 'leaveRequests'), { ...req, createdAt: serverTimestamp() });
                  }}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView projects={projects} leaveRequests={leaveRequests} assignments={assignments} />
              )}
              {activeTab === 'admin' && (
                <AdminSettingsView config={calendarConfig} onUpdateConfig={setCalendarConfig} />
              )}
              {activeTab === 'projects' && (
                <ProjectsView 
                  role={user.role} 
                  projects={projects}
                  clients={clients}
                  users={staff} 
                  equipment={equipment}
                  vendors={vendors}
                  freelancers={freelancers}
                  assignments={assignments}
                  onUpdateAssignments={handleUpdateAssignments}
                  onAdd={addProject}
                  onUpdate={handleUpdateProject}
                  onDelete={handleDeleteProject}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={user.role} />
      </div>
    </div>
  );
}

