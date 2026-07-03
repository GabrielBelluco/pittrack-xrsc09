const express = require('express');
const ordersService = require('../services/orders.service');
const { EVENT_TYPES } = require('../events/constants');
const { publishEvent } = require('../events/publisher');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getId(req) {
  return Number(req.params.id);
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
    const { status, note, createdBy } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'O campo status é obrigatório.' });
    }

    const order = await ordersService.updateOrderStatus(getId(req), status, note, createdBy);

    if (!order) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    await publishEvent(EVENT_TYPES.STATUS_UPDATED, {
      orderId: order.id,
      status,
      message: `Ordem #${order.id}: status atualizado para ${status}.`
    });

    return res.json(order);
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

router.get(
  '/:id/timeline',
  asyncHandler(async (req, res) => {
    const timeline = await ordersService.getTimeline(getId(req));
    res.json(timeline);
  })
);

module.exports = router;
