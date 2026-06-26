export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  return request(`/orders/${orderId}/budget`, {
    method: 'POST',
    body: JSON.stringify({
      description: 'Diagnóstico, troca de pastilhas, revisão de fluido e teste final.',
      amount: 1180
    })
  });
}

export function approveBudget(orderId) {
  return request(`/orders/${orderId}/approve-budget`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export function addPart(orderId) {
  return request(`/orders/${orderId}/parts`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Kit de pastilhas dianteiras',
      quantity: 1
    })
  });
}

export function addVideo(orderId) {
  return request(`/orders/${orderId}/videos`, {
    method: 'POST',
    body: JSON.stringify({
      step: 'Diagnóstico',
      type: 'video',
      url: 'https://example.com/videos/diagnostico-freio.mp4',
      description: 'Registro do ruído identificado durante o teste de frenagem.'
    })
  });
}
