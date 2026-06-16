import express from "express";
import { Resend } from "resend";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
// import nodemailer from "nodemailer";
import { google } from "googleapis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  app.use((err: any, req: any, res: any, next: any) => {
    if (err && err.type === "entity.parse.failed") {
      console.error(
        "[Server] JSON parse failed",
        err.message,
        "rawBody:",
        req.rawBody
      );
      return res.status(400).json({
        success: false,
        message: "Invalid JSON body. Please send a valid JSON payload.",
        error: err.message,
        rawBody: req.rawBody,
      });
    }
    next(err);
  });

  // const smtpHost = process.env.SMTP_HOST;
  // const smtpPort = Number(process.env.SMTP_PORT || 587);
  // const smtpSecure = process.env.SMTP_SECURE === "true";
  // const smtpUser = process.env.SMTP_USER;
  // const smtpPass = process.env.SMTP_PASS;
  // const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const serviceAccountCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    : undefined;
  const GOOGLE_CREDENTIALS_PATH = path.resolve(
    __dirname,
    "..",
    "google-credentials.json"
  );
  const sheetsSpreadsheetId =
    process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    "1Jb6Xtq2yj9xh6H8rBD7g6kHC11vI6tFvVkj4hHg8sKE";
  const sheetsTabName = "UnitNoOwnerInfo";
  const slotsTabName = "VPSlots";
  // if (!smtpHost || !smtpUser || !smtpPass) {
  //   console.warn(
  //     "SMTP configuration is incomplete. /api/send-email will fail until SMTP_HOST, SMTP_USER, and SMTP_PASS are provided."
  //   );
  // }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const resendFrom =
    process.env.RESEND_FROM || "digitalintelligencesdnbhd@gmail.com";
  // const transporter = nodemailer.createTransport({
  //   host: smtpHost || "smtp.gmail.com",
  //   port: smtpPort,
  //   secure: smtpSecure,
  //   auth: {
  //     user: smtpUser,
  //     pass: smtpPass,
  //   },
  // });

  async function getSheetsAuth() {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : fs.existsSync(GOOGLE_CREDENTIALS_PATH)
        ? GOOGLE_CREDENTIALS_PATH
        : undefined;

    if (!serviceAccountCredentials && !keyFile) {
      throw new Error(
        "Google Sheets service account credentials are not configured. Place google-credentials.json in the project root or set GOOGLE_APPLICATION_CREDENTIALS, or use GOOGLE_SERVICE_ACCOUNT_KEY."
      );
    }

    const authOptions: any = {
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    };

    if (serviceAccountCredentials) {
      authOptions.credentials = serviceAccountCredentials;
    } else if (keyFile) {
      authOptions.keyFile = keyFile;
    }

    return new google.auth.GoogleAuth(authOptions);
  }

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html } = req.body || {};

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: "Missing required email fields: to, subject, text/html.",
      });
    }

    // if (!smtpHost || !smtpUser || !smtpPass) {
    //   return res
    //     .status(500)
    //     .json({
    //       success: false,
    //       message: "SMTP is not configured on the server.",
    //     });
    // }
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Resend is not configured on the server.",
      });
    }
    try {
      await resend.emails.send({
        from: resendFrom,
        to,
        subject,
        text,
        html,
      });
      // await transporter.sendMail({
      //   from: smtpFrom,
      //   to,
      //   subject,
      //   text,
      //   html,
      // });
      return res.json({ success: true, message: "Email sent successfully." });
    } catch (error) {
      console.error("[Resend] send mail failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/book-appointment", async (req, res) => {
    const { rowIndex, appointmentDate, purchaserEmail, purchaserName } =
      req.body || {};

    if (
      rowIndex === undefined ||
      rowIndex === null ||
      typeof appointmentDate !== "string" ||
      !purchaserEmail ||
      !purchaserName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required booking fields: rowIndex, appointmentDate, purchaserEmail, purchaserName.",
      });
    }

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const range = `${sheetsTabName}!F${rowIndex}`;
      console.log("[Server] book-appointment request", {
        spreadsheetId: sheetsSpreadsheetId,
        range,
        appointmentDate,
        purchaserEmail,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsSpreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[appointmentDate]],
        },
      });
      await resend.emails.send({
        from: resendFrom,
        to: purchaserEmail,
        subject: "Vacant Possession (VP) Appointment Confirmation - Ruby",
        text: `Dear ${purchaserName},

Your Vacant Possession (VP) appointment for Unit No has been confirmed.

Appointment Details:
${appointmentDate}

Venue: Aviscon Management Office, Ruby Clubhouse

Please arrive 15 minutes prior to your slot. If you need to reschedule, please call Aviscon Property Management at 03-2011 9966.

Warm regards,
Aviscon Property Management`,
      });
      // if (!smtpHost || !smtpUser || !smtpPass) {
      //   return res
      //     .status(500)
      //     .json({
      //       success: false,
      //       message: "SMTP is not configured on the server.",
      //     });
      // }

      // await transporter.sendMail({
      //   from: smtpFrom,
      //   to: purchaserEmail,
      //   subject: "Vacant Possession (VP) Appointment Confirmation - Ruby",
      //   text: `Dear ${purchaserName},\n\nYour Vacant Possession (VP) appointment for Unit No has been confirmed.\n\nAppointment Details:\n${appointmentDate}\n\nVenue: Aviscon Management Office, Ruby Clubhouse\n\nPlease arrive 15 minutes prior to your slot. If you need to reschedule, please call Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`,
      // });

      return res.json({
        success: true,
        message:
          "Booking confirmed, sheet updated, and email sent successfully.",
      });
    } catch (error) {
      console.error("[Booking] booking confirmation failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/update-sheet", async (req, res) => {
    const { rowIndex, appointmentDate, dateSendVPNotice } = req.body || {};

    if (
      rowIndex === undefined ||
      rowIndex === null ||
      (appointmentDate === undefined && dateSendVPNotice === undefined)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required sheet update fields: rowIndex and at least one field to update.",
      });
    }

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const updates = [] as Array<{ range: string; values: string[][] }>;

      if (dateSendVPNotice !== undefined) {
        updates.push({
          range: `${sheetsTabName}!E${rowIndex}`,
          values: [[dateSendVPNotice]],
        });
      }
      if (appointmentDate !== undefined) {
        updates.push({
          range: `${sheetsTabName}!F${rowIndex}`,
          values: [[appointmentDate]],
        });
      }

      for (const update of updates) {
        console.log("[Server] update-sheet request", {
          spreadsheetId: sheetsSpreadsheetId,
          range: update.range,
          values: update.values,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetsSpreadsheetId,
          range: update.range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: update.values },
        });
      }

      return res.json({
        success: true,
        message: "Google Sheet updated successfully.",
      });
    } catch (error) {
      console.error("[Sheets] update failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/debug-sheet", async (req, res) => {
    const { text, range } = req.body || {};
    const debugText =
      typeof text === "string" && text.trim()
        ? text.trim()
        : `DEBUG ${new Date().toISOString()}`;
    const debugRange =
      typeof range === "string" && range.trim()
        ? range.trim()
        : `${sheetsTabName}!J1`;

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      console.log("[Server] debug-sheet request", {
        spreadsheetId: sheetsSpreadsheetId,
        debugRange,
        debugText,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsSpreadsheetId,
        range: debugRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[debugText]],
        },
      });

      return res.json({
        success: true,
        message: `Debug value written to ${debugRange}.`,
        debugRange,
        debugText,
      });
    } catch (error) {
      console.error("[Debug] sheet write failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });
  app.post("/api/cancel-booking", async (req, res) => {
  const { ownerRowIndex, unitNo, appointmentDate, purchaserEmail, purchaserName } = req.body || {};

  if (!ownerRowIndex || !unitNo || !purchaserEmail || !purchaserName) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    const auth = await getSheetsAuth();
    const sheets = google.sheets({ version: "v4", auth });

    // 1. Clear VPAppointmentDate in UnitNoOwnerInfo
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsSpreadsheetId,
      range: `${sheetsTabName}!F${ownerRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[""]] },
    });

    // 2. Find and clear the unit from VPSlots
    const slotsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsSpreadsheetId,
      range: `${slotsTabName}!A2:G`,
    });

    const rows = slotsResponse.data.values || [];
    let slotRowIndex = -1;
    let bookedCol = "";
    let currentAvail = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const e = (row[4] ?? "").trim().toLowerCase();
      const f = (row[5] ?? "").trim().toLowerCase();
      const g = (row[6] ?? "").trim().toLowerCase();
      const target = unitNo.trim().toLowerCase();

      if (e === target) { slotRowIndex = i + 2; bookedCol = "E"; currentAvail = Number(row[3] ?? 0); break; }
      if (f === target) { slotRowIndex = i + 2; bookedCol = "F"; currentAvail = Number(row[3] ?? 0); break; }
      if (g === target) { slotRowIndex = i + 2; bookedCol = "G"; currentAvail = Number(row[3] ?? 0); break; }
    }

    if (slotRowIndex !== -1 && bookedCol) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetsSpreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `${slotsTabName}!${bookedCol}${slotRowIndex}`, values: [[""]] },
            { range: `${slotsTabName}!D${slotRowIndex}`, values: [[String(currentAvail + 1)]] },
          ],
        },
      });
    }

    // 3. Send cancellation email
    await resend.emails.send({
      from: resendFrom,
      to: purchaserEmail,
      subject: "VP Appointment Cancellation - Ruby Residences",
      text: `Dear ${purchaserName},\n\nYour Vacant Possession (VP) appointment for Unit ${unitNo}${appointmentDate ? ` scheduled on ${appointmentDate}` : ""} has been cancelled by the management.\n\nPlease log in to rebook your appointment at your earliest convenience:\nhttps://ruby.dig-intel.com/login\n\nIf you have any questions, please contact Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`,
    });

    return res.json({ success: true, message: "Booking cancelled, slot released, and email sent." });
  } catch (error) {
    console.error("[CancelBooking] failed", error);
    return res.status(500).json({ success: false, message: String(error) });
  }
});
  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.get("/api/slots", async (req, res) => {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Missing date query parameter." });
    }

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const range = `${slotsTabName}!A2:G`;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsSpreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      const slots = rows
        .map((row, idx) => ({
          Date: row[0] || "",
          StartTime: row[1] || "",
          EndTime: row[2] || "",
          SlotsAvailNo: Number(row[3] ?? 3),
          Slot1BookedBy: row[4] || null,
          Slot2BookedBy: row[5] || null,
          Slot3BookedBy: row[6] || null,
          rowIndex: idx + 2,
        }))
        .filter(slot => slot.Date === date);

      return res.json({ success: true, slots });
    } catch (error) {
      console.error("[Slots] get failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  // Init slots — auto-generate next 14 days if missing
  app.post("/api/init-slots", async (req, res) => {
    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsSpreadsheetId,
        range: `${slotsTabName}!A2:G`,
      });

      const existingRows = response.data.values || [];
      const today = toLocalDateStr(new Date());

      // Separate rows to keep vs delete
      const rowsToKeep: { row: string[]; originalIndex: number }[] = [];
      const rowsToDelete: number[] = [];

      existingRows.forEach((row, idx) => {
        const date = row[0] || "";
        const hasBooking = [row[4], row[5], row[6]].some(
          v => v && v.trim() !== ""
        );
        const isPast = date < today;

        if (isPast && !hasBooking) {
          rowsToDelete.push(idx); // mark for deletion
        } else {
          rowsToKeep.push({ row, originalIndex: idx });
        }
      });

      // If there are rows to delete, rewrite the whole sheet without them
      if (rowsToDelete.length > 0) {
        const keptRows = rowsToKeep.map(r => r.row);

        // Generate new slots for next 14 days
        const existingDates = new Set(keptRows.map(r => r[0]));
        const defaultTimes = [
          { start: "09:00 AM", end: "10:00 AM" },
          { start: "10:30 AM", end: "11:30 AM" },
          { start: "02:00 PM", end: "03:00 PM" },
          { start: "03:30 PM", end: "04:30 PM" },
        ];

        const newRows: string[][] = [];
        for (let i = 1; i <= 14; i++) {
          const future = new Date();
          future.setDate(new Date().getDate() + i);
          const dateStr = toLocalDateStr(future);
          if (!existingDates.has(dateStr)) {
            for (const t of defaultTimes) {
              newRows.push([dateStr, t.start, t.end, "3", "", "", ""]);
            }
          }
        }

        const allRows = [...keptRows, ...newRows];

        // Clear from row 2 down and rewrite
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetsSpreadsheetId,
          range: `${slotsTabName}!A2:G`,
        });

        if (allRows.length > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetsSpreadsheetId,
            range: `${slotsTabName}!A2`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: allRows },
          });
        }

        return res.json({
          success: true,
          message: `Cleaned ${rowsToDelete.length} empty past rows, added ${newRows.length} new slot rows.`,
        });
      }

      // No deletions needed, just add missing future dates
      const existingDates = new Set(existingRows.map(r => r[0]));
      const defaultTimes = [
        { start: "09:00 AM", end: "10:00 AM" },
        { start: "10:30 AM", end: "11:30 AM" },
        { start: "02:00 PM", end: "03:00 PM" },
        { start: "03:30 PM", end: "04:30 PM" },
      ];

      const newRows: string[][] = [];
      for (let i = 1; i <= 14; i++) {
        const future = new Date();
        future.setDate(new Date().getDate() + i);
        const dateStr = toLocalDateStr(future);
        if (!existingDates.has(dateStr)) {
          for (const t of defaultTimes) {
            newRows.push([dateStr, t.start, t.end, "3", "", "", ""]);
          }
        }
      }

      if (newRows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetsSpreadsheetId,
          range: `${slotsTabName}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: newRows },
        });
      }

      return res.json({
        success: true,
        message: `No cleanup needed. Added ${newRows.length} new slot rows.`,
      });
    } catch (error) {
      console.error("[Slots] init failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get("/api/all-slots", async (req, res) => {
    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsSpreadsheetId,
        range: `${slotsTabName}!A2:G`,
      });

      const rows = response.data.values || [];
      const slots = rows.map((row, idx) => ({
        Date: row[0] || "",
        StartTime: row[1] || "",
        EndTime: row[2] || "",
        SlotsAvailNo: Number(row[3] ?? 3),
        Slot1BookedBy: row[4] || null,
        Slot2BookedBy: row[5] || null,
        Slot3BookedBy: row[6] || null,
        rowIndex: idx + 2,
      }));

      return res.json({ success: true, slots });
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post("/api/update-slot", async (req, res) => {
    const { rowIndex, StartTime, EndTime } = req.body || {};
    if (!rowIndex)
      return res
        .status(400)
        .json({ success: false, message: "Missing rowIndex." });

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetsSpreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `${slotsTabName}!B${rowIndex}`, values: [[StartTime]] },
            { range: `${slotsTabName}!C${rowIndex}`, values: [[EndTime]] },
          ],
        },
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  // Book a slot — update VPSlots sheet
  app.post("/api/book-slot", async (req, res) => {
    const {
      slotRowIndex,
      unitNo,
      appointmentDate,
      purchaserEmail,
      purchaserName,
      ownerRowIndex,
    } = req.body || {};

    if (
      !slotRowIndex ||
      !unitNo ||
      !appointmentDate ||
      !purchaserEmail ||
      !purchaserName ||
      !ownerRowIndex
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required booking fields." });
    }

    try {
      const auth = await getSheetsAuth();
      const sheets = google.sheets({ version: "v4", auth });

      // Read current slot
      const slotRange = `${slotsTabName}!A${slotRowIndex}:G${slotRowIndex}`;
      const slotResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsSpreadsheetId,
        range: slotRange,
      });

      const row = slotResponse.data.values?.[0];
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Slot not found." });

      const slot1 = row[4] ?? "";
      const slot2 = row[5] ?? "";
      const slot3 = row[6] ?? "";
      const booked = [slot1, slot2, slot3].filter(s => s.trim() !== "").length;
      const avail = 3 - booked;
      if (avail <= 0)
        return res
          .status(409)
          .json({ success: false, message: "Slot is fully booked." });

      const bookedByCol =
        slot1.trim() === "" ? "E" : slot2.trim() === "" ? "F" : "G";
      const newAvail = avail - 1;

      // Update SlotsAvailNo and BookedBy column
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetsSpreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: `${slotsTabName}!D${slotRowIndex}`,
              values: [[String(newAvail)]],
            },
            {
              range: `${slotsTabName}!${bookedByCol}${slotRowIndex}`,
              values: [[unitNo]],
            },
          ],
        },
      });

      // Update owner's VPAppointmentDate in UnitNoOwnerInfo
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsSpreadsheetId,
        range: `${sheetsTabName}!F${ownerRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[appointmentDate]] },
      });

      // Send confirmation email
      // if (smtpHost && smtpUser && smtpPass) {
      //   await transporter.sendMail({
      //     from: smtpFrom,
      //     to: purchaserEmail,
      //     subject: "Vacant Possession (VP) Appointment Confirmation - Ruby",
      //     text: `Dear ${purchaserName},\n\nYour Vacant Possession (VP) appointment for Unit ${unitNo} has been confirmed.\n\nAppointment Details:\n${appointmentDate}\n\nVenue: Aviscon Management Office, Ruby Clubhouse\n\nPlease arrive 15 minutes prior to your slot. If you need to reschedule, please call Aviscon Property Management at 03-2011 9966.\n\nWarm regards,\nAviscon Property Management`,
      //   });
      // }
      await resend.emails.send({
        from: resendFrom,
        to: purchaserEmail,
        subject: "Vacant Possession (VP) Appointment Confirmation - Ruby",
        text: `Dear ${purchaserName},

Your Vacant Possession (VP) appointment for Unit ${unitNo} has been confirmed.

Appointment Details:
${appointmentDate}

Venue: Aviscon Management Office, Ruby Clubhouse

Please arrive 15 minutes prior to your slot. If you need to reschedule, please call Aviscon Property Management at 03-2011 9966.

Warm regards,
Aviscon Property Management`,
      });
      console.log("[BookSlot] slotRowIndex:", slotRowIndex, "row data:", row);
      return res.json({
        success: true,
        message: "Slot booked, sheet updated, and confirmation email sent.",
      });
    } catch (error) {
      console.error("[BookSlot] failed", error);
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port =
    process.env.NODE_ENV === "production"
      ? process.env.PORT || 3000
      : process.env.PORT || 4000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
