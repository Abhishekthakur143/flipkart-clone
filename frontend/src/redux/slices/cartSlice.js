import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cartItems: JSON.parse(localStorage.getItem('cartItems')) || [],
    shippingInfo: JSON.parse(localStorage.getItem('shippingInfo')) || {},
  },
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cartItems.find(
        (i) => i.product === item.product
      );

      if (existingItem) {
        existingItem.quantity = item.quantity || existingItem.quantity + 1;
      } else {
        state.cartItems.push({ ...item, quantity: item.quantity || 1 });
      }
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter(
        (item) => item.product !== action.payload
      );
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    updateCartQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.cartItems.find((i) => i.product === id);
      if (item) {
        item.quantity = quantity;
      }
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    saveShippingInfo: (state, action) => {
      state.shippingInfo = action.payload;
      localStorage.setItem('shippingInfo', JSON.stringify(action.payload));
    },
    clearCart: (state) => {
      state.cartItems = [];
      state.shippingInfo = {};
      localStorage.removeItem('cartItems');
      localStorage.removeItem('shippingInfo');
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  saveShippingInfo,
  clearCart,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.cartItems;
export const selectCartTotal = (state) =>
  state.cart.cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
export const selectCartItemCount = (state) =>
  state.cart.cartItems.reduce((count, item) => count + item.quantity, 0);

export default cartSlice.reducer;