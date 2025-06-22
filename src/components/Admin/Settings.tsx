import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Clock, 
  DollarSign, 
  Users, 
  Building2, 
  Mail, 
  Shield, 
  Bell, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Globe,
  Palette,
  Database,
  Key,
  Lock,
  User,
  Phone,
  MapPin,
  FileText,
  Trash2,
  Plus,
  Edit3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings, User as UserType } from '../../types';
import { hashPassword } from '../../utils/auth';

interface NotificationSettings {
  emailNotifications: boolean;
  lateArrivalAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  systemUpdates: boolean;
}

interface SecuritySettings {
  passwordMinLength: number;
  sessionTimeout: number;
  twoFactorAuth: boolean;
  loginAttempts: number;
}

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  logo: string;
}

const Settings: React.FC = () => {
  const { user, company } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'work' | 'penalties' | 'notifications' | 'security' | 'users' | 'backup'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Company Settings
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    logo: ''
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    lateArrivalAlerts: true,
    dailyReports: false,
    weeklyReports: true,
    systemUpdates: true
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    passwordMinLength: 6,
    sessionTimeout: 30,
    twoFactorAuth: false,
    loginAttempts: 5
  });

  // Users Management
  const [users, setUsers] = useState<UserType[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'employee' as 'admin' | 'employee',
    password: '',
    work_start_time: '08:00',
    work_end_time: '17:00'
  });

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (company && user) {
      fetchAllSettings();
    }
  }, [company, user]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCompanySettings(),
        fetchUsers(),
        loadStoredSettings()
      ]);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showMessage('error', 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company?.company_id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCompanySettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          company_id: company?.company_id,
          penalty_per_hour: 1500,
          work_start_time: '08:00',
          work_end_time: '17:00',
          penalty_type: 'hour' as const
        };
        
        const { data: newSettings, error: createError } = await supabase
          .from('company_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) throw createError;
        setCompanySettings(newSettings);
      }

      // Load company profile
      setCompanyProfile({
        name: company?.name || '',
        address: '',
        phone: '',
        email: '',
        website: '',
        description: '',
        logo: ''
      });
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const loadStoredSettings = () => {
    // Load settings from localStorage (in production, these would be in database)
    const storedNotifications = localStorage.getItem(`notifications_${company?.company_id}`);
    const storedSecurity = localStorage.getItem(`security_${company?.company_id}`);

    if (storedNotifications) {
      setNotificationSettings(JSON.parse(storedNotifications));
    }

    if (storedSecurity) {
      setSecuritySettings(JSON.parse(storedSecurity));
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const saveCompanySettings = async () => {
    if (!companySettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          penalty_per_hour: companySettings.penalty_per_hour,
          work_start_time: companySettings.work_start_time,
          work_end_time: companySettings.work_end_time,
          penalty_type: companySettings.penalty_type
        })
        .eq('company_id', company?.company_id);

      if (error) throw error;

      // Update company name if changed
      if (companyProfile.name !== company?.name) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({ name: companyProfile.name })
          .eq('company_id', company?.company_id);

        if (companyError) throw companyError;
      }

      showMessage('success', 'Paramètres de l\'entreprise sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving company settings:', error);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`notifications_${company?.company_id}`, JSON.stringify(notificationSettings));
      showMessage('success', 'Paramètres de notification sauvegardés');
    } catch (error) {
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`security_${company?.company_id}`, JSON.stringify(securitySettings));
      showMessage('success', 'Paramètres de sécurité sauvegardés');
    } catch (error) {
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          work_start_time: userFormData.work_start_time,
          work_end_time: userFormData.work_end_time
        };

        if (userFormData.password) {
          updateData.password = await hashPassword(userFormData.password);
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        showMessage('success', 'Utilisateur modifié avec succès');
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert([{
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role,
            company_id: company?.company_id,
            password: await hashPassword(userFormData.password),
            work_start_time: userFormData.work_start_time,
            work_end_time: userFormData.work_end_time,
            email_verified: true
          }]);

        if (error) throw error;
        showMessage('success', 'Utilisateur créé avec succès');
      }

      await fetchUsers();
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        role: 'employee',
        password: '',
        work_start_time: '08:00',
        work_end_time: '17:00'
      });
    } catch (error) {
      console.error('Error saving user:', error);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      work_start_time: user.work_start_time,
      work_end_time: user.work_end_time
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      showMessage('success', 'Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('error', 'Erreur lors de la suppression');
    }
  };

  const exportBackup = () => {
    const backupData = {
      company: company,
      settings: companySettings,
      profile: companyProfile,
      notifications: notificationSettings,
      security: securitySettings,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${company?.company_id}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('success', 'Sauvegarde exportée avec succès');
  };

  const tabs = [
    { id: 'company', label: 'Entreprise', icon: Building2 },
    { id: 'work', label: 'Horaires', icon: Clock },
    { id: 'penalties', label: 'Sanctions', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'backup', label: 'Sauvegarde', icon: Database }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <span>Paramètres</span>
        </h1>
        <button
          onClick={fetchAllSettings}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {message.type === 'info' && <Info className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Informations de l'entreprise</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={companyProfile.name}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Entreprise
                  </label>
                  <input
                    type="text"
                    value={company?.company_id || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={companyProfile.email}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site web
                  </label>
                  <input
                    type="url"
                    value={companyProfile.website}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={companyProfile.address}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={companyProfile.description}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description de votre entreprise..."
                />
              </div>

              <button
                onClick={saveCompanySettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          )}

          {/* Work Hours Tab */}
          {activeTab === 'work' && companySettings && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Horaires de travail</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure d'arrivée
                  </label>
                  <input
                    type="time"
                    value={companySettings.work_start_time}
                    onChange={(e) => setCompanySettings({ ...companySettings, work_start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de départ
                  </label>
                  <input
                    type="time"
                    value={companySettings.work_end_time}
                    onChange={(e) => setCompanySettings({ ...companySettings, work_end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-800 text-sm">
                    Ces horaires s'appliquent par défaut à tous les nouveaux employés. 
                    Vous pouvez personnaliser les horaires individuellement dans la gestion des employés.
                  </p>
                </div>
              </div>

              <button
                onClick={saveCompanySettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          )}

          {/* Penalties Tab */}
          {activeTab === 'penalties' && companySettings && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Système de sanctions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant par heure de retard (FCFA)
                  </label>
                  <input
                    type="number"
                    value={companySettings.penalty_per_hour}
                    onChange={(e) => setCompanySettings({ ...companySettings, penalty_per_hour: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de calcul
                  </label>
                  <select
                    value={companySettings.penalty_type}
                    onChange={(e) => setCompanySettings({ ...companySettings, penalty_type: e.target.value as 'hour' | 'minute' | 'day' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hour">Par heure</option>
                    <option value="minute">Par minute</option>
                    <option value="day">Par jour</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Exemple de calcul :</p>
                    <p className="text-yellow-700 text-sm">
                      Retard de 30 minutes = {Math.ceil(30 / 60 * companySettings.penalty_per_hour).toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={saveCompanySettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Paramètres de notification</h2>
              
              <div className="space-y-4">
                {Object.entries({
                  emailNotifications: 'Notifications par email',
                  lateArrivalAlerts: 'Alertes de retard',
                  dailyReports: 'Rapports quotidiens',
                  weeklyReports: 'Rapports hebdomadaires',
                  systemUpdates: 'Mises à jour système'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{label}</h3>
                      <p className="text-sm text-gray-500">
                        {key === 'emailNotifications' && 'Recevoir les notifications par email'}
                        {key === 'lateArrivalAlerts' && 'Être alerté en cas de retard d\'employé'}
                        {key === 'dailyReports' && 'Recevoir un résumé quotidien des présences'}
                        {key === 'weeklyReports' && 'Recevoir un rapport hebdomadaire'}
                        {key === 'systemUpdates' && 'Être informé des mises à jour du système'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings[key as keyof NotificationSettings]}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          [key]: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Paramètres de sécurité</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longueur minimale du mot de passe
                  </label>
                  <input
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="6"
                    max="20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout de session (minutes)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="5"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tentatives de connexion max
                  </label>
                  <input
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttempts: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="3"
                    max="10"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Authentification à deux facteurs</h3>
                    <p className="text-sm text-gray-500">Sécurité renforcée pour les connexions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorAuth}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <button
                onClick={saveSecuritySettings}
                disabled={saving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h2>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvel utilisateur</span>
                </button>
              </div>

              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horaires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrateur' : 'Employé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {user.work_start_time} - {user.work_end_time}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.email_verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.email_verified ? 'Vérifié' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {user.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Sauvegarde et restauration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Database className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Exporter les données</h3>
                      <p className="text-sm text-blue-700">Créer une sauvegarde complète</p>
                    </div>
                  </div>
                  <button
                    onClick={exportBackup}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Télécharger la sauvegarde
                  </button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <RefreshCw className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Sauvegarde automatique</h3>
                      <p className="text-sm text-green-700">Programmée chaque semaine</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-800">
                    <p>Prochaine sauvegarde : Dimanche 23:00</p>
                    <p>Dernière sauvegarde : Il y a 3 jours</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Important :</p>
                    <p className="text-yellow-700 text-sm">
                      Conservez vos sauvegardes dans un lieu sûr. En cas de problème, 
                      contactez le support technique pour la restauration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </h2>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'employee' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="employee">Employé</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure d'arrivée</label>
                  <input
                    type="time"
                    value={userFormData.work_start_time}
                    onChange={(e) => setUserFormData({ ...userFormData, work_start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure de départ</label>
                  <input
                    type="time"
                    value={userFormData.work_end_time}
                    onChange={(e) => setUserFormData({ ...userFormData, work_end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserFormData({
                      name: '',
                      email: '',
                      role: 'employee',
                      password: '',
                      work_start_time: '08:00',
                      work_end_time: '17:00'
                    });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;