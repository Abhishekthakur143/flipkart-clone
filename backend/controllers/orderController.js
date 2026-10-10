const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

// Create New Order
exports.newOrder = async (req, res, next) => {
  try {
    const {
      shippingInfo,
      orderItems,
      paymentInfo,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountPrice,
      totalPrice,
      couponUsed,
      paymentMethod,
    } = req.body;

    const order = await Order.create({
      user: req.user._id,
      shippingInfo,
      items: orderItems,
      paymentInfo,
      paidAt: paymentMethod === 'Online' ? Date.now() : undefined,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountPrice,
      totalPrice,
      couponUsed,
      paymentMethod,
      trackingUpdates: [
        {
          status: 'Processing',
          location: 'Seller Warehouse',
          message: 'Order has been placed and is being processed',
        },
      ],
    });

    // Update product stock and sold count
    for (let item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock -= item.quantity;
        product.totalSold += item.quantity;
        await product.save({ validateBeforeSave: false });
      }
    }

    // Send order confirmation email
    try {
      const user = req.user;
      await sendEmail({
        email: user.email,
        subject: `Order Confirmed - #${order._id.toString().slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2874f0;">Order Confirmed!</h2>
            <p>Hi ${user.name},</p>
            <p>Your order has been placed successfully.</p>
            <p><strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
            <p><strong>Total:</strong> ₹${totalPrice.toLocaleString()}</p>
            <p><strong>Payment:</strong> ${paymentMethod === 'Online' ? 'Paid Online' : 'Cash on Delivery'}</p>
            <p>Thank you for shopping with us!</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending order email:', emailError);
    }

    res.status(201).json({
      success: true,
      order,
      message: 'Order placed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Order
exports.getSingleOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email phone'
    );

    if (!order) {
      return next(new ErrorHandler('Order not found', 404));
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Get Logged In User Orders
exports.myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get All Orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    let totalAmount = 0;
    orders.forEach((order) => {
      totalAmount += order.totalPrice;
    });

    res.status(200).json({
      success: true,
      orders,
      totalAmount,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update Order Status
exports.updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler('Order not found', 404));
    }

    if (order.orderStatus === 'Delivered') {
      return next(new ErrorHandler('This order has already been delivered', 400));
    }

    if (req.body.status === 'Shipped' && req.body.trackingId) {
      order.trackingId = req.body.trackingId;
    }

    // Add tracking update
    const statusMessages = {
      Processing: 'Order is being processed',
      Confirmed: 'Order has been confirmed by seller',
      Shipped: 'Order has been shipped',
      'Out for Delivery': 'Order is out for delivery',
      Delivered: 'Order has been delivered',
      Cancelled: 'Order has been cancelled',
      Returned: 'Return request has been processed',
    };

    order.trackingUpdates.push({
      status: req.body.status,
      location: req.body.location || '',
      message: req.body.message || statusMessages[req.body.status],
    });

    order.orderStatus = req.body.status;

    if (req.body.status === 'Delivered') {
      order.deliveredAt = Date.now();

      // If COD, mark payment as received
      if (order.paymentMethod === 'COD') {
        order.paymentInfo = {
          id: `COD_${order._id}`,
          status: 'Paid on Delivery',
        };
      }
    }

    if (req.body.status === 'Cancelled') {
      // Restore product stock
      for (let item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          product.totalSold -= item.quantity;
          await product.save({ validateBeforeSave: false });
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      order,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete Order
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler('Order not found', 404));
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};