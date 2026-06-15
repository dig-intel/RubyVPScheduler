import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, KeyRound, Mail, HelpCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithEmail, verifyOTP, isAuthenticated, currentUser, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Input states
  const [unitNo, setUnitNo] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // UI Flow states
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [actionLoading, setActionLoading] = useState(false);

  // Parse unitno from query params if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unitnoParam = params.get('unitno');
    if (unitnoParam) {
      setUnitNo(unitnoParam);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setLocation(`/?unitno=${currentUser.UnitNo}`);
    }
  }, [isAuthenticated, currentUser, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNo.trim()) {
      toast.error("Please enter your Unit Number.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your registered Email address.");
      return;
    }

    setActionLoading(true);
    const res = await loginWithEmail(unitNo, email);
    setActionLoading(false);

    if (res.success) {
      setStep('OTP');
    } else {
      toast.error(res.message);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the One-Time Pin.");
      return;
    }

    setActionLoading(true);
    const res = await verifyOTP(otp);
    setActionLoading(false);

    if (!res.success) {
      toast.error(res.message);
    }
  };

  const handleBackToEmail = () => {
    setStep('EMAIL');
    setOtp('');
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
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
            <Building2 className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Aviscon Residences
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Ruby Vacant Possession (VP) Scheduling Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-md shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-6 border-b border-slate-900">
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {step === 'EMAIL' ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  Owner Verification
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  Enter One-Time Pin
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {step === 'EMAIL' 
                ? "Verify your property details to request an appointment timeslot."
                : `We've sent a 6-digit OTP to your registered email address.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {step === 'EMAIL' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unitNo" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Unit Number</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <Input
                      id="unitNo"
                      type="text"
                      placeholder="e.g. A-12-03"
                      value={unitNo}
                      onChange={(e) => setUnitNo(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm font-semibold tracking-wider"
                      disabled={actionLoading}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Format example: A-12-03 (Block-Floor-Unit)</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Registered Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. owner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      Verifying details...
                    </>
                  ) : (
                    <>
                      Request OTP Code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="otp" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">One-Time Pin (OTP)</Label>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Unit: {unitNo}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-center text-lg font-bold tracking-widest"
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>If you did not receive the email, please check your inbox and try again.</span>
                      <button 
                        type="button" 
                        onClick={handleBackToEmail}
                        className="text-blue-400 hover:text-blue-300 font-semibold underline"
                      >
                        Change Email
                      </button>
                    </div>
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
                      Verify & Log In
                      <ShieldCheck className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6 border-t border-slate-900 pt-4 bg-slate-950/40">
            <div className="flex items-start gap-2.5 text-xs text-slate-400">
              <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Quick Test Credentials:</p>
                <p className="mt-0.5 font-mono text-[10px]">
                  Unit No: <strong className="text-blue-400">A-12-03</strong> <br />
                  Email: <strong className="text-blue-400">alexander.tan@example.com</strong>
                </p>
                <p className="mt-1 text-slate-400">
                  Once submitted, a 6-digit OTP will be sent to the registered owner email address.
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
