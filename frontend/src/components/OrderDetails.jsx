import { BadgeDollarSign, CheckCircle2, Video, Stethoscope, Wrench, Flag, XCircle, ThumbsDown, Camera } from 'lucide-react';
import MediaGallery from './MediaGallery.jsx';
import Timeline from './Timeline.jsx';

const TERMINAL = new Set(['COMPLETED', 'CANCELLED']);

export default function OrderDetails({
  order,
  busy,
  role,
  onCreateBudget,
  onApproveBudget,
  onRejectBudget,
  onAddVideo,
  onAddPhoto,
  onStartDiagnosis,
  onRegisterDiagnosis,
  onStartRepair,
  onFinishMaintenance,
  onCancel
}) {
  if (!order) {
    return (
      <section className="panel details-panel placeholder">
        <h2>Selecione ou crie uma ordem</h2>
        <p className="muted">
          O painel mostra a timeline, mídias, peças e orçamento da manutenção.
        </p>
      </section>
    );
  }

  const latestBudget = order.budgets?.[order.budgets.length - 1];
  const status = order.status;
  const isTerminal = TERMINAL.has(status);
  const isMecanico = role === 'mecanico';
  const hasDiagnosis = !!order.diagnosis?.description;

  return (
    <section className="panel details-panel">
      <div className="details-header">
        <div>
          <p className="eyebrow">Ordem de serviço #{order.id}</p>
          <h2>{order.vehicle.plate} · {order.vehicle.model}</h2>
          <p className="muted">{order.customer.name} · {order.customer.phone}</p>
        </div>
        <span className="large-status">{status}</span>
      </div>

      <div className="complaint-box">
        <span>Relato do cliente</span>
        <p>{order.complaint ? order.complaint : <em>Sem relato do cliente</em>}</p>
      </div>

      {!isTerminal && (
        <div className="action-row">
          {isMecanico && status === 'CREATED' && (
            <button type="button" onClick={onStartDiagnosis} disabled={busy}>
              <Stethoscope size={18} />
              Iniciar Diagnóstico
            </button>
          )}

          {isMecanico && status === 'DIAGNOSIS_IN_PROGRESS' && (
            <>
              <button type="button" onClick={onCreateBudget} disabled={busy || !hasDiagnosis} title={!hasDiagnosis ? 'Registre o diagnóstico primeiro' : ''}>
                <BadgeDollarSign size={18} />
                Gerar orçamento
              </button>
              <button type="button" onClick={onRegisterDiagnosis} disabled={busy}>
                <Stethoscope size={18} />
                Registrar Diagnóstico
              </button>
              <button type="button" onClick={onAddVideo} disabled={busy}>
                <Video size={18} />
                Transmitir ao vivo
              </button>
              <button type="button" onClick={onAddPhoto} disabled={busy}>
                <Camera size={18} />
                Foto do Diagnóstico
              </button>
            </>
          )}

          {!isMecanico && status === 'WAITING_APPROVAL' && (
            <>
              <button type="button" onClick={onApproveBudget} disabled={busy || !latestBudget || latestBudget.approved}>
                <CheckCircle2 size={18} />
                Aprovar
              </button>
              <button type="button" onClick={onRejectBudget} disabled={busy}>
                <ThumbsDown size={18} />
                Reprovar
              </button>
            </>
          )}

          {isMecanico && status === 'APPROVED' && (
            <button type="button" onClick={onStartRepair} disabled={busy}>
              <Wrench size={18} />
              Iniciar Reparo
            </button>
          )}

          {isMecanico && status === 'REPAIR_IN_PROGRESS' && (
            <>
              <button type="button" onClick={onFinishMaintenance} disabled={busy}>
                <Flag size={18} />
                Finalizar
              </button>
              <button type="button" onClick={onAddVideo} disabled={busy}>
                <Video size={18} />
                Transmitir ao vivo
              </button>
              <button type="button" onClick={onAddPhoto} disabled={busy}>
                <Camera size={18} />
                Foto do Reparo
              </button>
            </>
          )}

          {isMecanico && (
            <>
              <button type="button" className="danger-button" onClick={onCancel} disabled={busy}>
                <XCircle size={18} />
                Cancelar OS
              </button>
            </>
          )}
        </div>
      )}

      <div className="details-grid">
        <Timeline entries={order.timeline || []} />
        <MediaGallery orderId={order.id} media={order.media || []} budgets={order.budgets || []} />
      </div>
    </section>
  );
}
