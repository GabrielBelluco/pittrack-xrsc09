import { BadgeDollarSign, CheckCircle2, Package, Video } from 'lucide-react';
import MediaGallery from './MediaGallery.jsx';
import Timeline from './Timeline.jsx';

export default function OrderDetails({
  order,
  busy,
  onCreateBudget,
  onApproveBudget,
  onAddPart,
  onAddVideo
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

  return (
    <section className="panel details-panel">
      <div className="details-header">
        <div>
          <p className="eyebrow">Ordem de serviço #{order.id}</p>
          <h2>{order.vehicle.plate} · {order.vehicle.model}</h2>
          <p className="muted">{order.customer.name} · {order.customer.phone}</p>
        </div>
        <span className="large-status">{order.status}</span>
      </div>

      <div className="complaint-box">
        <span>Relato do cliente</span>
        <p>{order.complaint}</p>
      </div>

      <div className="action-row">
        <button type="button" onClick={onCreateBudget} disabled={busy}>
          <BadgeDollarSign size={18} />
          Gerar orçamento
        </button>
        <button type="button" onClick={onApproveBudget} disabled={busy || !latestBudget || latestBudget.approved}>
          <CheckCircle2 size={18} />
          Aprovar
        </button>
        <button type="button" onClick={onAddPart} disabled={busy}>
          <Package size={18} />
          Registrar peça
        </button>
        <button type="button" onClick={onAddVideo} disabled={busy}>
          <Video size={18} />
          Registrar vídeo
        </button>
      </div>

      <div className="details-grid">
        <Timeline entries={order.timeline || []} />
        <MediaGallery media={order.media || []} parts={order.parts || []} budgets={order.budgets || []} />
      </div>
    </section>
  );
}
