/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceTask, Equipment } from '../types';
import { addDays, isAfter, isBefore, addMonths } from 'date-fns';

export class MaintenanceService {
  /**
   * Calculates the status of a maintenance task based on current date
   */
  static getTaskStatus(dueDate: string): MaintenanceTask['status'] {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (isBefore(due, now)) {
      return 'overdue';
    }
    
    // If due within next 7 days
    if (isBefore(due, addDays(now, 7))) {
      return 'due';
    }
    
    return 'pending';
  }

  /**
   * Generates the next recurring task for a piece of equipment
   */
  static generateNextTask(equipment: Equipment, lastTask: MaintenanceTask): MaintenanceTask | null {
    if (!lastTask.isRecurring || !lastTask.frequencyDays) return null;
    
    const nextDueDate = addDays(new Date(lastTask.dueDate), lastTask.frequencyDays);
    
    return {
      id: `task-${Date.now()}`,
      equipmentId: equipment.id,
      title: lastTask.title,
      description: lastTask.description,
      dueDate: nextDueDate.toISOString().split('T')[0],
      status: 'pending',
      isRecurring: true,
      frequencyDays: lastTask.frequencyDays
    };
  }
}
