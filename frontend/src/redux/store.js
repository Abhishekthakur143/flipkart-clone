import { configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
 
// Reducers
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import orderReducer from './slices/orderSlice';
import categoryReducer from './slices/categorySlice';
import couponReducer from './slices/couponSlice';
import adminReducer from './slices/adminSlice';
 
// Auth ko persist NAHI karte: authSlice already token/user ko
// localStorage se initialState mein utha leta hai.
// Sirf cart aur wishlist persist honge.
const cartPersistConfig = {
  key: 'cart',
  storage,
  whitelist: ['cartItems'],
};
 
const wishlistPersistConfig = {
  key: 'wishlist',
  storage,
  whitelist: ['wishlistItems'],
};
 
const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    cart: persistReducer(cartPersistConfig, cartReducer),
    wishlist: persistReducer(wishlistPersistConfig, wishlistReducer),
    orders: orderReducer,
    categories: categoryReducer,
    coupon: couponReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});
 
export const persistor = persistStore(store);
export default store;
 