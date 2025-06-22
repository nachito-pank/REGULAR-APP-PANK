import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getCurrentTime, getCurrentDate, calculateLateMinutes, calculatePenalty } from '../../utils/time';
import { Attendance, CompanySettings } from '../../types';

const PunchClock: React.FC = () => {
  const { user, company } = useAuth();
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    if (company && user) {
      fetchTodayAttendance();
      fetchCompanySettings();
    }

    return () => clearInterval(timer);
  }, [company, user]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company?.company_id)
        .single();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = getCurrentDate();
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const handleArrival = async () => {
    setLoading(true);
    try {
      const now = getCurrentTime();
      const today = getCurrentDate();
      const expectedTime = user?.work_start_time || companySettings?.work_start_time || '08:00';

      const lateMinutes = calculateLateMinutes(expectedTime, now);
      const penaltyAmount = calculatePenalty(lateMinutes, companySettings?.penalty_per_hour || 1500);

      const { data, error } = await supabase
        .from('attendances')
        .insert([{
          user_id: user?.id,
          company_id: company?.company_id,
          date: today,
          arrival_time: now,
          arrival_validated: false,
          late_minutes: lateMinutes,
          penalty_amount: penaltyAmount
        }])
        .select()
        .single();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error recording arrival:', error);
      alert('Erreur lors de l\'enregistrement de l\'arrivée');
    } finally {
      setLoading(false);
    }
  };

  const handleDeparture = async () => {
    if (!todayAttendance) return;

    setLoading(true);
    try {
      const now = getCurrentTime();

      const { data, error } = await supabase
        .from('attendances')
        .update({ departure_time: now })
        .eq('id', todayAttendance.id)
        .select()
        .single();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error recording departure:', error);
      alert('Erreur lors de l\'enregistrement du départ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!todayAttendance) {
      return {
        status: 'not-arrived',
        message: 'Vous n\'avez pas encore pointé aujourd\'hui',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      };
    }

    if (!todayAttendance.arrival_validated) {
      return {
        status: 'pending-validation',
        message: 'Arrivée en attente de validation par l\'administrateur',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }

    if (!todayAttendance.departure_time) {
      return {
        status: 'present',
        message: 'Vous êtes présent - N\'oubliez pas de pointer votre départ',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    }

    return {
      status: 'completed',
      message: 'Journée terminée - Merci pour votre travail',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Pointage</h1>
        <div className="text-2xl sm:text-4xl font-mono font-bold text-blue-600 mb-4">
          {currentTime}
        </div>
        <div className="text-gray-600 text-sm sm:text-base">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className={`p-4 rounded-lg ${statusInfo.bgColor} border`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {statusInfo.status === 'not-arrived' && <Clock className="w-5 h-5 text-gray-600" />}
            {statusInfo.status === 'pending-validation' && <AlertCircle className="w-5 h-5 text-orange-600" />}
            {statusInfo.status === 'present' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {statusInfo.status === 'completed' && <CheckCircle className="w-5 h-5 text-blue-600" />}
          </div>
          <p className={`${statusInfo.color} font-medium text-sm sm:text-base`}>{statusInfo.message}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Arrivée</h3>
            <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>

          {todayAttendance?.arrival_time ? (
            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {todayAttendance.arrival_time}
              </p>
              {todayAttendance.late_minutes > 0 && (
                <div className="text-sm text-orange-600">
                  <p>Retard: {todayAttendance.late_minutes} minutes</p>
                  <p>Sanction: {todayAttendance.penalty_amount} FCFA</p>
                </div>
              )}
              {!todayAttendance.arrival_validated && (
                <p className="text-xs text-orange-600">⏳ En attente de validation</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm sm:text-base">Heure prévue: {user?.work_start_time}</p>
              <button
                onClick={handleArrival}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                {loading ? 'Enregistrement...' : 'Je suis arrivé'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Départ</h3>
            <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>

          {todayAttendance?.departure_time ? (
            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {todayAttendance.departure_time}
              </p>
              <p className="text-sm text-gray-600">Départ enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm sm:text-base">Heure prévue: {user?.work_end_time}</p>
              <button
                onClick={handleDeparture}
                disabled={loading || !todayAttendance?.arrival_time}
                className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                {loading ? 'Enregistrement...' : 'Je rentre'}
              </button>
              {!todayAttendance?.arrival_time && (
                <p className="text-xs text-gray-500 text-center">
                  Vous devez d'abord pointer votre arrivée
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {todayAttendance && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du jour</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Arrivée prévue:</span>
              <p className="font-medium">{user?.work_start_time}</p>
            </div>
            <div>
              <span className="text-gray-600">Arrivée réelle:</span>
              <p className="font-medium">{todayAttendance.arrival_time || 'Non pointée'}</p>
            </div>
            <div>
              <span className="text-gray-600">Départ prévu:</span>
              <p className="font-medium">{user?.work_end_time}</p>
            </div>
            <div>
              <span className="text-gray-600">Départ réel:</span>
              <p className="font-medium">{todayAttendance.departure_time || 'Non pointé'}</p>
            </div>
            {todayAttendance.late_minutes > 0 && (
              <>
                <div>
                  <span className="text-gray-600">Retard:</span>
                  <p className="font-medium text-orange-600">{todayAttendance.late_minutes} min</p>
                </div>
                <div>
                  <span className="text-gray-600">Sanction:</span>
                  <p className="font-medium text-red-600">{todayAttendance.penalty_amount} FCFA</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PunchClock;