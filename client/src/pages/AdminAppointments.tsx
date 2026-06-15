import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import { MockDb, VPSlot } from '@/lib/mockDb';
import { toast } from 'sonner';
import { isGoogleSheetsConfigured } from '@/lib/sheetDb';


export default function AdminAppointments() {
  const [isSheetMode, setIsSheetMode] = useState(isGoogleSheetsConfigured());
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const [slots, setSlots] = useState<VPSlot[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<VPSlot>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSlot, setNewSlot] = useState<Partial<VPSlot>>({
    Date: new Date().toISOString().split('T')[0],
    StartTime: '09:00 AM',
    EndTime: '10:00 AM',
    SlotsAvailNo: 3,
    Slot1BookedBy: null,
    Slot2BookedBy: null,
    Slot3BookedBy: null,
  });

  // Redirect to login if not authenticated as admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== 'admin')) {
      setLocation('/admin-login');
    }
  }, [isAuthenticated, userRole, isLoading, setLocation]);

  // Load slots on mount
useEffect(() => {
  const loadSlots = async () => {
    if (isGoogleSheetsConfigured()) {
      try {
        const response = await fetch('/api/all-slots');
        const data = await response.json();
        if (data.success) setSlots(data.slots);
      } catch {
        setSlots(MockDb.getSlots());
      }
    } else {
      setSlots(MockDb.getSlots());
    }
  };
  loadSlots();
}, []);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...slots[index] });
  };

 const handleSave = async () => {
  if (editingIndex === null) return;
  const updatedSlots = [...slots];
  updatedSlots[editingIndex] = { ...updatedSlots[editingIndex], ...editData };

  if (isSheetMode && updatedSlots[editingIndex].rowIndex) {
    try {
      await fetch('/api/update-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex: updatedSlots[editingIndex].rowIndex,
          StartTime: editData.StartTime,
          EndTime: editData.EndTime,
        }),
      });
    } catch {
      toast.error('Failed to update sheet.');
      return;
    }
  } else {
    MockDb.saveSlots(updatedSlots);
  }

  setSlots(updatedSlots);
  setEditingIndex(null);
  setEditData({});
  toast.success("Slot updated successfully!");
};

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData({});
  };

  const handleDelete = (index: number) => {
    if (confirm(`Are you sure you want to delete this slot (${slots[index].Date} ${slots[index].StartTime})?`)) {
      const updatedSlots = slots.filter((_, i) => i !== index);
      MockDb.saveSlots(updatedSlots);
      setSlots(updatedSlots);
      toast.success("Appointment slot deleted successfully!");
    }
  };

  const handleAddNew = () => {
    if (!newSlot.Date || !newSlot.StartTime || !newSlot.EndTime) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const maxRowIndex = Math.max(...slots.map(s => s.rowIndex), 0);
    const slotToAdd: VPSlot = {
      Date: newSlot.Date as string,
      StartTime: newSlot.StartTime as string,
      EndTime: newSlot.EndTime as string,
      SlotsAvailNo: newSlot.SlotsAvailNo as number || 3,
      Slot1BookedBy: null,
      Slot2BookedBy: null,
      Slot3BookedBy: null,
      rowIndex: maxRowIndex + 1,
    };

    const updatedSlots = [...slots, slotToAdd];
    MockDb.saveSlots(updatedSlots);
    setSlots(updatedSlots);
    setIsAddingNew(false);
    setNewSlot({
      Date: new Date().toISOString().split('T')[0],
      StartTime: '09:00 AM',
      EndTime: '10:00 AM',
      SlotsAvailNo: 3,
      Slot1BookedBy: null,
      Slot2BookedBy: null,
      Slot3BookedBy: null,
    });
    toast.success("New appointment slot created successfully!");
  };

  const getSlotStatus = (slot: VPSlot) => {
    const booked = [slot.Slot1BookedBy, slot.Slot2BookedBy, slot.Slot3BookedBy].filter(Boolean).length;
    return { booked, available: slot.SlotsAvailNo };
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

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.Date]) {
      acc[slot.Date] = [];
    }
    acc[slot.Date].push(slot);
    return acc;
  }, {} as Record<string, VPSlot[]>);

  const sortedDates = Object.keys(slotsByDate).sort();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              VP Appointment Scheduling
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage available timeslots and booking capacity.</p>
          </div>
          <Button 
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Slot
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Slots</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{slots.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Spots</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    {slots.reduce((sum, s) => sum + s.SlotsAvailNo, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-emerald-100" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booked Slots</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">
                    {slots.filter(s => s.SlotsAvailNo < 3).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Slot Form */}
        {isAddingNew && (
          <Card className="border-blue-200 bg-blue-50/40 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-blue-100 bg-blue-50">
              <CardTitle className="text-sm font-bold text-slate-900">Add New Appointment Slot</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date *</label>
                  <Input
                    type="date"
                    value={newSlot.Date || ''}
                    onChange={(e) => setNewSlot({ ...newSlot, Date: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Time *</label>
                  <Input
                    value={newSlot.StartTime || ''}
                    onChange={(e) => setNewSlot({ ...newSlot, StartTime: e.target.value })}
                    placeholder="e.g. 09:00 AM"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">End Time *</label>
                  <Input
                    value={newSlot.EndTime || ''}
                    onChange={(e) => setNewSlot({ ...newSlot, EndTime: e.target.value })}
                    placeholder="e.g. 10:00 AM"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    value={newSlot.SlotsAvailNo || 3}
                    onChange={(e) => setNewSlot({ ...newSlot, SlotsAvailNo: parseInt(e.target.value) || 3 })}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={handleAddNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Create Slot
                </Button>
                <Button 
                  onClick={() => setIsAddingNew(false)}
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Slots by Date */}
        {sortedDates.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No appointment slots available</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add New Slot" to create scheduling options.</p>
            </CardContent>
          </Card>
        ) : (
          sortedDates.map(date => (
            <Card key={date} className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Slot</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booked</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bookings</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slotsByDate[date].map((slot, idx) => {
                        const status = getSlotStatus(slot);
                        const isEditing = editingIndex === slots.indexOf(slot);
                        return (
                          <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold text-slate-800 font-mono text-sm">
                              {isEditing ? (
                                <Input
                                  value={editData.StartTime || ''}
                                  onChange={(e) => setEditData({ ...editData, StartTime: e.target.value })}
                                  className="text-xs"
                                />
                              ) : (
                                slot.StartTime
                              )}
                            </TableCell>
                            <TableCell className="text-slate-700 text-sm">
                              {isEditing ? (
                                <Input
                                  value={editData.EndTime || ''}
                                  onChange={(e) => setEditData({ ...editData, EndTime: e.target.value })}
                                  className="text-xs"
                                />
                              ) : (
                                `${slot.StartTime} - ${slot.EndTime}`
                              )}
                            </TableCell>
                            <TableCell className="text-slate-700 text-sm font-bold">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="1"
                                  max="3"
                                  value={editData.SlotsAvailNo || 3}
                                  onChange={(e) => setEditData({ ...editData, SlotsAvailNo: parseInt(e.target.value) || 3 })}
                                  className="text-xs"
                                />
                              ) : (
                                `${3}`
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200 font-bold">
                                {status.booked}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200 font-bold">
                                {status.available}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {[slot.Slot1BookedBy, slot.Slot2BookedBy, slot.Slot3BookedBy]
                                .filter(Boolean)
                                .map((unitNo, i) => (
                                  <div key={i} className="font-mono text-blue-600">{unitNo}</div>
                                ))}
                            </TableCell>
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
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleEdit(slots.indexOf(slot))}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleDelete(slots.indexOf(slot))}
                                    variant="destructive"
                                    className="text-xs h-7"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
