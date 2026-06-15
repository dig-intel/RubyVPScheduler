import { nanoid } from 'nanoid';

// --- Types ---

export interface UnitOwner {
  UnitNo: string;
  Block: string;
  UnitType: string;
  PurchaserName: string;
  PurchaserEmail: string;
  Eligibility?: string;
  DateSendVPNotice: string; // YYYY-MM-DD
  Size: number; // sf
  VPAppointmentDate: string | null; // e.g. "2026-06-15 09:00 AM - 10:00 AM"
  rowIndex: number;
}

export interface VPSlot {
  Date: string; // YYYY-MM-DD
  StartTime: string; // HH:MM AM/PM
  EndTime: string; // HH:MM AM/PM
  SlotsAvailNo: number; // Max 3
  Slot1BookedBy: string | null; // UnitNo
  Slot2BookedBy: string | null; // UnitNo
  Slot3BookedBy: string | null; // UnitNo
  rowIndex: number;
}

export interface UnitTypeDetail {
  Description: string;
  [unitType: string]: string | number; // Dynamic values for each unit type (e.g. Type A, Type B)
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  type: 'OTP' | 'CONFIRMATION';
}

// --- Seed Data ---

const INITIAL_OWNERS: UnitOwner[] = [
  {
    UnitNo: "A-12-03",
    Block: "Block A",
    UnitType: "Type A",
    PurchaserName: "Alexander Tan",
    PurchaserEmail: "alexander.tan@example.com",
    DateSendVPNotice: "2026-06-01",
    Size: 1150,
    VPAppointmentDate: null,
    rowIndex: 1,
  },
  {
    UnitNo: "A-15-05",
    Block: "Block A",
    UnitType: "Type B",
    PurchaserName: "Sarah Lim",
    PurchaserEmail: "sarah.lim@example.com",
    DateSendVPNotice: "2026-06-01",
    Size: 1350,
    VPAppointmentDate: "2026-06-10 09:00 AM - 10:00 AM",
    rowIndex: 2,
  },
  {
    UnitNo: "B-08-02",
    Block: "Block B",
    UnitType: "Type C",
    PurchaserName: "Michael Wong",
    PurchaserEmail: "michael.wong@example.com",
    DateSendVPNotice: "2026-06-01",
    Size: 950,
    VPAppointmentDate: null,
    rowIndex: 3,
  },
  {
    UnitNo: "B-20-07",
    Block: "Block B",
    UnitType: "Type A",
    PurchaserName: "Jessica Teh",
    PurchaserEmail: "jessica.teh@example.com",
    DateSendVPNotice: "2026-06-01",
    Size: 1150,
    VPAppointmentDate: null,
    rowIndex: 4,
  },
  {
    UnitNo: "A-03-01",
    Block: "Block A",
    UnitType: "Type D (Penthouse)",
    PurchaserName: "Dato' Sri Lee",
    PurchaserEmail: "lee.owner@example.com",
    DateSendVPNotice: "2026-06-01",
    Size: 2450,
    VPAppointmentDate: null,
    rowIndex: 5,
  }
];

// Helper to generate scheduling slots for a range of dates
const generateSlotsForDate = (dateStr: string, startRowIndex: number): VPSlot[] => {
  const times = [
    { start: "09:00 AM", end: "10:00 AM" },
    { start: "10:30 AM", end: "11:30 AM" },
    { start: "02:00 PM", end: "03:00 PM" },
    { start: "03:30 PM", end: "04:30 PM" },
  ];
  
  return times.map((t, idx) => ({
    Date: dateStr,
    StartTime: t.start,
    EndTime: t.end,
    SlotsAvailNo: dateStr === "2026-06-10" && idx === 0 ? 2 : 3, // Pre-book one slot on June 10, 9 AM for Sarah Lim
    Slot1BookedBy: dateStr === "2026-06-10" && idx === 0 ? "A-15-05" : null,
    Slot2BookedBy: null,
    Slot3BookedBy: null,
    rowIndex: startRowIndex + idx,
  }));
};

// Generate slots for the next 14 days
const INITIAL_SLOTS: VPSlot[] = [];
let slotRowCounter = 1;
const today = new Date();
for (let i = 1; i <= 14; i++) {
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + i);
  const dateStr = futureDate.toISOString().split('T')[0];
  INITIAL_SLOTS.push(...generateSlotsForDate(dateStr, slotRowCounter));
  slotRowCounter += 4;
}

