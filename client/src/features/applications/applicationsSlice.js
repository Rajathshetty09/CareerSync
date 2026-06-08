import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/applicationApi.js';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchApplications = createAsyncThunk(
  'applications/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await api.fetchApplications(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load applications');
    }
  },
);

export const fetchApplicationById = createAsyncThunk(
  'applications/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.fetchApplicationById(id);
      return data.data.application;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Application not found');
    }
  },
);

export const createApplication = createAsyncThunk(
  'applications/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.createApplication(payload);
      return data.data.application;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create application');
    }
  },
);

export const updateApplication = createAsyncThunk(
  'applications/update',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.updateApplication(id, payload);
      return data.data.application;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update application');
    }
  },
);

export const deleteApplication = createAsyncThunk(
  'applications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.deleteApplication(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete application');
    }
  },
);

export const fetchApplicationStats = createAsyncThunk(
  'applications/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.fetchApplicationStats();
      return data.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load stats');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const DEFAULT_STATS = {
  total: 0, pending: 0, applied: 0,
  interviewing: 0, offered: 0, rejected: 0, withdrawn: 0,
};

const applicationsSlice = createSlice({
  name: 'applications',
  initialState: {
    list: [],
    pagination: {},
    currentApplication: null,
    stats: DEFAULT_STATS,
    listStatus: 'idle',
    detailStatus: 'idle',
    actionStatus: 'idle',
    error: null,
  },
  reducers: {
    clearCurrentApplication(state) {
      state.currentApplication = null;
      state.detailStatus = 'idle';
    },
    clearActionStatus(state) {
      state.actionStatus = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch list
    builder
      .addCase(fetchApplications.pending, (state) => {
        state.listStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, { payload }) => {
        state.listStatus = 'succeeded';
        state.list = payload.applications;
        state.pagination = payload.pagination;
      })
      .addCase(fetchApplications.rejected, (state, { payload }) => {
        state.listStatus = 'failed';
        state.error = payload;
      });

    // Fetch single
    builder
      .addCase(fetchApplicationById.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchApplicationById.fulfilled, (state, { payload }) => {
        state.detailStatus = 'succeeded';
        state.currentApplication = payload;
      })
      .addCase(fetchApplicationById.rejected, (state, { payload }) => {
        state.detailStatus = 'failed';
        state.error = payload;
      });

    // Create
    builder
      .addCase(createApplication.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(createApplication.fulfilled, (state, { payload }) => {
        state.actionStatus = 'succeeded';
        state.list.unshift(payload);
        state.stats.total += 1;
        if (payload.status in state.stats) state.stats[payload.status] += 1;
      })
      .addCase(createApplication.rejected, (state, { payload }) => {
        state.actionStatus = 'failed';
        state.error = payload;
      });

    // Update
    builder
      .addCase(updateApplication.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(updateApplication.fulfilled, (state, { payload }) => {
        state.actionStatus = 'succeeded';
        const idx = state.list.findIndex((a) => a._id === payload._id);
        if (idx !== -1) state.list[idx] = payload;
        if (state.currentApplication?._id === payload._id) {
          state.currentApplication = payload;
        }
      })
      .addCase(updateApplication.rejected, (state, { payload }) => {
        state.actionStatus = 'failed';
        state.error = payload;
      });

    // Delete
    builder
      .addCase(deleteApplication.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(deleteApplication.fulfilled, (state, { payload: id }) => {
        state.actionStatus = 'succeeded';
        const removed = state.list.find((a) => a._id === id);
        state.list = state.list.filter((a) => a._id !== id);
        if (removed) {
          state.stats.total = Math.max(0, state.stats.total - 1);
          if (removed.status in state.stats) {
            state.stats[removed.status] = Math.max(0, state.stats[removed.status] - 1);
          }
        }
      })
      .addCase(deleteApplication.rejected, (state, { payload }) => {
        state.actionStatus = 'failed';
        state.error = payload;
      });

    // Stats
    builder
      .addCase(fetchApplicationStats.fulfilled, (state, { payload }) => {
        state.stats = payload;
      });
  },
});

export const { clearCurrentApplication, clearActionStatus } = applicationsSlice.actions;
export default applicationsSlice.reducer;
