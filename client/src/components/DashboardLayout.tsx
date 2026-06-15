import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  LogOut, 
  Calendar, 
  Info, 
  User, 
  Menu, 
  X,
  RefreshCw,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { MockDb } from '@/lib/mockDb';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleResetDemo = () => {
    MockDb.resetDb();
    toast.success("Database reset to initial state!");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const navItems = [
    {
      name: 'VP Scheduling',
      path: '/',
      icon: Calendar,
    },
    {
      name: 'Unit Details',
      path: `/unit-details?unitno=${currentUser?.UnitNo || ''}`,
      icon: Info,
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner / Notification */}
      <div className="bg-slate-900 text-slate-100 py-2 px-4 text-xs font-medium flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-[10px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider">Announcement</span>
          <span>Aviscon VP Scheduling is open for Phase 1 Owners.</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleResetDemo}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            title="Reset Database to default state for testing"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Demo DB
          </button>
          <span className="text-slate-500">|</span>
          <span>Support: 03-2011 9966</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight block">RUBY</span>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase -mt-1 block">Aviscon Residences</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || (item.path.startsWith('/unit-details') && location.startsWith('/unit-details'));
                return (
                  <Link key={item.name} href={item.path}>
                    <span className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold border-b-2 border-blue-600 rounded-b-none' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* User Controls */}
            <div className="hidden md:flex items-center gap-4">
              {/* User Profile Summary */}
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800">{currentUser?.PurchaserName}</span>
                  <span className="text-[10px] font-mono text-slate-500">{currentUser?.UnitNo}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={logout}
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                  title="Log Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-600"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || (item.path.startsWith('/unit-details') && location.startsWith('/unit-details'));
              return (
                <Link key={item.name} href={item.path}>
                  <span 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
            
            <div className="border-t border-slate-200 my-3 pt-3">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{currentUser?.PurchaserName}</span>
                    <span className="text-xs font-mono text-slate-500">{currentUser?.UnitNo}</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full mt-2 flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© 2026 Aviscon Property Management Sdn Bhd. All rights reserved.</p>
          <p className="mt-1">Ruby Residences Clubhouse, Persiaran Ruby, 50450 Kuala Lumpur.</p>
        </div>
      </footer>

    </div>
  );
};
