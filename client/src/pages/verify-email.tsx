import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/service/app.api';
import { toast } from 'sonner';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  
  const success = searchParams.get('success');
  const token = searchParams.get('token');

  useEffect(() => {
    // Check if we have success/error params from backend redirect
    if (success === 'true') {
      setStatus('success');
      setMessage('Your email has been verified successfully!');
    } else if (success === 'false') {
      setStatus('error');
      setMessage('Email verification failed. The link may be invalid or expired.');
    } else if (token) {
      // Handle direct verification using API call
      setStatus('loading');
      verifyEmailWithToken(token);
    } else {
      // No params, this might be an invalid access
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
    }
  }, [success, token]);

  const verifyEmailWithToken = async (verificationToken: string) => {
    try {
      const response = await api.auth.verifyEmail(verificationToken);
      if (response.success) {
        setStatus('success');
        setMessage(response.message);
        toast.success('Email verified successfully!');
      } else {
        setStatus('error');
        setMessage(response.message);
        toast.error('Verification failed');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An error occurred during verification');
      toast.error('Verification failed');
    }
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Verifying your email...
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Please wait while we verify your email address.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Email Verified Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message || 'Your email address has been verified successfully. You can now log in to your account and access all features.'}
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleGoToLogin} 
                className="w-full"
                size="lg"
              >
                Continue to Login
              </Button>
              
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome to Colbin! 🎉
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verification Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {message || 'The verification link is invalid or has expired. This might happen if:'}
          </p>
          
          {!message && (
            <ul className="text-left text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                The link has already been used
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                The link has expired (24 hours)
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                The link was corrupted or incomplete
              </li>
            </ul>
          )}
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              
              <Button 
                onClick={handleGoToLogin}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Try Login
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If you continue to experience issues, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;