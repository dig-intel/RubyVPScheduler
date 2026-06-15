import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  XCircle,
  Search,
  Mail,
  Building,
  AlertCircle,
} from "lucide-react";
import { MockDb, UnitOwner } from "@/lib/mockDb";
import { fetchSheetOwners, isGoogleSheetsConfigured } from "@/lib/sheetDb";
import { toast } from "sonner";

export default function AdminOwnerInfo() {
  const [bulkCooldown, setBulkCooldown] = useState<number | null>(null);
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [emailCooldowns, setEmailCooldowns] = useState<Record<string, number>>(
    {}
  );
  const [owners, setOwners] = useState<UnitOwner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<UnitOwner>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSheetMode, setIsSheetMode] = useState<boolean>(
    isGoogleSheetsConfigured()
  );
  const [isSheetLoading, setIsSheetLoading] = useState<boolean>(false);
  const [newOwner, setNewOwner] = useState<Partial<UnitOwner>>({
    UnitNo: "",
    Block: "",
    UnitType: "",
    PurchaserName: "",
    PurchaserEmail: "",
    DateSendVPNotice: new Date().toISOString().split("T")[0],
    Size: 0,
    VPAppointmentDate: null,
  });

  useEffect(() => {
  const active = Object.values(emailCooldowns).some(t => Date.now() - t < 60_000);
  const bulkActive = bulkCooldown && Date.now() - bulkCooldown < 60_000;
  if (!active && !bulkActive) return;

  const timer = setTimeout(() => {
    setEmailCooldowns(prev => ({ ...prev })); // force re-render
    setBulkCooldown(prev => prev); // force re-render
  }, 60_000);

  return () => clearTimeout(timer);
}, [emailCooldowns, bulkCooldown]);

  // Redirect to login if not authenticated as admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== "admin")) {
      setLocation("/admin-login");
    }
  }, [isAuthenticated, userRole, isLoading, setLocation]);

  // Load owners on mount
  useEffect(() => {
    const loadOwners = async () => {
      if (isGoogleSheetsConfigured()) {
        setIsSheetMode(true);
        setIsSheetLoading(true);
        try {
          const data = await fetchSheetOwners();
          setOwners(data);
        } catch (error) {
          console.error("[AdminOwnerInfo] failed to load sheet owners", error);
          setOwners(MockDb.getOwners());
          setIsSheetMode(false);
        } finally {
          setIsSheetLoading(false);
        }
      } else {
        setOwners(MockDb.getOwners());
      }
    };

    loadOwners();
  }, []);

  const filteredOwners = owners.filter(
    owner =>
      owner.UnitNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.PurchaserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.PurchaserEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditData({ ...owners[index] });
  };

  const handleSave = async () => {
    if (editingIndex === null) return;

    const updatedOwners = [...owners];
    updatedOwners[editingIndex] = {
      ...updatedOwners[editingIndex],
      ...editData,
    } as UnitOwner;
    setOwners(updatedOwners);

    if (isSheetMode && updatedOwners[editingIndex].rowIndex) {
      try {
        const body: any = { rowIndex: updatedOwners[editingIndex].rowIndex };
        if (editData.DateSendVPNotice !== undefined) {
          body.dateSendVPNotice = editData.DateSendVPNotice as string;
        }
        if (editData.VPAppointmentDate !== undefined) {
          body.appointmentDate = editData.VPAppointmentDate as string;
        }

        if (body.dateSendVPNotice || body.appointmentDate !== undefined) {
          await fetch("/api/update-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      } catch (error) {
        console.error("[AdminOwnerInfo] sheet save failed", error);
        toast.error("Failed to persist owner record to the sheet.");
      }
    } else {
      MockDb.saveOwners(updatedOwners);
    }

    setEditingIndex(null);
    setEditData({});
    toast.success("Owner record updated successfully!");
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData({});
  };

  const handleDelete = (index: number) => {
    if (isSheetMode) {
      toast.error(
        "Cannot delete owner records while using Google Sheets live mode."
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete ${owners[index].PurchaserName}'s record?`
      )
    ) {
      const updatedOwners = owners.filter((_, i) => i !== index);
      MockDb.saveOwners(updatedOwners);
      setOwners(updatedOwners);
      toast.success("Owner record deleted successfully!");
    }
  };

  const handleCancelBooking = async (index: number) => {
    const owner = owners[index];
    if (!owner.VPAppointmentDate) {
      toast.error("This record has no active booking to cancel.");
      return;
    }

    if (
      !confirm(`Cancel booking for ${owner.PurchaserName} (${owner.UnitNo})?`)
    ) {
      return;
    }

    const localCancelResult = MockDb.cancelBooking(owner.UnitNo);
    if (!localCancelResult.success && !isSheetMode) {
      toast.error(localCancelResult.message);
      return;
    }

    if (!localCancelResult.success) {
      console.warn(
        "[AdminOwnerInfo] local cancellation skipped:",
        localCancelResult.message
      );
    }

    if (owner.rowIndex) {
      try {
        await fetch("/api/update-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rowIndex: owner.rowIndex,
            appointmentDate: "",
          }),
        });
      } catch (error) {
        console.error("[AdminOwnerInfo] sheet clear failed", error);
      }
    }

    if (isSheetMode) {
      try {
        const data = await fetchSheetOwners();
        setOwners(data);
      } catch (error) {
        console.error("[AdminOwnerInfo] failed to reload sheet owners", error);
      }
    } else {
      setOwners(MockDb.getOwners());
    }

    toast.success(
      localCancelResult.success
        ? localCancelResult.message
        : "Booking cancelled successfully."
    );
  };

  const sendVPNoticeEmail = async (index: number) => {
    const owner = owners[index];

    const lastSent = emailCooldowns[owner.UnitNo];
    if (lastSent && Date.now() - lastSent < 60_000) {
      const secondsLeft = Math.ceil((60_000 - (Date.now() - lastSent)) / 1000);
      toast.error(
        `Please wait ${secondsLeft}s before resending to ${owner.PurchaserName}.`
      );
      return;
    }

    if (!owner.PurchaserEmail) {
      toast.error("Owner email address is missing.");
      return;
    }
    if (owner.Eligibility !== "Yes") {
      toast.error(`${owner.PurchaserName} is not eligible for VP notice.`);
      return;
    }

    const dateSent = new Date().toISOString().split("T")[0];
    const subject = "Vacant Possession (VP) Notice from Ruby Residences";
    const text = `Dear ${owner.PurchaserName},\n\nThis is your Vacant Possession (VP) notice for Unit ${owner.UnitNo}.\n\nPlease log in to schedule your VP appointment at your earliest convenience.\n\nNotice Sent: ${dateSent}\n\nIf you have any questions, please contact Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`;

    try {
      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: owner.PurchaserEmail, subject, text }),
      });

      if (!emailResponse.ok) {
        const body = await emailResponse.text();
        throw new Error(body || "Email delivery failed.");
      }

      // Update sheet column E with date sent
      if (isSheetMode && owner.rowIndex) {
        await fetch("/api/update-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rowIndex: owner.rowIndex,
            dateSendVPNotice: dateSent,
          }),
        });
      }

      const updatedOwners = [...owners];
      updatedOwners[index] = { ...owner, DateSendVPNotice: dateSent };
      setOwners(updatedOwners);
      if (!isSheetMode) MockDb.saveOwners(updatedOwners);

      toast.success(`VP notice sent to ${owner.PurchaserName}.`);
      setEmailCooldowns(prev => ({ ...prev, [owner.UnitNo]: Date.now() }));
    } catch (error) {
      console.error("[AdminOwnerInfo] send VP notice failed", error);
      toast.error("Failed to send VP notice email.");
    }
  };

  const sendAllEligibleEmails = async () => {
    if (bulkCooldown && Date.now() - bulkCooldown < 60_000) {
      const secondsLeft = Math.ceil(
        (60_000 - (Date.now() - bulkCooldown)) / 1000
      );
      toast.error(`Please wait ${secondsLeft}s before sending again.`);
      return;
    }
    const eligible = owners
      .map((owner, index) => ({ owner, index }))
      .filter(
        ({ owner }) => owner.Eligibility === "Yes" && owner.PurchaserEmail
      );

    if (eligible.length === 0) {
      toast.error("No eligible owners found to send notices to.");
      return;
    }

    if (
      !confirm(`Send VP notice emails to ${eligible.length} eligible owner(s)?`)
    )
      return;

    let successCount = 0;
    let failCount = 0;
    const dateSent = new Date().toISOString().split("T")[0];
    const updatedOwners = [...owners];

    for (const { owner, index } of eligible) {
      try {
        const subject = "Vacant Possession (VP) Notice from Ruby Residences";
        const text = `Dear ${owner.PurchaserName},\n\nThis is your Vacant Possession (VP) notice for Unit ${owner.UnitNo}.\n\nPlease log in here \n {Login Link} \n to schedule your VP appointment at your earliest convenience.\n\nNotice Sent: ${dateSent}\n\nIf you have any questions, please contact Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`;

        const emailResponse = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: owner.PurchaserEmail, subject, text }),
        });

        if (!emailResponse.ok) throw new Error("Email failed");

        if (isSheetMode && owner.rowIndex) {
          await fetch("/api/update-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rowIndex: owner.rowIndex,
              dateSendVPNotice: dateSent,
            }),
          });
        }

        updatedOwners[index] = { ...owner, DateSendVPNotice: dateSent };
        successCount++;
      } catch {
        failCount++;
      }
    }

    setOwners(updatedOwners);
    if (!isSheetMode) MockDb.saveOwners(updatedOwners);

    if (failCount === 0) {
      toast.success(
        `VP notices sent to ${successCount} owner(s) successfully.`
      );
      setBulkCooldown(Date.now());
    } else {
      toast.error(
        `Sent ${successCount}, failed ${failCount}. Check console for details.`
      );
    }
  };
  const handleAddNew = () => {
    if (isSheetMode) {
      toast.error(
        "Cannot add owner records while using Google Sheets live mode."
      );
      return;
    }

    if (!newOwner.UnitNo || !newOwner.PurchaserEmail) {
      toast.error("Please fill in Unit No and Email fields.");
      return;
    }

    const maxRowIndex = Math.max(...owners.map(o => o.rowIndex), 0);
    const ownerToAdd: UnitOwner = {
      UnitNo: newOwner.UnitNo as string,
      Block: (newOwner.Block as string) || "Block A",
      UnitType: (newOwner.UnitType as string) || "Type A",
      PurchaserName: (newOwner.PurchaserName as string) || "New Owner",
      PurchaserEmail: newOwner.PurchaserEmail as string,
      DateSendVPNotice: newOwner.DateSendVPNotice as string,
      Size: (newOwner.Size as number) || 1000,
      VPAppointmentDate: null,
      rowIndex: maxRowIndex + 1,
    };

    const updatedOwners = [...owners, ownerToAdd];
    MockDb.saveOwners(updatedOwners);
    setOwners(updatedOwners);
    setIsAddingNew(false);
    setNewOwner({
      UnitNo: "",
      Block: "",
      UnitType: "",
      PurchaserName: "",
      PurchaserEmail: "",
      DateSendVPNotice: new Date().toISOString().split("T")[0],
      Size: 0,
      VPAppointmentDate: null,
    });
    toast.success("New owner record created successfully!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-semibold">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Owner Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              View, edit, and manage property owner records.
            </p>
            {isSheetMode && (
              <p className="mt-2 text-xs text-emerald-600 font-medium">
                Live Google Sheets mode enabled — showing the latest
                sheet-backed owner records.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
  <Button
    onClick={sendAllEligibleEmails}
    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
    disabled={!!(bulkCooldown && Date.now() - bulkCooldown < 60_000)}
  >
    <Mail className="h-4 w-4" />
    Send All Eligible
  </Button>
  <Button
    onClick={() => setIsAddingNew(!isAddingNew)}
    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
    disabled={isSheetMode}
  >
    <Plus className="h-4 w-4" />
    Add New Owner
  </Button>
</div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by Unit No, Owner Name, or Email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add New Owner Form */}
        {isAddingNew && (
          <Card className="border-blue-200 bg-blue-50/40 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-blue-100 bg-blue-50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Add New Owner Record
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Unit No *
                  </label>
                  <Input
                    value={newOwner.UnitNo || ""}
                    onChange={e =>
                      setNewOwner({ ...newOwner, UnitNo: e.target.value })
                    }
                    placeholder="e.g. A-12-03"
                    className="mt-1 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Block
                  </label>
                  <Input
                    value={newOwner.Block || ""}
                    onChange={e =>
                      setNewOwner({ ...newOwner, Block: e.target.value })
                    }
                    placeholder="e.g. Block A"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Unit Type
                  </label>
                  <Input
                    value={newOwner.UnitType || ""}
                    onChange={e =>
                      setNewOwner({ ...newOwner, UnitType: e.target.value })
                    }
                    placeholder="e.g. Type A"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Purchaser Name *
                  </label>
                  <Input
                    value={newOwner.PurchaserName || ""}
                    onChange={e =>
                      setNewOwner({
                        ...newOwner,
                        PurchaserName: e.target.value,
                      })
                    }
                    placeholder="Full name"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={newOwner.PurchaserEmail || ""}
                    onChange={e =>
                      setNewOwner({
                        ...newOwner,
                        PurchaserEmail: e.target.value,
                      })
                    }
                    placeholder="owner@example.com"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Size (sf)
                  </label>
                  <Input
                    type="number"
                    value={newOwner.Size || 0}
                    onChange={e =>
                      setNewOwner({
                        ...newOwner,
                        Size: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g. 1150"
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
                  Create Owner
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

        {/* Owners Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Owner Records
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Total:{" "}
                  <strong className="text-slate-800">
                    {filteredOwners.length}
                  </strong>{" "}
                  owner{filteredOwners.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Unit No
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Purchaser
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Email
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Block
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Size
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Notice Sent
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      VP Status
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOwners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <AlertCircle className="h-8 w-8 mb-2" />
                          <p className="text-sm font-semibold">
                            No owners found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOwners.map((owner, idx) => {
                      const isEditing = editingIndex === owners.indexOf(owner);
                      return (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="font-bold text-slate-800 font-mono text-sm">
                            {isEditing ? (
                              <Input
                                value={editData.UnitNo || ""}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    UnitNo: e.target.value,
                                  })
                                }
                                className="text-xs font-mono"
                              />
                            ) : (
                              owner.UnitNo
                            )}
                          </TableCell>
                          <TableCell className="text-slate-800">
                            {isEditing ? (
                              <Input
                                value={editData.PurchaserName || ""}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    PurchaserName: e.target.value,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.PurchaserName
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs font-mono">
                            {isEditing ? (
                              <Input
                                type="email"
                                value={editData.PurchaserEmail || ""}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    PurchaserEmail: e.target.value,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.PurchaserEmail
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm">
                            {isEditing ? (
                              <Input
                                value={editData.Block || ""}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    Block: e.target.value,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.Block
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm">
                            {isEditing ? (
                              <Input
                                value={editData.UnitType || ""}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    UnitType: e.target.value,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.UnitType
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm font-mono">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editData.Size || 0}
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    Size: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.Size.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm font-mono">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={
                                  editData.DateSendVPNotice ||
                                  owner.DateSendVPNotice ||
                                  new Date().toISOString().split("T")[0]
                                }
                                onChange={e =>
                                  setEditData({
                                    ...editData,
                                    DateSendVPNotice: e.target.value,
                                  })
                                }
                                className="text-xs"
                              />
                            ) : (
                              owner.DateSendVPNotice || "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {owner.VPAppointmentDate ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200 font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Booked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200 font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                Pending
                              </span>
                            )}
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
                                  onClick={() =>
                                    handleEdit(owners.indexOf(owner))
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                {owner.Eligibility === "Yes" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      sendVPNoticeEmail(owners.indexOf(owner))
                                    }
                                    variant="outline"
                                    className="border-blue-200 text-blue-700 text-xs h-7"
                                    disabled={
                                      !!(
                                        emailCooldowns[owner.UnitNo] &&
                                        Date.now() -
                                          emailCooldowns[owner.UnitNo] <
                                          60_000
                                      )
                                    }
                                    title={
                                      emailCooldowns[owner.UnitNo] &&
                                      Date.now() -
                                        emailCooldowns[owner.UnitNo] <
                                        60_000
                                        ? "Cooldown active"
                                        : "Send VP notice email"
                                    }
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                )}
                                {owner.VPAppointmentDate && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleCancelBooking(owners.indexOf(owner))
                                    }
                                    variant="outline"
                                    className="border-amber-200 text-amber-700 text-xs h-7"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(owners.indexOf(owner))
                                  }
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
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
