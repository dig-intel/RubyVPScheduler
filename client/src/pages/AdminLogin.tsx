import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Lock, User, Loader2, ArrowRight, Shield, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const { loginAdmin, isAuthenticated, userRole, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      setLocation('/admin');
    }
  }, [isAuthenticated, userRole, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter your admin username.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password.");
      return;
    }

    setActionLoading(true);
    const res = await loginAdmin(username, password);
    setActionLoading(false);

    if (!res.success) {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
            <Shield className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Aviscon Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Ruby VP Scheduling Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-md shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-6 border-b border-slate-900">
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-500" />
              Admin Authentication
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Secure access to property management and scheduling controls.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Admin Username</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm font-semibold"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Password</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 transition-all mt-6 shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Admin
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6 border-t border-slate-900 pt-4 bg-slate-950/40">
            <div className="flex items-start gap-2.5 text-xs text-slate-400">
              <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Demo Credentials:</p>
                <p className="mt-0.5 font-mono text-[10px]">
                  Username: <strong className="text-blue-400">admin</strong> <br />
                  Password: <strong className="text-blue-400">admin123</strong>
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/login')}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ← Back to Owner Login
          </Button>
        </div>
      </div>
    </div>
  );
}
