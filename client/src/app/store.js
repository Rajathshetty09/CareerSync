import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import jobsReducer from '../features/jobs/jobsSlice.js';
import resumeReducer from '../features/resume/resumeSlice.js';
import uiReducer from '../features/ui/uiSlice.js';
import profileReducer from '../features/profile/profileSlice.js';
import applicationsReducer from '../features/applications/applicationsSlice.js';
import aiReducer from '../features/ai/aiSlice.js';
import automationReducer from '../features/automation/automationSlice.js';

const store = configureStore({
  reducer: {
    auth:         authReducer,
    profile:      profileReducer,
    jobs:         jobsReducer,
    resume:       resumeReducer,
    ui:           uiReducer,
    applications: applicationsReducer,
    ai:           aiReducer,
    automation:   automationReducer,
  },
  devTools: import.meta.env.DEV,
});

export default store;
