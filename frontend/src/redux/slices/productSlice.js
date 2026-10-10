import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../utils/api';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const { data } = await API.get(`/products?${queryString}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductDetails = createAsyncThunk(
  'products/fetchProductDetails',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await API.get(`/products/${id}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/products/featured');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchTrendingProducts = createAsyncThunk(
  'products/fetchTrending',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/products/trending');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchFlashDeals = createAsyncThunk(
  'products/fetchFlashDeals',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/products/flash-deals');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const createReview = createAsyncThunk(
  'products/createReview',
  async (reviewData, { rejectWithValue }) => {
    try {
      const { data } = await API.put('/products/review', reviewData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Review failed');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    featuredProducts: [],
    trendingProducts: [],
    flashDeals: [],
    product: null,
    similarProducts: [],
    productsCount: 0,
    resultPerPage: 0,
    filteredProductsCount: 0,
    loading: false,
    detailLoading: false,
    error: null,
  },
  reducers: {
    clearProductErrors: (state) => {
      state.error = null;
    },
    clearProductDetails: (state) => {
      state.product = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.productsCount = action.payload.productsCount;
        state.resultPerPage = action.payload.resultPerPage;
        state.filteredProductsCount = action.payload.filteredProductsCount;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductDetails.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.product = action.payload.product;
        state.similarProducts = action.payload.similarProducts;
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload.products;
      })
      .addCase(fetchTrendingProducts.fulfilled, (state, action) => {
        state.trendingProducts = action.payload.products;
      })
      .addCase(fetchFlashDeals.fulfilled, (state, action) => {
        state.flashDeals = action.payload.products;
      });
  },
});

export const { clearProductErrors, clearProductDetails } = productSlice.actions;
export default productSlice.reducer;