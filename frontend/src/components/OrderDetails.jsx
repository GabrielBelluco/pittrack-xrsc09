import MediaGallery from './MediaGallery.jsx';
import MediaUploader from './MediaUploader.jsx';
import LiveSession from './LiveSession.jsx';
import Timeline from './Timeline.jsx';
import WorkflowControls from './WorkflowControls.jsx';

export default function OrderDetails({
  order,
  socket,
  busy,
  onStatus,
  onCreateBudget,
  onApproveBudget,
  onAddPart,
  onReplacePart,
  onUploadMedia,
  onStartLive,
  onEndLive,
  clientLink
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

  return (
    <section className="panel details-panel">
      <div className="details-header">
        <div>
          <p className="eyebrow">Ordem de serviço #{order.id}</p>
          <h2>{order.vehicle.plate} · {order.vehicle.model}</h2>
          <p className="muted">{order.customer.name} · {order.customer.phone}</p>
        </div>
        <div className="header-actions">
          {clientLink && (
            <a className="link-button" href={clientLink} target="_blank" rel="noreferrer">
              Visão do cliente
            </a>
          )}
          <span className="large-status">{order.status}</span>
        </div>
      </div>

      <div className="complaint-box">
        <span>Relato do cliente</span>
        <p>{order.complaint}</p>
      </div>

      <WorkflowControls
        order={order}
        busy={busy}
        onStatus={onStatus}
        onCreateBudget={onCreateBudget}
        onApproveBudget={onApproveBudget}
        onAddPart={onAddPart}
        onReplacePart={onReplacePart}
      />

      <div className="details-grid">
        <div className="main-stack">
          <LiveSession
            order={order}
            socket={socket}
            busy={busy}
            defaultRole="oficina"
            allowedRoles={['oficina']}
            onStartLive={onStartLive}
            onEndLive={onEndLive}
          />
          <MediaUploader busy={busy} onUpload={onUploadMedia} />
          <Timeline entries={order.timeline || []} />
        </div>

        <MediaGallery media={order.media || []} parts={order.parts || []} budgets={order.budgets || []} />
      </div>
    </section>
  );
}
