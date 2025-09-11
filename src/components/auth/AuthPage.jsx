import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleToggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setRegistrationSuccess(false);
  };

  const handleRegistrationSuccess = () => {
    setRegistrationSuccess(true);
    setMode('login');
  };

  // For login mode, use the full Figma design
  if (mode === 'login') {
    return <LoginForm onToggleMode={handleToggleMode} />;
  }

  // For registration mode, keep the original centered layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Bloom Energy Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
              <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bloom Energy
          </h1>
          <p className="text-gray-600">
            Contract Learning & Rules Management System
          </p>
        </div>

        {registrationSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Account created successfully! Please sign in with your credentials.
            </AlertDescription>
          </Alert>
        )}

        <RegisterForm 
          onToggleMode={handleToggleMode} 
          onSuccess={handleRegistrationSuccess}
        />

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 Bloom Energy Corporation</p>
          <p>Secure contract management platform</p>
        </div>
      </div>
    </div>
  );
}