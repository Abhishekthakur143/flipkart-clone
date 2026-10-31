const Order = require('../models/Order');
const Product = require('../models/Product');
const Deal = require('../models/Deal');
const User = require('../models/User');
const SellerProfile = require('../models/SellerProfile');
const DeliveryPartner = require('../models/DeliveryPartner');

// Saara hisaab India time (IST) me
const IST = 5.5 * 3600 * 1000;
const DAY = 864e5;
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

const dayStart = (d) => {
  const t = new Date(d.getTime() + IST);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - IST);
};
const dateKey = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);
const r2 = (n) => Math.round((n || 0) * 100) / 100;

// daily = aaj, weekly = is hafte (Mon se), monthly = is mahine, yearly = is saal
function rangeFor(period, ref = new Date()) {
  const today = dayStart(ref);
  const t = new Date(ref.getTime() + IST);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  let from;
  let to;
  if (period === 'daily') {
    from = today;
    to = new Date(today.getTime() + DAY);
  } else if (period === 'weekly') {
    from = new Date(today.getTime() - ((t.getUTCDay() + 6) % 7) * DAY);
    to = new Date(from.getTime() + 7 * DAY);
  } else if (period === 'yearly') {
    from = new Date(Date.UTC(y, 0, 1) - IST);
    to = new Date(Date.UTC(y + 1, 0, 1) - IST);
  } else {
    from = new Date(Date.UTC(y, m, 1) - IST);
    to = new Date(Date.UTC(y, m + 1, 1) - IST);
  }
  return { from, to, key: `${period}:${dateKey(from)}` };
}

const bucketOf = (period, d) => {
  if (period === 'daily') return `${String(new Date(new Date(d).getTime() + IST).getUTCHours()).padStart(2, '0')}:00`;
  if (period === 'yearly') return dateKey(d).slice(0, 7);
  return dateKey(d);
};

