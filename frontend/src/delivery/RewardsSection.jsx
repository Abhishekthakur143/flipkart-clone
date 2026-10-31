import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineGift, HiOutlineStar } from 'react-icons/hi';
import { dv, errMsg } from './deliveryApi';
import { Empty, Skeleton, StatCard, inr, fmtTime } from './ui';

const METRIC = { deliveries: 'Deliveries', orderValue: 'Order value delivered', companyMargin: 'Profit to company' };
const MONEY = ['orderValue', 'companyMargin'];
const GIFT = { bonus: 'Cash bonus', points: 'Points', badge: 'Badge', commission: 'Commission discount', other: 'Surprise', coupon: 'Coupon' };
const PERIOD = { daily: 'today', weekly: 'this week', monthly: 'this month', yearly: 'this year' };
const show = (m, n) => (MONEY.includes(m) ? inr(n) : n);

/* ---------- Rewards (gifts + targets) ---------- */
const RewardsSection = () => {
  const [d, setD] = useState(null);

  useEffect(() => {
    dv.rewards().then(setD).catch((e) => { toast.error(errMsg(e, 'Could not load rewards')); setD({ rewards: [], targets: [], totals: { count: 0, cash: 0 } }); });
  }, []);

  if (!d) return <Skeleton h={220} n={2} />;

  return (
    <>
      <div className="dv-grid4">
        <StatCard icon={HiOutlineGift} tone="violet" label="Gifts received" value={d.totals.count} hint="Great work!" />
        <StatCard icon={HiOutlineStar} tone="amber" label="Cash bonus total" value={inr(d.totals.cash)} hint="From rewards" />
      </div>

      <div className="dv-card" style={{ marginBottom: 18 }}>
        <h4 style={{ marginBottom: 14 }}>Your targets</h4>
        {d.targets.length === 0 ? (
          <Empty icon={HiOutlineStar} title="No active targets" text="New targets will show up here." />
        ) : d.targets.map((t) => (
          <div key={t._id} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{METRIC[t.metric] || t.metric}: {show(t.metric, t.target)} {PERIOD[t.period]}</p>
                <p className="dv-note">Gift: {t.giftTitle}{t.amount > 0 ? ` · ${inr(t.amount)}` : ''}</p>
              </div>
              <b style={{ color: t.achieved ? 'var(--dv-accent)' : 'inherit', whiteSpace: 'nowrap' }}>
                {t.achieved ? 'Reached!' : `${show(t.metric, t.current)} / ${show(t.metric, t.target)}`}
              </b>
            </div>
            <div style={{ height: 10, borderRadius: 10, background: 'rgba(128,128,128,.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (t.current / t.target) * 100)}%`, background: 'var(--dv-accent)', borderRadius: 10, transition: 'width .6s' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="dv-card">
        <h4 style={{ marginBottom: 14 }}>Gift history</h4>
        {d.rewards.length === 0 ? (
          <Empty icon={HiOutlineGift} title="No gifts yet" text="Hit your targets and surprises will land here." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dv-table">
              <thead><tr><th>Date</th><th>Gift</th><th className="n">Value</th><th>Status</th></tr></thead>
              <tbody>
                {d.rewards.map((r) => (
                  <tr key={r._id}>
                    <td>{fmtTime(r.givenAt || r.createdAt)}</td>
                    <td><b>{r.title}</b><br /><span className="dv-note">{GIFT[r.giftType]}{r.note ? ` · ${r.note}` : ''}</span></td>
                    <td className="n">{r.amount > 0 ? inr(r.amount) : '-'}</td>
                    <td>{r.status === 'Given' ? 'Received' : 'Under review'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default RewardsSection;
