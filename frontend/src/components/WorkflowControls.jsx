import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Package,
  PlayCircle,
  TestTube2,
  Wrench
} from 'lucide-react';

export default function WorkflowControls({
  order,
  busy,
  onStatus,
  onCreateBudget,
  onApproveBudget,
  onAddPart,
  onReplacePart
}) {
  const latestBudget = order.budgets?.[order.budgets.length - 1];
  const replaceablePart = order.parts?.find((part) => part.status !== 'Substituída');

  return (
    <div className="workflow">
      <div className="section-title">
        <h3>Controle da oficina</h3>
        <span>etapas manuais</span>
      </div>

      <div className="action-row">
        <button
          type="button"
          onClick={() => onStatus('Em Diagnóstico', 'Diagnóstico iniciado pela oficina.', 'DIAGNOSIS_STARTED')}
          disabled={busy}
        >
          <PlayCircle size={18} />
          Iniciar diagnóstico
        </button>

        <button
          type="button"
          onClick={() => onStatus('Em Diagnóstico', 'Diagnóstico concluído. Oficina pode gerar orçamento.', 'DIAGNOSIS_FINISHED')}
          disabled={busy}
        >
          <ClipboardCheck size={18} />
          Finalizar diagnóstico
        </button>

        <button type="button" onClick={onCreateBudget} disabled={busy}>
          <BadgeDollarSign size={18} />
          Gerar orçamento
        </button>

        <button type="button" onClick={onApproveBudget} disabled={busy || !latestBudget || latestBudget.approved}>
          <CheckCircle2 size={18} />
          Aprovar orçamento
        </button>

        <button
          type="button"
          onClick={() => onStatus('Em Reparo', 'Reparo iniciado manualmente pela oficina.', 'REPAIR_STARTED')}
          disabled={busy}
        >
          <Wrench size={18} />
          Iniciar reparo
        </button>

        <button type="button" onClick={onAddPart} disabled={busy}>
          <Package size={18} />
          Solicitar peça
        </button>

        <button type="button" onClick={() => onReplacePart(replaceablePart?.id)} disabled={busy || !replaceablePart}>
          <Package size={18} />
          Substituir peça
        </button>

        <button
          type="button"
          onClick={() => onStatus('Em Testes Finais', 'Testes finais iniciados pela oficina.', 'FINAL_TEST_STARTED')}
          disabled={busy}
        >
          <TestTube2 size={18} />
          Iniciar testes
        </button>

        <button
          type="button"
          onClick={() => onStatus('Finalizado', 'Manutenção finalizada pela oficina.', 'MAINTENANCE_FINISHED')}
          disabled={busy}
        >
          <CheckCircle2 size={18} />
          Finalizar serviço
        </button>

        <button
          type="button"
          onClick={() => onStatus('Disponível para Retirada', 'Veículo disponível para retirada.', 'STATUS_UPDATED')}
          disabled={busy}
        >
          <ClipboardCheck size={18} />
          Liberar retirada
        </button>
      </div>
    </div>
  );
}
