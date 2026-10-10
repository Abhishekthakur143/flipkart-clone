const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');

// Get Dashboard Stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalCategories = await Category.countDocuments();

    const orders = await Order.find();
    const totalRevenue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Processing' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });

    // Monthly revenue for chart (last 12 months)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'Cancelled' },
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Category-wise sales
    const categorySales = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          totalSales: { $sum: '$items.price' },
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 },
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top selling products
    const topProducts = await Product.find()
      .sort({ totalSold: -1 })
      .limit(5)
      .populate('category', 'name');

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalProducts,
        totalUsers,
        totalCategories,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
      },
      monthlyRevenue,
      categorySales,
      recentOrders,
      topProducts,
    });
  } catch (error) {
    next(error);
  }
};