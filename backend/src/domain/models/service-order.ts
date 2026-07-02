import { ServiceOrderStatus } from './enums';
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
  diagnosis?: Diagnosis;
  budget?: Budget;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  version: number;
}
