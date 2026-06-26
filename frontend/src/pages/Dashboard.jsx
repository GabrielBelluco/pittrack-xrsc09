import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import OrderList from '../components/OrderList.jsx';
import OrderDetails from '../components/OrderDetails.jsx';
import LiveEvents from '../components/LiveEvents.jsx';
import {
  API_URL,
  addPart,
  addVideo,
  approveBudget,
  createBudget,
  createSampleOrder,
  fetchOrder,
  fetchOrders
} from '../services/api.js';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const selectedIdRef = useRef(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
      setError('');

      if (!selectedIdRef.current && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrder = useCallback(async (id) => {
    if (!id) {
      setSelectedOrder(null);
      return;
    }

    try {
      const data = await fetchOrder(id);
      setSelectedOrder(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    void loadOrder(selectedId);
  }, [selectedId, loadOrder]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const socket = io(API_URL);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('order-event', (event) => {
      setEvents((current) => [event, ...current].slice(0, 30));
      void loadOrders();

      if (event.orderId && event.orderId === selectedIdRef.current) {
        void loadOrder(event.orderId);
      }
    });

    return () => socket.disconnect();
  }, [loadOrder, loadOrders]);

  async function runAction(action) {
    if (!selectedId) {
      return;
    }

    setBusy(true);
    try {
      setError('');
      await action(selectedId);
      await loadOrders();
      await loadOrder(selectedId);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    setBusy(true);
    try {
      setError('');
      const order = await createSampleOrder();
      await loadOrders();
      setSelectedId(order.id);
      await loadOrder(order.id);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <OrderList
        orders={orders}
        selectedId={selectedId}
        loading={loading}
        onCreate={handleCreateOrder}
        onRefresh={loadOrders}
        onSelect={setSelectedId}
      />

      <div className="center-column">
        {error && <div className="error-banner">{error}</div>}

        <OrderDetails
          order={selectedOrder}
          busy={busy}
          onCreateBudget={() => runAction(createBudget)}
          onApproveBudget={() => runAction(approveBudget)}
          onAddPart={() => runAction(addPart)}
          onAddVideo={() => runAction(addVideo)}
        />
      </div>

      <LiveEvents events={events} connected={connected} />
    </main>
  );
}
