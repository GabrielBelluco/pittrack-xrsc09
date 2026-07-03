import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Package,
  PlayCircle,
  TestTube2,
  Wrench
} from 'lucide-react';

const STATUS = {
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

export default function WorkflowControls({
  order,
  busy,
  onStatus,
  onCreateBudget,
  onAddPart,
  onReplacePart
}) {
  const latestBudget = order.budgets?.[order.budgets.length - 1];
  const pendingBudget = latestBudget && !latestBudget.approved;
  const replaceablePart = order.parts?.find((part) => part.status !== 'Substituída');
  const actions = [];
  let hint = '';

  if (order.status === STATUS.WAITING_SERVICE) {
    hint = 'Próxima etapa: iniciar o diagnóstico técnico do veículo.';
    actions.push({
      label: 'Iniciar diagnóstico',
      Icon: PlayCircle,
      onClick: () => onStatus(STATUS.DIAGNOSIS, 'Diagnóstico iniciado pela oficina.', 'DIAGNOSIS_STARTED')
    });
  } else if (order.status === STATUS.DIAGNOSIS) {
    hint = 'Diagnóstico em andamento. Ao gerar o orçamento, o cliente passa a poder aprovar na tela dele.';
    actions.push({
      label: 'Gerar orçamento',
      Icon: BadgeDollarSign,
      onClick: onCreateBudget
    });
  } else if ([STATUS.BUDGET_CREATED, STATUS.WAITING_APPROVAL].includes(order.status)) {
    hint = pendingBudget
      ? 'Aguardando aprovação do cliente. Abra a visão do cliente para aprovar o orçamento.'
      : 'Aguardando orçamento pendente para continuar.';
  } else if (order.status === STATUS.APPROVED) {
    hint = 'Orçamento aprovado. A oficina pode iniciar o reparo.';
    actions.push({
      label: 'Iniciar reparo',
      Icon: Wrench,
      onClick: () => onStatus(STATUS.REPAIR, 'Reparo iniciado manualmente pela oficina.', 'REPAIR_STARTED')
    });
  } else if (order.status === STATUS.REPAIR) {
    hint = 'Reparo em andamento. Solicite peça se necessário; se não houver peça pendente, avance para os testes.';
    actions.push(
      {
        label: 'Solicitar peça',
        Icon: Package,
        onClick: onAddPart
      },
      {
        label: 'Iniciar testes',
        Icon: TestTube2,
        onClick: () => onStatus(STATUS.FINAL_TESTS, 'Testes finais iniciados pela oficina.', 'FINAL_TEST_STARTED')
      }
    );
  } else if (order.status === STATUS.WAITING_PART) {
    hint = replaceablePart
      ? `Aguardando chegada/substituição da peça: ${replaceablePart.name}.`
      : 'Aguardando peça registrada para liberar a substituição.';

    if (replaceablePart) {
      actions.push({
        label: 'Substituir peça',
        Icon: Package,
        onClick: () => onReplacePart(replaceablePart.id)
      });
    }
  } else if (order.status === STATUS.FINAL_TESTS) {
    hint = 'Testes finais em execução. Finalize o serviço depois da validação.';
    actions.push({
      label: 'Finalizar serviço',
      Icon: CheckCircle2,
      onClick: () => onStatus(STATUS.FINISHED, 'Manutenção finalizada pela oficina.', 'MAINTENANCE_FINISHED')
    });
  } else if (order.status === STATUS.FINISHED) {
    hint = 'Serviço finalizado. Falta liberar o veículo para retirada.';
    actions.push({
      label: 'Liberar retirada',
      Icon: ClipboardCheck,
      onClick: () => onStatus(STATUS.READY_FOR_PICKUP, 'Veículo disponível para retirada.', 'STATUS_UPDATED')
    });
  } else if (order.status === STATUS.READY_FOR_PICKUP) {
    hint = 'Fluxo concluído. O veículo já está disponível para retirada.';
  } else if (order.status === STATUS.CANCELED) {
    hint = 'Ordem cancelada. Não há próximas etapas operacionais.';
  } else {
    hint = 'Status ainda não mapeado no fluxo guiado.';
  }

  return (
    <div className="workflow">
      <div className="section-title">
        <h3>Controle da oficina</h3>
        <span>fluxo guiado</span>
      </div>

      <div className="workflow-step">
        <Clock3 size={18} />
        <span>Status atual</span>
        <strong>{order.status}</strong>
      </div>

      <p className="workflow-hint">{hint}</p>

      {actions.length > 0 ? (
        <div className="action-row">
          {actions.map((action) => {
            const Icon = action.Icon;

            return (
              <button key={action.label} type="button" onClick={action.onClick} disabled={busy}>
                <Icon size={18} />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="workflow-empty">Nenhuma ação da oficina disponível neste momento.</p>
      )}
    </div>
  );
}
