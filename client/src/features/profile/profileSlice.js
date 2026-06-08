import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as userApi from '../../api/userApi.js';
import { setCredentials } from '../auth/authSlice.js';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchProfile = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await userApi.getProfile();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load profile');
    }
  },
);

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const { data } = await userApi.updateProfile(payload);
      // Keep auth.user in sync if name changed
      if (payload.name) {
        const authUser = getState().auth.user;
        dispatch(setCredentials({
          user: { ...authUser, name: payload.name },
          accessToken: getState().auth.accessToken,
        }));
      }
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Update failed');
    }
  },
);

export const updateSkills = createAsyncThunk(
  'profile/updateSkills',
  async (skills, { rejectWithValue }) => {
    try {
      const { data } = await userApi.updateSkills(skills);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update skills');
    }
  },
);

export const addExperience = createAsyncThunk(
  'profile/addExperience',
  async (expData, { rejectWithValue }) => {
    try {
      const { data } = await userApi.addExperience(expData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add experience');
    }
  },
);

export const updateExperience = createAsyncThunk(
  'profile/updateExperience',
  async ({ expId, expData }, { rejectWithValue }) => {
    try {
      const { data } = await userApi.updateExperience(expId, expData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update experience');
    }
  },
);

export const deleteExperience = createAsyncThunk(
  'profile/deleteExperience',
  async (expId, { rejectWithValue }) => {
    try {
      const { data } = await userApi.deleteExperience(expId);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove experience');
    }
  },
);

export const updatePreferences = createAsyncThunk(
  'profile/updatePreferences',
  async (prefs, { rejectWithValue }) => {
    try {
      const { data } = await userApi.updatePreferences(prefs);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update preferences');
    }
  },
);

export const uploadAvatar = createAsyncThunk(
  'profile/uploadAvatar',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await userApi.uploadAvatar(formData);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Upload failed');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    data: null,
    fetchStatus: 'idle',   // initial page load
    saveStatus: 'idle',    // save operations (update, skills, exp, prefs)
    error: null,
    saveError: null,
  },
  reducers: {
    resetSaveStatus: (state) => {
      state.saveStatus = 'idle';
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.fetchStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.error = action.payload;
      });

    // All mutating operations share saveStatus / saveError
    const saveThunks = [
      updateProfile, updateSkills, addExperience,
      updateExperience, deleteExperience, updatePreferences, uploadAvatar,
    ];

    saveThunks.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saveStatus = 'loading';
          state.saveError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.saveStatus = 'succeeded';
          state.data = action.payload; // every mutation returns the full updated user
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saveStatus = 'failed';
          state.saveError = action.payload;
        });
    });
  },
});

export const { resetSaveStatus } = profileSlice.actions;
export default profileSlice.reducer;
