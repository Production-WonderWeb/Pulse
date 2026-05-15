/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Administrator' | 'Admin' | 'Manager' | 'Staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  imageUrl?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  isOnboarded?: boolean;
  checkInStatus?: 'in' | 'out';
  lastCheckIn?: string;
  yearlyLeaveDays?: number;
  remainingCompOff?: number;
  standardWorkingHours?: number;
}

export type EquipmentStatus = 'Available' | 'In Use' | 'Under Maintenance';

export interface Equipment {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  serialNumber: string;
  purchaseDate: string;
  status: EquipmentStatus;
  lastMaintenance?: string;
  nextMaintenance?: string;
  imageUrl?: string;
}

export interface MaintenanceTask {
  id: string;
  equipmentId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'due' | 'overdue' | 'completed';
  isRecurring: boolean;
  frequencyDays?: number;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Client {
  id: string;
  name: string;
  contacts: Contact[];
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface VendorService {
  id: string;
  name: string;
  description?: string;
  type: 'Service' | 'Equipment';
}

export interface Vendor {
  id: string;
  name: string;
  contacts: Contact[];
  services: VendorService[];
  notes?: string;
}

export interface Freelancer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  dailyRate: number;
  contactDetails: string;
  notes?: string;
}

export interface ProjectResourceAssignment {
  id: string;
  projectId: string;
  resourceId: string;
  resourceType: 'staff' | 'equipment' | 'freelancer' | 'vendor_service';
  serviceId?: string; // Valid for vendor_service
  dateId?: string; // Optional reference to specific project date
}

export interface ProjectEventDate {
  id: string;
  label: string; // e.g. "Show Day"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ProjectTask {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0-100
  dependencies: string[]; // IDs of dependent tasks
}

export interface Project {
  id: string;
  referenceNumber?: string;
  name: string;
  clientId: string;
  clientContactId?: string;
  category: string;
  description: string;
  location: {
    address: string;
    mapLink?: string;
  };
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  eventDates: ProjectEventDate[];
  timingNotes?: string;
  assignedStaff: string[]; // Keep for quick reference, but transition to assignment interface
  tasks: ProjectTask[];
  imageUrl?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'leave' | 'project' | 'general';
  createdAt?: any;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  createdBy: string;
  dueDate: string; // ISO string with date and time
  status: 'todo' | 'in-progress' | 'completed';
  createdAt?: any;
  updatedAt?: any;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  UNPAID = 'UNPAID',
  EARLY_LEAVE = 'EARLY_LEAVE',
  COMP_OFF = 'COMP_OFF'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface AttendanceSession {
  checkIn: string;
  checkOut?: string;
  hoursWorked: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn: string; // Use first session's checkIn for legacy compatibility
  checkInRaw?: string;
  checkOut?: string; // Use last session's checkOut for legacy compatibility
  hoursWorked: number; // Sum of sessions
  standardHours?: number;
  sessions?: AttendanceSession[];
}

export interface PublicHoliday {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  description?: string;
}

export interface CalendarConfig {
  workingWeekends: number[];
  publicHolidays: PublicHoliday[];
  forcedWorkingDates?: string[];
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  equipment: Equipment[];
  maintenanceTasks: MaintenanceTask[];
  projects: Project[];
  timeLogs: TimeLog[];
}

export interface TimeLog {
  id: string;
  userId: string;
  projectId: string;
  checkInTime: string;
  checkOutTime?: string;
  notes?: string;
}

export interface HiredEquipment {
  id: string;
  name: string;
  vendorId: string;
  details: string;
  dailyRate: number;
  status: 'active' | 'completed';
}

export interface SystemSettings {
  id: string;
  logoUrl?: string;
  appName?: string;
  primaryColor?: string;
  updatedAt?: string;
}

export interface PDFExportConfig {
  includeSpecs: boolean;
  includeTimeline: boolean;
  includeStaff: boolean;
  includeEquipment: boolean;
  includeFreelancers: boolean;
  includeVendors: boolean;
}

