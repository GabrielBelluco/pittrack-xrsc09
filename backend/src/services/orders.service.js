const { query, withTransaction } = require('../db');

const DEFAULT_STATUS = 'Aguardando Atendimento';

function mapOrder(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    complaint: row.complaint,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email
    },
    vehicle: {
      id: row.vehicle_id,
      plate: row.vehicle_plate,
      model: row.vehicle_model,
      year: row.vehicle_year
    },
    mediaCount: Number(row.media_count || 0),
    partCount: Number(row.part_count || 0)
  };
}

async function listOrders() {
  const result = await query(
    `
      SELECT
        so.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model,
        v.year AS vehicle_year,
        (SELECT COUNT(*) FROM media_records mr WHERE mr.service_order_id = so.id) AS media_count,
        (SELECT COUNT(*) FROM parts p WHERE p.service_order_id = so.id) AS part_count
      FROM service_orders so
      JOIN customers c ON c.id = so.customer_id
      JOIN vehicles v ON v.id = so.vehicle_id
      ORDER BY so.created_at DESC
    `
  );

  return result.rows.map(mapOrder);
}

async function getOrderSummary(id) {
  const result = await query(
    `
      SELECT
        so.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        v.plate AS vehicle_plate,
        v.model AS vehicle_model,
        v.year AS vehicle_year,
        (SELECT COUNT(*) FROM media_records mr WHERE mr.service_order_id = so.id) AS media_count,
        (SELECT COUNT(*) FROM parts p WHERE p.service_order_id = so.id) AS part_count
      FROM service_orders so
      JOIN customers c ON c.id = so.customer_id
      JOIN vehicles v ON v.id = so.vehicle_id
      WHERE so.id = $1
    `,
    [id]
  );

  return mapOrder(result.rows[0]);
}

async function getOrderById(id) {
  const [order, timeline, budgets, parts, media, activeLive] = await Promise.all([
    getOrderSummary(id),
    getTimeline(id),
    getBudgets(id),
    getParts(id),
    getMedia(id),
    getActiveLiveSession(id)
  ]);

  if (!order) {
    return null;
  }

  return {
    ...order,
    timeline,
    budgets,
    parts,
    media,
    activeLive
  };
}

async function createOrder(data) {
  const customer = data.customer || {};
  const vehicle = data.vehicle || {};

  const orderId = await withTransaction(async (client) => {
    const customerResult = await client.query(
      `
        INSERT INTO customers (name, phone, email)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [
        customer.name || 'Cliente Demonstração',
        customer.phone || '(35) 99999-0000',
        customer.email || 'cliente@pittrack.local'
      ]
    );

    const customerRow = customerResult.rows[0];

    const vehicleResult = await client.query(
      `
        INSERT INTO vehicles (customer_id, plate, model, year)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        customerRow.id,
        vehicle.plate || 'PTK-2026',
        vehicle.model || 'Hatch 1.6',
        vehicle.year || 2020
      ]
    );

    const vehicleRow = vehicleResult.rows[0];

    const orderResult = await client.query(
      `
        INSERT INTO service_orders (customer_id, vehicle_id, complaint, assigned_to, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        customerRow.id,
        vehicleRow.id,
        data.complaint || 'Cliente relata ruído ao frear e vibração em baixa velocidade.',
        data.assignedTo || 'Equipe Oficina A',
        DEFAULT_STATUS
      ]
    );

    const orderRow = orderResult.rows[0];

    await client.query(
      `
        INSERT INTO status_history (service_order_id, status, note, created_by)
        VALUES ($1, $2, $3, $4)
      `,
      [orderRow.id, DEFAULT_STATUS, 'Ordem de serviço aberta.', data.createdBy || 'api']
    );

    return orderRow.id;
  });

  return getOrderById(orderId);
}

async function updateOrderStatus(id, status, note, createdBy = 'api') {
  const updatedId = await withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE service_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return null;
    }

    await client.query(
      `
        INSERT INTO status_history (service_order_id, status, note, created_by)
        VALUES ($1, $2, $3, $4)
      `,
      [id, status, note || `Status atualizado para ${status}.`, createdBy]
    );

    return id;
  });

  if (!updatedId) {
    return null;
  }

  return getOrderById(updatedId);
}

async function createBudget(id, data) {
  const budget = await withTransaction(async (client) => {
    const order = await client.query('SELECT id FROM service_orders WHERE id = $1', [id]);

    if (order.rowCount === 0) {
      return null;
    }

    const budgetResult = await client.query(
      `
        INSERT INTO budgets (service_order_id, description, amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [
        id,
        data.description || 'Troca de pastilhas, limpeza do sistema de freio e teste final.',
        Number(data.amount || 890)
      ]
    );

    await client.query(
      `
        UPDATE service_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      ['Aguardando Aprovação', id]
    );

    await client.query(
      `
        INSERT INTO status_history (service_order_id, status, note, created_by)
        VALUES
          ($1, $2, $3, $4),
          ($1, $5, $6, $4)
      `,
      [
        id,
        'Orçamento Gerado',
        `Orçamento #${budgetResult.rows[0].id} criado.`,
        data.createdBy || 'api',
        'Aguardando Aprovação',
        'Cliente deve aprovar ou rejeitar o orçamento.'
      ]
    );

    return budgetResult.rows[0];
  });

  if (!budget) {
    return null;
  }

  return {
    order: await getOrderById(id),
    budget
  };
}

