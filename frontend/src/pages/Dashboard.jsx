import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import OrderList from '../components/OrderList.jsx';
import OrderDetails from '../components/OrderDetails.jsx';
import LiveEvents from '../components/LiveEvents.jsx';
import {
  API_URL,
  addPart,
  approveBudget,
  createBudget,
  createSampleOrder,
  endLive,
  fetchOrder,
  fetchOrders,
  replacePart,
  startLive,
  updateOrderStatus,
  uploadMedia
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
  const [socket, setSocket] = useState(null);
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
    setSocket(socket);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('order-event', (event) => {
      setEvents((current) => [event, ...current].slice(0, 30));
      void loadOrders();

      if (event.orderId && Number(event.orderId) === Number(selectedIdRef.current)) {
        void loadOrder(event.orderId);
      }
    });

    return () => {
      setSocket(null);
      socket.disconnect();
    };
  }, [loadOrder, loadOrders]);

  useEffect(() => {
    if (socket && selectedId) {
      socket.emit('join-order', selectedId);
    }
  }, [socket, selectedId]);

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

  async function runSelectedAction(action) {
    if (!selectedId) {
      return;
    }

    setBusy(true);
    try {
      setError('');
      await action();
      await loadOrders();
      await loadOrder(selectedId);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function runLiveAction(action) {
    if (!selectedId) {
      return null;
    }

    setBusy(true);
    try {
      setError('');
      const result = await action(selectedId);
      await loadOrders();
      await loadOrder(selectedId);
      return result;
    } catch (actionError) {
      setError(actionError.message);
      throw actionError;
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
          socket={socket}
          busy={busy}
          onStatus={(status, note, eventType) => runSelectedAction(() => updateOrderStatus(selectedId, status, note, eventType))}
          onCreateBudget={() => runAction(createBudget)}
          onApproveBudget={() => runAction(approveBudget)}
          onAddPart={() => runAction(addPart)}
          onReplacePart={(partId) => {
            if (partId) {
              return runSelectedAction(() => replacePart(selectedId, partId));
            }
            return undefined;
          }}
          onUploadMedia={(media) => runSelectedAction(() => uploadMedia(selectedId, media))}
          onStartLive={() => runLiveAction(startLive)}
          onEndLive={() => runLiveAction(endLive)}
        />
      </div>

      <LiveEvents events={events} connected={connected} />
    </main>
  );
}
