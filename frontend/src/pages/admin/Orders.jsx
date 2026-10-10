import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminOrders, updateOrderStatus } from '../../redux/slices/adminSlice';
import { formatPrice } from '../../utils/constants';
import toast from 'react-hot-toast';
import '../../components/admin/admin.css';

const statuses = ['Processing', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const TONE = { Delivered: 'ok', Cancelled: 'bad', Shipped: 'info', 'Out for Delivery': 'info', Confirmed: 'purple', Processing: 'warn' };

const Orders = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { orders } = useSelector((state) => state.admin);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    dispatch(fetchAdminOrders());
  }, [dispatch]);

  const handleStatusUpdate = (orderId, status) => {
    dispatch(updateOrderStatus({ id: orderId, status }));
    toast.success(`Order marked as ${status}`);
  };

  const filteredOrders = statusFilter ? orders.filter((o) => o.orderStatus === statusFilter) : orders;
  const countOf = (s) => orders.filter((o) => o.orderStatus === s).length;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Manage Orders</h1>
          <p className="adm-sub">{filteredOrders.length} of {orders.length} orders</p>
        </div>
      </div>

      <div className="adm-chips">
        <button className={`adm-chip ${statusFilter === '' ? 'on' : ''}`} onClick={() => setStatusFilter('')}>
          All Statuses<em>{orders.length}</em>
        </button>
        {statuses.map((s) => (
          <button key={s} className={`adm-chip ${statusFilter === s ? 'on' : ''}`} onClick={() => setStatusFilter(s)}>
            {s}<em>{countOf(s)}</em>
          </button>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Status / Update</th></tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td className="adm-id">#{order._id.slice(-8).toUpperCase()}</td>
                  <td className="adm-strong">{order.user?.name || 'Unknown'}</td>
                  <td>{order.items.length} Items</td>
                  <td className="adm-strong">{formatPrice(order.totalPrice)}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="adm-actions" style={{ alignItems: 'center' }}>
                      <span className={`adm-badge ${TONE[order.orderStatus] || 'gray'}`}>{order.orderStatus}</span>
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        disabled={order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled'}
                        className="adm-status-select"
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && <div className="adm-empty">No orders found.</div>}
        </div>
      </div>
    </div>
  );
};

export default Orders;