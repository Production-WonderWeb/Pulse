/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Equipment, Project, MaintenanceTask, Client, Vendor, Freelancer, HiredEquipment } from './types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'CL-001',
    name: 'BuildCore Construction',
    contacts: [
      { id: 'ct1', name: 'Alex Rivera', role: 'Project Manager', email: 'arivera@buildcore.com', phone: '+971 50 123 4567' },
      { id: 'ct2', name: 'Maria Santos', role: 'Procurement', email: 'msantos@buildcore.com', phone: '+971 50 987 6543' }
    ],
    address: 'Business Bay, Dubai, UAE',
    notes: 'Returning client, priority account.',
    createdAt: '2025-01-10'
  }
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'VN-001',
    name: 'HeavyLift Rentals',
    contacts: [
      { id: 'vct1', name: 'Mike Johnson', role: 'Sales Manager', email: 'rentals@heavylift.com', phone: '+971 4 881 2345' }
    ],
    services: [
      { id: 'vs1', name: 'Crane Rental 20T', type: 'Equipment' },
      { id: 'vs2', name: 'Excavator Rental', type: 'Equipment' },
      { id: 'vs3', name: 'Operator Service', type: 'Service' }
    ],
    notes: 'Primary supplier for cranes and excavators.'
  }
];

export const MOCK_FREELANCERS: Freelancer[] = [
  {
    id: 'FL-001',
    name: 'David Smith',
    role: 'Crane Operator',
    email: 'david.op@gmail.com',
    phone: '+971 55 555 1122',
    dailyRate: 450,
    contactDetails: 'Available weekends',
    notes: 'Certified for Model X excavators.'
  }
];

export const MOCK_HIRED_EQUIPMENT: HiredEquipment[] = [
  {
    id: 'HE-001',
    name: 'Mobile Crane 20T',
    vendorId: 'VN-001',
    details: 'Hydraulic lift, 20m reach',
    dailyRate: 1200,
    status: 'active'
  }
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Johnson', email: 'alex@company.com', role: 'Administrator', checkInStatus: 'out' },
  { id: 'u2', name: 'Sarah Miller', email: 'sarah@company.com', role: 'Manager', checkInStatus: 'in', lastCheckIn: new Date().toISOString() },
  { id: 'u3', name: 'Mike Ross', email: 'mike@company.com', role: 'Staff', checkInStatus: 'out' },
];

export const MOCK_EQUIPMENT: Equipment[] = [
  { 
    id: 'e1', 
    name: 'Excavator Model X', 
    category: 'Heavy Machinery', 
    serialNumber: 'EXCAV-2024-001', 
    purchaseDate: '2023-01-15', 
    status: 'In Use',
    lastMaintenance: '2024-03-10',
    nextMaintenance: '2024-06-10'
  },
  { 
    id: 'e2', 
    name: 'Power Drill D-500', 
    category: 'Power Tools', 
    serialNumber: 'DRILL-9982', 
    purchaseDate: '2024-02-01', 
    status: 'Available' 
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Palm Jumeirah Site A',
    clientId: 'CL-001',
    clientContactId: 'ct1',
    category: 'Infrastructure',
    description: 'Foundation work for high-rise residential complex including piling and site drainage setup.',
    location: {
      address: 'Palm Jumeirah, Sector 4',
      mapLink: 'https://maps.google.com/?q=25.1124,55.1390'
    },
    status: 'active',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    eventDates: [
      { id: 'ed1', label: 'Load In', date: '2026-05-01', startTime: '07:00', endTime: '18:00' },
      { id: 'ed2', label: 'Show Day', date: '2026-05-02', startTime: '09:00', endTime: '22:00' }
    ],
    timingNotes: '07:00 - 18:00 Daily',
    assignedStaff: ['u1', 'u2'],
    tasks: [
      { id: 'tsk1', name: 'Site Preparation', startDate: '2026-05-01', endDate: '2026-05-10', progress: 100, dependencies: [] },
      { id: 'tsk2', name: 'Foundation Piling', startDate: '2026-05-11', endDate: '2026-05-25', progress: 50, dependencies: ['tsk1'] },
      { id: 'tsk3', name: 'Drainage Setup', startDate: '2026-05-26', endDate: '2026-06-15', progress: 0, dependencies: ['tsk2'] }
    ]
  }
];

export const MOCK_TASKS: MaintenanceTask[] = [
  {
    id: 't1',
    equipmentId: 'e1',
    title: 'Hydraulic Fluid Change',
    description: 'Periodic maintenance for model X',
    dueDate: '2024-05-10',
    status: 'due',
    isRecurring: true,
    frequencyDays: 90
  }
];
