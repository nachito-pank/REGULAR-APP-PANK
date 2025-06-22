import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Users,
  Clock,
  BarChart3,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Archive,
  Share2,
  Mail,
  Plus,
  Edit,
  Play,
  Pause,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'reports' | 'statistics' | 'employees' | 'penalties';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  fields: string[];
  filters: {
    dateRange?: { start: string; end: string };
    employees?: string[];
    includeCharts?: boolean;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  lastUsed?: string;
  usageCount: number;
  isActive: boolean;
}

interface ExportHistory {
  id: string;
  templateName: string;
  format: string;
  fileName: string;
  size: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'processing';
  downloadUrl?: string;
}

const Exports: React.FC = () => {
  const { company, user } = useAuth();
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExportTemplate | null>(null);
  const [exportProgress, setExportProgress] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'scheduled'>('templates');

  // Form state for template creation/editing
  const [templateForm, setTemplateForm] = useState<Partial<ExportTemplate>>({
    name: '',
    description: '',
    type: 'attendance',
    format: 'pdf',
    fields: [],
    filters: {
      dateRange: {
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      }
    },
    schedule: {
      enabled: false,
      frequency: 'monthly',
      time: '09:00',
      recipients: []
    },
    usageCount: 0,
    isActive: true
  });

  const [scheduleForm, setScheduleForm] = useState({
    templateId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    recipients: [''],
    enabled: true
  });

  useEffect(() => {
    if (company) {
      loadDefaultTemplates();
      loadExportHistory();
    }
  }, [company]);

  const loadDefaultTemplates = () => {
    const defaultTemplates: ExportTemplate[] = [
      {
        id: 'attendance-monthly',
        name: 'Rapport de Présence Mensuel',
        description: 'Rapport complet des présences du mois avec statistiques détaillées',
        type: 'attendance',
        format: 'pdf',
        fields: ['date', 'employee', 'arrival_time', 'departure_time', 'late_minutes', 'penalty_amount', 'status'],
        filters: {
          dateRange: {
            start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
          },
          includeCharts: true
        },
        schedule: {
          enabled: false,
          frequency: 'monthly',
          time: '09:00',
          recipients: []
        },
        usageCount: 0,
        isActive: true
      },
      {
        id: 'employees-excel',
        name: 'Liste des Employés (Excel)',
        description: 'Export Excel de tous les employés avec leurs informations complètes',
        type: 'employees',
        format: 'excel',
        fields: ['name', 'email', 'role', 'work_start_time', 'work_end_time', 'created_at'],
        filters: {},
        schedule: {
          enabled: false,
          frequency: 'monthly',
          time: '09:00',
          recipients: []
        },
        usageCount: 0,
        isActive: true
      },
      {
        id: 'daily-reports-pdf',
        name: 'Rapports Journaliers (PDF)',
        description: 'Compilation des rapports de tâches quotidiennes en format PDF',
        type: 'reports',
        format: 'pdf',
        fields: ['date', 'employee', 'tasks', 'submitted_at', 'productivity_score'],
        filters: {
          dateRange: {
            start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
            end: format(new Date(), 'yyyy-MM-dd')
          }
        },
        schedule: {
          enabled: false,
          frequency: 'weekly',
          time: '18:00',
          recipients: []
        },
        usageCount: 0,
        isActive: true
      },
      {
        id: 'penalties-csv',
        name: 'Sanctions et Retards (CSV)',
        description: 'Export CSV des sanctions et retards pour analyse externe',
        type: 'penalties',
        format: 'csv',
        fields: ['employee', 'date', 'late_minutes', 'penalty_amount', 'total_penalties'],
        filters: {
          dateRange: {
            start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
          }
        },
        schedule: {
          enabled: false,
          frequency: 'monthly',
          time: '09:00',
          recipients: []
        },
        usageCount: 0,
        isActive: true
      },
      {
        id: 'statistics-dashboard',
        name: 'Tableau de Bord Statistiques',
        description: 'Rapport statistique complet avec métriques et analyses',
        type: 'statistics',
        format: 'pdf',
        fields: ['attendance_rate', 'punctuality_rate', 'productivity_average', 'trends'],
        filters: {
          dateRange: {
            start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
          },
          includeCharts: true
        },
        schedule: {
          enabled: false,
          frequency: 'monthly',
          time: '08:00',
          recipients: []
        },
        usageCount: 0,
        isActive: true
      }
    ];

    setTemplates(defaultTemplates);
  };

  const loadExportHistory = () => {
    const history: ExportHistory[] = [
      {
        id: '1',
        templateName: 'Rapport de Présence Mensuel',
        format: 'PDF',
        fileName: 'presences_decembre_2024.pdf',
        size: '2.3 MB',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        id: '2',
        templateName: 'Liste des Employés (Excel)',
        format: 'Excel',
        fileName: 'employes_liste_complete.xlsx',
        size: '156 KB',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        id: '3',
        templateName: 'Rapports Journaliers (PDF)',
        format: 'PDF',
        fileName: 'rapports_semaine_50.pdf',
        size: '1.8 MB',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      }
    ];

    setExportHistory(history);
  };

  const fetchDataForExport = async (template: ExportTemplate) => {
    const { type, filters } = template;
    let data: any[] = [];

    try {
      switch (type) {
        case 'attendance':
          const { data: attendances } = await supabase
            .from('attendances')
            .select(`
              *,
              user:users(name, email, work_start_time, work_end_time)
            `)
            .eq('company_id', company?.company_id)
            .gte('date', filters.dateRange?.start || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
            .lte('date', filters.dateRange?.end || format(endOfMonth(new Date()), 'yyyy-MM-dd'))
            .order('date', { ascending: false });
          data = attendances || [];
          break;

        case 'employees':
          const { data: employees } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', company?.company_id)
            .eq('role', 'employee')
            .order('name');
          data = employees || [];
          break;

        case 'reports':
          const { data: reports } = await supabase
            .from('daily_reports')
            .select(`
              *,
              user:users(name, email),
              attendance:attendances(late_minutes, penalty_amount)
            `)
            .eq('company_id', company?.company_id)
            .gte('date', filters.dateRange?.start || format(subDays(new Date(), 7), 'yyyy-MM-dd'))
            .lte('date', filters.dateRange?.end || format(new Date(), 'yyyy-MM-dd'))
            .order('date', { ascending: false });
          data = reports || [];
          break;

        case 'penalties':
          const { data: penalties } = await supabase
            .from('attendances')
            .select(`
              *,
              user:users(name, email)
            `)
            .eq('company_id', company?.company_id)
            .gt('penalty_amount', 0)
            .gte('date', filters.dateRange?.start || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
            .lte('date', filters.dateRange?.end || format(endOfMonth(new Date()), 'yyyy-MM-dd'))
            .order('penalty_amount', { ascending: false });
          data = penalties || [];
          break;

        case 'statistics':
          const [employeesData, attendancesData, reportsData] = await Promise.all([
            supabase.from('users').select('*').eq('company_id', company?.company_id).eq('role', 'employee'),
            supabase.from('attendances').select('*').eq('company_id', company?.company_id)
              .gte('date', filters.dateRange?.start || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
              .lte('date', filters.dateRange?.end || format(endOfMonth(new Date()), 'yyyy-MM-dd')),
            supabase.from('daily_reports').select('*').eq('company_id', company?.company_id)
              .gte('date', filters.dateRange?.start || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
              .lte('date', filters.dateRange?.end || format(endOfMonth(new Date()), 'yyyy-MM-dd'))
          ]);

          data = {
            employees: employeesData.data || [],
            attendances: attendancesData.data || [],
            reports: reportsData.data || []
          };
          break;
      }

      return data;
    } catch (error) {
      console.error('Error fetching export data:', error);
      throw error;
    }
  };

  const generatePDF = async (template: ExportTemplate, data: any[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('PANK - Système de Gestion', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(template.name, pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Entreprise: ${company?.name}`, 20, 50);
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 20, 60);
    doc.text(`Par: ${user?.name}`, 20, 70);

    let yPosition = 85;

    switch (template.type) {
      case 'attendance':
        const attendanceHeaders = ['Date', 'Employé', 'Arrivée', 'Départ', 'Retard', 'Sanction'];
        const attendanceRows = data.map(att => [
          format(new Date(att.date), 'dd/MM/yyyy'),
          att.user?.name || 'N/A',
          att.arrival_time || 'Non pointé',
          att.departure_time || 'Non pointé',
          `${att.late_minutes} min`,
          `${att.penalty_amount} FCFA`
        ]);

        (doc as any).autoTable({
          head: [attendanceHeaders],
          body: attendanceRows,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] }
        });

        const totalPenalties = data.reduce((sum, att) => sum + Number(att.penalty_amount), 0);
        const totalLateMinutes = data.reduce((sum, att) => sum + att.late_minutes, 0);
        const presentDays = data.filter(att => att.arrival_time).length;

        yPosition = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(12);
        doc.text('Résumé:', 20, yPosition);
        doc.setFontSize(10);
        doc.text(`• Total jours présents: ${presentDays}`, 25, yPosition + 10);
        doc.text(`• Total retards: ${totalLateMinutes} minutes`, 25, yPosition + 20);
        doc.text(`• Total sanctions: ${totalPenalties.toLocaleString()} FCFA`, 25, yPosition + 30);
        break;

      case 'employees':
        const employeeHeaders = ['Nom', 'Email', 'Rôle', 'Horaires', 'Date d\'ajout'];
        const employeeRows = data.map(emp => [
          emp.name,
          emp.email,
          emp.role,
          `${emp.work_start_time} - ${emp.work_end_time}`,
          format(new Date(emp.created_at), 'dd/MM/yyyy')
        ]);

        (doc as any).autoTable({
          head: [employeeHeaders],
          body: employeeRows,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] }
        });
        break;

      case 'reports':
        const reportHeaders = ['Date', 'Employé', 'Nb Tâches', 'Soumis à'];
        const reportRows = data.map(report => [
          format(new Date(report.date), 'dd/MM/yyyy'),
          report.user?.name || 'N/A',
          report.tasks.length.toString(),
          report.submitted_at
        ]);

        (doc as any).autoTable({
          head: [reportHeaders],
          body: reportRows,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] }
        });
        break;

      case 'penalties':
        const penaltyHeaders = ['Employé', 'Date', 'Retard', 'Sanction'];
        const penaltyRows = data.map(penalty => [
          penalty.user?.name || 'N/A',
          format(new Date(penalty.date), 'dd/MM/yyyy'),
          `${penalty.late_minutes} min`,
          `${penalty.penalty_amount} FCFA`
        ]);

        (doc as any).autoTable({
          head: [penaltyHeaders],
          body: penaltyRows,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] }
        });
        break;

      case 'statistics':
        const { employees, attendances, reports } = data as any;
        
        doc.setFontSize(14);
        doc.text('Statistiques Générales', 20, yPosition);
        
        yPosition += 20;
        const totalEmployees = employees.length;
        const presentCount = attendances.filter((att: any) => att.arrival_time).length;
        const attendanceRate = totalEmployees > 0 ? (presentCount / attendances.length) * 100 : 0;
        const totalPenaltiesStats = attendances.reduce((sum: number, att: any) => sum + Number(att.penalty_amount), 0);

        doc.setFontSize(10);
        doc.text(`• Nombre total d'employés: ${totalEmployees}`, 25, yPosition);
        doc.text(`• Taux de présence: ${Math.round(attendanceRate)}%`, 25, yPosition + 10);
        doc.text(`• Total sanctions: ${totalPenaltiesStats.toLocaleString()} FCFA`, 25, yPosition + 20);
        break;
    }

    return doc;
  };

  const generateExcel = (template: ExportTemplate, data: any[]) => {
    const workbook = XLSX.utils.book_new();
    
    switch (template.type) {
      case 'attendance':
        const attendanceData = data.map(att => ({
          'Date': format(new Date(att.date), 'dd/MM/yyyy'),
          'Employé': att.user?.name || 'N/A',
          'Email': att.user?.email || 'N/A',
          'Arrivée Prévue': att.user?.work_start_time || 'N/A',
          'Arrivée Réelle': att.arrival_time || 'Non pointé',
          'Départ Prévu': att.user?.work_end_time || 'N/A',
          'Départ Réel': att.departure_time || 'Non pointé',
          'Retard (min)': att.late_minutes,
          'Sanction (FCFA)': att.penalty_amount,
          'Validé': att.arrival_validated ? 'Oui' : 'Non'
        }));
        
        const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Présences');
        break;

      case 'employees':
        const employeeData = data.map(emp => ({
          'Nom': emp.name,
          'Email': emp.email,
          'Rôle': emp.role,
          'Heure Arrivée': emp.work_start_time,
          'Heure Départ': emp.work_end_time,
          'Email Vérifié': emp.email_verified ? 'Oui' : 'Non',
          'Date Création': format(new Date(emp.created_at), 'dd/MM/yyyy HH:mm')
        }));
        
        const employeeSheet = XLSX.utils.json_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employés');
        break;

      case 'reports':
        const reportData = data.map(report => ({
          'Date': format(new Date(report.date), 'dd/MM/yyyy'),
          'Employé': report.user?.name || 'N/A',
          'Email': report.user?.email || 'N/A',
          'Nombre Tâches': report.tasks.length,
          'Tâches': report.tasks.join(' | '),
          'Heure Soumission': report.submitted_at
        }));
        
        const reportSheet = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(workbook, reportSheet, 'Rapports');
        break;

      case 'penalties':
        const penaltyData = data.map(penalty => ({
          'Date': format(new Date(penalty.date), 'dd/MM/yyyy'),
          'Employé': penalty.user?.name || 'N/A',
          'Email': penalty.user?.email || 'N/A',
          'Retard (min)': penalty.late_minutes,
          'Sanction (FCFA)': penalty.penalty_amount
        }));
        
        const penaltySheet = XLSX.utils.json_to_sheet(penaltyData);
        XLSX.utils.book_append_sheet(workbook, penaltySheet, 'Sanctions');
        break;
    }

    return workbook;
  };

  const generateCSV = (template: ExportTemplate, data: any[]) => {
    let csvContent = '';
    
    switch (template.type) {
      case 'attendance':
        csvContent = 'Date,Employé,Email,Arrivée Prévue,Arrivée Réelle,Départ Prévu,Départ Réel,Retard (min),Sanction (FCFA),Validé\n';
        data.forEach(att => {
          csvContent += `"${format(new Date(att.date), 'dd/MM/yyyy')}","${att.user?.name || 'N/A'}","${att.user?.email || 'N/A'}","${att.user?.work_start_time || 'N/A'}","${att.arrival_time || 'Non pointé'}","${att.user?.work_end_time || 'N/A'}","${att.departure_time || 'Non pointé'}",${att.late_minutes},${att.penalty_amount},"${att.arrival_validated ? 'Oui' : 'Non'}"\n`;
        });
        break;

      case 'employees':
        csvContent = 'Nom,Email,Rôle,Heure Arrivée,Heure Départ,Email Vérifié,Date Création\n';
        data.forEach(emp => {
          csvContent += `"${emp.name}","${emp.email}","${emp.role}","${emp.work_start_time}","${emp.work_end_time}","${emp.email_verified ? 'Oui' : 'Non'}","${format(new Date(emp.created_at), 'dd/MM/yyyy HH:mm')}"\n`;
        });
        break;

      case 'reports':
        csvContent = 'Date,Employé,Email,Nombre Tâches,Tâches,Heure Soumission\n';
        data.forEach(report => {
          csvContent += `"${format(new Date(report.date), 'dd/MM/yyyy')}","${report.user?.name || 'N/A'}","${report.user?.email || 'N/A'}",${report.tasks.length},"${report.tasks.join(' | ')}","${report.submitted_at}"\n`;
        });
        break;

      case 'penalties':
        csvContent = 'Date,Employé,Email,Retard (min),Sanction (FCFA)\n';
        data.forEach(penalty => {
          csvContent += `"${format(new Date(penalty.date), 'dd/MM/yyyy')}","${penalty.user?.name || 'N/A'}","${penalty.user?.email || 'N/A'}",${penalty.late_minutes},${penalty.penalty_amount}\n`;
        });
        break;
    }

    return csvContent;
  };

  const executeExport = async (template: ExportTemplate) => {
    setLoading(true);
    setExportProgress({ [template.id]: 0 });

    try {
      setExportProgress({ [template.id]: 20 });
      
      const data = await fetchDataForExport(template);
      setExportProgress({ [template.id]: 50 });

      let fileName = '';
      let blob: Blob;

      switch (template.format) {
        case 'pdf':
          const pdf = await generatePDF(template, data);
          fileName = `${template.name.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          blob = new Blob([pdf.output('blob')], { type: 'application/pdf' });
          break;

        case 'excel':
          const workbook = generateExcel(template, data);
          fileName = `${template.name.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          break;

        case 'csv':
          const csvContent = generateCSV(template, data);
          fileName = `${template.name.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          break;

        case 'json':
          fileName = `${template.name.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`;
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          break;

        default:
          throw new Error('Format non supporté');
      }

      setExportProgress({ [template.id]: 90 });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress({ [template.id]: 100 });

      const newHistoryItem: ExportHistory = {
        id: Date.now().toString(),
        templateName: template.name,
        format: template.format.toUpperCase(),
        fileName,
        size: `${Math.round(blob.size / 1024)} KB`,
        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      setExportHistory(prev => [newHistoryItem, ...prev]);

      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t
      ));

      setTimeout(() => {
        setExportProgress({});
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'exportation');
      setExportProgress({});
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      type: 'attendance',
      format: 'pdf',
      fields: [],
      filters: {
        dateRange: {
          start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        }
      },
      schedule: {
        enabled: false,
        frequency: 'monthly',
        time: '09:00',
        recipients: []
      },
      usageCount: 0,
      isActive: true
    });
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: ExportTemplate) => {
    setEditingTemplate(template);
    setTemplateForm(template);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newTemplate: ExportTemplate = {
      id: editingTemplate?.id || `custom-${Date.now()}`,
      name: templateForm.name!,
      description: templateForm.description!,
      type: templateForm.type!,
      format: templateForm.format!,
      fields: templateForm.fields!,
      filters: templateForm.filters!,
      schedule: templateForm.schedule!,
      usageCount: editingTemplate?.usageCount || 0,
      lastUsed: editingTemplate?.lastUsed,
      isActive: templateForm.isActive!
    };

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? newTemplate : t));
    } else {
      setTemplates(prev => [...prev, newTemplate]);
    }

    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isActive: !t.isActive } : t
    ));
  };

  const handleScheduleExport = (template: ExportTemplate) => {
    setScheduleForm({
      templateId: template.id,
      frequency: template.schedule?.frequency || 'monthly',
      time: template.schedule?.time || '09:00',
      recipients: template.schedule?.recipients || [''],
      enabled: true
    });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = () => {
    const validRecipients = scheduleForm.recipients.filter(email => email.trim() !== '');
    
    if (validRecipients.length === 0) {
      alert('Veuillez ajouter au moins un destinataire');
      return;
    }

    setTemplates(prev => prev.map(t => 
      t.id === scheduleForm.templateId 
        ? {
            ...t,
            schedule: {
              enabled: scheduleForm.enabled,
              frequency: scheduleForm.frequency,
              time: scheduleForm.time,
              recipients: validRecipients
            }
          }
        : t
    ));

    setShowScheduleModal(false);
    alert('Programmation sauvegardée avec succès !');
  };

  const handleDeleteHistoryItem = (itemId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément de l\'historique ?')) {
      setExportHistory(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
      case 'excel': case 'xlsx': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'csv': return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
      case 'json': return <FileText className="w-5 h-5 text-purple-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'attendance': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'employees': return <Users className="w-5 h-5 text-green-600" />;
      case 'reports': return <FileText className="w-5 h-5 text-purple-600" />;
      case 'penalties': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'statistics': return <BarChart3 className="w-5 h-5 text-indigo-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Exportations</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCreateTemplate}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Modèle</span>
          </button>
          <button
            onClick={loadExportHistory}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'templates', label: 'Modèles d\'Export', icon: FileText },
              { id: 'history', label: 'Historique', icon: Archive },
              { id: 'scheduled', label: 'Exports Programmés', icon: Calendar }
            ].map(tab => (
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
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.filter(t => t.isActive).map(template => (
                  <div key={template.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(template.type)}
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </div>
                      {getFormatIcon(template.format)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium uppercase">{template.format}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Utilisé:</span>
                        <span className="font-medium">{template.usageCount} fois</span>
                      </div>
                      {template.lastUsed && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Dernière utilisation:</span>
                          <span className="font-medium">{format(new Date(template.lastUsed), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {exportProgress[template.id] !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Export en cours...</span>
                          <span>{exportProgress[template.id]}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress[template.id]}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 mb-3">
                      <button
                        onClick={() => executeExport(template)}
                        disabled={loading || exportProgress[template.id] !== undefined}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Exporter</span>
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleScheduleExport(template)}
                        className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Programmer"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>

                    {template.schedule?.enabled && (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-blue-800">
                          <Calendar className="w-4 h-4" />
                          <span>Programmé: {template.schedule.frequency} à {template.schedule.time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Historique des Exportations</h3>
              </div>

              <div className="bg-white rounded-lg overflow-hidden border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fichier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modèle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Format
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exportHistory.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            {getFormatIcon(item.format)}
                            <span className="text-sm font-medium text-gray-900">{item.fileName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.templateName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {item.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {item.status === 'processing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                            {item.status === 'completed' ? 'Terminé' : 
                             item.status === 'failed' ? 'Échec' : 'En cours'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {item.status === 'completed' && (
                              <button 
                                onClick={() => alert('Fonctionnalité de re-téléchargement disponible')}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Re-télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {exportHistory.length === 0 && (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun export dans l'historique</p>
                  <p className="text-sm text-gray-400">Vos exportations apparaîtront ici</p>
                </div>
              )}
            </div>
          )}

          {/* Scheduled Tab */}
          {activeTab === 'scheduled' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Exports Programmés</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.filter(t => t.schedule?.enabled).map(template => (
                  <div key={template.id} className="bg-white border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(template.type)}
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fréquence:</span>
                        <span className="font-medium capitalize">{template.schedule?.frequency}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Heure:</span>
                        <span className="font-medium">{template.schedule?.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium uppercase">{template.format}</span>
                      </div>
                      {template.schedule?.recipients && template.schedule.recipients.length > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-600">Destinataires:</span>
                          <div className="mt-1 space-y-1">
                            {template.schedule.recipients.map((email, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-900">{email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-4 pt-4 border-t">
                      <button 
                        onClick={() => handleScheduleExport(template)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                      <button 
                        onClick={() => executeExport(template)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Exécuter</span>
                      </button>
                      <button 
                        onClick={() => handleToggleTemplate(template.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Désactiver"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {templates.filter(t => t.schedule?.enabled).length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun export programmé</p>
                  <p className="text-sm text-gray-400">Configurez des exports automatiques pour recevoir vos rapports régulièrement</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'export'}
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du modèle *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Rapport mensuel des présences"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de données *
                    </label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="attendance">Présences</option>
                      <option value="employees">Employés</option>
                      <option value="reports">Rapports</option>
                      <option value="penalties">Sanctions</option>
                      <option value="statistics">Statistiques</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez ce que contient ce modèle d'export..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format d'export *
                    </label>
                    <select
                      value={templateForm.format}
                      onChange={(e) => setTemplateForm({ ...templateForm, format: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut
                    </label>
                    <select
                      value={templateForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.value === 'active' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date début
                    </label>
                    <input
                      type="date"
                      value={templateForm.filters?.dateRange?.start}
                      onChange={(e) => setTemplateForm({
                        ...templateForm,
                        filters: {
                          ...templateForm.filters,
                          dateRange: {
                            ...templateForm.filters?.dateRange,
                            start: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={templateForm.filters?.dateRange?.end}
                      onChange={(e) => setTemplateForm({
                        ...templateForm,
                        filters: {
                          ...templateForm.filters,
                          dateRange: {
                            ...templateForm.filters?.dateRange,
                            end: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={templateForm.filters?.includeCharts || false}
                    onChange={(e) => setTemplateForm({
                      ...templateForm,
                      filters: {
                        ...templateForm.filters,
                        includeCharts: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeCharts" className="text-sm text-gray-700">
                    Inclure les graphiques (PDF uniquement)
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTemplate ? 'Mettre à jour' : 'Créer le modèle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Programmer l'export
                </h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence
                  </label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure d'exécution
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinataires email
                  </label>
                  <div className="space-y-2">
                    {scheduleForm.recipients.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newRecipients = [...scheduleForm.recipients];
                            newRecipients[index] = e.target.value;
                            setScheduleForm({ ...scheduleForm, recipients: newRecipients });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="email@exemple.com"
                        />
                        {scheduleForm.recipients.length > 1 && (
                          <button
                            onClick={() => {
                              const newRecipients = scheduleForm.recipients.filter((_, i) => i !== index);
                              setScheduleForm({ ...scheduleForm, recipients: newRecipients });
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setScheduleForm({
                        ...scheduleForm,
                        recipients: [...scheduleForm.recipients, '']
                      })}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un destinataire</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="scheduleEnabled"
                    checked={scheduleForm.enabled}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="scheduleEnabled" className="text-sm text-gray-700">
                    Activer la programmation
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exports;