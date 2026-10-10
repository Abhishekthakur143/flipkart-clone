import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../redux/slices/orderSlice';
import { formatPrice } from '../utils/constants';
import { HiOutlineClipboardList } from 'react-icons/hi';
import './orders.css';

const statusClass = (s) =>
  s === 'Delivered' ? 'ok' : s === 'Cancelled' ? 'bad' : s === 'Processing' ? 'warn' : 'info';

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="or-loading">
        <div className="or-spin" />
        Loading Orders...
      </div>
    );
  }

  return (
    <div className="or">
      <h1 className="or-title">
        <span className="or-title-ico"><HiOutlineClipboardList /></span> My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="or-empty">
          <div className="or-empty-ico">📦</div>
          <h2>No Orders Yet!</h2>
          <p>Looks like you haven't made any purchases.</p>
          <Link to="/products" className="or-view">Start Shopping</Link>
        </div>
      ) : (
        <div className="or-list">
          {orders.map((order) => (
            <div key={order._id} className="or-card">
              <div className="or-top">
                <div className="or-meta">
                  <div><small>ORDER PLACED</small>{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div><small>TOTAL</small>{formatPrice(order.totalPrice)}</div>
                  <div><small>SHIP TO</small>{order.shippingInfo.name}</div>
                </div>
                <div className="or-no">
                  ORDER # <b>{order._id.slice(-8).toUpperCase()}</b>
                </div>
              </div>

              <div className="or-body">
                <div className="or-main">
                  <div className="or-status-row">
                    <h3 className="or-status-title">
                      {order.orderStatus === 'Delivered' ? 'Delivered' : 'In Transit / Processing'}
                    </h3>
                    <span className={`or-badge ${statusClass(order.orderStatus)}`}>{order.orderStatus}</span>
                  </div>
                  <p className="or-sub">Your order has been {order.orderStatus.toLowerCase()}</p>

                  <div className="or-items">
                    {order.items.map((item, i) => (
                      <div key={i} className="or-item">
                        <div className="or-img"><img src={item.image} alt={item.name} /></div>
                        <div>
                          <Link to={`/product/${item.product}`} className="or-item-name">{item.name}</Link>
                          <p className="or-item-sub">Qty: {item.quantity} • Price: {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to={`/order/${order._id}`} className="or-view">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;