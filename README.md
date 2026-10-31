# FindIt - Campus Lost & Found Web Application

FindIt is a full-featured campus Lost & Found management platform built with **React 18**, **Vite 6**, and **Axios**. It connects students, office staff, and campus administrators into a unified, authenticated workflow for reporting missing belongings, cataloging found items, submitting verification proof, and resolving handoffs.

---

## Table of Contents
- [Architecture & Overview](#architecture--overview)
- [Key Features by Role](#key-features-by-role)
- [Dynamic Listing Model (No Pre-Defined Mock Items)](#dynamic-listing-model-no-pre-defined-mock-items)
- [Claim Approval & Resolution Flow](#claim-approval--resolution-flow)
- [Backend API Specification & Integration](#backend-api-specification--integration)
- [Getting Started](#getting-started)
- [End-to-End Testing Walkthrough](#end-to-end-testing-walkthrough)
- [Project Structure](#project-structure)

---

## Architecture & Overview

- **Frontend**: React 18 SPA with React Router v6.
- **Build Tool**: Vite 6.
- **Icons**: Lucide React.
- **Styling**: Modern, responsive vanilla CSS design system (`src/styles.css`).
- **State Management**:
  - `AuthContext`: Manages sessions, JWT tokens, user profiles, and role gating.
  - `DataContext`: Centralizes items, claims, lost requests, real-time backend synchronization, and persistent browser storage.
- **Live Backend API**: Connects to the CodeForge Campus API deployed on Render (`https://campus-os-backend-8sjf.onrender.com`).

---

## Key Features by Role

### 1. Primary Admin (`admin@team18.com`)
- **Login**: Authenticates via dedicated admin login endpoint (`/api/v1/auth/admin/login`).
- **User Provisioning**: Creates `student` and `office_staff` accounts with automatic OTP generation (`POST /api/v1/admin/users`).
- **OTP Management**: Regenerates OTPs for campus members on demand (`POST /api/v1/admin/users/{email}/regenerate-otp`).
- **Account Management**: Lists and deletes registered accounts.
- **Audit Overview**: Inspects campus-wide lost items, found posts, and claim activity.

### 2. Office Staff (`role: 'office_staff'`)
- **Register Found Items**: Uploads newly found items with title, location, date, category, description, and multi-image attachments (`POST /api/v1/findit/posts` via `multipart/form-data`).
- **Review Claims**: Inspects claims submitted by students with candidate details and proof notes (`GET /api/v1/findit/posts/{post_id}/claims`).
- **Approve Claim & Hand Over**: Resolves posts by approving a verified claim and entering a resolution note (`POST /api/v1/findit/posts/{post_id}/resolution`).
- **Change Resolution Note / Undo Resolution**: Updates notes (`PATCH`) or reopens posts (`DELETE`).
- **Post Lifecycle**: Archives and deletes found posts.

### 3. Students & Campus Members (`role: 'student'`)
- **Browse Items**: Searches and filters active found items by category, campus location, date, and keywords.
- **Single Item Claim**: Submits verification proof describing ownership (minimum 10 characters required) with strict single-claim-per-item enforcement (`POST /api/v1/findit/posts/{post_id}/claims`).
- **Track My Claims**: Views the status of their submitted claims (`Pending`, `Approved`, `Rejected`) and can withdraw pending claims.
- **Report Lost Items**: Reports missing belongings to the campus community (`POST /api/v1/findit/lost-requests`).

---

## Dynamic Listing Model (No Pre-Defined Mock Items)

The application operates on a **strictly dynamic, zero-mock baseline**:
- `INITIAL_ITEMS` and `INITIAL_CLAIMS` are empty arrays (`[]`).
- Storage keys are isolated (`findit_live_items_v17`, `findit_live_claims_v17`, `findit_live_lost_v17`) ensuring previously cached mock items (bottles, headsets, mice) do not display.
- **Items strictly display only when**:
  1. A student reports a lost item via **Report Lost** (`/lost/report`).
  2. Office staff registers a found item via **Register Found** (`/staff/add`).
  3. Live items and claims are fetched from the connected backend API.
- Intuitive empty states guide the user directly to report or register items when no items exist.

---

## Claim Approval & Resolution Flow

The **Approve Claim** feature complies with the backend OpenAPI contract:

```
Office Staff clicks [Approve Claim]
        ↓
In-App Confirmation Modal opens (displays item, claimant, proof message)
        ↓
Staff enters / confirms Verification Note (1–500 chars)
        ↓
POST /api/v1/findit/posts/{post_id}/resolution
Payload: { "claim_id": "CLM-...", "note": "..." }
        ↓
Backend 201 Response:
- Approved claim receives decision: "approved", status: "archived"
- All competing claims for this post receive decision: "rejected", status: "archived"
- Post is resolved and marked status: "archived", resolved: true
        ↓
UI updates immediately and shows success confirmation banner
```

### Key Technical Improvements:
- **No Popup Blocker Dependency**: Replaced fragile `window.prompt` with an in-app confirmation modal.
- **Schema Validation Guard**: Verification notes are sanitized to satisfy the backend `minLength: 1` and `maxLength: 500` requirements.
- **Accurate Status Detection**: Evaluates `decision` (`pending` / `approved` / `rejected`) alongside `status` (`active` / `archived`) so pending claims are always actionable.
- **Clear Error Propagation**: If an unauthorized role attempts resolution or the network fails, exact backend error messages from `messageOf(err)` are displayed.

---

## Backend API Specification & Integration

The frontend automatically attaches Bearer tokens from `localStorage` (`findit_token`) to all authenticated requests.

| Resource | Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|---|
| **Health** | `GET` | `/health` | Public | Backend status check |
| **Auth (User)** | `POST` | `/api/v1/auth/login` | Student / Staff | Login with `{ email_id, otp }` |
| **Auth (Admin)** | `POST` | `/api/v1/auth/admin/login` | Admin | Login with `{ email_id, otp }` |
| **Users** | `GET` | `/api/v1/admin/users` | Admin | List all registered campus users |
| **Users** | `POST` | `/api/v1/admin/users` | Admin | Provision user (returns generated OTP) |
| **Users** | `POST` | `/api/v1/admin/users/{email}/regenerate-otp` | Admin | Issue new OTP for user |
| **Users** | `DELETE`| `/api/v1/admin/users/{email}` | Admin | Delete a user account |
| **Found Posts** | `GET` | `/api/v1/findit/posts` | All authenticated | List posts (`?status=active` or `archived`) |
| **Found Posts** | `POST` | `/api/v1/findit/posts` | Office Staff | Create found post (`multipart/form-data`) |
| **Found Posts** | `GET` | `/api/v1/findit/posts/{post_id}` | All authenticated | Get post details |
| **Found Posts** | `PATCH`| `/api/v1/findit/posts/{post_id}` | Office Staff / Admin | Update post fields |
| **Found Posts** | `DELETE`| `/api/v1/findit/posts/{post_id}` | Office Staff / Admin | Delete found post |
| **Claims** | `POST` | `/api/v1/findit/posts/{post_id}/claims` | Student / Staff | Submit claim (`{ message }`) |
| **Claims** | `GET` | `/api/v1/findit/posts/{post_id}/claims` | Office Staff (all), Claimant (own) | List claims on a post |
| **Claims** | `GET` | `/api/v1/findit/claims/me` | Student / Staff | Get caller's own claims |
| **Claims** | `DELETE`| `/api/v1/findit/claims/{claim_id}` | Claimant | Withdraw pending claim |
| **Resolution** | `POST` | `/api/v1/findit/posts/{post_id}/resolution` | Office Staff | Approve claim & resolve post |
| **Resolution** | `GET` | `/api/v1/findit/posts/{post_id}/resolution` | Staff / Approved Claimant | View post resolution details |
| **Resolution** | `PATCH`| `/api/v1/findit/posts/{post_id}/resolution` | Office Staff | Update resolution note or approved claim |
| **Resolution** | `DELETE`| `/api/v1/findit/posts/{post_id}/resolution` | Office Staff | Undo resolution & reopen post |
| **Lost Items** | `GET` | `/api/v1/findit/lost-requests` | All authenticated | List lost item requests |
| **Lost Items** | `POST` | `/api/v1/findit/lost-requests` | Non-admin (Student/Staff) | Report lost item |
| **Lost Items** | `PATCH`| `/api/v1/findit/lost-requests/{id}` | Reporter | Edit / archive lost report |
| **Lost Items** | `DELETE`| `/api/v1/findit/lost-requests/{id}` | Reporter | Delete lost report |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- `npm` (comes with Node.js)

### Installation
1. Clone or extract the project folder:
   ```bash
   cd calculator
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Verify environment configuration in `.env`:
   ```ini
   VITE_API_BASE_URL=https://campus-os-backend-8sjf.onrender.com
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the printed localhost URL in your browser (default: `http://localhost:5173/`).

### Building for Production
To generate an optimized production bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## End-to-End Testing Walkthrough

Follow these steps to test the entire lifecycle from provisioning to claim hand-over:

### Step 1: Sign in as Primary Admin & Provision Accounts
1. Navigate to `/login`.
2. Check the box **"Sign in as Primary Admin"** (`admin@team18.com`) and enter the admin password/OTP.
3. In the **Admin Dashboard**, click **"+ Register Campus User"**:
   - Create an **Office Staff** account (e.g. `staff@team18.com`, role `office_staff`). Note the generated OTP.
   - Create a **Student** account (e.g. `student@team18.com`, role `student`). Note the generated OTP.
4. Log out.

### Step 2: Register a Found Item as Office Staff
1. Log in with the **Office Staff** email and OTP.
2. Go to **Register Found Item** (`/staff/add`).
3. Fill in the form:
   - **Title**: `MacBook Pro 14" (Space Grey)`
   - **Category**: `Electronics`
   - **Location Found**: `Library 2nd Floor Reading Area`
   - **Date**: Select today's date
   - **Description**: `Found on desk #12 with a black sleeve.`
   - Optional: Attach a photo.
4. Click **Register Found Item**. The item is posted to the backend API and appears immediately on the Dashboard and Browse pages.
5. Log out.

### Step 3: Report a Lost Item & Submit a Claim as Student
1. Log in with the **Student** email and OTP.
2. Go to **Report Lost** (`/lost/report`) to post a missing item report.
3. Go to **Browse Items** (`/browse`), locate the `MacBook Pro 14"`.
4. Click **View Details** (`/items/{id}`).
5. In the **Claim This Item** box, enter verification proof (min. 10 chars):
   - `"It has a small sticker on the top left corner and device name is Student-Mac."`
6. Click **Submit Claim**. The claim is recorded with `decision: pending`.
7. Go to **My Claims** (`/claims`) to verify that the claim appears in the tracking table.
8. Log out.

### Step 4: Approve the Claim as Office Staff
1. Log back in with the **Office Staff** account.
2. Navigate to **Claims** (`/claims`).
3. Under the **Pending** tab, locate the student's claim.
4. Click the green **Approve Claim** button.
5. The confirmation modal will open with the item title, claimant name, and proof.
6. Verify the resolution note (e.g. `"Proof verified in-person at campus office desk. Matched sticker description."`).
7. Click **Confirm & Approve**.
8. The backend resolves the post (`POST /posts/{id}/resolution`), updates the post status to `claimed` / `archived`, marks the claim as `Approved`, and displays the green success alert.

---

## Project Structure

```
calculator/
├── dist/                      # Production build output
├── public/                    # Static public assets
├── src/
│   ├── components/
│   │   ├── ItemCard.jsx       # Reusable card for found & lost items
│   │   └── Layout.jsx         # App navigation bar, role badges & layout wrapper
│   ├── context/
│   │   ├── AuthContext.jsx    # Authentication, JWT handling & user management
│   │   └── DataContext.jsx    # Central state, backend sync & optimistic operations
│   ├── data/
│   │   └── mockData.js        # Campus categories & location dropdown lists
│   ├── pages/
│   │   ├── AdminDashboard.jsx # Admin management, user table, OTP tools & metrics
│   │   ├── Browse.jsx         # Search, filter & view all active found items
│   │   ├── Claims.jsx         # Claims tracking & office staff approval dialog modal
│   │   ├── Dashboard.jsx      # Main campus Lost & Found home feed
│   │   ├── ItemDetails.jsx    # Single item view, claim submission & resolution details
│   │   ├── Login.jsx          # Member & administrator OTP sign in
│   │   ├── LostRequestsPage.jsx# Lost item requests directory
│   │   ├── ReportLost.jsx     # Form for students to report lost belongings
│   │   └── StaffAdd.jsx       # Form for office staff to register found items
│   ├── services/
│   │   └── api.js             # Axios client, auth interceptor & API endpoints
│   ├── styles/
│   │   └── index.css          # Design system variables & base styling
│   ├── App.jsx                # Route definitions & role-based route guards
│   ├── main.jsx               # Application bootstrap
│   └── styles.css             # Main styling rules, responsive layout & modal dialogs
├── .env                       # Environment configuration (VITE_API_BASE_URL)
├── index.html                 # HTML entry point
├── package.json               # Project dependencies and npm scripts
└── README.md                  # Comprehensive project documentation
```

---

## License, 

Created for campus lost and found tracking. All rights reserved.
