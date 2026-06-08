import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/automationApi.js';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCredentials = createAsyncThunk(
  'automation/fetchCredentials',
  async (portal, { rejectWithValue }) => {
    try {
      const { data } = await api.getCredentials(portal);
      return { portal, creds: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load credentials');
    }
  },
);

export const saveCredentials = createAsyncThunk(
  'automation/saveCredentials',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.saveCredentials(payload);
      return { portal: payload.portal, creds: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save credentials');
    }
  },
);

export const removeCredentials = createAsyncThunk(
  'automation/removeCredentials',
  async (portal, { rejectWithValue }) => {
    try {
      await api.deleteCredentials(portal);
      return portal;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove credentials');
    }
  },
);

export const verifyLogin = createAsyncThunk(
  'automation/verifyLogin',
  async (portal, { rejectWithValue }) => {
    try {
      const { data } = await api.testLogin(portal);
      return { portal, verified: data.data.verified };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login test failed');
    }
  },
);

export const startAutoApply = createAsyncThunk(
  'automation/startAutoApply',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.triggerAutoApply(payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to start automation');
    }
  },
);

export const fetchRunHistory = createAsyncThunk(
  'automation/fetchRunHistory',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.getRunHistory(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load runs');
    }
  },
);

export const fetchRunById = createAsyncThunk(
  'automation/fetchRunById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.getRunById(id);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load run');
    }
  },
);

export const cancelAutomationRun = createAsyncThunk(
  'automation/cancelRun',
  async (id, { rejectWithValue }) => {
    try {
      await api.cancelRun(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to cancel run');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const automationSlice = createSlice({
  name: 'automation',
  initialState: {
    // portal → credential info (no password)
    credentials: {},
    credentialsStatus: 'idle',
    credentialsError: null,

    // Login test
    loginTestStatus: 'idle',
    loginTestError: null,

    // Trigger
    triggerStatus: 'idle',
    triggerError: null,
    lastTriggered: null,

    // Run history
    runs: [],
    runsPagination: null,
    runsStatus: 'idle',
    runsError: null,

    // Single run detail
    currentRun: null,
    currentRunStatus: 'idle',
  },
  reducers: {
    resetLoginTest: (state) => {
      state.loginTestStatus = 'idle';
      state.loginTestError = null;
    },
    resetTrigger: (state) => {
      state.triggerStatus = 'idle';
      state.triggerError = null;
      state.lastTriggered = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCredentials
      .addCase(fetchCredentials.pending,   (s) => { s.credentialsStatus = 'loading'; })
      .addCase(fetchCredentials.fulfilled, (s, { payload }) => {
        s.credentialsStatus = 'succeeded';
        s.credentials[payload.portal] = payload.creds;
      })
      .addCase(fetchCredentials.rejected,  (s, { payload }) => {
        s.credentialsStatus = 'failed'; s.credentialsError = payload;
      })

      // saveCredentials
      .addCase(saveCredentials.pending,   (s) => { s.credentialsStatus = 'loading'; })
      .addCase(saveCredentials.fulfilled, (s, { payload }) => {
        s.credentialsStatus = 'succeeded';
        s.credentials[payload.portal] = payload.creds;
      })
      .addCase(saveCredentials.rejected,  (s, { payload }) => {
        s.credentialsStatus = 'failed'; s.credentialsError = payload;
      })

      // removeCredentials
      .addCase(removeCredentials.fulfilled, (s, { payload }) => {
        delete s.credentials[payload];
      })

      // verifyLogin
      .addCase(verifyLogin.pending,   (s) => { s.loginTestStatus = 'loading'; s.loginTestError = null; })
      .addCase(verifyLogin.fulfilled, (s, { payload }) => {
        s.loginTestStatus = 'succeeded';
        if (s.credentials[payload.portal]) {
          s.credentials[payload.portal].lastVerifiedAt = new Date().toISOString();
        }
      })
      .addCase(verifyLogin.rejected,  (s, { payload }) => {
        s.loginTestStatus = 'failed'; s.loginTestError = payload;
      })

      // startAutoApply
      .addCase(startAutoApply.pending,   (s) => { s.triggerStatus = 'loading'; s.triggerError = null; })
      .addCase(startAutoApply.fulfilled, (s, { payload }) => {
        s.triggerStatus = 'succeeded'; s.lastTriggered = payload;
      })
      .addCase(startAutoApply.rejected,  (s, { payload }) => {
        s.triggerStatus = 'failed'; s.triggerError = payload;
      })

      // fetchRunHistory
      .addCase(fetchRunHistory.pending,   (s) => { s.runsStatus = 'loading'; })
      .addCase(fetchRunHistory.fulfilled, (s, { payload }) => {
        s.runsStatus = 'succeeded';
        s.runs = payload.runs;
        s.runsPagination = payload.pagination;
      })
      .addCase(fetchRunHistory.rejected,  (s, { payload }) => {
        s.runsStatus = 'failed'; s.runsError = payload;
      })

      // fetchRunById
      .addCase(fetchRunById.pending,   (s) => { s.currentRunStatus = 'loading'; })
      .addCase(fetchRunById.fulfilled, (s, { payload }) => {
        s.currentRunStatus = 'succeeded'; s.currentRun = payload;
      })
      .addCase(fetchRunById.rejected,  (s) => { s.currentRunStatus = 'failed'; })

      // cancelRun
      .addCase(cancelAutomationRun.fulfilled, (s, { payload }) => {
        const run = s.runs.find((r) => r._id === payload);
        if (run) run.status = 'cancelled';
        if (s.currentRun?._id === payload) s.currentRun.status = 'cancelled';
      });
  },
});

export const { resetLoginTest, resetTrigger } = automationSlice.actions;
export default automationSlice.reducer;
