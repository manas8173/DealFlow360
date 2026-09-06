# DealFlow360 — B2B Sales Operations & Deal Governance Platform

DealFlow360 is an enterprise-grade, self-governing B2B Sales Operations platform. It protects company margins, calculates live blended discount risk, automatically routes multi-level approval workflows, provides real-time upsell recommendations, allocates inventory across split warehouses, manages hybrid one-time/subscription billing, isolates customer negotiations, and triggers automatic re-approvals when terms exceed policy limits.

---

## 🌟 Key Features & Core Engines

1. **Discount Governance Engine**:
   - `effective_discount_limit = MIN(customer_tier_limit, category_limit)`
   - Overage points: `MAX(0, given_discount - effective_discount_limit)`
   - Visually demarcates lines as `OK` vs `OVER (+Xpt)`.

2. **Blended Risk Scoring Engine**:
   - Weighted overage math: $\text{weighted\_overage} = \frac{\sum (\text{overage\_points} \times \text{gross})}{\sum \text{gross}}$
   - Penalty formula: $\text{risk\_score} = \text{weighted\_overage} + (\text{worst\_overage} \times 0.5)$
   - Bands: `LOW` (0), `MEDIUM` ($0 < \text{score} \le 5$), `HIGH` ($\text{score} > 5$).

3. **Automated Multi-Level Approval Routing**:
   - `LOW` Risk: Automatic direct approval (no approval steps required).
   - `MEDIUM` Risk: Sales Manager approval required.
   - `HIGH` Risk: Sales Manager $\rightarrow$ Finance Operations approval chain.

4. **Live Upsell / Cross-Sell Recommendation Engine**:
   - Dynamically evaluates product pairings, margin quality bonus, and promos.
   - One-click "Add to Quote" updating subtotal, tax, net total, margin ₹, and margin % in real-time.

5. **Multi-Warehouse Fulfillment & Split Algorithm**:
   - Evaluates availability across warehouses (`Main Warehouse`, `East Depot`).
   - Prefers single warehouse if available $\ge$ requested; otherwise computes optimal split to minimize shipments & costs.
   - Generates automatic `Backorder` records when stock is insufficient. Supports audited Finance/Admin manual overrides.

6. **Hybrid One-Time & Subscription Billing**:
   - Keeps one-time items (immediate invoices) and recurring items (subscription billing schedules) logically distinct.
   - Mid-cycle subscription proration calculator for quantity modifications.

7. **Isolated Customer Negotiation Portal**:
   - Strict server-side customer isolation (`customerId === authenticatedCustomer.id`).
   - Hides internal risk breakdowns, margins, and internal audit logs.
   - Supports line-by-line comment threads, counter-discount proposals, and quote confirmation locking.

8. **Automatic Re-Approval Trigger**:
   - When internal reps accept customer counter-proposals, the engine recalculates totals, margin, ceilings, and risk.
   - If recalculated risk exceeds policy, the quote automatically resets to `PENDING_APPROVAL` with incremented revision version (`Rev v2`), creating a NEW approval request while preserving historical decisions!

9. **Deal Health Anomaly Detection**:
   - Background/on-demand scanners detecting **Stalled Deals** ($>7$ days idle), **Discount Anomalies** ($>1.5\times$ rep average), and **Delivery Slippage**.
   - Built-in rep nudges & VP escalation.

10. **Append-Only Audit Trail**:
    - Audit log for all state transitions, approval decisions, discount changes, manual warehouse overrides, and customer confirmations.

---

## 👥 User Credentials

All accounts use the standard password: `Password123!`

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Sales Rep** | `rep@dealflow360.demo` | Create quotes, apply discounts, view upsells, submit for approval |
| **Sales Manager** | `manager@dealflow360.demo` | Review discount overage risk math, approve/return step 1 |
| **Finance Operations** | `finance@dealflow360.demo` | 2nd-level approval, warehouse split, billing, record payment |
| **Customer (Acme Corp)** | `customer@acme.demo` | Isolated Customer Portal, submit counter discount, confirm quote |
| **Admin** | `admin@dealflow360.demo` | Product catalog, tier ceilings, warehouses, DB seed reset |

