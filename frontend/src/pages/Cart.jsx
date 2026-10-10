import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart, updateCartQuantity, clearCart } from '../redux/slices/cartSlice';
import { formatPrice } from '../utils/constants';
import { HiOutlineTrash, HiMinusSm, HiPlusSm } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import './cart.css';

const FREE_DELIVERY_ABOVE = 500;

const Cart = () => {
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.cart);

  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalCuttedPrice = cartItems.reduce((acc, item) => acc + (item.cuttedPrice || 0) * item.quantity, 0);
  const totalDiscount = totalCuttedPrice - totalPrice;
  const shippingCharge = totalPrice > 500 ? 0 : 40;

  return (
    <div className="ct">
      {/* Cart Items */}
      <div className="ct-list">
        <div className="ct-head">
          <h1>
            My Cart <span className="ct-count">{cartItems.length}</span>
          </h1>
          {cartItems.length > 0 && (
            <button onClick={() => dispatch(clearCart())} className="ct-clear">Clear Cart</button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="ct-empty">
            <div style={{ fontSize: 72, marginBottom: 12 }}>🛒</div>
           
            <h2>Your cart is empty!</h2>
            <p>Add items you love and they will show up here.</p>
            <Link to="/products" className="ct-btn">Shop Now</Link>
          </div>
        ) : (
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div
                key={item.product}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="ct-item"
              >
                <div className="ct-img">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="ct-info">
                  <h3 className="ct-name">{item.name}</h3>
                  <div className="ct-prices">
                    <span className="ct-price">{formatPrice(item.price)}</span>
                    {item.cuttedPrice > item.price && (
                      <>
                        <span className="ct-old">{formatPrice(item.cuttedPrice)}</span>
                        <span className="ct-off">
                          {Math.round(((item.cuttedPrice - item.price) / item.cuttedPrice) * 100)}% off
                        </span>
                      </>
                    )}
                  </div>
                  <div className="ct-actions">
                    <div className="ct-qty">
                      <button
                        onClick={() => dispatch(updateCartQuantity({ id: item.product, quantity: item.quantity - 1 }))}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <HiMinusSm />
                      </button>
                      <input type="number" readOnly value={item.quantity} />
                      <button
                        onClick={() => dispatch(updateCartQuantity({ id: item.product, quantity: item.quantity + 1 }))}
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase quantity"
                      >
                        <HiPlusSm />
                      </button>
                    </div>
                    <button onClick={() => dispatch(removeFromCart(item.product))} className="ct-remove">
                      <HiOutlineTrash /> Remove
                    </button>
                    {item.quantity >= item.stock && <span className="ct-max">Max available</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Price Summary */}
      {cartItems.length > 0 && (
        <div className="ct-sum">
          <div className="ct-sum-head">
            <h2>PRICE DETAILS</h2>
          </div>
          <div className="ct-sum-body">
            {shippingCharge > 0 && (
              <div className="ct-ship">
                <p>Add {formatPrice(FREE_DELIVERY_ABOVE - totalPrice)} more for FREE delivery</p>
                <div className="ct-bar">
                  <i style={{ width: `${Math.min(100, (totalPrice / FREE_DELIVERY_ABOVE) * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="ct-row"><span>Price ({cartItems.length} items)</span><span>{formatPrice(totalCuttedPrice)}</span></div>
            <div className="ct-row ct-green"><span>Discount</span><span>-{formatPrice(totalDiscount)}</span></div>
            <div className="ct-row"><span>Delivery Charges</span><span className={shippingCharge === 0 ? 'ct-green' : ''}>{shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge)}</span></div>
            <div className="ct-row ct-total"><span>Total Amount</span><span>{formatPrice(totalPrice + shippingCharge)}</span></div>
            <p className="ct-save">You will save {formatPrice(totalDiscount)} on this order</p>
          </div>
          <div className="ct-sum-foot">
            <Link to="/checkout" className="ct-place">PLACE ORDER</Link>
            <p className="ct-secure">🔒 Safe and secure payments</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;