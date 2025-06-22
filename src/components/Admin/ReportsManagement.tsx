import React, { useEffect, useState } from 'react';
import { FileText, Calendar, User, Search, Download, Eye, CheckCircle, Clock, Filter, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getCurrentDate } from '../../utils/time';
import { DailyReport, User as UserType, Attendance } from '../../types';

interface ReportWithDetails extends DailyReport {
  user: UserType;
  attendance: Attendance;
}

const ReportsManagement: React.FC = () => {
  const { company } = useAuth();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: getCurrentDate()
  });
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (company) {
      fetchEmployees();
      fetchReports();
    }
  }, [company, selectedDate, selectedEmployee, dateRange]);

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

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          user:users(*),
          attendance:attendances(*)
        `)
        .eq('company_id', company?.company_id)
        .order('created_at', { ascending: false });

      // Apply date filters
      if (selectedDate) {
        query = query.eq('date', selectedDate);
      } else if (dateRange.start && dateRange.end) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }

      // Apply employee filter
      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Apply search filter
      if (searchTerm) {
        filteredData = filteredData.filter(report =>
          report.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.tasks.some(task => task.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setReports(filteredData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewReportDetails = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const exportReports = () => {
    const headers = [
      'Date', 'Employé', 'Email', 'Heure de soumission', 'Nombre de tâches', 
      'Arrivée', 'Départ', 'Retard (min)', 'Sanction (FCFA)', 'Tâches'
    ];
    
    const csvData = reports.map(report => [
      report.date,
      report.user.name,
      report.user.email,
      report.submitted_at,
      report.tasks.length,
      report.attendance.arrival_time || 'Non pointé',
      report.attendance.departure_time || 'Non pointé',
      report.attendance.late_minutes,
      report.attendance.penalty_amount,
      report.tasks.join(' | ')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapports_${dateRange.start || 'all'}_${dateRange.end || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProductivityScore = (report: ReportWithDetails): number => {
    // Simple productivity score based on number of tasks and punctuality
    const taskScore = Math.min(report.tasks.length * 20, 80); // Max 80 points for tasks
    const punctualityScore = report.attendance.late_minutes === 0 ? 20 : Math.max(0, 20 - report.attendance.late_minutes);
    return Math.min(taskScore + punctualityScore, 100);
  };

  const getProductivityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
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
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Rapports</h1>
        <button
          onClick={exportReports}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date spécifique
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (e.target.value) {
                    setDateRange({ start: '', end: '' });
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                if (e.target.value) {
                  setSelectedDate('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                if (e.target.value) {
                  setSelectedDate('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, email ou tâche..."
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
              <p className="text-sm text-gray-600">Total rapports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tâches totales</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.reduce((sum, report) => sum + report.tasks.length, 0)}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Moyenne tâches/jour</p>
              <p className="text-2xl font-bold text-purple-600">
                {reports.length > 0 
                  ? Math.round((reports.reduce((sum, report) => sum + report.tasks.length, 0) / reports.length) * 10) / 10
                  : 0
                }
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productivité moyenne</p>
              <p className="text-2xl font-bold text-indigo-600">
                {reports.length > 0 
                  ? Math.round(reports.reduce((sum, report) => sum + getProductivityScore(report), 0) / reports.length)
                  : 0
                }%
              </p>
            </div>
            <Clock className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Reports Table */}
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
                  Tâches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Soumis à
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productivité
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => {
                const productivityScore = getProductivityScore(report);
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{report.user.name}</div>
                          <div className="text-sm text-gray-500">{report.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {report.tasks.length} tâche{report.tasks.length > 1 ? 's' : ''}
                        </span>
                        <div className="mt-1 text-xs text-gray-500 max-w-xs truncate">
                          {report.tasks.slice(0, 2).join(', ')}
                          {report.tasks.length > 2 && '...'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{report.submitted_at}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProductivityColor(productivityScore)}`}>
                        {productivityScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewReportDetails(report)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun rapport trouvé pour les critères sélectionnés</p>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Rapport de {selectedReport.user.name}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Informations employé</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nom:</span>
                      <p className="font-medium">{selectedReport.user.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{selectedReport.user.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p className="font-medium">{formatDate(selectedReport.date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Soumis à:</span>
                      <p className="font-medium">{selectedReport.submitted_at}</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Présence du jour</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Arrivée prévue:</span>
                      <p className="font-medium">{selectedReport.user.work_start_time}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Arrivée réelle:</span>
                      <p className="font-medium">{selectedReport.attendance.arrival_time || 'Non pointée'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Départ prévu:</span>
                      <p className="font-medium">{selectedReport.user.work_end_time}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Départ réel:</span>
                      <p className="font-medium">{selectedReport.attendance.departure_time || 'Non pointé'}</p>
                    </div>
                    {selectedReport.attendance.late_minutes > 0 && (
                      <>
                        <div>
                          <span className="text-gray-600">Retard:</span>
                          <p className="font-medium text-orange-600">{selectedReport.attendance.late_minutes} min</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Sanction:</span>
                          <p className="font-medium text-red-600">{selectedReport.attendance.penalty_amount} FCFA</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Tâches réalisées ({selectedReport.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.tasks.map((task, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-900 flex-1">{task}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Productivity Score */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Score de productivité</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Score global</span>
                        <span className="font-medium">{getProductivityScore(selectedReport)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProductivityScore(selectedReport)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    Basé sur le nombre de tâches réalisées et la ponctualité
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;