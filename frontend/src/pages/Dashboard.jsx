import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import OrderList from '../components/OrderList.jsx';
import OrderDetails from '../components/OrderDetails.jsx';
import LiveEvents from '../components/LiveEvents.jsx';
import DiagnosisModal from '../components/DiagnosisModal.jsx';
import RejectModal from '../components/RejectModal.jsx';
import {
  API_URL,
  approveBudget,
  rejectBudget,
  createBudget,
  createSampleOrder,
  fetchOrder,
  fetchOrders,
  uploadMedia,
  startDiagnosis,
  registerDiagnosis,
  startRepair,
  finishMaintenance,
  cancelOrder
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
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [role, setRole] = useState('mecanico');
  const fileInputRef = useRef(null);
  const pendingUploadRef = useRef(null);
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

  function handleStartDiagnosis() {
    runAction(startDiagnosis);
  }

  function handleRegisterDiagnosis(data) {
    if (!selectedId) return;
    setBusy(true);
    try {
      setError('');
      registerDiagnosis(selectedId, data);
      setShowDiagnosisModal(false);
      loadOrders();
      loadOrder(selectedId);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  function handleRejectBudget(reason) {
    if (!selectedId) return;
    setBusy(true);
    try {
      setError('');
      rejectBudget(selectedId, reason);
      setShowRejectModal(false);
      loadOrders();
      loadOrder(selectedId);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  function handleStartRepair() {
    runAction(startRepair);
  }

  function handleFinishMaintenance() {
    if (window.confirm('Finalizar esta ordem de serviço?')) {
      runAction(finishMaintenance);
    }
  }

  function handleCancel() {
    if (window.confirm('Tem certeza que deseja cancelar esta ordem de serviço?')) {
      runAction(cancelOrder);
    }
  }

  function triggerFileUpload(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'photo' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !selectedId) return;
      const status = selectedOrder?.status;
      const step = status === 'DIAGNOSIS_IN_PROGRESS' ? 'DIAGNOSIS' : 'REPAIR';

      setBusy(true);
      try {
        setError('');
        await uploadMedia(selectedId, { step, type, file, description: '' });
        await loadOrders();
        await loadOrder(selectedId);
      } catch (uploadError) {
        setError(uploadError.message);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  function handleAddVideo() {
    triggerFileUpload('video');
  }

  function handleAddPhoto() {
    triggerFileUpload('photo');
  }

  return (
    <main className="app-shell">
      <OrderList
        orders={orders}
        selectedId={selectedId}
        loading={loading}
        role={role}
        onRoleChange={setRole}
        onCreate={handleCreateOrder}
        onRefresh={loadOrders}
        onSelect={setSelectedId}
      />

      <div className="center-column">
        {error && <div className="error-banner">{error}</div>}

        <OrderDetails
          order={selectedOrder}
          busy={busy}
          role={role}
          onCreateBudget={() => runAction(createBudget)}
          onApproveBudget={() => runAction(approveBudget)}
          onRejectBudget={() => setShowRejectModal(true)}
          onAddVideo={handleAddVideo}
          onAddPhoto={handleAddPhoto}
          onStartDiagnosis={handleStartDiagnosis}
          onRegisterDiagnosis={() => setShowDiagnosisModal(true)}
          onStartRepair={handleStartRepair}
          onFinishMaintenance={handleFinishMaintenance}
          onCancel={handleCancel}
        />
      </div>

      <LiveEvents events={events} connected={connected} />

      {showDiagnosisModal && (
        <DiagnosisModal
          busy={busy}
          onClose={() => setShowDiagnosisModal(false)}
          onSubmit={handleRegisterDiagnosis}
        />
      )}

      {showRejectModal && (
        <RejectModal
          busy={busy}
          onClose={() => setShowRejectModal(false)}
          onSubmit={handleRejectBudget}
        />
      )}
    </main>
  );
}
