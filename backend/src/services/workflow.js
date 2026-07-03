const WORKFLOW_STATUS = {
  WAITING_SERVICE: 'Aguardando Atendimento',
  DIAGNOSIS: 'Em Diagnóstico',
  BUDGET_CREATED: 'Orçamento Gerado',
  WAITING_APPROVAL: 'Aguardando Aprovação',
  APPROVED: 'Aprovado',
  REPAIR: 'Em Reparo',
  WAITING_PART: 'Aguardando Peça',
  FINAL_TESTS: 'Em Testes Finais',
  FINISHED: 'Finalizado',
  READY_FOR_PICKUP: 'Disponível para Retirada',
  CANCELED: 'Cancelado'
};

const STATUS_TRANSITIONS = {
  [WORKFLOW_STATUS.WAITING_SERVICE]: [WORKFLOW_STATUS.DIAGNOSIS, WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.DIAGNOSIS]: [WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.BUDGET_CREATED]: [WORKFLOW_STATUS.WAITING_APPROVAL, WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.WAITING_APPROVAL]: [WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.APPROVED]: [WORKFLOW_STATUS.REPAIR, WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.REPAIR]: [WORKFLOW_STATUS.FINAL_TESTS, WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.WAITING_PART]: [WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.FINAL_TESTS]: [WORKFLOW_STATUS.FINISHED, WORKFLOW_STATUS.CANCELED],
  [WORKFLOW_STATUS.FINISHED]: [WORKFLOW_STATUS.READY_FOR_PICKUP],
  [WORKFLOW_STATUS.READY_FOR_PICKUP]: [],
  [WORKFLOW_STATUS.CANCELED]: []
};

const MEDIA_STEP_BY_STATUS = {
  [WORKFLOW_STATUS.WAITING_SERVICE]: 'Atendimento',
  [WORKFLOW_STATUS.DIAGNOSIS]: 'Diagnóstico',
  [WORKFLOW_STATUS.BUDGET_CREATED]: 'Orçamento',
  [WORKFLOW_STATUS.WAITING_APPROVAL]: 'Orçamento',
  [WORKFLOW_STATUS.APPROVED]: 'Orçamento',
  [WORKFLOW_STATUS.REPAIR]: 'Reparo',
  [WORKFLOW_STATUS.WAITING_PART]: 'Peça',
  [WORKFLOW_STATUS.FINAL_TESTS]: 'Testes Finais',
  [WORKFLOW_STATUS.FINISHED]: 'Entrega',
  [WORKFLOW_STATUS.READY_FOR_PICKUP]: 'Entrega'
};

class WorkflowError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkflowError';
    this.code = 'WORKFLOW_INVALID_TRANSITION';
    this.statusCode = 409;
  }
}

function formatStatuses(statuses) {
  return statuses.map((status) => `"${status}"`).join(' ou ');
}

function validateStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    throw new WorkflowError(`A ordem já está em "${nextStatus}".`);
  }

  const allowedStatuses = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedStatuses.includes(nextStatus)) {
    const nextSteps = allowedStatuses.length > 0 ? formatStatuses(allowedStatuses) : 'nenhuma etapa';
    throw new WorkflowError(
      `Fluxo inválido: não é possível mudar de "${currentStatus}" para "${nextStatus}". Próxima etapa válida: ${nextSteps}.`
    );
  }
}

function assertCurrentStatus(actionName, currentStatus, allowedStatuses) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new WorkflowError(
      `${actionName} só pode ser executado quando a ordem está em ${formatStatuses(allowedStatuses)}. Status atual: "${currentStatus}".`
    );
  }
}

function mediaStepForStatus(status) {
  return MEDIA_STEP_BY_STATUS[status] || null;
}

function assertMediaAllowed(status) {
  const step = mediaStepForStatus(status);

  if (!step) {
    throw new WorkflowError(`Mídia não pode ser enviada quando a ordem está em "${status}".`);
  }

  return step;
}

module.exports = {
  WORKFLOW_STATUS,
  WorkflowError,
  validateStatusTransition,
  assertCurrentStatus,
  mediaStepForStatus,
  assertMediaAllowed
};
