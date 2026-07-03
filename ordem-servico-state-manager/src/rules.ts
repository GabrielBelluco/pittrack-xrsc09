export const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'OSEventos';
export const GROUP = 'ordem-servico-state-manager-group';
export const CONSUMER = 'ordem-servico-state-manager-instance';

export enum ServiceOrderStatus {
  CREATED = 'CREATED',
  DIAGNOSIS_IN_PROGRESS = 'DIAGNOSIS_IN_PROGRESS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REPAIR_IN_PROGRESS = 'REPAIR_IN_PROGRESS',
  FINAL_TEST = 'FINAL_TEST',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

const TERMINAL = new Set([ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED]);

export function isTerminal(status: string): boolean {
  return TERMINAL.has(status as ServiceOrderStatus);
}

const TRANSITIONS: Record<string, Record<string, string>> = {
  [ServiceOrderStatus.CREATED]: {
    DIAGNOSIS_STARTED: ServiceOrderStatus.DIAGNOSIS_IN_PROGRESS,
    DIAGNOSIS_FINISHED: ServiceOrderStatus.DIAGNOSIS_IN_PROGRESS
  },
  [ServiceOrderStatus.DIAGNOSIS_IN_PROGRESS]: {
    BUDGET_CREATED: ServiceOrderStatus.WAITING_APPROVAL
  },
  [ServiceOrderStatus.WAITING_APPROVAL]: {
    BUDGET_APPROVED: ServiceOrderStatus.APPROVED,
    BUDGET_REJECTED: ServiceOrderStatus.CANCELLED
  },
  [ServiceOrderStatus.APPROVED]: {
    REPAIR_STARTED: ServiceOrderStatus.REPAIR_IN_PROGRESS
  },
  [ServiceOrderStatus.REPAIR_IN_PROGRESS]: {
    FINAL_TEST_STARTED: ServiceOrderStatus.FINAL_TEST,
    MAINTENANCE_FINISHED: ServiceOrderStatus.COMPLETED
  },
  [ServiceOrderStatus.FINAL_TEST]: {
    MAINTENANCE_FINISHED: ServiceOrderStatus.COMPLETED
  }
};

export interface ValidationResult {
  allowed: boolean;
  newStatus?: string;
}

export function validateTransition(
  currentStatus: string,
  eventType: string,
  data: Record<string, unknown>
): ValidationResult {
  if (isTerminal(currentStatus)) {
    return { allowed: false };
  }

  if (eventType === 'STATUS_UPDATED') {
    const targetStatus = String(data.status ?? '');
    if (targetStatus === ServiceOrderStatus.CANCELLED) {
      return { allowed: true, newStatus: ServiceOrderStatus.CANCELLED };
    }
    const fromCurrent = TRANSITIONS[currentStatus];
    if (fromCurrent && fromCurrent[targetStatus]) {
      return { allowed: true, newStatus: fromCurrent[targetStatus] };
    }
    return { allowed: false };
  }

  const fromCurrent = TRANSITIONS[currentStatus];
  if (!fromCurrent) {
    return { allowed: false };
  }

  const newStatus = fromCurrent[eventType];
  if (!newStatus) {
    return { allowed: false };
  }

  return { allowed: true, newStatus };
}
