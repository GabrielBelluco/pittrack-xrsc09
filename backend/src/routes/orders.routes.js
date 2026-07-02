const express = require('express');
const multer = require('multer');
const path = require('path');
const ordersService = require('../services/orders.service');
const { EVENT_TYPES } = require('../events/constants');
const { publishEvent } = require('../events/publisher');
const { UPLOAD_DIR, ensureUploadDir } = require('../config/uploads');

const router = express.Router();
ensureUploadDir();

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename(req, file, callback) {
      const extension = path.extname(file.originalname || '');
      const safeExtension = extension.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
      callback(null, name);
    }
  }),
  limits: {
    fileSize: 80 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Envie apenas arquivos de imagem ou vídeo.'));
  }
});

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getId(req) {
  return Number(req.params.id);
}

function eventForStatus(status, requestedEvent) {
  if (requestedEvent && EVENT_TYPES[requestedEvent]) {
    return EVENT_TYPES[requestedEvent];
  }

  const mapping = {
    'Em Diagnóstico': EVENT_TYPES.DIAGNOSIS_STARTED,
    'Em Reparo': EVENT_TYPES.REPAIR_STARTED,
    'Em Testes Finais': EVENT_TYPES.FINAL_TEST_STARTED,
    Finalizado: EVENT_TYPES.MAINTENANCE_FINISHED
  };

  return mapping[status] || EVENT_TYPES.STATUS_UPDATED;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await ordersService.listOrders();
    res.json(orders);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(getId(req));

    if (!order) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    return res.json(order);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body || {});

    await publishEvent(EVENT_TYPES.SERVICE_ORDER_CREATED, {
      orderId: order.id,
      status: order.status,
      customerName: order.customer.name,
      vehiclePlate: order.vehicle.plate,
      message: `Ordem #${order.id} criada para ${order.vehicle.plate}.`
    });

    res.status(201).json(order);
  })
);

router.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status, note, createdBy, eventType } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'O campo status é obrigatório.' });
    }

    const order = await ordersService.updateOrderStatus(getId(req), status, note, createdBy);

    if (!order) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const type = eventForStatus(status, eventType);

    await publishEvent(type, {
      orderId: order.id,
      status,
      message: note || `Ordem #${order.id}: status atualizado para ${status}.`
    });

    return res.json(order);
  })
);

router.post(
  '/:id/parts/:partId/replace',
  asyncHandler(async (req, res) => {
    const result = await ordersService.replacePart(getId(req), Number(req.params.partId), req.body || {});

    if (!result) {
      return res.status(404).json({ error: 'Peça não encontrada nesta ordem de serviço.' });
    }

    await publishEvent(EVENT_TYPES.PART_REPLACED, {
      orderId: result.order.id,
      partId: result.part.id,
      message: `Peça #${result.part.id} substituída na ordem #${result.order.id}.`
    });

    return res.json(result);
  })
);

router.post(
  '/:id/budget',
  asyncHandler(async (req, res) => {
    const result = await ordersService.createBudget(getId(req), req.body || {});

    if (!result) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.BUDGET_CREATED, {
      orderId: result.order.id,
      budgetId: result.budget.id,
      amount: Number(result.budget.amount),
      status: result.order.status,
      message: `Orçamento #${result.budget.id} criado para a ordem #${result.order.id}.`
    });

    return res.status(201).json(result);
  })
);

router.post(
  '/:id/approve-budget',
  asyncHandler(async (req, res) => {
    const result = await ordersService.approveBudget(getId(req), req.body || {});

    if (!result) {
      return res.status(404).json({ error: 'Nenhum orçamento pendente encontrado para esta ordem.' });
    }

    await publishEvent(EVENT_TYPES.BUDGET_APPROVED, {
      orderId: result.order.id,
      budgetId: result.budget.id,
      status: result.order.status,
      message: `Orçamento #${result.budget.id} aprovado. Reparos liberados.`
    });

    return res.json(result);
  })
);

router.post(
  '/:id/parts',
  asyncHandler(async (req, res) => {
    const result = await ordersService.addPart(getId(req), req.body || {});

    if (!result) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.PART_RESERVED, {
      orderId: result.order.id,
      partId: result.part.id,
      partName: result.part.name,
      status: result.part.status,
      message: `Peça registrada para reserva: ${result.part.name}.`
    });

    return res.status(201).json(result);
  })
);

router.post(
  '/:id/videos',
  asyncHandler(async (req, res) => {
    const result = await ordersService.addMedia(getId(req), {
      ...(req.body || {}),
      type: (req.body && req.body.type) || 'video'
    });

    if (!result) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.VIDEO_UPLOADED, {
      orderId: result.order.id,
      mediaId: result.media.id,
      step: result.media.step,
      url: result.media.url,
      message: `Vídeo registrado na etapa ${result.media.step}.`
    });

    return res.status(201).json(result);
  })
);

router.post(
  '/:id/media',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'O arquivo de mídia é obrigatório.' });
    }

    const type = req.file.mimetype.startsWith('video/') ? 'video' : 'foto';
    const result = await ordersService.addMedia(getId(req), {
      step: req.body.step,
      type,
      url: `/uploads/${req.file.filename}`,
      description: req.body.description,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    });

    if (!result) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.MEDIA_UPLOADED, {
      orderId: result.order.id,
      mediaId: result.media.id,
      step: result.media.step,
      type: result.media.type,
      url: result.media.url,
      message: `${result.media.type === 'video' ? 'Vídeo' : 'Foto'} enviado na etapa ${result.media.step}.`
    });

    return res.status(201).json(result);
  })
);

router.post(
  '/:id/live/start',
  asyncHandler(async (req, res) => {
    const result = await ordersService.startLiveSession(getId(req), req.body || {});

    if (!result) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.LIVE_STARTED, {
      orderId: result.order.id,
      liveId: result.live.id,
      message: `Live iniciada para a ordem #${result.order.id}.`
    });

    return res.status(201).json(result);
  })
);

router.post(
  '/:id/live/end',
  asyncHandler(async (req, res) => {
    const result = await ordersService.endLiveSession(getId(req));

    if (!result) {
      return res.status(404).json({ error: 'Nenhuma live ativa encontrada para esta ordem.' });
    }

    await publishEvent(EVENT_TYPES.LIVE_ENDED, {
      orderId: result.order.id,
      liveId: result.live.id,
      message: `Live encerrada para a ordem #${result.order.id}.`
    });

    return res.json(result);
  })
);

router.get(
  '/:id/timeline',
  asyncHandler(async (req, res) => {
    const timeline = await ordersService.getTimeline(getId(req));
    res.json(timeline);
  })
);

module.exports = router;
