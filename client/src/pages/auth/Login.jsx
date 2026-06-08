import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearAuthError } from '../../features/auth/authSlice.js';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/ui/Button.jsx';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useSelector((state) => state.auth);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';
  const justRegistered = location.state?.registered === true;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } });

  // Clear any stale error from a previous page (e.g. failed login before navigating here)
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(login(data));
      if (login.fulfilled.match(result)) {
        // AuthLayout detects isAuthenticated=true and redirects via <Navigate>.
        // We also call navigate here as a fallback for edge cases (e.g. direct URL entry).
        navigate(from, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to continue to CareerSync</p>
      </div>

      {/* Success banner when redirected from registration */}
      {justRegistered && !error && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Account created successfully. Sign in to get started.
        </div>
      )}

      {/* Server-level error */}
      {(error || errors.root?.serverError) && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>{errors.root?.serverError?.message || error}</span>
          {error?.includes('verify your email') && (
            <Link
              to="/resend-verification"
              className="ml-auto font-medium underline whitespace-nowrap"
            >
              Resend link
            </Link>
          )}
        </div>
      )}

      <FormField
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email}
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Enter a valid email address',
          },
        })}
      />

      <FormField
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password}
        {...register('password', { required: 'Password is required' })}
      />

      <Button type="submit" className="w-full" loading={isLoading} size="lg">
        Sign in
      </Button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
          Create one
        </Link>
      </p>
    </form>
  );
};

export default Login;
