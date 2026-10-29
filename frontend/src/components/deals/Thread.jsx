import { formatPrice } from '../../utils/constants';
import './deals.css';

const WHAT = {
  proposed: 'asked', countered: 'offered', accepted: 'accepted', rejected: 'closed the deal',
  withdrawn: 'withdrew', submitted: 'sent it to the admin at', approved: 'Admin approved', admin_rejected: 'Admin declined',
};
const WHO = { seller: 'Seller', manager: 'Manager', admin: '' };

// Deal ki baat-cheet (kisne kya rate bola). viewer = 'seller' ya 'staff'
const Thread = ({ events = [], viewer = 'staff' }) => (
  <div className="dl-thread" aria-label="Deal history">
    {events.map((e, i) => {
      const mine = viewer === 'seller' ? e.by === 'seller' : e.by === 'manager';
      const who = viewer === 'seller' ? (e.by === 'seller' ? 'You' : WHO[e.by]) : WHO[e.by];
      return (
        <div key={i} className={`dl-ev ${mine ? 'me' : ''}`}>
          <b>{who}{who ? ' ' : ''}{WHAT[e.type] || e.type}{e.price != null ? ` ${formatPrice(e.price)} per unit` : ''}</b>
          {e.note ? <i>“{e.note}”</i> : null}
          <small>{new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small>
        </div>
      );
    })}
  </div>
);

export default Thread;
