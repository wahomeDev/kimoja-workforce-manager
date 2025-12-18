# KIMOJA — Compound Work Tracker

A lightweight, client-side web application that models a fenced compound (KIMOJA) containing independent groups (teams). Each group manages its own workers, truck events, attendance, and payments. Data is persisted in browser `localStorage` so each group keeps a separate dataset.

## Purpose
KIMOJA captures real-world daily labor events (trucks) and fairly distributes payments among workers who actually handled each truck. The app mirrors the real process:
- Trucks are events with plate, tonnage and total pay
- Attendance records who worked on a given truck
- Money is distributed equally among attendees for that truck
- Totals are calculated from records (not manually entered)

## Key Features
- Per-group pages (ELITE, NGORONYO, SHERIF, SCORPION, ACHIEVERS, MWEA)
- Add / list workers
- Add trucks (date auto-set to today)
- Mark attendance per truck (who worked this truck)
- Calculate unpaid totals and record payments (payment history)
- Per-worker daily earnings graph and JSON export
- All data stored separately per group in `localStorage` (e.g. `kimoja_ELITE_data`)

## File Structure (project root)
- `homepage.html` — Welcome and group links
- `elite.html`, `ngoronyo.html`, `sherif.html`, `scorpion.html`, `achievers.html`, `mwea.html` — Group pages that share the same `logic.js`
- `logic.js` — Core app logic (data model, DOM rendering, graphing, persistence)
- `style.css` — App styles
- `README.md` — (this file)

## Data Model (in `localStorage`)
Each group's key: `kimoja_<GROUP>_data`
Structure:
```
{
  workers: ["John", "Ali", ...],
  trucks: [
    { id, date: "YYYY-MM-DD", plate, tonnage, totalPay, attendance: ["John"] },
    ...
  ],
  payments: [ { date, worker, amount }, ... ]
}
```

## Important Functions (in `logic.js`)
- `loadData()` / `saveData()` — load and persist the group's dataset
- `addWorker()` — push a name to `workers[]`
- `addTruck(event)` — create a truck object with `attendance: []`, save and append to the DOM
- `toggleAttendance(truckId, worker)` — add/remove a worker for a truck and update payments
- `calculateUnpaid()` — computes running unpaid totals per worker
- `payWorkers()` — records payments for positive unpaid balances
- `getDailyEarnings()` — derives per-day earnings per worker from trucks
- `prepareGraphData(workerName)` — returns `{ labels, values }` for a single worker (fills missing days with 0)
- `exportData()` — download daily earnings as JSON

## How to Run Locally
A simple static server is sufficient. From the project root run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/homepage.html` in your browser and choose a group page.

## Using the App (quick guide)
1. Open a group page (e.g., `elite.html`).
2. Add workers in "Workers".
3. Add a truck with plate, tonnage and total pay (date is set automatically).
4. For that truck, check attendance for the workers who actually worked the truck.
5. Visit the "Payments" section to see unpaid totals and record payments.
6. Use the graphs section to select a worker and view daily earnings (zeros included for missing days).
7. Click "Export Daily Earnings Data" to download JSON for further analysis.

## Notes & Known Issues
- Data is stored in the browser `localStorage` — clearing browser data will remove stored records.
- The app is single-user per browser profile. For multi-device or multi-user sync, integrate a backend service.
- Graphs and DOM rely on up-to-date `data` in memory; if you edit `localStorage` externally, reload the page.

## Next Steps (suggested)
- Add CSV export and monthly/pay-cycle summaries.
- Improve truck/date editing (allow back-dating trucks and editing truck details).
- Add per-group authentication or export/import features for backups.
- Add unit tests for core JS functions (e.g., `calculateUnpaid`, `prepareGraphData`).

## Contribution & Contact
If you'd like help expanding features (server sync, backups, or UX polish), tell me which area to work on next and I can implement a focused plan.

---
Generated: December 2025 — KIMOJA app (work-in-progress)
