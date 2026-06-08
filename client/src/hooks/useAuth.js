import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice.js';

const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isInitializing, status, error } = useSelector((state) => state.auth);

  const handleLogout = () => dispatch(logout());

  return { user, isAuthenticated, isInitializing, status, error, logout: handleLogout };
};

export default useAuth;
