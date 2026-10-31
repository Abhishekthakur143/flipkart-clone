const ErrorHandler = require('../utils/errorHandler');
const { computeStats, rangeFor, PERIODS, IST, DAY } = require('../utils/analyticsCore');

// GET /admin/analytics?period=daily|weekly|monthly|yearly   (ya ?from=2026-11-01&to=2026-11-30)
exports.overview = async (req, res, next) => {
  try {
    let period = PERIODS.includes(req.query.period) ? req.query.period : 'monthly';
    let from;
    let to;

    if (req.query.from && req.query.to) {
      const f = new Date(`${req.query.from}T00:00:00+05:30`);
      const t = new Date(new Date(`${req.query.to}T00:00:00+05:30`).getTime() + DAY);
      if (isNaN(f) || isNaN(t) || t <= f) return next(new ErrorHandler('Please choose a valid date range', 400));
      if (t - f > 400 * DAY) return next(new ErrorHandler('Date range cannot be more than 400 days', 400));
      from = f; to = t; period = 'custom';
    } else {
      ({ from, to } = rangeFor(period));
    }

    const stats = await computeStats(from, to, period);
    const top = (a, k) => [...a].sort((x, y) => (y[k] || 0) - (x[k] || 0));
    res.json({
      success: true,
      period,
      from,
      to: new Date(to.getTime() - 1),
      company: stats.company,
      series: stats.series,
      partners: top(stats.partners, 'deliveries'),
      managers: top(stats.managers, 'margin'),
      sellers: top(stats.sellers, 'companyMargin'),
      users: top(stats.users, 'spent').slice(0, 100),
    });
  } catch (e) {
    next(e);
  }
};
