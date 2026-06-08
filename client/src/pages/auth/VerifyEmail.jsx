import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { verifyEmail, resendVerification } from '../../api/authApi.js';
import Button from '../../components/ui/Button.jsx';

const STATUS = { LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' };

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ status: STATUS.LOADING, message: '' });
  const [resendState, setResendState] = useState({ loading: false, sent: false, error: '' });

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState({ status: STATUS.ERROR, message: 'No verification token found in the link.' });
      return;
    }

    verifyEmail(token)
      .then(({ data }) =>
        setState({ status: STATUS.SUCCESS, message: data.message || 'Email verified!' }),
      )
      .catch((err) =>
        setState({
          status: STATUS.ERROR,
          message: err.response?.data?.message || 'Verification failed. The link may have expired.',
        }),
      );
  }, [searchParams]);

  const handleResend = async () => {
    const email = searchParams.get('email') || '';
    if (!email) {
      setResendState({ loading: false, sent: false, error: 'Email not found. Please re-register.' });
      return;
    }

    setResendState({ loading: true, sent: false, error: '' });
    try {
      await resendVerification(email);
      setResendState({ loading: false, sent: true, error: '' });
    } catch {
      setResendState({ loading: false, sent: false, error: 'Could not resend. Please try again.' });
    }
  };

  if (state.status === STATUS.LOADING) {
    return (
      <div className="text-center space-y-3 py-4">
        <Loader className="mx-auto text-primary-600 animate-spin" size={36} />
        <p className="text-gray-500 text-sm">Verifying your email…</p>
      </div>
    );
  }

  if (state.status === STATUS.SUCCESS) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="text-green-600" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Email verified!</h2>
          <p className="text-sm text-gray-500 mt-2">{state.message}</p>
        </div>
        <Link to="/login">
          <Button size="lg" className="mx-auto">Continue to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 py-4">
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <XCircle className="text-red-500" size={28} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Verification failed</h2>
        <p className="text-sm text-gray-500 mt-2">{state.message}</p>
      </div>

      {resendState.sent ? (
        <p className="text-sm text-green-600">A new verification link has been sent.</p>
      ) : (
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="md"
            loading={resendState.loading}
            onClick={handleResend}
          >
            Resend verification email
          </Button>
          {resendState.error && (
            <p className="text-xs text-red-500">{resendState.error}</p>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500">
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default VerifyEmail;
