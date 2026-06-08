import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { refreshAuth } from './features/auth/authSlice.js';
import AppRouter from './routes/AppRouter.jsx';

const App = () => {
  const dispatch = useDispatch();
  // Guard against double-invoke (React StrictMode or future remounts).
  // Token rotation means a second concurrent call would invalidate the first token.
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (refreshAttempted.current) return;
    refreshAttempted.current = true;
    dispatch(refreshAuth());
  }, [dispatch]);

  return <AppRouter />;
};

export default App;