async function computeStats(from, to, period = 'monthly') {
  const inRange = { $gte: from, $lt: to };

  const [delivered, placed, failed, newProducts, managers, partners, sellers, profiles] = await Promise.all([
    Order.find({ orderStatus: 'Delivered', $or: [{ deliveredAt: inRange }, { 'delivery.deliveredAt': inRange }] })
      .select('items totalPrice deliveredAt updatedAt delivery.partner delivery.payout delivery.codCollected delivery.deliveredAt confirmedBy')
      .lean(),
    Order.find({ createdAt: inRange, orderStatus: { $nin: ['Cancelled', 'Returned'] } }).select('user totalPrice').lean(),
    Order.find({ 'delivery.failedAt': inRange }).select('delivery.partner').lean(),
    Product.find({ createdAt: inRange }).select('seller deal createdAt').lean(),
    User.find({ role: 'manager' }).select('name email').lean(),
    DeliveryPartner.find().select('name city').lean(),
    User.find({ role: 'seller' }).select('name email').lean(),
    SellerProfile.find().select('user invitedBy shopName').lean(),
  ]);

  // Delivered orders ke products (seller, dealPrice, deal)
  const ids = [...new Set(delivered.flatMap((o) => (o.items || []).map((i) => String(i.product))))];
  const prods = ids.length ? await Product.find({ _id: { $in: ids } }).select('seller dealPrice deal name').lean() : [];
  const pMap = new Map(prods.map((p) => [String(p._id), p]));

  const dealIds = [...new Set([...prods, ...newProducts].map((p) => p.deal).filter(Boolean).map(String))];
  const deals = dealIds.length ? await Deal.find({ _id: { $in: dealIds } }).lean() : [];
  const dMap = new Map(deals.map((d) => [String(d._id), d]));

  const mgrOfSeller = Object.fromEntries(profiles.map((p) => [String(p.user), p.invitedBy ? String(p.invitedBy) : null]));
  const shopOf = Object.fromEntries(profiles.map((p) => [String(p.user), p.shopName]));

  // Product kis manager ke under aata hai: Deal ka manager (agar field ho), nahi to jisne seller ko invite kiya
  const managerOf = (p) => {
    const d = p.deal && dMap.get(String(p.deal));
    const m = (d && (d.manager || d.managerId || d.approvedBy)) || mgrOfSeller[String(p.seller)];
    return m ? String(m) : null;
  };

  const M = Object.fromEntries(managers.map((u) => [String(u._id), {
    id: String(u._id), name: u.name, sub: u.email, productsAdded: 0, dealsHandled: 0, unitsSold: 0, margin: 0, ordersConfirmed: 0,
  }]));
  const S = Object.fromEntries(sellers.map((u) => [String(u._id), {
    id: String(u._id), name: u.name, sub: shopOf[String(u._id)] || u.email, productsAdded: 0, unitsSold: 0, earned: 0, sellerProfit: 0, companyMargin: 0,
  }]));
  const P = Object.fromEntries(partners.map((u) => [String(u._id), {
    id: String(u._id), name: u.name, sub: u.city || '', deliveries: 0, failed: 0, orderValue: 0, payout: 0, codCollected: 0, companyMargin: 0,
  }]));

  const co = { deliveredOrders: delivered.length, revenue: 0, margin: 0, ownRevenue: 0, deliveryPayout: 0, netProfit: 0, placedOrders: placed.length, placedValue: 0 };
  const series = {};

  for (const o of delivered) {
    let orderMargin = 0;
    let orderRev = 0;
    const seenMgr = new Set();
    for (const it of o.items || []) {
      const qty = it.quantity || 0;
      const rev = (it.price || 0) * qty;
      orderRev += rev;
      const p = pMap.get(String(it.product));
      if (p && p.seller && p.dealPrice != null) {
        const pay = p.dealPrice * qty;
        const mg = rev - pay; // company ka margin = customer price - seller ko diya hua rate
        orderMargin += mg;
        const s = S[String(p.seller)];
        if (s) {
          s.unitsSold += qty; s.earned += pay; s.companyMargin += mg;
          const d = p.deal && dMap.get(String(p.deal));
          if (d && d.costPrice != null) s.sellerProfit += (p.dealPrice - d.costPrice) * qty;
        }
        const mid = managerOf(p);
        if (mid && M[mid]) {
          M[mid].unitsSold += qty; M[mid].margin += mg;
          if (!seenMgr.has(mid)) { seenMgr.add(mid); M[mid].dealsHandled += 1; }
        }
      } else {
        co.ownRevenue += rev; // store ka apna product: cost pata nahi, isliye margin nahi
      }
    }
    const payout = o.delivery?.payout || 0;
    co.revenue += orderRev; co.margin += orderMargin; co.deliveryPayout += payout;

    const pa = o.delivery?.partner && P[String(o.delivery.partner)];
    if (pa) {
      pa.deliveries += 1; pa.orderValue += o.totalPrice || 0; pa.payout += payout;
      pa.codCollected += o.delivery.codCollected || 0; pa.companyMargin += orderMargin - payout;
    }
    if (o.confirmedBy && M[String(o.confirmedBy)]) M[String(o.confirmedBy)].ordersConfirmed += 1;

    const b = bucketOf(period, o.deliveredAt || o.delivery?.deliveredAt || o.updatedAt);
    series[b] = series[b] || { label: b, orders: 0, revenue: 0, profit: 0 };
    series[b].orders += 1; series[b].revenue += orderRev; series[b].profit += orderMargin - payout;
  }
  co.netProfit = co.margin - co.deliveryPayout;

  for (const f of failed) {
    const pa = f.delivery?.partner && P[String(f.delivery.partner)];
    if (pa) pa.failed += 1;
  }
  for (const np of newProducts) {
    if (!np.seller) continue;
    if (S[String(np.seller)]) S[String(np.seller)].productsAdded += 1;
    const mid = managerOf(np);
    if (mid && M[mid]) M[mid].productsAdded += 1;
  }

  // Customers: jis ne is period me order kiya
  const U = {};
  for (const o of placed) {
    const k = String(o.user);
    U[k] = U[k] || { id: k, orders: 0, spent: 0 };
    U[k].orders += 1; U[k].spent += o.totalPrice || 0;
    co.placedValue += o.totalPrice || 0;
  }
  const uIds = Object.keys(U);
  const uDocs = uIds.length ? await User.find({ _id: { $in: uIds } }).select('name email').lean() : [];
  uDocs.forEach((u) => { U[String(u._id)].name = u.name; U[String(u._id)].sub = u.email; });

  Object.keys(co).forEach((k) => { co[k] = r2(co[k]); });
  return {
    company: co,
    series: Object.values(series).sort((a, b) => a.label.localeCompare(b.label)).map((s) => ({ ...s, revenue: r2(s.revenue), profit: r2(s.profit) })),
    users: Object.values(U).filter((u) => u.name),
    managers: Object.values(M),
    sellers: Object.values(S),
    partners: Object.values(P),
  };
}

module.exports = { computeStats, rangeFor, PERIODS, IST, DAY };
