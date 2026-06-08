import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchResumes as fetchResumesApi,
  fetchResumeById as fetchResumeByIdApi,
  deleteResume as deleteResumeApi,
  setDefaultResume as setDefaultResumeApi,
} from '../../api/resumeApi.js';

export const fetchResumes = createAsyncThunk(
  'resume/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await fetchResumesApi();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load resumes');
    }
  },
);

export const fetchResumeById = createAsyncThunk(
  'resume/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await fetchResumeByIdApi(id);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load resume');
    }
  },
);

export const deleteResume = createAsyncThunk(
  'resume/delete',
  async (id, { rejectWithValue }) => {
    try {
      await deleteResumeApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete resume');
    }
  },
);

export const setDefaultResume = createAsyncThunk(
  'resume/setDefault',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await setDefaultResumeApi(id);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update default resume');
    }
  },
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState: {
    resumes: [],
    activeResume: null,   // full resume with extractedText — for preview
    listStatus: 'idle',
    actionStatus: 'idle', // delete / setDefault
    error: null,
  },
  reducers: {
    addResume: (state, action) => {
      // Called directly after upload (progress handled in component)
      state.resumes.unshift(action.payload);
    },
    clearActiveResume: (state) => { state.activeResume = null; },
    resetActionStatus: (state) => { state.actionStatus = 'idle'; state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResumes.pending, (state) => { state.listStatus = 'loading'; })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.resumes = action.payload;
      })
      .addCase(fetchResumes.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.payload;
      })

      .addCase(fetchResumeById.fulfilled, (state, action) => {
        state.activeResume = action.payload;
      })

      .addCase(deleteResume.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(deleteResume.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.resumes = state.resumes.filter((r) => r._id !== action.payload);
      })
      .addCase(deleteResume.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      })

      .addCase(setDefaultResume.pending, (state) => { state.actionStatus = 'loading'; })
      .addCase(setDefaultResume.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        // Unset old default, set new one
        state.resumes = state.resumes.map((r) => ({
          ...r,
          isDefault: r._id === action.payload._id,
        }));
      })
      .addCase(setDefaultResume.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const { addResume, clearActiveResume, resetActionStatus } = resumeSlice.actions;
export default resumeSlice.reducer;
