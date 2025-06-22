import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const { verifyEmail, sendVerificationCode } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await verifyEmail(email, code);
      setSuccess('Email vérifié avec succès !');
      setTimeout(() => {
        onVerified();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code de vérification invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendVerificationCode(email);
      setTimeLeft(600); // Reset timer
      setCanResend(false);
      setCode(''); // Clear current code
      setSuccess('Nouveau code envoyé !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi du code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Vérification Email</h1>
          <p className="text-blue-100 text-sm sm:text-base">Confirmez votre adresse email</p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2 text-sm sm:text-base">
              Un code de vérification a été envoyé à :
            </p>
            <p className="font-semibold text-gray-900 break-all bg-gray-50 p-2 rounded-lg text-sm sm:text-base">
              {email}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de vérification (6 chiffres)
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl sm:text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Vérification...</span>
                </>
              ) : (
                <span>Vérifier</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
            {timeLeft > 0 ? (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  ⏰ Code expire dans : <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
                </p>
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Code expiré
                </p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resendLoading || (!canResend && timeLeft > 0)}
              className="flex items-center justify-center space-x-2 w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
              <span>
                {resendLoading ? 'Envoi...' : canResend || timeLeft === 0 ? 'Renvoyer le code' : 'Renvoyer le code'}
              </span>
            </button>

            <button
              onClick={onBack}
              className="flex items-center justify-center space-x-2 w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la connexion</span>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 Astuce :</strong> Vérifiez votre dossier spam si vous ne recevez pas l'email. 
              Le code est valide pendant 10 minutes. Pour cette démo, le code s'affiche aussi dans la console du navigateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;