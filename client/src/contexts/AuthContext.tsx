import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MockDb, UnitOwner } from '@/lib/mockDb';
import { findOwnerUnit as findSheetOwnerUnit, isGoogleSheetsConfigured } from '@/lib/sheetDb';
import { toast } from 'sonner';

export type UserRole = 'owner' | 'admin';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  currentUser: UnitOwner | null;
  validIdToken: number;
  loginWithEmail: (unitNo: string, email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (otp: string) => Promise<{ success: boolean; message: string }>;
  loginAdmin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateCurrentUser: (user: UnitOwner) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin credentials (hardcoded for demo - in production, use secure backend auth)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<UnitOwner | null>(null);
  const [validIdToken, setValidIdToken] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [location, setLocation] = useLocation();

  // Temporary storage during multi-step login
  const [tempUnitNo, setTempUnitNo] = useState<string>('');
  const [tempEmail, setTempEmail] = useState<string>('');
  const [tempOwner, setTempOwner] = useState<UnitOwner | null>(null);
  const [activeOTP, setActiveOTP] = useState<string>('');
  const [emailAttempts, setEmailAttempts] = useState<number>(0);
  const [otpAttempts, setOtpAttempts] = useState<number>(0);

  useEffect(() => {
    const loadSession = async () => {
      // Check session on mount
      const savedUser = sessionStorage.getItem('ruby_user');
      const token = sessionStorage.getItem('ruby_valid_id');
      const role = sessionStorage.getItem('ruby_role') as UserRole | null;
      
      if (token === '8888') {
        if (role === 'admin') {
          setIsAuthenticated(true);
          setUserRole('admin');
          setValidIdToken(8888);
        } else if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as UnitOwner;
          // Refresh user details from the correct source in case it was updated
          const freshUser = isGoogleSheetsConfigured()
            ? await findSheetOwnerUnit(parsedUser.UnitNo)
            : MockDb.findOwnerUnit(parsedUser.UnitNo);
          if (freshUser) {
            setCurrentUser(freshUser);
            setIsAuthenticated(true);
            setUserRole('owner');
            setValidIdToken(8888);
          } else {
            // cleanup if user not found anymore
            sessionStorage.clear();
          }
        }
      }
      setIsLoading(false);
    };

    loadSession();
  }, []);

  const sendEmail = async (to: string, subject: string, text: string) => {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || 'Email send failed');
    }

    return response.json();
  };

  const loginWithEmail = async (unitNo: string, email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      console.log('[Auth] loginWithEmail called with unitNo:', unitNo, 'email:', email);
      const owner = isGoogleSheetsConfigured()
        ? await findSheetOwnerUnit(unitNo)
        : MockDb.findOwnerUnit(unitNo);

      console.log('[Auth] owner fetched:', owner);
      console.log('[Auth] owner email normalized:', owner?.PurchaserEmail?.trim().toLowerCase(), 'input normalized:', email.trim().toLowerCase());

      if (!owner) {
        setIsLoading(false);
        return { success: false, message: "Unit No not found in our system." };
      }

      if (owner.PurchaserEmail.toLowerCase() !== email.trim().toLowerCase()) {
        const nextAttempts = emailAttempts + 1;
        setEmailAttempts(nextAttempts);
        setIsLoading(false);

        if (nextAttempts >= 3) {
          toast.error("Email is incorrect too many times. System locking out.");
          setTimeout(() => {
            resetLoginForm();
            window.location.href = "https://www.dig-intel.com/";
          }, 3000);
          return { success: false, message: "Too many failed attempts. Redirecting to corporate site..." };
        }

        return { success: false, message: `Email is incorrect. Please try again. (Attempt ${nextAttempts}/3)` };
      }

      const eligibility = owner.Eligibility?.trim().toLowerCase();
      if (eligibility && eligibility !== 'yes') {
        setIsLoading(false);
        return { success: false, message: "This unit is not eligible to login at this time." };
      }

      // Email matched and eligibility allowed, send OTP through server SMTP
      const res = MockDb.sendOTP(unitNo, email, owner);
      if (res.success && res.otp) {
        const subject = "Your One-Time Pin (OTP) for Aviscon VP Scheduling";
        const text = `Dear ${owner.PurchaserName},\n\nYour One-Time Pin (OTP) to access the Ruby VP Scheduling System is:\n\n${res.otp}\n\nThis OTP is valid for 10 minutes. Please do not share this code with anyone.\n\nWarm regards,\nAviscon Property Management`;

        try {
          await sendEmail(email, subject, text);
        } catch (sendError) {
          console.error('[Auth] SMTP send failed:', sendError);
          setIsLoading(false);
          return { success: false, message: 'Failed to send OTP email. Check SMTP configuration.' };
        }

        setTempUnitNo(unitNo);
        setTempEmail(email);
        setTempOwner(owner);
        setActiveOTP(res.otp);
        setEmailAttempts(0); // reset email attempts on success
        setIsLoading(false);
        toast.success(`Email matched! OTP has been sent to ${email}`);
        return { success: true, message: "OTP sent successfully." };
      } else {
        setIsLoading(false);
        return { success: false, message: res.message };
      }
    } catch (error) {
      setIsLoading(false);
      return { success: false, message: "An unexpected error occurred." };
    }
  };

  const verifyOTP = async (otp: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      if (otp === activeOTP) {
        setOtpAttempts(0);
        setValidIdToken(8888);
        setIsAuthenticated(true);
        setUserRole('owner');
        
        const owner = tempOwner ?? (isGoogleSheetsConfigured() ? await findSheetOwnerUnit(tempUnitNo) : MockDb.findOwnerUnit(tempUnitNo));
        if (owner) {
          setCurrentUser(owner);
          sessionStorage.setItem('ruby_user', JSON.stringify(owner));
          sessionStorage.setItem('ruby_valid_id', '8888');
          sessionStorage.setItem('ruby_role', 'owner');
          
          toast.success("Login successful!");
          setIsLoading(false);
          
          setTimeout(() => {
            setLocation(`/?unitno=${owner.UnitNo}`);
          }, 1000);

          return { success: true, message: "Login successful." };
        } else {
          setIsLoading(false);
          return { success: false, message: "Failed to load owner profile." };
        }
      } else {
        const nextAttempts = otpAttempts + 1;
        setOtpAttempts(nextAttempts);
        setIsLoading(false);

        if (nextAttempts >= 3) {
          toast.error("OTP incorrect too many times. Logging out.");
          setTimeout(() => {
            resetLoginForm();
            window.location.href = "https://www.dig-intel.com/";
          }, 3000);
          return { success: false, message: "Too many incorrect OTP attempts. Redirecting..." };
        }

        return { success: false, message: `OTP is incorrect. Please try again. (Attempt ${nextAttempts}/3)` };
      }
    } catch (error) {
      setIsLoading(false);
      return { success: false, message: "An unexpected error occurred." };
    }
  };

  const loginAdmin = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        setValidIdToken(8888);
        setIsAuthenticated(true);
        setUserRole('admin');
        setCurrentUser(null);
        
        sessionStorage.setItem('ruby_valid_id', '8888');
        sessionStorage.setItem('ruby_role', 'admin');
        
        toast.success("Admin login successful!");
        setIsLoading(false);
        
        setTimeout(() => {
          setLocation('/admin');
        }, 500);

        return { success: true, message: "Admin login successful." };
      } else {
        setIsLoading(false);
        toast.error("Invalid admin credentials.");
        return { success: false, message: "Invalid username or password." };
      }
    } catch (error) {
      setIsLoading(false);
      return { success: false, message: "An unexpected error occurred." };
    }
  };

  const updateCurrentUser = (user: UnitOwner) => {
    setCurrentUser(user);
    sessionStorage.setItem('ruby_user', JSON.stringify(user));
  };

  const logout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
    setValidIdToken(0);
    resetLoginForm();
    toast.info("Logged out successfully.");
    setLocation('/login');
  };

  const resetLoginForm = () => {
    setTempUnitNo('');
    setTempEmail('');
    setTempOwner(null);
    setActiveOTP('');
    setEmailAttempts(0);
    setOtpAttempts(0);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        currentUser,
        validIdToken,
        loginWithEmail,
        verifyOTP,
        loginAdmin,
        logout,
        updateCurrentUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