const INITIAL_UNIT_TYPE_DETAILS: UnitTypeDetail[] = [
  { Description: "Bedroom Count", "Type A": 3, "Type B": 3, "Type C": 2, "Type D (Penthouse)": 4 },
  { Description: "Bathroom Count", "Type A": 2, "Type B": 3, "Type C": 2, "Type D (Penthouse)": 4 },
  { Description: "Car Park Bays Allocated", "Type A": 2, "Type B": 2, "Type C": 1, "Type D (Penthouse)": 4 },
  { Description: "Balcony Orientation", "Type A": "North (Pool View)", "Type B": "South (City View)", "Type C": "North (Pool View)", "Type D (Penthouse)": "360 Panoramic View" },
  { Description: "Furnishing Condition", "Type A": "Semi-Furnished", "Type B": "Fully-Furnished", "Type C": "Unfurnished", "Type D (Penthouse)": "Designer Premium Fit-out" },
  { Description: "Air Conditioner Units", "Type A": 4, "Type B": 4, "Type C": 3, "Type D (Penthouse)": 6 },
  { Description: "Water Heater System", "Type A": "Storage Tank", "Type B": "Storage Tank", "Type C": "Instant Heater", "Type D (Penthouse)": "Centralized Solar System" },
  { Description: "Kitchen Cabinetry", "Type A": "Signature Kitchen", "Type B": "Signature Kitchen", "Type C": "Standard Fitted", "Type D (Penthouse)": "Bespoke Italian Import" },
  { Description: "Smart Home Hub Included", "Type A": "Yes", "Type B": "Yes", "Type C": "No", "Type D (Penthouse)": "Yes (Premium Suite)" },
];

// --- Database Store Keys ---
const OWNERS_KEY = 'ruby_vp_owners';
const SLOTS_KEY = 'ruby_vp_slots';
const EMAILS_KEY = 'ruby_vp_emails';

export class MockDb {
  static init() {
    if (!localStorage.getItem(OWNERS_KEY)) {
      localStorage.setItem(OWNERS_KEY, JSON.stringify(INITIAL_OWNERS));
    }
    if (!localStorage.getItem(SLOTS_KEY)) {
      localStorage.setItem(SLOTS_KEY, JSON.stringify(INITIAL_SLOTS));
    }
    if (!localStorage.getItem(EMAILS_KEY)) {
      localStorage.setItem(EMAILS_KEY, JSON.stringify([]));
    }
  }

  static getOwners(): UnitOwner[] {
    this.init();
    return JSON.parse(localStorage.getItem(OWNERS_KEY) || '[]');
  }

  static saveOwners(owners: UnitOwner[]) {
    localStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
  }

  static getSlots(): VPSlot[] {
    this.init();
    return JSON.parse(localStorage.getItem(SLOTS_KEY) || '[]');
  }

  static saveSlots(slots: VPSlot[]) {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  }

  static getEmails(): EmailLog[] {
    this.init();
    return JSON.parse(localStorage.getItem(EMAILS_KEY) || '[]');
  }

  static saveEmails(emails: EmailLog[]) {
    localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
  }

  // --- API / Action Implementations ---

  // Find unit owner by UnitNo
  static findOwnerUnit(unitNo: string): UnitOwner | null {
    const owners = this.getOwners();
    return owners.find(o => o.UnitNo.toLowerCase() === unitNo.trim().toLowerCase()) || null;
  }

  // Find slots by specific Date (YYYY-MM-DD)
  static findSlotsByDate(dateStr: string): VPSlot[] {
    const slots = this.getSlots();
    return slots.filter(s => s.Date === dateStr);
  }

  // Book slot transaction
  static bookSlot(unitNo: string, dateStr: string, slotRowIndex: number, ownerOverride?: UnitOwner): { success: boolean; message: string; appointmentDate?: string } {
    const owners = this.getOwners();
    const slots = this.getSlots();

    let ownerIdx = owners.findIndex(o => o.UnitNo.toLowerCase() === unitNo.trim().toLowerCase());
    if (ownerIdx === -1) {
      if (ownerOverride) {
        owners.push(ownerOverride);
        ownerIdx = owners.length - 1;
      } else {
        return { success: false, message: "Unit Owner record not found." };
      }
    }

    const owner = owners[ownerIdx];
    if (owner.VPAppointmentDate) {
      return { 
        success: false, 
        message: `This unit already has a VP Appointment Scheduled on ${owner.VPAppointmentDate}. Please contact Aviscon Property Management at 03-2011 9966 to reschedule.` 
      };
    }

    const slotIdx = slots.findIndex(s => s.rowIndex === slotRowIndex);
    if (slotIdx === -1) {
      return { success: false, message: "Selected time slot is invalid." };
    }

    const slot = slots[slotIdx];
    if (slot.SlotsAvailNo <= 0) {
      return { success: false, message: "There are no more available slots for this time." };
    }

    // Book the slot
    const currentAvail = slot.SlotsAvailNo;
    slot.SlotsAvailNo = currentAvail - 1;
    if (currentAvail === 3) {
      slot.Slot3BookedBy = unitNo;
    } else if (currentAvail === 2) {
      slot.Slot2BookedBy = unitNo;
    } else if (currentAvail === 1) {
      slot.Slot1BookedBy = unitNo;
    }

    const formattedDate = slot.Date;
    const appointmentDate = `${formattedDate} ${slot.StartTime} - ${slot.EndTime}`;
    owner.VPAppointmentDate = appointmentDate;

    // Save changes
    this.saveOwners(owners);
    this.saveSlots(slots);

    // Send confirmation email log
    this.logEmail(
      owner.PurchaserEmail,
      "Vacant Possession (VP) Appointment Confirmation - Ruby",
      `Dear ${owner.PurchaserName},\n\nWe are pleased to confirm your Vacant Possession (VP) appointment for Unit No ${owner.UnitNo} at Ruby.\n\nAppointment Details:\nDate & Time: ${appointmentDate}\nVenue: Aviscon Management Office, Ruby Clubhouse\n\nPlease arrive 15 minutes prior to your slot. If you need to reschedule, please call Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`,
      'CONFIRMATION'
    );

    return { success: true, message: "Slot successfully booked. Confirmation email has been sent!", appointmentDate };
  }

