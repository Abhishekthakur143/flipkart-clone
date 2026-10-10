import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../utils/api';

export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/admin/dashboard');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchAdminProducts = createAsyncThunk(
  'admin/fetchAdminProducts',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/products/admin/all');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const createProduct = createAsyncThunk(
  'admin/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/products/admin/new', productData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateProduct = createAsyncThunk(
  'admin/updateProduct',
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const { data } = await API.put(`/products/admin/${id}`, productData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'admin/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await API.delete(`/products/admin/${id}`);
      return { ...data, id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchAdminOrders = createAsyncThunk(
  'admin/fetchAdminOrders',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/orders/admin/all');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'admin/updateOrderStatus',
  async ({ id, ...statusData }, { rejectWithValue }) => {
    try {
      const { data } = await API.put(`/orders/admin/${id}`, statusData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchAdminUsers = createAsyncThunk(
  'admin/fetchAdminUsers',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/auth/admin/users');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    monthlyRevenue: [],
    categorySales: [],
    recentOrders: [],
    topProducts: [],
    products: [],
    orders: [],
    users: [],
    loading: false,
    error: null,
    success: null,
  },
  reducers: {
    clearAdminErrors: (state) => {
      state.error = null;
    },
    clearAdminSuccess: (state) => {
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload.stats;
        state.monthlyRevenue = action.payload.monthlyRevenue;
        state.categorySales = action.payload.categorySales;
        state.recentOrders = action.payload.recentOrders;
        state.topProducts = action.payload.topProducts;
      })
      .addCase(fetchAdminProducts.fulfilled, (state, action) => {
        state.products = action.payload.products;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(
          (p) => p._id !== action.payload.id
        );
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.orders = action.payload.orders;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.orders.findIndex(
          (o) => o._id === action.payload.order._id
        );
        if (index !== -1) state.orders[index] = action.payload.order;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.users = action.payload.users;
      });
  },
});

export const { clearAdminErrors, clearAdminSuccess } = adminSlice.actions;
export default adminSlice.reducer;