async function approveBudget(id, data = {}) {
  const budget = await withTransaction(async (client) => {
    const budgetId = data.budgetId;
    const budgetResult = await client.query(
      `
        WITH target_budget AS (
          SELECT id
          FROM budgets
          WHERE service_order_id = $1
            AND approved = FALSE
            AND ($2::INTEGER IS NULL OR id = $2::INTEGER)
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        )
        UPDATE budgets b
        SET approved = TRUE, approved_at = NOW()
        FROM target_budget t
        WHERE b.id = t.id
        RETURNING b.*
      `,
      [id, budgetId || null]
    );

    if (budgetResult.rowCount === 0) {
      return null;
    }

    await client.query(
      `
        UPDATE service_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      ['Aprovado', id]
    );

    await client.query(
      `
        INSERT INTO status_history (service_order_id, status, note, created_by)
        VALUES ($1, $2, $3, $4)
      `,
      [id, 'Aprovado', 'Orçamento aprovado pelo cliente.', data.createdBy || 'api']
    );

    return budgetResult.rows[0];
  });

  if (!budget) {
    return null;
  }

  return {
    order: await getOrderById(id),
    budget
  };
}

async function addPart(id, data) {
  const part = await withTransaction(async (client) => {
    const order = await client.query('SELECT id FROM service_orders WHERE id = $1', [id]);

    if (order.rowCount === 0) {
      return null;
    }

    const partResult = await client.query(
      `
        INSERT INTO parts (service_order_id, name, quantity, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [id, data.name || 'Pastilha de freio dianteira', Number(data.quantity || 1), 'Solicitada']
    );

    await client.query(
      `
        UPDATE service_orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      ['Aguardando Peça', id]
    );

    await client.query(
      `
        INSERT INTO status_history (service_order_id, status, note, created_by)
        VALUES ($1, $2, $3, $4)
      `,
      [id, 'Aguardando Peça', `Peça solicitada: ${partResult.rows[0].name}.`, data.createdBy || 'api']
    );

    return partResult.rows[0];
  });

  if (!part) {
    return null;
  }

  return {
    order: await getOrderById(id),
    part
  };
}

async function updatePartStatus(partId, status, trackingCode) {
  const result = await query(
    `
      UPDATE parts
      SET status = $1,
          tracking_code = COALESCE($2, tracking_code),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
    [status, trackingCode || null, partId]
  );

  return result.rows[0] || null;
}

async function recordPartReplacement(partId, description = 'Peça substituída no reparo.') {
  return withTransaction(async (client) => {
    const partResult = await client.query('SELECT * FROM parts WHERE id = $1', [partId]);

    if (partResult.rowCount === 0) {
      return null;
    }

    const part = partResult.rows[0];

    const replacementResult = await client.query(
      `
        INSERT INTO part_replacements (service_order_id, part_id, description)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [part.service_order_id, part.id, description]
    );

    await client.query(
      `
        UPDATE parts
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      ['Substituída', part.id]
    );

    return {
      part: {
        ...part,
        status: 'Substituída'
      },
      replacement: replacementResult.rows[0]
    };
  });
}

async function addMedia(id, data) {
  const media = await withTransaction(async (client) => {
    const order = await client.query('SELECT id FROM service_orders WHERE id = $1', [id]);

    if (order.rowCount === 0) {
      return null;
    }

    const result = await client.query(
      `
        INSERT INTO media_records (
          service_order_id,
          step,
          type,
          url,
          description,
          original_name,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        id,
        data.step || 'Diagnóstico',
        data.type || 'video',
        data.url || 'https://example.com/videos/diagnostico-demo.mp4',
        data.description || 'Registro visual enviado pela oficina.',
        data.originalName || null,
        data.mimeType || null,
        data.sizeBytes || null
      ]
    );

    return result.rows[0];
  });

  if (!media) {
    return null;
  }

  return {
    order: await getOrderById(id),
    media
  };
}

async function replacePart(id, partId, data = {}) {
  const replacement = await recordPartReplacement(
    partId,
    data.description || 'Peça substituída manualmente pela oficina.'
  );

  if (!replacement || Number(replacement.part.service_order_id) !== Number(id)) {
    return null;
  }

  const current = await getOrderSummary(id);

  if (current && current.status === 'Aguardando Peça') {
    await updateOrderStatus(
      id,
      'Em Reparo',
      'Peça recebida e reparo retomado.',
      data.createdBy || 'oficina'
    );
  }

  return {
    order: await getOrderById(id),
    part: replacement.part,
    replacement: replacement.replacement
  };
}

async function startLiveSession(id, data = {}) {
  const live = await withTransaction(async (client) => {
    const order = await client.query('SELECT id FROM service_orders WHERE id = $1', [id]);

    if (order.rowCount === 0) {
      return null;
    }

    await client.query(
      `
        UPDATE live_sessions
        SET status = 'ended', ended_at = NOW()
        WHERE service_order_id = $1
          AND status = 'active'
      `,
      [id]
    );

    const result = await client.query(
      `
        INSERT INTO live_sessions (service_order_id, status, started_by)
        VALUES ($1, 'active', $2)
        RETURNING *
      `,
      [id, data.startedBy || 'oficina']
    );

    return result.rows[0];
  });

  if (!live) {
    return null;
  }

  return {
    order: await getOrderById(id),
    live
  };
}

async function endLiveSession(id) {
  const result = await query(
    `
      UPDATE live_sessions
      SET status = 'ended', ended_at = NOW()
      WHERE service_order_id = $1
        AND status = 'active'
      RETURNING *
    `,
    [id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    order: await getOrderById(id),
    live: result.rows[0]
  };
}

async function getActiveLiveSession(id) {
  const result = await query(
    `
      SELECT *
      FROM live_sessions
      WHERE service_order_id = $1
        AND status = 'active'
      ORDER BY started_at DESC, id DESC
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getStatusHistory(id) {
  const result = await query(
    `
      SELECT *
      FROM status_history
      WHERE service_order_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [id]
  );

  return result.rows;
}

async function getBudgets(id) {
  const result = await query(
    `
      SELECT *
      FROM budgets
      WHERE service_order_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [id]
  );

  return result.rows;
}

async function getParts(id) {
  const result = await query(
    `
      SELECT *
      FROM parts
      WHERE service_order_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [id]
  );

  return result.rows;
}

async function getMedia(id) {
  const result = await query(
    `
      SELECT *
      FROM media_records
      WHERE service_order_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [id]
  );

  return result.rows;
}

async function getTimeline(id) {
  const [statuses, budgets, parts, media, replacements, lives] = await Promise.all([
    getStatusHistory(id),
    getBudgets(id),
    getParts(id),
    getMedia(id),
    query(
      `
        SELECT pr.*, p.name AS part_name
        FROM part_replacements pr
        JOIN parts p ON p.id = pr.part_id
        WHERE pr.service_order_id = $1
        ORDER BY pr.replaced_at ASC, pr.id ASC
      `,
      [id]
    ).then((result) => result.rows),
    query(
      `
        SELECT *
        FROM live_sessions
        WHERE service_order_id = $1
        ORDER BY started_at ASC, id ASC
      `,
      [id]
    ).then((result) => result.rows)
  ]);

  const entries = [
    ...statuses.map((item) => ({
      id: `status-${item.id}`,
      type: 'status',
      title: item.status,
      description: item.note,
      actor: item.created_by,
      timestamp: item.created_at
    })),
    ...budgets.map((item) => ({
      id: `budget-${item.id}`,
      type: 'budget',
      title: item.approved ? 'Orçamento aprovado' : 'Orçamento criado',
      description: `${item.description} - R$ ${Number(item.amount).toFixed(2)}`,
      actor: 'api',
      timestamp: item.approved_at || item.created_at
    })),
    ...parts.map((item) => ({
      id: `part-${item.id}`,
      type: 'part',
      title: `Peça ${item.status.toLowerCase()}`,
      description: `${item.quantity}x ${item.name}${item.tracking_code ? ` (${item.tracking_code})` : ''}`,
      actor: 'parts-worker',
      timestamp: item.updated_at || item.created_at
    })),
    ...media.map((item) => ({
      id: `media-${item.id}`,
      type: item.type,
      title: `${item.type === 'video' ? 'Vídeo' : 'Foto'} enviado: ${item.step}`,
      description: item.description,
      actor: 'api',
      timestamp: item.created_at,
      url: item.url
    })),
    ...lives.map((item) => ({
      id: `live-${item.id}`,
      type: 'live',
      title: item.status === 'active' ? 'Live iniciada' : 'Live encerrada',
      description: item.status === 'active'
        ? 'Transmissão ao vivo disponível para o cliente.'
        : 'Transmissão ao vivo encerrada pela oficina.',
      actor: item.started_by,
      timestamp: item.ended_at || item.started_at
    })),
    ...replacements.map((item) => ({
      id: `replacement-${item.id}`,
      type: 'part_replacement',
      title: `Peça substituída: ${item.part_name}`,
      description: item.description,
      actor: 'oficina',
      timestamp: item.replaced_at
    }))
  ];

  return entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  createBudget,
  approveBudget,
  addPart,
  replacePart,
  updatePartStatus,
  recordPartReplacement,
  addMedia,
  startLiveSession,
  endLiveSession,
  getActiveLiveSession,
  getTimeline
};
