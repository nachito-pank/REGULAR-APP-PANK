import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContextType, User, Company } from '../types';
import { hashPassword, verifyPassword } from '../utils/auth';
import { generateVerificationCode, sendVerificationEmail, isValidEmail, requestNotificationPermission } from '../utils/email';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Request notification permission for email verification demo
    requestNotificationPermission();

    // Check for stored auth data
    const storedUser = localStorage.getItem('regula_user');
    const storedCompany = localStorage.getItem('regula_company');
    
    if (storedUser && storedCompany) {
      const userData = JSON.parse(storedUser);
      const companyData = JSON.parse(storedCompany);
      
      // Only set user if email is verified
      if (userData.email_verified) {
        setUser(userData);
        setCompany(companyData);
      } else {
        // Clear unverified user data
        localStorage.removeItem('regula_user');
        localStorage.removeItem('regula_company');
      }
    }
    
    setLoading(false);
  }, []);

  const sendVerificationCode = async (email: string): Promise<void> => {
    if (!isValidEmail(email)) {
      throw new Error('Adresse email invalide');
    }

    try {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Store verification code in database
      const { error } = await supabase
        .from('email_verifications')
        .upsert([{
          email,
          code,
          expires_at: expiresAt,
          verified: false
        }], {
          onConflict: 'email'
        });

      if (error) throw error;

      // Send email (in production, this would be a real email service)
      await sendVerificationEmail(email, code);
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Erreur lors de l\'envoi du code de vérification');
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .single();

      if (error || !data) {
        throw new Error('Code de vérification invalide');
      }

      // Check if code has expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Code de vérification expiré');
      }

      // Mark as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('email', email)
        .eq('code', code);

      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  };

  const signUp = async (companyData: { 
    companyName: string; 
    companyId: string; 
    adminName: string; 
    adminEmail: string; 
    password: string 
  }) => {
    try {
      // Validate email format
      if (!isValidEmail(companyData.adminEmail)) {
        throw new Error('Adresse email invalide');
      }

      // Check if company ID already exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('company_id', companyData.companyId)
        .single();

      if (existingCompany) {
        throw new Error('Cet ID d\'entreprise existe déjà');
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', companyData.adminEmail)
        .single();

      if (existingUser) {
        throw new Error('Cette adresse email est déjà utilisée');
      }

      // Create company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.companyName,
          company_id: companyData.companyId
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Hash password
      const hashedPassword = await hashPassword(companyData.password);

      // Create admin user (not verified yet)
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: companyData.adminEmail,
          name: companyData.adminName,
          role: 'admin',
          company_id: companyData.companyId,
          password: hashedPassword,
          work_start_time: '08:00',
          work_end_time: '17:00',
          email_verified: false
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create default company settings
      await supabase
        .from('company_settings')
        .insert([{
          company_id: companyData.companyId,
          penalty_per_hour: 1500,
          work_start_time: '08:00',
          work_end_time: '17:00',
          penalty_type: 'hour'
        }]);

      // Send verification email
      await sendVerificationCode(companyData.adminEmail);

      // Store unverified user data temporarily
      localStorage.setItem('regula_pending_user', JSON.stringify(newUser));
      localStorage.setItem('regula_pending_company', JSON.stringify(newCompany));
      
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (companyId: string, name: string, password: string, role: 'admin' | 'employee') => {
    try {
      // Get company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (companyError || !companyData) {
        throw new Error('Entreprise introuvable');
      }

      // Get user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('name', name)
        .eq('role', role)
        .single();

      if (userError || !userData) {
        throw new Error('Utilisateur introuvable');
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, userData.password);
      if (!isValidPassword) {
        throw new Error('Mot de passe incorrect');
      }

      // Check if email is verified
      if (!userData.email_verified) {
        // Send new verification code
        await sendVerificationCode(userData.email);
        
        // Store unverified user data temporarily
        localStorage.setItem('regula_pending_user', JSON.stringify(userData));
        localStorage.setItem('regula_pending_company', JSON.stringify(companyData));
        
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      setUser(userData);
      setCompany(companyData);
      
      localStorage.setItem('regula_user', JSON.stringify(userData));
      localStorage.setItem('regula_company', JSON.stringify(companyData));
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    }
  };

  const signOut = () => {
    setUser(null);
    setCompany(null);
    localStorage.removeItem('regula_user');
    localStorage.removeItem('regula_company');
    localStorage.removeItem('regula_pending_user');
    localStorage.removeItem('regula_pending_company');
  };

  const value = {
    user,
    company,
    loading,
    signIn,
    signUp,
    signOut,
    sendVerificationCode,
    verifyEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};