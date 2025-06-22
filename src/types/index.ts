export interface Company {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  company_id: string;
  password: string;
  work_start_time: string;
  work_end_time: string;
  email_verified: boolean;
  created_at: string;
}

export interface EmailVerification {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  company_id: string;
  date: string;
  arrival_time: string | null;
  departure_time: string | null;
  arrival_validated: boolean;
  late_minutes: number;
  penalty_amount: number;
  created_at: string;
}

export interface DailyReport {
  id: string;
  user_id: string;
  company_id: string;
  attendance_id: string;
  date: string;
  tasks: string[];
  submitted_at: string;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  penalty_per_hour: number;
  work_start_time: string;
  work_end_time: string;
  penalty_type: 'hour' | 'minute' | 'day';
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  signIn: (companyId: string, name: string, password: string, role: 'admin' | 'employee') => Promise<void>;
  signUp: (companyData: { companyName: string; companyId: string; adminName: string; adminEmail: string; password: string }) => Promise<void>;
  signOut: () => void;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
}