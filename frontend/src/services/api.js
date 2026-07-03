export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:3003';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error((payload && payload.error) || `Erro HTTP ${response.status}`);
  }

  return payload;
}

export function fetchOrders() {
  return request('/orders');
}

export function fetchOrder(id) {
  return request(`/orders/${id}`);
}

export function createSampleOrder() {
  const suffix = Math.floor(1000 + Math.random() * 9000);

  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer: {
        name: `Cliente ${suffix}`,
        phone: `(35) 9${suffix}-2026`,
        email: `cliente${suffix}@pittrack.local`
      },
      vehicle: {
        plate: `PTK-${suffix}`,
        model: 'Sedan 2.0',
        year: 2019
      },
      complaint: 'Cliente relata ruído ao frear, luz de revisão acesa e perda de desempenho.',
      assignedTo: 'Equipe Box 2'
    })
  });
}

export function createBudget(orderId) {
  const budgetId = crypto.randomUUID();
  return request(`/orders/${orderId}/budget`, {
    method: 'POST',
    body: JSON.stringify({
      budgetId,
      items: [{
        id: crypto.randomUUID(),
        description: 'Diagnóstico, troca de pastilhas, revisão de fluido e teste final.',
        quantity: 1,
        unitPrice: 1180,
        totalPrice: 1180
      }],
      totalAmount: 1180
    })
  });
}

export function approveBudget(orderId) {
  return request(`/orders/${orderId}/approve-budget`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function uploadMedia(orderId, { step, type, description, file }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('orderId', orderId);
  formData.append('step', step);
  formData.append('type', type);
  if (description) formData.append('description', description);

  const response = await fetch(`${MEDIA_URL}/media/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const payload = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    throw new Error((payload && payload.error) || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchMedia(orderId) {
  const response = await fetch(`${MEDIA_URL}/media/${orderId}`);
  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }
  return response.json();
}

export function startDiagnosis(orderId) {
  return request(`/orders/${orderId}/diagnosis/start`, { method: 'POST', body: JSON.stringify({}) });
}

export function registerDiagnosis(orderId, { description, rootCause, observations } = {}) {
  return request(`/orders/${orderId}/diagnosis`, {
    method: 'POST',
    body: JSON.stringify({
      description: description || 'Diagnóstico padrão',
      rootCause,
      observations
    })
  });
}

export function rejectBudget(orderId, reason) {
  return request(`/orders/${orderId}/budget/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || '' })
  });
}

export function startRepair(orderId) {
  return request(`/orders/${orderId}/repair/start`, { method: 'POST', body: JSON.stringify({}) });
}

export function startFinalTest(orderId) {
  return request(`/orders/${orderId}/repair/final-test`, { method: 'POST', body: JSON.stringify({}) });
}

export function finishMaintenance(orderId) {
  return request(`/orders/${orderId}/repair/finish`, { method: 'POST', body: JSON.stringify({}) });
}

export function cancelOrder(orderId) {
  return request(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelado pelo usuário' }) });
}
