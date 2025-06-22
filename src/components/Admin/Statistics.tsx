import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

interface StatisticsData {
  totalEmployees: number;
  averageAttendanceRate: number;
  totalPenalties: number;
  averageProductivity: number;
  attendanceTrend: { date: string; present: number; total: number }[];
  punctualityTrend: { date: string; onTime: number; late: number }[];
  penaltiesByEmployee: { name: string; amount: number }[];
  tasksByEmployee: { name: string; tasks: number }[];
  monthlyComparison: { month: string; attendance: number; productivity: number }[];
  departmentStats: { department: string; attendance: number; productivity: number }[];
}

const Statistics: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<StatisticsData>({
    totalEmployees: 0,
    averageAttendanceRate: 0,
    totalPenalties: 0,
    averageProductivity: 0,
    attendanceTrend: [],
    punctualityTrend: [],
    penaltiesByEmployee: [],
    tasksByEmployee: [],
    monthlyComparison: [],
    departmentStats: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    if (company) {
      fetchStatistics();
    }
  }, [company, dateRange, selectedPeriod]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employees } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company?.company_id)
        .eq('role', 'employee');

      // Fetch attendances for the period
      const { data: attendances } = await supabase
        .from('attendances')
        .select(`
          *,
          user:users(name)
        `)
        .eq('company_id', company?.company_id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Fetch reports for the period
      const { data: reports } = await supabase
        .from('daily_reports')
        .select(`
          *,
          user:users(name)
        `)
        .eq('company_id', company?.company_id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      if (employees && attendances && reports) {
        const processedStats = processStatisticsData(employees, attendances, reports);
        setStats(processedStats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processStatisticsData = (employees: any[], attendances: any[], reports: any[]): StatisticsData => {
    const totalEmployees = employees.length;
    
    // Calculate attendance rate
    const daysInPeriod = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    }).length;
    const expectedAttendances = totalEmployees * daysInPeriod;
    const actualAttendances = attendances.filter(att => att.arrival_time).length;
    const averageAttendanceRate = expectedAttendances > 0 ? (actualAttendances / expectedAttendances) * 100 : 0;

    // Calculate total penalties
    const totalPenalties = attendances.reduce((sum, att) => sum + Number(att.penalty_amount), 0);

    // Calculate average productivity
    const averageProductivity = reports.length > 0 
      ? reports.reduce((sum, report) => {
          const taskScore = Math.min(report.tasks.length * 20, 80);
          const attendance = attendances.find(att => att.id === report.attendance_id);
          const punctualityScore = attendance?.late_minutes === 0 ? 20 : Math.max(0, 20 - attendance?.late_minutes);
          return sum + Math.min(taskScore + punctualityScore, 100);
        }, 0) / reports.length
      : 0;

    // Generate attendance trend
    const attendanceTrend = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    }).map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAttendances = attendances.filter(att => att.date === dateStr);
      return {
        date: dateStr,
        present: dayAttendances.filter(att => att.arrival_time).length,
        total: totalEmployees
      };
    });

    // Generate punctuality trend
    const punctualityTrend = eachDayOfInterval({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    }).map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAttendances = attendances.filter(att => att.date === dateStr && att.arrival_time);
      return {
        date: dateStr,
        onTime: dayAttendances.filter(att => att.late_minutes === 0).length,
        late: dayAttendances.filter(att => att.late_minutes > 0).length
      };
    });

    // Penalties by employee
    const penaltiesByEmployee = employees.map(emp => {
      const empAttendances = attendances.filter(att => att.user_id === emp.id);
      const totalPenalty = empAttendances.reduce((sum, att) => sum + Number(att.penalty_amount), 0);
      return {
        name: emp.name,
        amount: totalPenalty
      };
    }).filter(emp => emp.amount > 0).sort((a, b) => b.amount - a.amount);

    // Tasks by employee
    const tasksByEmployee = employees.map(emp => {
      const empReports = reports.filter(report => report.user_id === emp.id);
      const totalTasks = empReports.reduce((sum, report) => sum + report.tasks.length, 0);
      return {
        name: emp.name,
        tasks: totalTasks
      };
    }).sort((a, b) => b.tasks - a.tasks);

    // Monthly comparison (last 6 months)
    const monthlyComparison = Array.from({ length: 6 }, (_, i) => {
      const date = subDays(new Date(), i * 30);
      const monthStart = format(startOfMonth(date), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd');
      
      const monthAttendances = attendances.filter(att => att.date >= monthStart && att.date <= monthEnd);
      const monthReports = reports.filter(report => report.date >= monthStart && report.date <= monthEnd);
      
      const monthlyAttendanceRate = monthAttendances.length > 0 
        ? (monthAttendances.filter(att => att.arrival_time).length / monthAttendances.length) * 100 
        : 0;
      
      const monthlyProductivity = monthReports.length > 0
        ? monthReports.reduce((sum, report) => sum + report.tasks.length, 0) / monthReports.length
        : 0;

      return {
        month: format(date, 'MMM yyyy'),
        attendance: Math.round(monthlyAttendanceRate),
        productivity: Math.round(monthlyProductivity * 10) / 10
      };
    }).reverse();

    return {
      totalEmployees,
      averageAttendanceRate: Math.round(averageAttendanceRate),
      totalPenalties,
      averageProductivity: Math.round(averageProductivity),
      attendanceTrend,
      punctualityTrend,
      penaltiesByEmployee,
      tasksByEmployee,
      monthlyComparison,
      departmentStats: [] // Could be expanded with department data
    };
  };

  const setPeriod = (period: 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'quarter':
        start = subDays(now, 90);
        break;
    }
    
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    });
  };

  const exportStatistics = () => {
    const data = {
      period: `${dateRange.start} to ${dateRange.end}`,
      summary: {
        totalEmployees: stats.totalEmployees,
        attendanceRate: `${stats.averageAttendanceRate}%`,
        totalPenalties: `${stats.totalPenalties} FCFA`,
        averageProductivity: `${stats.averageProductivity}%`
      },
      attendanceTrend: stats.attendanceTrend,
      penaltiesByEmployee: stats.penaltiesByEmployee,
      tasksByEmployee: stats.tasksByEmployee
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistics_${dateRange.start}_${dateRange.end}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Chart configurations
  const attendanceChartData = {
    labels: stats.attendanceTrend.map(item => format(new Date(item.date), 'dd/MM')),
    datasets: [
      {
        label: 'Présents',
        data: stats.attendanceTrend.map(item => item.present),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Total employés',
        data: stats.attendanceTrend.map(item => item.total),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ]
  };

  const punctualityChartData = {
    labels: stats.punctualityTrend.map(item => format(new Date(item.date), 'dd/MM')),
    datasets: [
      {
        label: 'À l\'heure',
        data: stats.punctualityTrend.map(item => item.onTime),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'En retard',
        data: stats.punctualityTrend.map(item => item.late),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  };

  const penaltiesChartData = {
    labels: stats.penaltiesByEmployee.slice(0, 10).map(item => item.name),
    datasets: [
      {
        data: stats.penaltiesByEmployee.slice(0, 10).map(item => item.amount),
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
          '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
        ],
      }
    ]
  };

  const productivityChartData = {
    labels: stats.tasksByEmployee.slice(0, 10).map(item => item.name),
    datasets: [
      {
        label: 'Tâches réalisées',
        data: stats.tasksByEmployee.slice(0, 10).map(item => item.tasks),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportStatistics}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
          <button
            onClick={fetchStatistics}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Période d'analyse</h2>
          <div className="flex items-center space-x-2">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriod(period)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'week' ? '7 jours' : period === 'month' ? 'Ce mois' : '3 mois'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Employés Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Présence</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageAttendanceRate}%</p>
              <div className="flex items-center mt-1">
                {stats.averageAttendanceRate >= 90 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-xs ${stats.averageAttendanceRate >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.averageAttendanceRate >= 90 ? 'Excellent' : 'À améliorer'}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sanctions Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPenalties.toLocaleString()} FCFA</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Productivité Moyenne</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageProductivity}%</p>
              <div className="flex items-center mt-1">
                {stats.averageProductivity >= 80 ? (
                  <Award className="w-4 h-4 text-purple-600 mr-1" />
                ) : (
                  <Target className="w-4 h-4 text-orange-600 mr-1" />
                )}
                <span className={`text-xs ${stats.averageProductivity >= 80 ? 'text-purple-600' : 'text-orange-600'}`}>
                  {stats.averageProductivity >= 80 ? 'Très bon' : 'Moyen'}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Évolution des Présences</h3>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="h-80">
            <Line data={attendanceChartData} options={chartOptions} />
          </div>
        </div>

        {/* Punctuality Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ponctualité Quotidienne</h3>
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div className="h-80">
            <Bar data={punctualityChartData} options={chartOptions} />
          </div>
        </div>

        {/* Penalties Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des Sanctions</h3>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="h-80">
            {stats.penaltiesByEmployee.length > 0 ? (
              <Doughnut 
                data={penaltiesChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Award className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>Aucune sanction dans cette période</p>
                  <p className="text-sm">Excellente ponctualité !</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productivity by Employee */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productivité par Employé</h3>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="h-80">
            <Bar data={productivityChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="w-5 h-5 text-yellow-500 mr-2" />
              Top Performers (Tâches)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.tasksByEmployee.slice(0, 5).map((employee, index) => (
                <div key={employee.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{employee.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-blue-600">{employee.tasks}</span>
                    <span className="text-sm text-gray-500">tâches</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Penalties Ranking */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              Sanctions par Employé
            </h3>
          </div>
          <div className="p-6">
            {stats.penaltiesByEmployee.length > 0 ? (
              <div className="space-y-4">
                {stats.penaltiesByEmployee.slice(0, 5).map((employee, index) => (
                  <div key={employee.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{employee.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-red-600">{employee.amount.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">FCFA</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-gray-600">Aucune sanction enregistrée</p>
                <p className="text-sm text-green-600 font-medium">Équipe exemplaire !</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      {stats.monthlyComparison.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="w-5 h-5 text-indigo-600 mr-2" />
            Évolution Mensuelle
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Mois</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Taux de Présence</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Productivité Moyenne</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Tendance</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthlyComparison.map((month, index) => {
                  const prevMonth = stats.monthlyComparison[index - 1];
                  const attendanceTrend = prevMonth ? month.attendance - prevMonth.attendance : 0;
                  const productivityTrend = prevMonth ? month.productivity - prevMonth.productivity : 0;
                  
                  return (
                    <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{month.month}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          month.attendance >= 90 ? 'bg-green-100 text-green-800' :
                          month.attendance >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {month.attendance}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium text-gray-900">{month.productivity}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {attendanceTrend > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : attendanceTrend < 0 ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                          {productivityTrend > 0 ? (
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                          ) : productivityTrend < 0 ? (
                            <TrendingDown className="w-4 h-4 text-orange-600" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;