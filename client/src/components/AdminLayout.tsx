import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  LogOut, 
  Users, 
  Calendar, 
  Sliders, 
  Menu, 
  X,
  BarChart3,
  Settings
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: 'Owner Management',
      path: '/admin',
      icon: Users,
      description: 'View and edit owner records'
    },
    {
      name: 'VP Appointments',
      path: '/admin/appointments',
      icon: Calendar,
      description: 'Manage scheduling slots'
    },
    {
      name: 'Unit Types',
      path: '/admin/unit-types',
      icon: Sliders,
      description: 'Configure unit specifications'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-100 py-2 px-4 text-xs font-medium flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-[10px] uppercase px-1.5 py-0.5 rounded font-bold tracking-wider">Admin</span>
          <span>Ruby VP Scheduling Management System</span>
        </div>
        <span className="text-slate-500">Support: 03-2011 9966</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-slate-100">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 tracking-tight block">RUBY</span>
                  <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase block">Admin</span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.name} href={item.path}>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.description}</div>
                      </div>
                    </button>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => toast.info("Settings coming soon")}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button 
                variant="destructive" 
                onClick={logout}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
                <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    A
                  </div>
                  <span className="font-semibold text-slate-800">Admin User</span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