> 💡 Use the **Active Role Swapper** dropdown in the top-left sidebar to instantly switch user roles without logging out.

---

## 🚀 Quickstart & Setup Commands

### Prerequisites
- Node.js v18+
- npm v9+
- PostgreSQL v14+ (or Docker)

### Installation & Run

1. **Configure Environment Variables**:
   Copy `.env.example` to `.env` (already configured by default):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dealflow360?schema=public"
   ```

2. **Start PostgreSQL (Optional if using Docker)**:
   ```bash
   docker compose up -d
   ```

3. **Install Root & Sub-package Dependencies**:
   ```bash
   npm install
   npm --prefix client install
   ```

4. **Push Database Schema & Seed Data**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Run Dev Servers (Backend API & React Client)**:
   ```bash
   npm run dev
   ```
   - Client App: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

6. **Run Unit & E2E Integration Test Suite**:
   ```bash
   npm test
   ```

7. **Reset Database to Seed State**:
   ```bash
   npm run db:reset
   ```

---

## 🎯 End-to-End Workflow

A complete walkthrough of the platform's core workflow:

1. **Login as Sales Rep** (`rep@dealflow360.demo`).
2. Navigate to **Quotations** $\rightarrow$ Open **Q-1042** (Acme Corp, Gold Tier).
3. Observe Line Items:
   - **Laptop Pro 14** (Qty 2, 12% disc $\le$ 15% Gold/Hardware ceiling $\rightarrow$ `OK`).
   - **Onsite Setup Service** (Qty 1, 18% disc $> 10\%$ Services ceiling $\rightarrow$ `OVER (+8pt)`).
4. Observe **Risk Badge**: Calculated Score = `5.19` (`HIGH RISK`). Click the badge to view exact math.
5. Click **Submit for Approval** $\rightarrow$ Status changes to `PENDING_APPROVAL`.
6. Switch role to **Sales Manager** (`manager@dealflow360.demo`).
7. Open **Approvals** $\rightarrow$ Review Q-1042 risk explanation $\rightarrow$ Click **Approve**.
8. Switch role to **Finance Operations** (`finance@dealflow360.demo`).
9. Open **Approvals** $\rightarrow$ Click **Approve** $\rightarrow$ Quote status transitions to `APPROVED`.
10. Open **Quotation Builder** $\rightarrow$ Click **Add to Quote** on **Wireless Mouse** upsell $\rightarrow$ Live totals and margins update immediately!
11. Navigate to **Fulfillment** $\rightarrow$ Select Q-1042 $\rightarrow$ Accept suggested multi-warehouse split (Main Warehouse 22 + East Depot).
12. Navigate to **Invoices** $\rightarrow$ Observe One-Time Invoice & Recurring Care Plan schedule.
13. Switch role to **Customer** (`customer@acme.demo`).
14. Open **Customer Portal** $\rightarrow$ Click **Counter Discount** on Setup Service (e.g. 22%) $\rightarrow$ Submit proposal.
15. Switch role to **Sales Rep** $\rightarrow$ Click **Accept & Trigger Re-Approval**.
16. Observe **Automatic Re-Approval**: Risk score recalculates, quote status automatically resets to `PENDING_APPROVAL` with `Rev v2`, preserving previous approval history!
17. Re-approve Manager & Finance steps $\rightarrow$ Customer confirms quote $\rightarrow$ Record payment $\rightarrow$ Invoice status transitions to `PAID`.
18. Open **Deal Health** $\rightarrow$ Review Stalled Deals (Zenith Co) & Discount Anomalies (Delta LLC).

---

## 💻 Tech Stack Architecture

- **Backend**: Node.js, Express, TypeScript, REST API, JWT Authentication, Zod validation.
- **ORM & Database**: Prisma ORM with PostgreSQL database.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6.
- **Testing**: Vitest + Supertest integration runner.
