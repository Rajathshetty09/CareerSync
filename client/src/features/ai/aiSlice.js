import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/aiApi.js';

export const runResumeAnalysis = createAsyncThunk(
  'ai/analyseResume',
  async ({ resumeId, jobId }, { rejectWithValue }) => {
    try {
      const { data } = await api.analyseResume(resumeId, jobId);
      return data.data.analysis;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Analysis failed');
    }
  },
);

export const runCoverLetter = createAsyncThunk(
  'ai/coverLetter',
  async ({ resumeId, jobId, tone }, { rejectWithValue }) => {
    try {
      const { data } = await api.generateCoverLetter(resumeId, jobId, tone);
      return data.data.coverLetter;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Generation failed');
    }
  },
);

export const runSkillGap = createAsyncThunk(
  'ai/skillGap',
  async ({ targetRole, jobId }, { rejectWithValue }) => {
    try {
      const { data } = await api.analyseSkillGap(targetRole, jobId);
      return data.data.gap;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Analysis failed');
    }
  },
);

const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    analysis: null,
    coverLetter: null,
    skillGap: null,
    analysisStatus: 'idle',
    coverLetterStatus: 'idle',
    skillGapStatus: 'idle',
    error: null,
  },
  reducers: {
    clearAnalysis: (state) => { state.analysis = null; state.analysisStatus = 'idle'; },
    clearCoverLetter: (state) => { state.coverLetter = null; state.coverLetterStatus = 'idle'; },
    clearSkillGap: (state) => { state.skillGap = null; state.skillGapStatus = 'idle'; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runResumeAnalysis.pending, (state) => { state.analysisStatus = 'loading'; state.error = null; })
      .addCase(runResumeAnalysis.fulfilled, (state, { payload }) => { state.analysisStatus = 'succeeded'; state.analysis = payload; })
      .addCase(runResumeAnalysis.rejected, (state, { payload }) => { state.analysisStatus = 'failed'; state.error = payload; })

      .addCase(runCoverLetter.pending, (state) => { state.coverLetterStatus = 'loading'; state.error = null; })
      .addCase(runCoverLetter.fulfilled, (state, { payload }) => { state.coverLetterStatus = 'succeeded'; state.coverLetter = payload; })
      .addCase(runCoverLetter.rejected, (state, { payload }) => { state.coverLetterStatus = 'failed'; state.error = payload; })

      .addCase(runSkillGap.pending, (state) => { state.skillGapStatus = 'loading'; state.error = null; })
      .addCase(runSkillGap.fulfilled, (state, { payload }) => { state.skillGapStatus = 'succeeded'; state.skillGap = payload; })
      .addCase(runSkillGap.rejected, (state, { payload }) => { state.skillGapStatus = 'failed'; state.error = payload; });
  },
});

export const { clearAnalysis, clearCoverLetter, clearSkillGap } = aiSlice.actions;
export default aiSlice.reducer;
