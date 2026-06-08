import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginUser, registerUser, logoutUser, refreshTokenApi } from '../../api/authApi.js';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await loginUser(credentials);
    return data.data; // { accessToken, user }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await registerUser(payload);
    return data; // { message }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutUser();
  } catch {
    // best-effort: clear local state regardless of API response
  }
});

export const refreshAuth = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const { data } = await refreshTokenApi();
    return data.data; // { accessToken, user }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired');
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const clearState = (state) => {
  state.user = null;
  state.accessToken = null;
  state.isAuthenticated = false;
  state.status = 'idle';
  state.isInitializing = false;
  state.error = null;
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    status: 'idle',
    // true only while the first refreshAuth (page-load session restore) is in flight.
    // Login/register thunks do NOT touch this flag, so the auth forms stay mounted
    // and visible while their own API calls are in progress.
    isInitializing: true,
    error: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.isInitializing = false;
      state.error = null;
    },
    clearCredentials: clearState,
    clearAuthError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // Login — does NOT touch isInitializing
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Register — does NOT touch isInitializing
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, clearState)
      .addCase(logout.rejected, clearState)

      // refreshAuth — the only thunk that controls isInitializing
      .addCase(refreshAuth.pending, (state) => {
        state.isInitializing = true;
        state.status = 'loading';
      })
      .addCase(refreshAuth.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.status = 'succeeded';
      })
      .addCase(refreshAuth.rejected, (state) => {
        state.isInitializing = false;
        state.status = 'idle';
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.error = null;
      });
  },
});

export const { setCredentials, clearCredentials, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
