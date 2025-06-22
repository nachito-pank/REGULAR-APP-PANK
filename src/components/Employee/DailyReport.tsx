import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Send, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getCurrentDate, getCurrentTime } from '../../utils/time';
import { Attendance, DailyReport as DailyReportType } from '../../types';

const DailyReport: React.FC = () => {
  const { user, company } = useAuth();
  const [tasks, setTasks] = useState<string[]>(['']);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [existingReport, setExistingReport] = useState<DailyReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (company && user) {
      fetchTodayData();
    }
  }, [company, user]);

  const fetchTodayData = async () => {
    try {
      const today = getCurrentDate();

      // Fetch today's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();

      if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;
      setTodayAttendance(attendance);

      // Fetch existing report if any
      if (attendance) {
        const { data: report, error: reportError } = await supabase
          .from('daily_reports')
          .select('*')
          .eq('attendance_id', attendance.id)
          .single();

        if (reportError && reportError.code !== 'PGRST116') throw reportError;

        if (report) {
          setExistingReport(report);
          setTasks(report.tasks.length > 0 ? report.tasks : ['']);
        }
      }
    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    setTasks([...tasks, '']);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const submitReport = async () => {
    if (!todayAttendance) {
      alert('Vous devez d\'abord pointer votre arrivée pour pouvoir soumettre un rapport');
      return;
    }

    const validTasks = tasks.filter(task => task.trim() !== '');
    if (validTasks.length === 0) {
      alert('Veuillez ajouter au moins une tâche');
      return;
    }

    setSubmitting(true);
    try {
      const reportData = {
        user_id: user?.id,
        company_id: company?.company_id,
        attendance_id: todayAttendance.id,
        date: getCurrentDate(),
        tasks: validTasks,
        submitted_at: getCurrentTime()
      };

      if (existingReport) {
        // Update existing report
        const { data, error } = await supabase
          .from('daily_reports')
          .update(reportData)
          .eq('id', existingReport.id)
          .select()
          .single();

        if (error) throw error;
        setExistingReport(data);
      } else {
        // Create new report
        const { data, error } = await supabase
          .from('daily_reports')
          .insert([reportData])
          .select()
          .single();

        if (error) throw error;
        setExistingReport(data);
      }

      alert('Rapport soumis avec succès !');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Erreur lors de la soumission du rapport');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rapport Journalier</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>

      {!todayAttendance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-800 text-sm sm:text-base">
              Vous devez d'abord pointer votre arrivée pour pouvoir créer un rapport journalier.
            </p>
          </div>
        </div>
      )}

      {todayAttendance && !todayAttendance.arrival_validated && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-orange-800 text-sm sm:text-base">
              Votre arrivée est en attente de validation par l'administrateur.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Mes tâches du jour</span>
          </h2>
          {existingReport && (
            <div className="text-sm text-green-600 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Soumis à {existingReport.submitted_at}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-1">
                {index + 1}
              </span>
              <textarea
                value={task}
                onChange={(e) => updateTask(index, e.target.value)}
                placeholder={`Tâche ${index + 1}...`}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm sm:text-base"
                rows={2}
                disabled={!todayAttendance}
              />
              {tasks.length > 1 && (
                <button
                  onClick={() => removeTask(index)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                  disabled={!todayAttendance}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-6 border-t gap-4">
          <button
            onClick={addTask}
            className="flex items-center justify-center sm:justify-start space-x-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm sm:text-base"
            disabled={!todayAttendance}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une tâche</span>
          </button>

          <button
            onClick={submitReport}
            disabled={submitting || !todayAttendance}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting ? 'Envoi...' : existingReport ? 'Mettre à jour' : 'Envoyer mon rapport'}
            </span>
          </button>
        </div>
      </div>

      {todayAttendance && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de présence</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Arrivée:</span>
              <p className="font-medium">{todayAttendance.arrival_time || 'Non pointée'}</p>
            </div>
            <div>
              <span className="text-gray-600">Départ:</span>
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

export default DailyReport;