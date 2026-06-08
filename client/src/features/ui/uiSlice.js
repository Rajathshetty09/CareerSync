import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    toast: null, // { message, type: 'success' | 'error' | 'info' | 'warning' }
    globalLoading: false,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    showToast: (state, action) => { state.toast = action.payload; },
    clearToast: (state) => { state.toast = null; },
    setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, showToast, clearToast, setGlobalLoading } =
  uiSlice.actions;
export default uiSlice.reducer;
