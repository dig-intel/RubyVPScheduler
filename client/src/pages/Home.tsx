import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Building,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  CalendarCheck2,
} from "lucide-react";
import { MockDb, VPSlot } from "@/lib/mockDb";
import {
  isGoogleSheetsConfigured,
  findOwnerUnit as findSheetOwnerUnit,
  fetchSheetSlots,
  initSheetSlots,
} from "@/lib/sheetDb";

import { toast } from "sonner";

export default function Home() {
  const { currentUser, isAuthenticated, isLoading, updateCurrentUser } =
    useAuth();
  const [location, setLocation] = useLocation();

  // Selected states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    // Default to tomorrow or next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [slots, setSlots] = useState<VPSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<VPSlot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const toLocalDateStr = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Load slots whenever date changes
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = toLocalDateStr(selectedDate);

    if (isGoogleSheetsConfigured()) {
      fetchSheetSlots(dateStr)
        .then(setSlots)
        .catch(() => {
          // fallback to mockDb
          setSlots(MockDb.findSlotsByDate(dateStr));
        });
    } else {
      setSlots(MockDb.findSlotsByDate(dateStr));
    }
    setSelectedSlot(null);
  }, [selectedDate]);

  // Init slots on mount
  useEffect(() => {
    if (isGoogleSheetsConfigured()) {
      initSheetSlots();
    }
  }, []);

  // Load slots whenever date changes
  // useEffect(() => {
  //   if (selectedDate) {
  //     const dateStr = toLocalDateStr(selectedDate);
  //     const dateSlots = MockDb.findSlotsByDate(dateStr);
  //     setSlots(dateSlots);
  //     setSelectedSlot(null); // Reset selection
  //   }
  // }, [selectedDate]);

  // const sendEmail = async (to: string, subject: string, text: string) => {
  //   const response = await fetch("/api/send-email", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ to, subject, text }),
  //   });

  //   if (!response.ok) {
  //     const body = await response.text();
  //     throw new Error(body || "Email send failed");
  //   }

  //   return response.json();
  // };

  // const confirmBookingOnServer = async (
  //   rowIndex: number,
  //   appointmentDate: string,
  //   purchaserEmail: string,
  //   purchaserName: string
  // ) => {
  //   const response = await fetch("/api/book-appointment", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       rowIndex,
  //       appointmentDate,
  //       purchaserEmail,
  //       purchaserName,
  //     }),
  //   });

  //   if (!response.ok) {
  //     const body = await response.text();
  //     console.error("[Home] confirmBookingOnServer failed", {
  //       status: response.status,
  //       body,
  //     });
  //     throw new Error(body || "Booking confirmation failed");
  //   }

  //   return response.json();
  // };

  const handleBookSlot = async () => {
    if (!currentUser || !selectedSlot) {
      toast.error("Please select a timeslot first.");
      return;
    }
    if (currentUser.VPAppointmentDate) {
      toast.error("You already have an appointment scheduled.");
      return;
    }

    setBookingLoading(true);
    const dateStr = toLocalDateStr(selectedDate ?? new Date());
    const appointmentDate = `${dateStr} ${selectedSlot.StartTime} - ${selectedSlot.EndTime}`;

    try {
      if (isGoogleSheetsConfigured()) {
        if (!currentUser.rowIndex)
          throw new Error("Account not linked to sheet row.");

        const response = await fetch("/api/book-slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotRowIndex: selectedSlot.rowIndex,
            unitNo: currentUser.UnitNo,
            appointmentDate,
            purchaserEmail: currentUser.PurchaserEmail,
            purchaserName: currentUser.PurchaserName,
            ownerRowIndex: currentUser.rowIndex,
          }),
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        const freshUser = await findSheetOwnerUnit(currentUser.UnitNo);
        updateCurrentUser(
          freshUser ?? { ...currentUser, VPAppointmentDate: appointmentDate }
        );
        toast.success("Appointment confirmed! Check your email.");
      } else {
        // fallback to mockDb
        const res = MockDb.bookSlot(
          currentUser.UnitNo,
          dateStr,
          selectedSlot.rowIndex,
          currentUser
        );
        if (!res.success) throw new Error(res.message);
        updateCurrentUser({
          ...currentUser,
          VPAppointmentDate: appointmentDate,
        });
        toast.success("Appointment confirmed!");
      }

      setSelectedSlot(null);
    } catch (error: any) {
      console.error("[Home] booking failed", error);
      toast.error(error.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-semibold">
            Loading your property details...
          </p>
        </div>
      </div>
    );
  }

  const hasScheduled = !!currentUser.VPAppointmentDate;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
            <Building className="h-64 w-64" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome to the Ruby VP Scheduling System
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              We are delighted to assist you in receiving your new home. Use
              this secure portal to schedule your handover and joint inspection.
            </p>

            {/* Owner Info Bar */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs font-mono">
              <div>
                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Unit No
                </span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {currentUser.UnitNo}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Unit Type
                </span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {currentUser.UnitType}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Block
                </span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {currentUser.Block}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Size (sf)
                </span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {currentUser.Size.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking State Check */}
        {hasScheduled ? (
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="bg-emerald-600 text-white p-3 rounded-full flex-shrink-0">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Your Appointment is Confirmed!
                </h2>
                <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
                  You have scheduled your Vacant Possession handover and
                  inspection. A confirmation email has been dispatched to your
                  inbox.
                </p>
                <div className="mt-4 inline-flex items-center gap-3 bg-white border border-emerald-200 px-4 py-3 rounded-xl shadow-sm text-sm font-mono text-emerald-900">
                  <CalendarCheck2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Scheduled Date & Time
                    </span>
                    <strong className="text-slate-800 text-sm">
                      {currentUser.VPAppointmentDate}
                    </strong>
                  </div>
                </div>
                <div className="pt-4 flex flex-col gap-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Info className="h-4 w-4 text-slate-400" />
                    Important Notice for Rescheduling:
                  </p>
                  <p className="pl-5">
                    If you need to change your appointment, please contact
                    Aviscon Property Management at{" "}
                    <strong className="text-slate-700">03-2011 9966</strong>.
                    Online rescheduling is locked for security.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Date Picker */}
            <Card className="lg:col-span-5 border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  1. Choose Handover Date
                </CardTitle>
                <CardDescription className="text-xs">
                  Select an available date for your joint handover inspection.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 14); // 14 days ahead, not 15
  return date <= today || date > maxDate;
}}
                  className="rounded-md border border-slate-100"
                />
              </CardContent>
              <CardFooter className="bg-slate-50 p-4 text-xs text-slate-500 border-t border-slate-100 rounded-b-xl flex gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p>
                  Appointments can be booked from tomorrow up to 14 days in
                  advance. Slots are limited to ensure thorough inspection.
                </p>
              </CardFooter>
            </Card>

            {/* Right: Slots List */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    2. Select Available Timeslot
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Timeslots available for{" "}
                    <strong className="text-slate-800">
                      {selectedDate?.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {slots.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p className="font-semibold text-sm">
                        No slots generated for this date.
                      </p>
                      <p className="text-xs mt-1">
                        Please select another date from the calendar.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {slots.map(slot => {
                        const isSelected =
                          selectedSlot?.rowIndex === slot.rowIndex;
                        const isFull = slot.SlotsAvailNo <= 0;

                        return (
                          <button
                            key={slot.rowIndex}
                            onClick={() => !isFull && setSelectedSlot(slot)}
                            disabled={isFull}
                            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                              isFull
                                ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-600"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                                Slot{" "}
                                {slot.rowIndex % 4 === 0
                                  ? 4
                                  : slot.rowIndex % 4}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isFull
                                    ? "bg-red-100 text-red-800"
                                    : slot.SlotsAvailNo === 1
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isFull
                                  ? "Fully Booked"
                                  : `${slot.SlotsAvailNo} available`}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5 font-mono">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {slot.StartTime}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Ends at {slot.EndTime}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Confirmation Panel */}
              {selectedSlot && (
                <Card className="border-blue-200 bg-blue-50/40 shadow-sm animate-fade-in">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                          Confirm Your Selection
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 font-mono">
                          {selectedDate?.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          @ {selectedSlot.StartTime} - {selectedSlot.EndTime}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Handover and Joint inspection for Unit{" "}
                          <strong className="text-slate-800">
                            {currentUser.UnitNo}
                          </strong>
                        </p>
                      </div>
                      <Button
                        onClick={handleBookSlot}
                        disabled={bookingLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-6 shadow-lg shadow-blue-600/10 flex items-center gap-2 self-stretch sm:self-auto justify-center"
                      >
                        {bookingLoading ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            Booking Slot...
                          </>
                        ) : (
                          <>
                            Confirm Appointment
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
