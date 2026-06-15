import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Sliders, 
  Edit2, 
  Save, 
  X, 
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { MockDb, UnitTypeDetail } from '@/lib/mockDb';
import { toast } from 'sonner';

export default function AdminUnitTypes() {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const [specs, setSpecs] = useState<UnitTypeDetail[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string | number>>({});

  // Redirect to login if not authenticated as admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== 'admin')) {
      setLocation('/admin-login');
    }
  }, [isAuthenticated, userRole, isLoading, setLocation]);

  // Load specs on mount
  useEffect(() => {
    const data = MockDb.getUnitTypeDetails();
    setSpecs(data);
  }, []);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...specs[index] });
  };

  const handleSave = () => {
    if (editingIndex === null) return;

    const updatedSpecs = [...specs];
    const updated = { ...updatedSpecs[editingIndex] };
    Object.keys(editData).forEach(key => {
      updated[key as keyof UnitTypeDetail] = editData[key];
    });
    updatedSpecs[editingIndex] = updated;
    
    // Note: In a real app, you'd persist this to a database
    // For now, we'll just update the local state
    setSpecs(updatedSpecs);
    setEditingIndex(null);
    setEditData({});
    toast.success("Unit type specification updated successfully!");
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-semibold">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const unitTypes = ['Type A', 'Type B', 'Type C', 'Type D (Penthouse)'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="h-6 w-6 text-blue-600" />
              Unit Type Specifications
            </h1>
            <p className="text-sm text-slate-500 mt-1">Configure and manage property unit specifications and inventory.</p>
          </div>
        </div>

        {/* Information Card */}
        <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">About Unit Specifications</p>
              <p className="text-xs mt-1 leading-relaxed">
                These specifications are displayed to owners when they view their unit details. Each specification item (e.g., Bedroom Count, Bathroom Count) can have different values for each unit type. Edit the values below to customize the inventory for each property layout.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Specifications Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Layout Inventory Items</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Total: <strong className="text-slate-800">{specs.length}</strong> specification item{specs.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[180px]">Specification Item</TableHead>
                    {unitTypes.map(type => (
                      <TableHead key={type} className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center min-w-[140px]">
                        {type}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={unitTypes.length + 2} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <AlertCircle className="h-8 w-8 mb-2" />
                          <p className="text-sm font-semibold">No specifications found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    specs.map((spec, idx) => {
                      const isEditing = editingIndex === idx;
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-semibold text-slate-800 text-sm">
                            {spec.Description}
                          </TableCell>
                          {unitTypes.map(type => (
                            <TableCell key={type} className="text-center text-sm">
                              {isEditing ? (
                                <Input
                                  value={editData[type] || ''}
                                  onChange={(e) => setEditData({ ...editData, [type]: e.target.value })}
                                  className="text-xs text-center"
                                />
                              ) : (
                                <span className="font-mono text-slate-700 text-xs">
                                  {spec[type] || 'N/A'}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right space-x-1">
                            {isEditing ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={handleSave}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={handleCancel}
                                  variant="outline"
                                  className="border-slate-200 text-slate-600 text-xs h-7"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handleEdit(idx)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Unit Types Reference */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-slate-400" />
              Available Unit Types
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {unitTypes.map(type => (
                <div key={type} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-sm">{type}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure specifications for this unit layout type.
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
