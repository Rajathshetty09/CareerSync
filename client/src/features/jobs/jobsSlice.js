import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as jobsApi from '../../api/jobsApi.js';

export const fetchJobs = createAsyncThunk(
  'jobs/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await jobsApi.searchJobs(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load jobs');
    }
  },
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await jobsApi.getJobById(id);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load job');
    }
  },
);

export const fetchSavedJobs = createAsyncThunk(
  'jobs/fetchSaved',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await jobsApi.getSavedJobs(params);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load saved jobs');
    }
  },
);

export const fetchSavedJobIds = createAsyncThunk(
  'jobs/fetchSavedIds',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await jobsApi.getSavedJobIds();
      return data.data; // string[]
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  },
);

export const saveJob = createAsyncThunk(
  'jobs/save',
  async (jobId, { rejectWithValue }) => {
    try {
      await jobsApi.saveJob(jobId);
      return jobId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not save job');
    }
  },
);

export const unsaveJob = createAsyncThunk(
  'jobs/unsave',
  async (jobId, { rejectWithValue }) => {
    try {
      await jobsApi.unsaveJob(jobId);
      return jobId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not unsave job');
    }
  },
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    listings: [],
    currentJob: null,
    savedJobs: [],
    savedJobIds: [],          // plain array — serialisable in Redux
    filters: { keyword: '', location: '', employmentType: '', source: '', sort: 'latest' },
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    listStatus: 'idle',
    jobStatus: 'idle',
    error: null,
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPage: (state, action) => { state.pagination.page = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => { state.listStatus = 'loading'; state.error = null; })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.listings = action.payload.jobs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload;
      })

      .addCase(fetchJobById.pending, (state) => { state.jobStatus = 'loading'; })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.jobStatus = 'succeeded';
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.jobStatus = 'failed';
        state.error = action.payload;
      })

      .addCase(fetchSavedJobs.fulfilled, (state, action) => {
        state.savedJobs = action.payload.jobs;
      })

      .addCase(fetchSavedJobIds.fulfilled, (state, action) => {
        // Store as plain array — serialisable in Redux; convert to Set on read
        state.savedJobIds = action.payload;
      })

      .addCase(saveJob.fulfilled, (state, action) => {
        if (!state.savedJobIds.includes(action.payload)) {
          state.savedJobIds = [...state.savedJobIds, action.payload];
        }
      })

      .addCase(unsaveJob.fulfilled, (state, action) => {
        state.savedJobIds = state.savedJobIds.filter((id) => id !== action.payload);
        state.savedJobs = state.savedJobs.filter((j) => j._id !== action.payload);
      });
  },
});

export const { setFilters, setPage } = jobsSlice.actions;
export default jobsSlice.reducer;
