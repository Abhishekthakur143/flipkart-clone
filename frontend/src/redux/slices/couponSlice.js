import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../utils/api';

export const applyCoupon = createAsyncThunk(
  'coupon/applyCoupon',
  async ({ code, orderAmount }, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/coupons/apply', { code, orderAmount });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const couponSlice = createSlice({
  name: 'coupon',
  initialState: {
    discountAmount: 0,
    couponCode: '',
    loading: false,
    error: null,
    applied: false,
  },
  reducers: {
    removeCoupon: (state) => {
      state.discountAmount = 0;
      state.couponCode = '';
      state.applied = false;
    },
    clearCouponErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(applyCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.discountAmount = action.payload.discountAmount;
        state.couponCode = action.payload.couponCode;
        state.applied = true;
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.applied = false;
      });
  },
});

export const { removeCoupon, clearCouponErrors } = couponSlice.actions;
export default couponSlice.reducer;