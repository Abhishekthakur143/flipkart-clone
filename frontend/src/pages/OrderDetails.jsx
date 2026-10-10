import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails } from '../redux/slices/orderSlice';
import { formatPrice } from '../utils/constants';
import {
  HiOutlineTruck,
  HiOutlineHome,
  HiOutlineClipboardList,
  HiOutlineLocationMarker,
  HiOutlineCreditCard,
  HiOutlineClock,
} from 'react-icons/hi';
import './orders.css';

const OrderDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { order, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderDetails(id));
  }, [dispatch, id]);

  if (loading || !order) {
    return (
      <div className="or-loading">
        <div className="or-spin" />
        Loading Order Details...
      </div>
    );
  }

  const steps = [
    { key: 'Processing', label: 'Order Placed', icon: HiOutlineClipboardList },
    { key: 'Shipped', label: 'Shipped', icon: HiOutlineTruck },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: HiOutlineTruck },
    { key: 'Delivered', label: 'Delivered', icon: HiOutlineHome },
  ];

  const getStepIndex = (status) => steps.findIndex(s => s.key === status);
  const currentStepIndex = getStepIndex(order.orderStatus);

  return (
    <div className="or">
      <div className="od-card">
        <div className="od-head">
          <div>
            <h1>Order Details</h1>
            <p>Order #{order._id.slice(-8).toUpperCase()} • Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="od-total">
            <small>Total Amount</small>
            <b>{formatPrice(order.totalPrice)}</b>
          </div>
        </div>

        {/* Delivery Tracker */}
        {order.orderStatus !== 'Cancelled' && (
          <div className="od-track">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`od-step ${index <= currentStepIndex ? 'done' : ''} ${index === currentStepIndex ? 'cur' : ''}`}
              >
                <div className="od-dot"><step.icon /></div>
                <span className="od-label">{step.label}</span>
                {index < steps.length - 1 && (
                  <div className={`od-line ${index < currentStepIndex ? 'done' : ''}`}></div>
                )}
              </div>
            ))}
          </div>
        )}

        {order.orderStatus === 'Cancelled' && (
          <div className="od-cancel">Order has been Cancelled</div>
        )}

        <div className="od-info">
          {/* Shipping Info */}
          <div className="od-box">
            <h3><HiOutlineLocationMarker /> DELIVERY ADDRESS</h3>
            <p className="od-name">{order.shippingInfo.name}</p>
            <p className="od-text">{order.shippingInfo.addressLine1}, {order.shippingInfo.city}, {order.shippingInfo.state} - {order.shippingInfo.pincode}</p>
          </div>

          {/* Payment Info */}
          <div className="od-box">
            <h3><HiOutlineCreditCard /> PAYMENT INFORMATION</h3>
            <p className="od-name">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</p>
            <p className="od-text">Status: <span className="od-ok">{order.paymentInfo.status}</span></p>
          </div>

          {/* Tracking Updates */}
          <div className="od-box">
            <h3><HiOutlineClock /> TRACKING UPDATES</h3>
            <div className="od-tl">
              {order.trackingUpdates.slice().reverse().map((track, i) => (
                <div key={i} className="od-tl-item">
                  <b>{track.status}</b>
                  <span>{new Date(track.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="od-card">
        <h2 className="od-items-title">Items in this Order</h2>
        <div>
          {order.items.map((item, i) => (
            <div key={i} className="od-row">
              <Link to={`/product/${item.product}`} className="od-row-img">
                <img src={item.image} alt={item.name} />
              </Link>
              <div className="od-row-info">
                <Link to={`/product/${item.product}`} className="od-row-name">{item.name}</Link>
                <p className="od-row-qty">Quantity: {item.quantity}</p>
              </div>
              <p className="od-row-price">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;