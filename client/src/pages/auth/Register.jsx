import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register as registerUser, clearAuthError } from '../../features/auth/authSlice.js';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/ui/Button.jsx';
import { CheckCircle } from 'lucide-react';

const PASSWORD_RULES = {
  minLength: { value: 8, message: 'At least 8 characters' },
  pattern: {
    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Must include uppercase, lowercase, and a number',
  },
};

const PasswordStrength = ({ password = '' }) => {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map(({ label, ok }) => (
            <span
              key={label}
              className={`flex items-center gap-1 text-xs ${
                ok ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <CheckCircle size={11} className={ok ? 'fill-green-500 text-white' : ''} />
              {label}
            </span>
          ))}
        </div>
      )}
      {password && score > 0 && (
        <p className={`text-xs font-medium ${score === 4 ? 'text-green-600' : 'text-gray-500'}`}>
          Strength: {labels[score]}
        </p>
      )}
    </div>
  );
};

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector((state) => state.auth);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  // Clear any stale error from a previous auth page
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(registerUser(data));
      if (registerUser.fulfilled.match(result)) {
        const msg = result.payload?.message || '';
        // Dev: auto-verified — go straight to login
        if (msg.includes('You can now sign in')) {
          navigate('/login', { state: { registered: true } });
          return;
        }
        setSuccessMessage(msg || 'Account created! Check your email for the verification link.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="text-green-600" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Check your inbox</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">{successMessage}</p>
        </div>
        <Button
          variant="secondary"
          size="md"
          className="mx-auto"
          onClick={() => navigate('/login')}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  const isLoading = submitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
        <p className="text-sm text-gray-500 mt-1">Start your AI-powered job search</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <FormField
        label="Full name"
        type="text"
        placeholder="Jane Smith"
        autoComplete="name"
        error={errors.name}
        {...register('name', {
          required: 'Name is required',
          minLength: { value: 2, message: 'Name must be at least 2 characters' },
          maxLength: { value: 50, message: 'Name cannot exceed 50 characters' },
        })}
      />

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

      <div>
        <FormField
          label="Password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          error={errors.password}
          {...register('password', {
            required: 'Password is required',
            ...PASSWORD_RULES,
          })}
        />
        <PasswordStrength password={password} />
      </div>

      <FormField
        label="Confirm password"
        type="password"
        placeholder="Repeat your password"
        autoComplete="new-password"
        error={errors.confirmPassword}
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (val) => val === password || 'Passwords do not match',
        })}
      />

      <Button type="submit" className="w-full" loading={isLoading} size="lg">
        Create account
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default Register;
