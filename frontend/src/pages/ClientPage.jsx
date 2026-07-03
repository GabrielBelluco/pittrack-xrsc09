import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import LiveEvents from '../components/LiveEvents.jsx';
import LiveSession from '../components/LiveSession.jsx';
import MediaGallery from '../components/MediaGallery.jsx';
import Timeline from '../components/Timeline.jsx';
import { API_URL, approveBudget, fetchOrder } from '../services/api.js';

export default function ClientPage({ orderId }) {
  const [order, setOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const orderIdRef = useRef(orderId);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    try {
      const data = await fetchOrder(orderId);
      setOrder(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [orderId]);

  useEffect(() => {
    orderIdRef.current = orderId;
    void loadOrder();
  }, [orderId, loadOrder]);

  useEffect(() => {
    const nextSocket = io(API_URL);
    setSocket(nextSocket);

    nextSocket.on('connect', () => {
      setConnected(true);
      if (orderIdRef.current) {
        nextSocket.emit('join-order', orderIdRef.current);
      }
    });

    nextSocket.on('disconnect', () => setConnected(false));

    nextSocket.on('order-event', (event) => {
      if (Number(event.orderId) !== Number(orderIdRef.current)) {
        return;
      }

      setEvents((current) => [event, ...current].slice(0, 30));
      void loadOrder();
    });

    return () => {
      setSocket(null);
      nextSocket.disconnect();
    };
  }, [loadOrder]);

  async function handleApproveBudget() {
    if (!order) {
      return;
    }

    setBusy(true);
    try {
      setError('');
      await approveBudget(order.id);
      await loadOrder();
    } catch (approveError) {
      setError(approveError.message);
    } finally {
      setBusy(false);
    }
  }

  const latestBudget = order?.budgets?.[order.budgets.length - 1];
  const pendingBudget = latestBudget && !latestBudget.approved;

  return (
    <main className="client-shell">
      <section className="client-header panel">
        <div>
          <p className="eyebrow">Cliente</p>
          <h1>{order ? `Ordem #${order.id}` : 'Acompanhamento da ordem'}</h1>
          {order && (
            <p className="muted">
              {order.vehicle.plate} · {order.vehicle.model} · {order.customer.name}
            </p>
          )}
        </div>

        <div className="header-actions">
          <a className="link-button" href="/oficina">
            <ArrowLeft size={18} />
            Oficina
          </a>
          <button className="icon-button" type="button" onClick={loadOrder} title="Atualizar">
            <RefreshCw size={18} />
          </button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {!order && !error && (
        <section className="panel details-panel placeholder">
          <h2>Carregando ordem</h2>
          <p className="muted">Aguarde enquanto buscamos os dados da manutenção.</p>
        </section>
      )}

      {order && (
        <section className="client-grid">
          <div className="main-stack">
            <section className="panel details-panel client-summary">
              <div className="details-header">
                <div>
                  <p className="eyebrow">Status atual</p>
                  <h2>{order.status}</h2>
                </div>
                <span className="large-status">{order.status}</span>
              </div>

              <div className="complaint-box">
                <span>Relato registrado</span>
                <p>{order.complaint}</p>
              </div>

              {pendingBudget && (
                <div className="budget-approval">
                  <div>
                    <strong>Orçamento pendente</strong>
                    <span>{latestBudget.description}</span>
                    <small>R$ {Number(latestBudget.amount).toFixed(2)}</small>
                  </div>
                  <button type="button" onClick={handleApproveBudget} disabled={busy}>
                    <CheckCircle2 size={18} />
                    Aprovar
                  </button>
                </div>
              )}
            </section>

            <LiveSession
              order={order}
              socket={socket}
              busy={busy}
              defaultRole="cliente"
              allowedRoles={['cliente']}
            />

            <Timeline entries={order.timeline || []} />
          </div>

          <div className="side-stack">
            <MediaGallery media={order.media || []} parts={order.parts || []} budgets={order.budgets || []} />
            <LiveEvents events={events} connected={connected} />
          </div>
        </section>
      )}
    </main>
  );
}
