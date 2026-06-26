import { Plus, RefreshCw } from 'lucide-react';

export default function OrderList({ orders, selectedId, loading, onCreate, onRefresh, onSelect }) {
  return (
    <aside className="panel orders-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Oficina</p>
          <h1>PitTrack</h1>
        </div>
        <button className="icon-button" type="button" onClick={onRefresh} title="Atualizar ordens">
          <RefreshCw size={18} />
        </button>
      </div>

      <button className="primary-button" type="button" onClick={onCreate}>
        <Plus size={18} />
        Criar ordem exemplo
      </button>

      <div className="order-list" aria-live="polite">
        {loading && <p className="muted">Carregando ordens...</p>}

        {!loading && orders.length === 0 && (
          <p className="empty-state">Nenhuma ordem registrada.</p>
        )}

        {orders.map((order) => (
          <button
            className={`order-card ${selectedId === order.id ? 'selected' : ''}`}
            key={order.id}
            type="button"
            onClick={() => onSelect(order.id)}
          >
            <span className="order-card-top">
              <strong>OS #{order.id}</strong>
              <span className="status-pill">{order.status}</span>
            </span>
            <span>{order.customer.name}</span>
            <span className="muted">
              {order.vehicle.plate} · {order.vehicle.model}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
