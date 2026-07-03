import { ServiceOrderStatus } from '../types/service-order-status';
import { CustomerSnapshot } from './customer-snapshot';
import { VehicleSnapshot } from './vehicle-snapshot';
import { Diagnosis } from './diagnosis';
import { Budget } from './budget';
import { TimelineEvent } from './timeline-event';

export interface ServiceOrder {
  id: string;
  status: ServiceOrderStatus;
  customer: CustomerSnapshot;
  vehicle: VehicleSnapshot;
  complaint?: string;
  assignedTo?: string;
  diagnosis?: Diagnosis;
  budget?: Budget;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  version: number;
}
