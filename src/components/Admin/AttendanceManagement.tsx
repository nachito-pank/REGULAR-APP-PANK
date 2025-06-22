import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Filter, Download, Eye, User, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getCurrentDate } from '../../utils/time';
import { Attendance, User as UserType } from '../../types';

interface AttendanceWithUser extends Attendance {
  user: UserType;
}

const AttendanceManagement: React.FC = () => {
  const { company } = useAuth();
  const [attendances, setAttendances] = useState<AttendanceWithUser[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (company) {
      fetchEmployees();
      fetchAttendances();
    }
  }, [company, selectedDate, selectedEmployee, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company?.company_id)
        .eq('role', 'employee')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendances = async () => {
    try {
      let query = supabase
        .from('attendances')
        .select(`
          *,
          user:users(*)
        `)
        .eq('company_id', company?.company_id)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (selectedDate) {
        query = query.eq('date', selectedDate);
      }

      // Apply employee filter
      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Apply status filter
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(attendance => {
          switch (statusFilter) {
            case 'pending':
              return !attendance.arrival_validated && attendance.arrival_time;
            case 'validated':
              return attendance.arrival_validated;
            case 'late':
              return attendance.late_minutes > 0;
            case 'on-time':
              return attendance.late_minutes === 0 && attendance.arrival_time;
            case 'absent':
              return !attendance.arrival_time;
            default:
              return true;
          }
        });
      }

      // Apply search filter
      if (searchTerm) {
        filteredData = filteredData.filter(attendance =>
          attendance.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendance.user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setAttendances(filteredData);
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateArrival = async (attendanceId: string, validated: boolean) => {
    try {
      const { error } = await supabase
        .from('attendances')
        .update({ arrival_validated: validated })
        .eq('id', attendanceId);

      if (error) throw error;
      await fetchAttendances();
    } catch (error) {
      console.error('Error validating arrival:', error);
      alert('Erreur lors de la validation');
    }
  };

  const getStatusBadge = (attendance: AttendanceWithUser) => {
    if (!attendance.arrival_time) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          Absent
        </span>
      );
    }

    if (!attendance.arrival_validated) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          En attente
        </span>
      );
    }

    if (attendance.late_minutes > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Clock className="w-3 h-3 mr-1" />
          Retard ({attendance.late_minutes}min)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        À l'heure
      </span>
    );
  };

  const exportAttendances = () => {
    // Simple CSV export
    const headers = ['Date', 'Employé', 'Email', 'Arrivée prévue', 'Arrivée réelle', 'Départ prévu', 'Départ réel', 'Retard (min)', 'Sanction (FCFA)', 'Statut'];
    const csvData = attendances.map(att => [
      att.date,
      att.user.name,
      att.user.email,
      att.user.work_start_time,
      att.arrival_time || 'Non pointé',
      att.user.work_end_time,
      att.departure_time || 'Non pointé',
      att.late_minutes,
      att.penalty_amount,
      att.arrival_validated ? 'Validé' : 'En attente'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `presences_${selectedDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Présences</h1>
        <button
          onClick={exportAttendances}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employé
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les employés</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="validated">Validé</option>
                <option value="late">En retard</option>
                <option value="on-time">À l'heure</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom ou email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total présences</p>
              <p className="text-2xl font-bold text-gray-900">{attendances.length}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-orange-600">
                {attendances.filter(att => !att.arrival_validated && att.arrival_time).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Retards</p>
              <p className="text-2xl font-bold text-red-600">
                {attendances.filter(att => att.late_minutes > 0).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sanctions totales</p>
              <p className="text-2xl font-bold text-red-600">
                {attendances.reduce((sum, att) => sum + Number(att.penalty_amount), 0).toLocaleString()} FCFA
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Attendances Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horaires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sanction
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{attendance.user.name}</div>
                        <div className="text-sm text-gray-500">{attendance.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(attendance.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Prévu:</span>
                        <span>{attendance.user.work_start_time} - {attendance.user.work_end_time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Réel:</span>
                        <span>
                          {attendance.arrival_time || 'Non pointé'} - {attendance.departure_time || 'Non pointé'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(attendance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.penalty_amount > 0 ? (
                      <span className="text-red-600 font-medium">
                        {Number(attendance.penalty_amount).toLocaleString()} FCFA
                      </span>
                    ) : (
                      <span className="text-green-600">Aucune</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {attendance.arrival_time && !attendance.arrival_validated && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => validateArrival(attendance.id, true)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Valider l'arrivée"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => validateArrival(attendance.id, false)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rejeter l'arrivée"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {attendance.arrival_validated && (
                      <span className="text-green-600 text-xs">Validé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendances.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune présence trouvée pour les critères sélectionnés</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;