# Smart Electricity Consumption Analysis & Solar Feasibility System — VJTI, Mumbai

**Capstone 2025-26** | Team: Aashay Kamble, Nathan Dsouza, Mohammad Hedayati, Omkar Karande, Shreyas Kulkarni | Guide: Prof. Saksham Kataria

This plan covers building a full-stack web app from the existing [data.json](file:///H:/Engineering%202024/SY/CEP/data.json) seed data. The system provides energy consumption analytics, solar feasibility simulation, role-based access, and a git-style approval workflow.

**✅ Decisions confirmed:** No Google Calendar (holiday PDF engine instead) · SendGrid for emails · Local MongoDB

---

## User Review Required

> [!NOTE]
> **Schedule Engine**: Google Calendar discarded. Instead, usage hours are computed from a seeded **Holiday List** (uploaded PDF parsed to JSON). Saturday & Sunday are always marked non-working. Lecture days get a **+1h buffer**; days with no lectures but not a holiday get a **+30 min phantom-load buffer**.

> [!NOTE]
> **Email Notifications**: Using **SendGrid** for the 72h and 7-day escalation alerts. Add `SENDGRID_API_KEY` to `server/.env`.

> [!NOTE]
> **MongoDB**: Local instance — `mongodb://localhost:27017/vjti_energy`. No Atlas needed.

---

## Proposed Changes

### Project Root Structure

```
H:\Engineering 2024\SY\CEP\
├── client/          ← React (Vite) frontend
├── server/          ← Node.js (Express) backend
├── data.json        ← existing seed data
└── README.md
```

---

### Backend — `server/`

#### [NEW] `server/package.json` + `server/index.js`
- Express server, `cors`, `dotenv`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `pdfkit`, `googleapis`
- Port: **5000**

#### [NEW] `server/models/`

| Model | Key Fields |
|---|---|
| `User` | name, email, password (hashed), role (`admin`/`hod`/`student`), department |
| `Department` | name, hodId, tariffPerUnit |
| `Room` | name, departmentId, floor |
| `ApplianceLibrary` | name, powerW, category — **Central library; updates propagate to RoomAppliances** |
| `RoomAppliance` | roomId, applianceLibraryId, quantity, usageHours, overridePowerW |
| `Proposal` | roomId, proposedBy, diff `{prev, next}`, status, comments[], submittedAt, reviewedAt |
| `BillingSnapshot` | roomId, month, year, snapshotData (frozen JSON), totalKWh, totalCost |
| `FaultLog` | roomId, applianceId, reportedBy, description, resolvedAt |
| `Notification` | userId, message, type, read, createdAt |
| `AuditLog` | action, performedBy, targetType, targetId, oldValue, newValue, timestamp |

#### [NEW] `server/routes/`
- `auth.js` — login, logout, refresh token
- `users.js` — CRUD (Admin only)
- `departments.js` — manage tariffs (Admin)
- `rooms.js` — CRUD (HOD scope), consumption summary
- `appliances.js` — library CRUD with propagation, room-level overrides
- `proposals.js` — create diff, approve/reject/comment/resubmit, history
- `solar.js` — SPS calculation, payback timeline
- `reports.js` — PDF generation, CSV export
- `faults.js` — fault log CRUD, correlation endpoint
- `notifications.js` — list, mark-read
- `holidays.js` — upload holiday PDF, list all holidays, toggle individual dates
- `timetable.js` — manage per-room weekly timetable (HOD sets lecture slots)

#### [NEW] `server/services/`
- `consumptionEngine.js` — Uses seeded **HolidayList** + room timetable (manually entered per room per semester). Saturdays/Sundays always off. Calculates daily kWh: lecture days get +1h buffer, non-lecture working days get +30 min phantom-load buffer.
- `holidayParser.js` — Accepts uploaded holiday-list PDF, converts to structured `{ date, type }` JSON, stored in `HolidayList` collection.
- `solarService.js` — Computes SPS = `((dailyKWh × tariff) + (faultFreq × penalty)) / panelCost`. Payback/profit timeline.
- `proposalService.js` — Creates JSON diffs (deep-diff) for HOD changes; stores in `Proposals`.
- `escalationJob.js` — `node-cron` job: 72h → SendGrid email to Admin; 7 days → mark "Urgent Action Required" + email.
- `snapshotService.js` — Monthly cron that freezes `BillingSnapshot` for each room.
- `propagationService.js` — When `ApplianceLibrary` item is updated, propagates wattage to all linked `RoomAppliance` records (unless overridden).

---

### Frontend — `client/`

Bootstrapped with **Vite + React**. Styling: **Vanilla CSS** with CSS custom properties for the premium dark-mode design (inspired by the OneText reference UI: deep navy/dark bg, vivid accent colors, glassmorphism cards, smooth animations).

#### [NEW] `client/src/styles/index.css`
- CSS variables: colors, spacing, radius, shadows
- Google Font: **Inter**
- Glassmorphism card utility classes
- Animation keyframes: fade-in, slide-up, pulse-glow

#### [NEW] `client/src/pages/`

| Page | Role | Key Features |
|---|---|---|
| `LoginPage` | All | Animated hero, role-based redirect after JWT login |
| `AdminDashboard` | Admin | Global kWh map, tariff editor, proposal queue, audit trail |
| `HODDashboard` | HOD | Dept rooms list, appliance editor, solar simulator, submit proposals |
| `StudentDashboard` | Student | Read-only charts, CSV + PDF export buttons |
| `RoomDetail` | HOD/Admin | Appliance table, consumption chart, fault log, history |
| `SolarSim` | HOD | Input panel cost → SPS output, payback chart (Recharts LineChart) |
| `ProposalDiff` | HOD/Admin | Side-by-side old vs. new, comment thread, approve/reject actions |
| `AuditTrail` | Admin | Immutable log table with filters |
| `NotificationCenter` | All | In-app alerts, read/unread, escalation badges |

#### [NEW] `client/src/components/`
- `Sidebar` — Collapsible nav with role-filtered links, notification badge
- `ConsumptionChart` — Recharts BarChart/LineChart for monthly/daily kWh
- `RoomCard` — Glassmorphism card with SPS badge color-coding
- `ApplianceTable` — Editable table (HOD) / read-only (Student)
- `ProposalBadge` — Status chip: Pending / Approved / Rejected / Urgent
- `PDFExportButton` — Calls `/api/reports/pdf`, triggers download
- `CSVExportButton` — Calls `/api/reports/csv`, triggers download
- `SolarPaybackChart` — Recharts LineChart: investment vs. savings over 20 years
- `DiffViewer` — Git-style side-by-side diff of appliance JSON

#### [NEW] `client/src/context/`
- `AuthContext` — JWT storage, role, user info
- `NotificationContext` — Polling/WebSocket for real-time alerts

---

### Data Seeding

#### [NEW] `server/scripts/seed.js`
Reads [data.json](file:///H:/Engineering%202024/SY/CEP/data.json) and seeds:
1. Default Admin/HOD/Student demo users
2. Departments (Computer Engineering from data)
3. Rooms: AL001, Staff Room, Lab 2, AL207, AL201, AL202
4. ApplianceLibrary entries for each unique appliance
5. RoomAppliance links with qty/usageHours from data.json

---

## Verification Plan

### Automated Tests
None exist yet. We will add a Postman collection (`server/tests/api.postman_collection.json`) covering:
- Auth: login success/fail for each role
- Consumption: `GET /api/rooms/:id/consumption` returns correct kWh
- Proposal: full create → approve workflow

### Browser Testing (via Browser Subagent)
After running both dev servers:
```bash
# Terminal 1 — backend
cd H:\Engineering 2024\SY\CEP\server && npm run dev

# Terminal 2 — frontend
cd H:\Engineering 2024\SY\CEP\client && npm run dev
```
1. Login as Admin → verify global dashboard loads, tariff editor works
2. Login as HOD → create a room appliance change → submit proposal → verify diff stored
3. Login as Admin → approve proposal → verify audit log entry created
4. Login as Student → confirm no edit controls visible; PDF + CSV download works
5. Verify SPS score displayed on solar simulation page

### Manual Checks
- Billing snapshot frozen correctly (seed a past month, confirm edits don't change historical data)
- ApplianceLibrary update propagates to all rooms using that appliance

---

## Recent Updates

- Student navbar now hides `Pending Approvals` and `Audit Trail`.
- Complaint status workflow moved to the **HOD Dashboard** (`Open`, `In Progress`, `Resolved`) with updates persisted via `/api/faults/:id`.
- HOD now has a **Global Library** modal to view all registered devices with power rating and add new devices.
- Global Library supports **Edit** and **Delete** actions for devices.
- In both **Add New Room** and **Manage Room**, device mapping uses a dropdown selection plus `Qty` and `Usage Hours`.
- `Manage Room` assigned devices area is scrollable while keeping the same block dimensions.
