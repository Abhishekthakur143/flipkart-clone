const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorHandler = require('../utils/errorHandler');

const ACTIVE = ['Assigned', 'Picked Up', 'Out for Delivery'];
const CLOSED = ['Cancelled', 'Returned'];
const LOW_STOCK = 5;

// Order kis step me hai (admin Deliveries page jaisa hi)
const stageOf = (o) => {
  if (CLOSED.includes(o.orderStatus)) return 'closed';
  if (o.orderStatus === 'Delivered' || o.delivery?.status === 'Delivered') return 'done';
  if (ACTIVE.includes(o.delivery?.status)) return 'moving';
  if (o.orderStatus === 'Processing') return 'new';
  return 'ready';
};

const ORDER_FIELDS =
  'items shippingInfo paymentMethod totalPrice orderStatus createdAt delivery.status delivery.partner delivery.assignedAt delivery.failReason';

// GET /manager/dashboard
exports.dashboard = async (req, res, next) => {
  try {
    const [products, orders] = await Promise.all([
      Product.find()
        .select('name stock price images category totalSold isActive')
        .populate('category', 'name')
        .sort({ stock: 1, name: 1 })
        .lean(),
      Order.find()
        .select(ORDER_FIELDS)
        .populate('user', 'name')
        .populate('delivery.partner', 'name phone')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const g = { new: [], ready: [], moving: [], done: [], closed: [] };
    orders.forEach((o) => g[stageOf(o)].push(o));

    const stats = {
      totalProducts: products.length,
      totalStock: products.reduce((a, p) => a + Math.max(p.stock || 0, 0), 0),
      outOfStock: products.filter((p) => p.stock <= 0).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
      totalOrders: orders.length,
      pendingOrders: g.new.length,        // abhi confirm karna baaki
      readyToAssign: g.ready.length,      // confirmed, delivery boy chahiye
      deliveryOrders: g.moving.length,    // delivery boy ke paas
      deliveredOrders: g.done.length,
    };

    const slim = (o) => ({
      _id: o._id,
      user: o.user,
      city: o.shippingInfo?.city,
      pincode: o.shippingInfo?.pincode,
      totalPrice: o.totalPrice,
      paymentMethod: o.paymentMethod,
      orderStatus: o.orderStatus,
      deliveryStatus: o.delivery?.status,
      partner: o.delivery?.partner || null,
      itemCount: (o.items || []).reduce((a, i) => a + i.quantity, 0),
      createdAt: o.createdAt,
    });

    res.json({
      success: true,
      lowStockLimit: LOW_STOCK,
      stats,
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        price: p.price,
        totalSold: p.totalSold,
        isActive: p.isActive,
        category: p.category?.name || '',
        image: p.images?.[0]?.url || '',
      })),
      pending: g.new.slice(0, 8).map(slim),
      delivery: g.moving.slice(0, 8).map(slim),
    });
  } catch (e) {
    next(e);
  }
};

// GET /manager/orders : saare orders (manager sirf operations dekhta hai)
exports.listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .select(ORDER_FIELDS)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, orders, count: orders.length });
  } catch (e) {
    next(e);
  }
};

// PUT /manager/orders/:id/confirm : Processing -> Confirmed
exports.confirmOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler('Order not found', 404));
    if (order.orderStatus !== 'Processing') {
      return next(new ErrorHandler(`Only new orders can be confirmed (this one is ${order.orderStatus})`, 400));
    }
    order.orderStatus = 'Confirmed';
    order.trackingUpdates.push({
      status: 'Confirmed',
      message: 'Order has been confirmed by the store manager',
    });
    await order.save();
    res.json({ success: true, message: 'Order confirmed' });
  } catch (e) {
    next(e);
  }
};
