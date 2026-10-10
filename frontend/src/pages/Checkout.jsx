
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createOrder, createRazorpayOrder, verifyPayment } from '../redux/slices/orderSlice';
import { applyCoupon, removeCoupon } from '../redux/slices/couponSlice';
import { clearCart, saveShippingInfo } from '../redux/slices/cartSlice';
import { formatPrice } from '../utils/constants';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { HiOutlineCreditCard, HiOutlineCash, HiOutlineLockClosed } from 'react-icons/hi';
import './checkout.css';

const AddrField = ({ label, value, onChange, span, ...rest }) => (
  <div className={`co-field ${span ? 'co-span' : ''}`}>
    <input type="text" placeholder=" " value={value || ''} onChange={onChange} {...rest} />
    <label>{label}</label>
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.cart);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { discountAmount, couponCode, applied } = useSelector((state) => state.coupon);

  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [couponInput, setCouponInput] = useState('');
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState(user?.addresses?.find(a => a.isDefault) || { name: '', phone: '', addressLine1: '', city: '', state: '', pincode: '' });

  const itemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingPrice = itemsPrice > 500 ? 0 : 40;
  const taxPrice = Math.round(itemsPrice * 0.18);
  const totalPrice = itemsPrice + shippingPrice + taxPrice - discountAmount;

  const handleApplyCoupon = () => {
    if (!couponInput) return toast.error('Enter coupon code');
    dispatch(applyCoupon({ code: couponInput, orderAmount: itemsPrice }));
  };

  const placeOrder = async () => {
    if (!isAuthenticated) return navigate('/login');
    // ✅ STATE aur PINCODE bhi check karne lage
    if (!address.name || !address.phone || !address.addressLine1 || !address.city || !address.state || !address.pincode) {
      return toast.error('Please fill all address fields including State and Pincode');
    }
    dispatch(saveShippingInfo(address));

    const orderData = {
      shippingInfo: address,
      orderItems: cartItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, product: i.product, image: i.image })),
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountPrice: discountAmount,
      totalPrice,
      couponUsed: couponCode,
    };

    if (paymentMethod === 'COD') {
      orderData.paymentInfo = { id: `COD_${Date.now()}`, status: 'Cash on Delivery' };
      const result = await dispatch(createOrder(orderData));
      if (createOrder.fulfilled.match(result)) {
        dispatch(clearCart());
        toast.success('Order placed successfully!');
        navigate(`/order/${result.payload.order._id}`);
      }
    } else {
      try {
        // 1. Create Razorpay Order
        const razorpayRes = await dispatch(createRazorpayOrder(totalPrice));
        if (!createRazorpayOrder.fulfilled.match(razorpayRes)) return toast.error('Payment initiation failed');

        const options = {
          key: (await API.get('/payment/key')).data.key,
          amount: razorpayRes.payload.order.amount,
          currency: "INR",
          name: "Flipkart Clone",
          description: "Order Payment",
          order_id: razorpayRes.payload.order.id,
          handler: async function (response) {
            // 2. Verify Payment
            const verifyRes = await dispatch(verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }));

            if (verifyPayment.fulfilled.match(verifyRes)) {
              orderData.paymentInfo = { id: response.razorpay_payment_id, status: 'Paid' };
              const orderRes = await dispatch(createOrder(orderData));
              if (createOrder.fulfilled.match(orderRes)) {
                dispatch(clearCart());
                toast.success('Payment Successful & Order Placed!');
                navigate(`/order/${orderRes.payload.order._id}`);
              }
            } else {
              toast.error('Payment verification failed');
            }
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: "#2874f0" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        toast.error('Payment failed');
      }
    }
  };

  // double click se bachne ke liye: button tab tak disabled jab tak request chal rahi ho
  const handlePlaceOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      await placeOrder();
    } finally {
      setPlacing(false);
    }
  };

  const set = (key) => (e) => setAddress({ ...address, [key]: e.target.value });

  return (
    <div className="co">
      {/* Left: Address & Payment */}
      <div className="co-main">
        <div className="co-card">
          <h2 className="co-title"><span className="co-num">1</span> Delivery Address</h2>
          <div className="co-grid">
            <AddrField label="Name" value={address.name} onChange={set('name')} />
            <AddrField label="Phone" value={address.phone} onChange={set('phone')} inputMode="tel" />
            <AddrField label="Address Line 1" value={address.addressLine1} onChange={set('addressLine1')} span />
            <AddrField label="City" value={address.city} onChange={set('city')} />
            {/* ✅ STATE INPUT */}
            <AddrField label="State" value={address.state} onChange={set('state')} />
            <AddrField label="Pincode" value={address.pincode} onChange={set('pincode')} inputMode="numeric" />
          </div>
        </div>

        <div className="co-card">
          <h2 className="co-title"><span className="co-num">2</span> Payment Method</h2>
          <div className="co-pays">
            <label className={`co-pay ${paymentMethod === 'Online' ? 'on' : ''}`}>
              <input type="radio" name="payment" checked={paymentMethod === 'Online'} onChange={() => setPaymentMethod('Online')} />
              <span className="co-radio" />
              <span className="co-pay-ico"><HiOutlineCreditCard /></span>
              <span className="co-pay-name">
                Online Payment (Razorpay)
                <span className="co-pay-sub">Cards, UPI and net banking</span>
              </span>
            </label>
            <label className={`co-pay ${paymentMethod === 'COD' ? 'on' : ''}`}>
              <input type="radio" name="payment" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
              <span className="co-radio" />
              <span className="co-pay-ico"><HiOutlineCash /></span>
              <span className="co-pay-name">
                Cash on Delivery
                <span className="co-pay-sub">Pay when your order arrives</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="co-sum">
        <h2 className="co-title">Order Summary</h2>
        <div className="co-items">
          {cartItems.map(item => (
            <div key={item.product} className="co-item">
              <span className="co-thumb"><img src={item.image} alt={item.name} /></span>
              <span className="co-item-name">{item.name} x{item.quantity}</span>
              <span className="co-item-price">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="co-coupon">
          <input type="text" placeholder="Coupon Code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} disabled={applied} />
          {applied ? (
            <button onClick={() => { dispatch(removeCoupon()); setCouponInput(''); }} className="co-remove">REMOVE</button>
          ) : (
            <button onClick={handleApplyCoupon} className="co-apply">Apply</button>
          )}
        </div>

        <div className="co-rows">
          <div className="co-row"><span>Subtotal</span><span>{formatPrice(itemsPrice)}</span></div>
          <div className="co-row"><span>Tax (18%)</span><span>{formatPrice(taxPrice)}</span></div>
          <div className="co-row"><span>Shipping</span><span className={shippingPrice === 0 ? 'co-green' : ''}>{shippingPrice === 0 ? 'FREE' : formatPrice(shippingPrice)}</span></div>
          {applied && <div className="co-row co-green"><span>Coupon Discount</span><span>-{formatPrice(discountAmount)}</span></div>}
          <div className="co-row co-total"><span>Total</span><span>{formatPrice(totalPrice)}</span></div>
        </div>

        <button onClick={handlePlaceOrder} className="co-place" disabled={placing}>
          {placing && <span className="co-spin" />}
          {placing ? 'Processing...' : 'PLACE ORDER'}
        </button>
        <p className="co-secure"><HiOutlineLockClosed /> Safe and secure payments</p>
      </div>
    </div>
  );
};

export default Checkout;