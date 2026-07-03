import { BudgetStatus } from '../types/budget-status';
import { BudgetItem } from './budget-item';

export interface Budget {
  id: string;
  status: BudgetStatus;
  items: BudgetItem[];
  totalAmount: number;
  createdAt: Date;
  approvedAt?: Date;
}
