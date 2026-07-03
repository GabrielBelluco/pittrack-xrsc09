import { ServiceOrder } from '../models/service-order';
import { Diagnosis } from '../models/diagnosis';
import { Budget } from '../models/budget';
import { ServiceOrderStatus } from '../types/service-order-status';

export interface ServiceOrderRepository {
  findById(id: string): Promise<ServiceOrder | null>;
  findAll(): Promise<ServiceOrder[]>;
  save(order: ServiceOrder): Promise<ServiceOrder>;
  updateStatus(id: string, status: ServiceOrderStatus): Promise<void>;
  saveDiagnosis(orderId: string, diagnosis: Diagnosis): Promise<void>;
  saveBudget(orderId: string, budget: Budget): Promise<void>;
  approveBudget(orderId: string, budgetId: string): Promise<void>;
  rejectBudget(orderId: string, budgetId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
