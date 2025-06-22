import React, { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getCurrentDate } from '../../utils/time';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  totalPenaltiesMonth: number;
  averageLateMinutes: number;
  pendingReports: number;
}

const Dashboard: React.FC = () => {
  const { company } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    totalPenaltiesMonth: 0,
    averageLateMinutes: 0,
    pendingReports: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company) {
      fetchDashboardStats();
    }
  }, [company]);

  const fetchDashboardStats = async () => {
    try {
      const today = getCurrentDate();
      const currentDate = new Date(today);
      const currentMonth = today.substring(0, 7); // YYYY-MM

      // Calculate first day of next month for proper date range
      const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const nextMonthStart = firstDayOfNextMonth.toISOString().split('T')[0]; // YYYY-MM-DD

      // Total employees
      const { count: employeeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company?.company_id)
        .eq('role', 'employee');

      // Today's attendance
      const { data: todayAttendance } = await supabase
        .from('attendances')
        .select('*')
        .eq('company_id', company?.company_id)
        .eq('date', today);

      // This month's penalties
      const { data: monthlyPenalties } = await supabase
        .from('attendances')
        .select('penalty_amount')
        .eq('company_id', company?.company_id)
        .gte('date', `${currentMonth}-01`)
        .lt('date', nextMonthStart);

      // Pending reports (attendances without reports)
      const { data: pendingReports } = await supabase
        .from('attendances')
        .select('id')
        .eq('company_id', company?.company_id)
        .eq('date', today)
        .is('id', null);

      const presentToday = todayAttendance?.filter(att => att.arrival_time).length || 0;
      const lateToday = todayAttendance?.filter(att => att.late_minutes > 0).length || 0;
      const totalPenaltiesMonth = monthlyPenalties?.reduce((sum, p) => sum + p.penalty_amount, 0) || 0;
      const averageLateMinutes = todayAttendance?.length > 0
        ? todayAttendance.reduce((sum, att) => sum + att.late_minutes, 0) / todayAttendance.length
        : 0;

      setStats({
        totalEmployees: employeeCount || 0,
        presentToday,
        lateToday,
        totalPenaltiesMonth,
        averageLateMinutes: Math.round(averageLateMinutes),
        pendingReports: pendingReports?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${color.replace('border-l', 'bg').replace('-500', '-100')} flex-shrink-0 ml-4`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="text-sm text-gray-500">
          {formatDate(getCurrentDate())}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Employés"
          value={stats.totalEmployees}
          icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
          color="border-l-blue-500"
        />

        <StatCard
          title="Présents Aujourd'hui"
          value={stats.presentToday}
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
          color="border-l-green-500"
          subtitle={`Sur ${stats.totalEmployees} employés`}
        />

        <StatCard
          title="Retards Aujourd'hui"
          value={stats.lateToday}
          icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />}
          color="border-l-orange-500"
        />

        <StatCard
          title="Sanctions ce Mois"
          value={`${stats.totalPenaltiesMonth.toLocaleString()} FCFA`}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />}
          color="border-l-red-500"
        />

        <StatCard
          title="Retard Moyen"
          value={`${stats.averageLateMinutes} min`}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
          color="border-l-purple-500"
          subtitle="Aujourd'hui"
        />

        <StatCard
          title="Rapports en Attente"
          value={stats.pendingReports}
          icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />}
          color="border-l-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aperçu Rapide</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Taux de présence aujourd'hui</span>
            <span className="font-semibold text-gray-900">
              {stats.totalEmployees > 0
                ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}%`
                : '0%'
              }
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Taux de ponctualité</span>
            <span className="font-semibold text-gray-900">
              {stats.presentToday > 0
                ? `${Math.round(((stats.presentToday - stats.lateToday) / stats.presentToday) * 100)}%`
                : '100%'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;