  // Cancel a booking for a unit and release the slot
  static cancelBooking(unitNo: string): { success: boolean; message: string } {
    const owners = this.getOwners();
    const slots = this.getSlots();

    const ownerIdx = owners.findIndex(o => o.UnitNo.toLowerCase() === unitNo.trim().toLowerCase());
    if (ownerIdx === -1) {
      return { success: false, message: "Unit Owner record not found." };
    }

    const owner = owners[ownerIdx];
    if (!owner.VPAppointmentDate) {
      return { success: false, message: "No booking exists for this unit." };
    }

    let slotFound = false;
    for (const slot of slots) {
      if (slot.Slot1BookedBy?.toLowerCase() === unitNo.trim().toLowerCase()) {
        slot.Slot1BookedBy = null;
        slot.SlotsAvailNo = Math.min(slot.SlotsAvailNo + 1, 3);
        slotFound = true;
        break;
      }
      if (slot.Slot2BookedBy?.toLowerCase() === unitNo.trim().toLowerCase()) {
        slot.Slot2BookedBy = null;
        slot.SlotsAvailNo = Math.min(slot.SlotsAvailNo + 1, 3);
        slotFound = true;
        break;
      }
      if (slot.Slot3BookedBy?.toLowerCase() === unitNo.trim().toLowerCase()) {
        slot.Slot3BookedBy = null;
        slot.SlotsAvailNo = Math.min(slot.SlotsAvailNo + 1, 3);
        slotFound = true;
        break;
      }
    }

    owner.VPAppointmentDate = null;

    this.saveOwners(owners);
    this.saveSlots(slots);

    if (slotFound) {
      return { success: true, message: "Booking cancelled and slot released successfully." };
    }

    return { success: true, message: "Booking cancelled successfully." };
  }

  // Send OTP
  static sendOTP(unitNo: string, email: string, ownerOverride?: UnitOwner): { success: boolean; message: string; otp?: string } {
    const owner = ownerOverride ?? this.findOwnerUnit(unitNo);
    if (!owner) {
      return { success: false, message: "Unit No not found." };
    }

    if (owner.PurchaserEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, message: "Email does not match our registered records." };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.logEmail(
      email,
      "Your One-Time Pin (OTP) for Aviscon VP Scheduling",
      `Dear ${owner.PurchaserName},\n\nYour One-Time Pin (OTP) to access the Ruby VP Scheduling System is:\n\n${otp}\n\nThis OTP is valid for 10 minutes. Please do not share this code with anyone.\n\nWarm regards,\nAviscon Property Management`,
      'OTP'
    );

    return { success: true, message: "OTP has been sent to your registered email.", otp };
  }

  // Log email
  static logEmail(to: string, subject: string, body: string, type: 'OTP' | 'CONFIRMATION') {
    const emails = this.getEmails();
    const log: EmailLog = {
      id: nanoid(),
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      type
    };
    emails.unshift(log); // newest first
    this.saveEmails(emails);
  }

  // Get Unit Type Details
  static getUnitTypeDetails(): UnitTypeDetail[] {
    return INITIAL_UNIT_TYPE_DETAILS;
  }

  // Clear booking / reset for testing
  static resetDb() {
    localStorage.removeItem(OWNERS_KEY);
    localStorage.removeItem(SLOTS_KEY);
    localStorage.removeItem(EMAILS_KEY);
    this.init();
  }
}
