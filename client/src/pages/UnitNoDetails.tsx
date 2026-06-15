import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building, 
  User, 
  Mail, 
  Calendar, 
  ChevronLeft, 
  ListTodo, 
  Sliders, 
  Maximize2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { MockDb, UnitTypeDetail } from '@/lib/mockDb';
import { toast } from 'sonner';

export default function UnitNoDetails() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // UI toggle states
  const [showSpecs, setShowSpecs] = useState(false);
  const [unitSpecs, setUnitSpecs] = useState<UnitTypeDetail[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Load specs on mount
  useEffect(() => {
    const specs = MockDb.getUnitTypeDetails();
    setUnitSpecs(specs);
  }, []);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-semibold">Loading unit specifications...</p>
        </div>
      </div>
    );
  }

  const currentUnitType = currentUser.UnitType;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLocation('/')}
              className="h-9 w-9 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Unit Information Details</h1>
              <p className="text-xs text-slate-500">View complete property records, inventory list, and layout specifications.</p>
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setShowSpecs(!showSpecs);
              toast.info(showSpecs ? "Showing general summary" : "Loading layout inventory specifications");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            {showSpecs ? (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Show General Info
              </>
            ) : (
              <>
                <ListTodo className="h-4 w-4" />
                Show Inventory List
              </>
            )}
          </Button>
        </div>

        {/* Content Panels */}
        {!showSpecs ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Owner & Purchaser Card */}
            <Card className="md:col-span-2 border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <User className="h-4 w-4 text-blue-600" />
                  Purchaser & Ownership Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="border-b border-slate-100 pb-3">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Purchaser</dt>
                    <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      {currentUser.PurchaserName}
                    </dd>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Email</dt>
                    <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-2 font-mono text-xs">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {currentUser.PurchaserEmail}
                    </dd>
                  </div>
                  <div className="border-b border-slate-100 pb-3 sm:border-none sm:pb-0">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">VP Notice Dispatch Date</dt>
                    <dd className="mt-1 font-semibold text-slate-800 flex items-center gap-2 font-mono">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {currentUser.DateSendVPNotice}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Status</dt>
                    <dd className="mt-1 font-semibold flex items-center gap-2">
                      {currentUser.VPAppointmentDate ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-200 font-bold font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Booked: {currentUser.VPAppointmentDate}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full border border-amber-200 font-bold font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          Pending Scheduling
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Right: Architectural Specifications */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Building className="h-4 w-4 text-blue-600" />
                  Property Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Number</dt>
                    <dd className="font-bold text-slate-800 font-mono text-base">{currentUser.UnitNo}</dd>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Block / Wing</dt>
                    <dd className="font-semibold text-slate-800">{currentUser.Block}</dd>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layout Type</dt>
                    <dd className="font-semibold text-slate-800">{currentUser.UnitType}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">Built-up Size</dt>
                    <dd className="font-bold text-slate-800 font-mono">{currentUser.Size.toLocaleString()} sq.ft.</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Detailed Inventory & Specifications Table */
          <Card className="border-slate-200 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <Sliders className="h-4 w-4 text-blue-600" />
                    Layout Inventory Specifications: {currentUnitType}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Dynamic inventory list for unit configuration type: <strong className="text-blue-600">{currentUnitType}</strong>.
                  </CardDescription>
                </div>
                <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full border border-blue-200 font-bold font-mono">
                  {currentUser.UnitNo} Specs
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-1/2 text-xs font-bold text-slate-500 uppercase tracking-wider pl-6 py-3">Specification Item / Description</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3">Allocated Configuration Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitSpecs.map((spec, index) => {
                    // Extract the specific value matching the owner's unit type
                    const specValue = spec[currentUnitType] || spec["Type A"] || "N/A";
                    return (
                      <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-slate-800 pl-6 py-3.5">{spec.Description}</TableCell>
                        <TableCell className="font-semibold text-blue-700 font-mono text-xs py-3.5">
                          {specValue}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Support Alert Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Need assistance or spotted a discrepancy?</p>
            <p className="leading-relaxed">
              If any of the property specifications or purchaser details do not align with your Sale and Purchase Agreement (SPA), please raise this immediately with our handover team at the Aviscon Residences Clubhouse or call <strong className="text-blue-900">03-2011 9966</strong>.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
