# Vision

A low-friction, modern CMMS that beats Hippo CMMS on speed, flexibility, and offline-first reliability. Core pillars:

* **Zero-friction work orders**: create/assign/close in seconds, optimized for mobile and desktop.
* **Robust equipment model**: hierarchical assets, meters, PM templates (calendar & meter-based), parts, vendors.
* **Offline-first**: PWA with background sync; technicians can work in mechanical rooms without signal.
* **Flexible workflows**: custom fields, statuses, and approval rules per site/department.
* **Reporting that matters**: MTTR/MTBF, backlog age, compliance %, inventory turns, labor utilization.
* **Easy migration**: CSV importers that mirror Hippo exports; idempotent re-runs; audit trails.

# Personas & Roles

* **Tech**: creates/executes WOs, logs parts/labor, attaches photos, scans QR codes.
* **Supervisor**: triage/assign WOs, approve quotes/POs, manage PMs, dashboards.
* **Stores/Buyer**: manage inventory, receive parts, create POs, vendor records.
* **Admin**: sites/departments/users/roles, custom fields, SLA rules, integrations.

# Feature Overview

## MVP (Phase 1)

* Work Orders (WO): create, assign, status flow (New → In Progress → Waiting Parts → Complete → Closed), priorities & SLAs.
* Assets/Equipment: hierarchy (Site > Building > Floor > Room > Asset), QR codes, custom fields, meters.
* Preventive Maintenance: calendar-based; meter-based (hours, cycles, readings) with tolerances.
* Parts & Inventory: items, bins, min/max, adjustments, reservations, issues to WO.
* Vendors: contacts, contracts, service areas.
* Comments & Activity Log per record; photo/file attachments.
* Search & filters; saved views.
* Mobile-friendly PWA; background sync; installable.
* Auth: SSO (OIDC) or email/password; roles/permissions; audit log.
* Notifications: in-app + email; digest summaries.
* Importers: CSV for assets, parts, WOs, PMs.
* Work Request Portal (guest/temporary access, templates, media uploads, tracking links)

## Phase 2

* Purchasing & POs: requisitions → approvals → POs → receipts → 3-way match.
* Labor & Timecards: shifts, approval, export to payroll.
* Advanced PM: seasonal calendars, routes, nested tasks, tool calibration.
* GIS / Maps for outdoor assets; BLE tags.
* API Keys & Webhooks; MS Teams/Slack notifications; SMS (Twilio or equivalent).
* Document control: SOP revisions, controlled distribution.

# Architecture

* **Frontend**: Next.js (App Router), React, TypeScript, Tailwind + shadcn/ui; PWA enabled; IndexedDB for offline cache; Workbox for service worker.
* **Backend**: Node (NestJS or Next.js API routes) with TypeScript; Prisma ORM.
* **DB**: PostgreSQL 15+, row-level security optional per tenant/site.
* **Storage**: S3-compatible object storage for attachments.
* **Search**: Postgres full-text (MVP), optional OpenSearch later.
* **Auth**: NextAuth (OIDC/SAML optional via provider); JWT/Session.
* **Infra**: Docker Compose (dev) & Kubernetes (prod). Background jobs via BullMQ/Redis.

# Data Model (Core Tables)

Below are representative columns (add common metadata: `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `tenant_id`).

## sites

* `name`, `code`

## locations

* `site_id` FK; `path` (e.g., `BldgA/F1/Rm105`); `type` (building|floor|room|area); `parent_id` nullable

## assets

* `site_id`, `location_id`, `parent_id` (for systems/sub-assemblies), `tag` (internal), `name`, `model`, `serial`, `manufacturer`, `commissioned_at`, `status` (active|retired), `criticality` (1–5), `qr_code`

## asset\_meters

* `asset_id`, `type` (hours|cycles|counter|reading), `uom`, `reading_value`, `reading_at`, `source` (manual|import|api)

## work\_orders

* `site_id`, `number` (WO-YYYY-####), `title`, `description_md`, `asset_id`, `location_id`, `priority` (P0–P4), `status` (enum), `requested_by`, `assigned_to`, `requested_at`, `due_at`, `completed_at`, `sla_id` nullable, `pm_instance_id` nullable, `cost_labor`, `cost_parts`, `downtime_minutes`

## wo\_tasks

* `work_order_id`, `seq`, `text`, `is_check`, `completed_by`, `completed_at`, `result` (pass|fail|n/a), `notes`

## wo\_comments

* `work_order_id`, `author_id`, `body_md`, `visibility` (internal|requester)

## wo\_parts

* `work_order_id`, `part_id`, `qty`, `unit_cost`, `issued_from_bin_id`

## parts

* `sku`, `name`, `uom`, `description`, `manufacturer`, `mfr_part_number`, `min_qty`, `max_qty`, `reorder_point`, `avg_cost`, `active`

## part\_bins

* `part_id`, `site_id`, `bin_code`, `on_hand_qty`

## vendors

* `name`, `account_no`, `phone`, `email`, `address`, `notes`

## pm\_templates

* `site_id`, `name`, `asset_filter` (JSON logic or tag-based), `frequency_type` (calendar|meter), `interval_days` nullable, `meter_type` nullable, `interval_amount` nullable, `tolerance_before` days, `tolerance_after` days, `tasks_md`, `estimated_minutes`, `requires_shutdown` bool

## pm\_schedules

* `pm_template_id`, `asset_id`, `next_due_at`, `last_done_at`, `meter_baseline`

## attachments

* `entity_type` (wo|asset|part|vendor|pm), `entity_id`, `file_key`, `file_name`, `content_type`, `size_bytes`

## users

* `email`, `name`, `role` (admin|supervisor|tech|stores|requester), `site_ids` (JSON for multi-site access)

## sla\_policies

* `site_id`, `name`, `priority`, `response_minutes`, `resolution_minutes`, `business_calendar_id`

## audit\_log

* `entity_type`, `entity_id`, `event`, `metadata_json`

# Example SQL (PostgreSQL)

```sql
CREATE TABLE sites (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assets (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  site_id BIGINT NOT NULL REFERENCES sites(id),
  location_id BIGINT,
  parent_id BIGINT REFERENCES assets(id),
  tag TEXT UNIQUE,
  name TEXT NOT NULL,
  model TEXT,
  serial TEXT,
  manufacturer TEXT,
  commissioned_at DATE,
  status TEXT CHECK (status IN ('active','retired')) DEFAULT 'active',
  criticality INT CHECK (criticality BETWEEN 1 AND 5),
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE work_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  site_id BIGINT NOT NULL REFERENCES sites(id),
  number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description_md TEXT,
  asset_id BIGINT REFERENCES assets(id),
  location_id BIGINT,
  priority TEXT CHECK (priority IN ('P0','P1','P2','P3','P4')) DEFAULT 'P3',
  status TEXT CHECK (status IN ('new','in_progress','waiting_parts','complete','closed','cancelled')) DEFAULT 'new',
  requested_by BIGINT,
  assigned_to BIGINT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_id BIGINT,
  pm_instance_id BIGINT,
  cost_labor NUMERIC(12,2) DEFAULT 0,
  cost_parts NUMERIC(12,2) DEFAULT 0,
  downtime_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

# API Design (REST, JSON)

Base: `/api/v1`

## Auth

* `POST /auth/login` → `{token}`
* `POST /auth/refresh`

## Work Orders

* `GET /work-orders?status=new,in_progress&site_id=...&q=...`
* `POST /work-orders` → create WO
* `GET /work-orders/{id}` → detail with tasks, parts, comments
* `PATCH /work-orders/{id}` → partial update (status, assignments, due, etc.)
* `POST /work-orders/{id}/tasks` / `{id}/comments` / `{id}/parts`
* `POST /work-orders/{id}/close` → closure summary (labor, parts, downtime)

## Assets

* `GET /assets?q=air handler&location_id=...`
* `POST /assets`
* `GET /assets/{id}`
* `POST /assets/{id}/meter-readings`
* `POST /assets/{id}/attachments`

## PMs

* `GET /pm/upcoming?site_id=...&from=2025-08-01&to=2025-09-30`
* `POST /pm/templates`
* `POST /pm/schedules` (link template→asset)
* `POST /pm/schedules/{id}/generate` (create WOs)

## Parts & Inventory

* `GET /parts?q=filter`
* `PATCH /parts/{id}`
* `POST /parts/{id}/adjustments`
* `POST /work-orders/{id}/issue-part` (decrement bin)

## Files

* `POST /files/signed-url` (S3 pre-signed upload)

## Reports

* `GET /reports/mttr?site_id=...&range=last_90d`
* `GET /reports/backlog-age`
* `GET /reports/pm-compliance`

# Frontend Pages (MVP)

* **Login**
* **Dashboard**: KPI cards (Open WOs, Overdue, PM Due this week), quick-create WO.
* **Work Orders**: table with status, priority, asset/location, assignee; bulk actions; saved filters.
* **WO Detail**: tasks, comments, parts, attachments, activity; timeline; change status.
* **Create WO**: single screen, scan QR → pre-fill asset & location.
* **Assets**: list & hierarchy; asset detail with meters, history; print/download QR.
* **PM Calendar**: drag/drop reschedule; generate WOs.
* **Parts**: list, bins, stock levels; issue to WO; receive.
* **Vendors**: list & contact view.
* **Admin**: users/roles, custom fields, SLA rules, importers.

# Offline-First Strategy

* PWA + service worker caches shell & API.
* IndexedDB cache for WO/Asset/Parts; conflict resolution via server timestamps & item `version` (increment on update).
* Background sync via service worker queues; optimistic UI.
* Read-only mode if auth expired offline; queue actions until refresh.

# Roles & Permissions (Examples)

* **tech**: read assets/parts, create WOs, edit own assigned WOs, add comments/tasks results, issue parts.
* **supervisor**: assign WOs, edit any WO, approve closures, manage PMs, adjust SLAs.
* **stores**: manage parts/bins, receive & issue, run inventory.
* **admin**: everything + user/site management + custom fields.

# Custom Fields & Statuses

* `custom_fields` table defines schema per entity with JSON Schema fragments.
* UI renders forms dynamically; filters & exports include custom fields.
* Status sets are configurable per site/department with allowed transitions & guards.

# Notifications

* Rules engine (BullMQ job): on new WO with priority P1/P0 → immediate email to on-call group; daily digest 7am local with overdue list.

# Reporting (Sample KPIs & SQL)

* **MTTR**: avg(`completed_at` - `in_progress_at`).
* **MTBF**: per asset: avg time between `closed` of failure-type WOs.
* **PM compliance**: (# PM WOs closed on/before due) / (total due) in period.
* **Backlog age**: distribution of `now() - requested_at` for open WOs.

Example MTTR query:

```sql
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - in_progress_at)))/3600 AS mttr_hours
FROM (
  SELECT wo.id,
         MIN(CASE WHEN a.event='status_change' AND a.metadata_json->>'to' = 'in_progress' THEN a.created_at END) AS in_progress_at,
         wo.completed_at
  FROM work_orders wo
  JOIN audit_log a ON a.entity_type='work_order' AND a.entity_id=wo.id
  WHERE wo.site_id=$1 AND wo.completed_at IS NOT NULL
  GROUP BY wo.id
) x;
```

# Service Request Portal (No-Account, Template-Driven)

A zero-friction channel for any staff (even without an account) to submit service requests with photos, audio, and video. Includes asset-prefill via QR, guided templates, and temporary access codes for phone-assisted submissions.

## Goals

* **No login required** to *start* a request.
* **Template-driven wizard** with branching questions by category (e.g., HVAC → Air Handler → No Cooling).
* **Fast capture**: photos, short videos, and audio notes (with optional transcription).
* **Pre-fill context** via asset/location QR scan or URL params.
* **Temporary Access Codes (TAC)** for supervisors to grant short-lived, scoped access to requesters calling by phone.
* **Trackable link** so requesters can follow progress and add updates without a full account.

## User Flows

### 1) Self-Serve (Guest)

1. User visits `/request` (public PWA route) or scans an asset QR → opens `/request?asset_id=123`.
2. Select **Site** (or inferred), **Category** (e.g., Plumbing, Electrical), then a **Template**.
3. Wizard renders fields from template schema (see *Templates*).
4. Attach media (photos/video/audio), annotate images (draw arrows/text), optional audio → text transcription.
5. Provide contact (name, email/phone).
6. Submit → returns **Request ID** and **secure tracking link**. Email/SMS confirmation optional.

### 2) Phone Assist (Temporary Access Code)

1. Staff calls maintenance; supervisor opens **Generate TAC** in console.
2. Choose **site** (and optional asset/location → pre-fill).
3. System creates one-time **6–8 digit code** valid **10 minutes**, single use, scope **`requester-guest`**.
4. Caller visits `/request/code` and enters the code → lands in the same wizard with context pre-filled.
5. They complete details, attach media, submit. Code is consumed and invalidated.

### 3) Triage → Work Order

* New submissions land in **Request Inbox** with priority hints (template rules), SLA mapping, and duplicate detection (same asset + symptom within window).
* Supervisor clicks **Convert to WO** → creates WO with all fields/media linked; original request becomes a child record.

## Templates

* Stored as JSON schema + UI schema with optional rules.
* Example template object:

```json
{
  "id": 42,
  "name": "Air Handler – No Cooling",
  "category": "HVAC",
  "fields": [
    {"key":"symptom","type":"select","label":"Symptom","options":["No cooling","Weak cooling","Intermittent"]},
    {"key":"area","type":"text","label":"Area/Room"},
    {"key":"impact","type":"select","label":"Impact","options":["Patient care impacted","Comfort issue","Safety risk"],"priority_map":{"Patient care impacted":"P1","Safety risk":"P0"}},
    {"key":"access","type":"checkbox","label":"Access available"},
    {"key":"notes","type":"textarea","label":"Notes"}
  ],
  "default_priority": "P2",
  "sla_policy_id": null,
  "routing": {"team":"HVAC"}
}
```

* Branching supported via `rules`: show/hide fields based on answers; can set `priority` or `requires_shutdown` flags.

## Media Capture & Uploads

* **Attachments**: photos (JPEG/PNG), videos (MP4/H.264), audio (M4A/MP3/WebM) via browser Media APIs.
* **Client-side checks**: max 50MB per file (config), optional auto-trim for videos to 30s.
* **Upload path**: request pre-signed S3 URL → direct upload (multipart for >5MB). Progress shown; offline queue supported.
* **Transcoding**: background worker (FFmpeg) creates web-friendly preview and thumbnails; stores original.
* **Transcription (optional)**: background Whisper or 3rd-party; result attached as searchable text.

## Security & Abuse Controls

* TACs: single-use, 10-minute expiry (configurable), 5 attempts max; site-scoped; role `requester-guest` only.
* Tracking links: signed token (JWT) with `request_id`, expires in 30 days (configurable); can be renewed via email/SMS.
* CAPTCHA for high-volume IPs; IP throttling; content-type & size validation; virus scanning (ClamAV/Lambda) on upload.
* PII minimization; consent prompt before recording audio/video.

## Data Model Additions

* **request\_templates**: `id, site_id, name, category, fields_json, default_priority, sla_policy_id, routing_json, is_active`
* **service\_requests**: `id, tenant_id, site_id, asset_id, location_id, template_id, title, description_md, contact_name, contact_email, contact_phone, status (new|triage|converted|closed), priority, submitted_at, converted_wo_id`
* **request\_messages**: `request_id, author (guest|user_id), body_md`
* **request\_attachments**: `request_id, attachment_id`
* **request\_portal\_tokens**: `id, site_id, token_hash, code (hashed), expires_at, used_at, scope ('requester-guest'), context_json (pre-fill asset/location), created_by`

## API Endpoints

* `POST /request-portal/code` (auth: supervisor) → `{code, expires_at}`
* `POST /request-portal/redeem` → `{session_token}` (scope-limited)
* `GET /request-templates?site_id=...`
* `POST /service-requests` (guest or TAC) → create
* `GET /service-requests/{id}?track=token` → read-only + comment/upload
* `POST /service-requests/{id}/messages?track=token`
* `POST /files/signed-url` (guest allowed with scope-limited token)
* `POST /service-requests/{id}/convert` (supervisor) → creates WO

## UI Details

* **Public entry**: `/request` with big category tiles; search bar (typeahead).
* **Wizard**: 3–4 steps max; inline photo capture; mic button for audio note; optional video capture.
* **Success screen**: request number + QR for tracking; share via SMS/email.
* **Inbox**: triage board with templates, duplicates flagged, one-click Convert → WO.
* **Generate TAC dialog**: select site/asset/location + notes; copy/share the code.

## Offline & QR

* Public portal is PWA-capable; caches templates and allows capture offline; queues submission on reconnect.
* Asset QR deep-links pre-fill asset/location and surface relevant templates first.

## Reporting

* Metrics: request volume by category/site, conversion rate to WO, avg triage time, top recurring templates, media usage.

---

# Migration from Hippo CMMS

1. **Exports**: From Hippo, export CSVs for assets, locations, work orders, PMs, parts, vendors, users.
2. **Mapping**: Create per-file mapping YAML (source→target columns, transforms). Example:

```yaml
assets.csv:
  id: tag
  Asset_Name: name
  Model: model
  Serial: serial
  Manufacturer: manufacturer
  Building: location.path
  Commissioned_Date: commissioned_at (parse: "%Y-%m-%d")
```

3. **Importer**: Node script reads YAML + CSV, upserts via API with `external_ref` preserved for traceability.
4. **Attachments**: bulk S3 upload via pre-signed URLs; link by external ref.
5. **Validation**: dry-run mode; data quality report (orphaned assets, missing locations, bad dates).
6. **Idempotency**: hash rows; skip unchanged; write import audit log.

# QR / Barcodes

* Generate `QR` codes per asset & location (PNG/SVG). Route `/#/a/{asset_id}` deep-links into app; offline-capable.
* Optional Code-128 labels for bins/parts.

# Security & Compliance

* Tenant isolation; per-site scoping; RLS optional.
* Audit logs for all changes.
* Backups: daily logical (pg\_dump), weekly full; object storage lifecycle rules.
* PII minimization; encrypt secrets; HTTPS everywhere; CSP headers.

# Deployment

* **Dev**: `docker compose up` provides Postgres, Redis, MinIO, Next.js backend & frontend.
* **Prod**: Helm charts (Postgres via managed service), S3 bucket, Redis, autoscaling frontends; CI/CD GitHub Actions.

# Example Next.js API Route (tRPC/REST style shown as REST)

```ts
// app/api/work-orders/route.ts (POST)
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  siteId: z.number(),
  title: z.string().min(3),
  descriptionMd: z.string().optional(),
  assetId: z.number().optional(),
  priority: z.enum(["P0","P1","P2","P3","P4"]).default("P3"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const data = schema.parse(body);
  const count = await prisma.workOrder.count({ where: { siteId: data.siteId } });
  const number = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const wo = await prisma.workOrder.create({
    data: {
      siteId: data.siteId,
      number,
      title: data.title,
      descriptionMd: data.descriptionMd ?? "",
      priority: data.priority,
      status: "new",
    },
  });
  return new Response(JSON.stringify(wo), { status: 201 });
}
```

# Example React Page (Create WO – Mobile-first)

```tsx
export default function QuickCreateWO() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("P3");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: 1, title, descriptionMd: desc, priority }),
      });
      if (!res.ok) throw new Error("Failed");
      setTitle(""); setDesc(""); setPriority("P3");
      alert("Work order created");
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-3">
      <h1 className="text-xl font-semibold">Quick Work Order</h1>
      <input className="w-full border rounded p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className="w-full border rounded p-2" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
      <select className="w-full border rounded p-2" value={priority} onChange={e=>setPriority(e.target.value)}>
        <option value="P0">P0 – Emergency</option>
        <option value="P1">P1 – Urgent</option>
        <option value="P2">P2 – High</option>
        <option value="P3">P3 – Normal</option>
        <option value="P4">P4 – Low</option>
      </select>
      <button disabled={saving} onClick={save} className="w-full rounded bg-black text-white p-2">{saving?"Saving...":"Create"}</button>
    </div>
  );
}
```

# Build Plan (90-day roadmap)

**Week 1–2**: finalize requirements, custom fields, statuses, SLAs; confirm data model.&#x20;
**Week 3–4**: scaffold Next.js/Prisma; auth; sites/assets/WOs CRUD; PWA shell.&#x20;
**Week 5–6**: PM engine (calendar + meter); QR codes; attachments.&#x20;
**Week 7–8**: Parts/inventory; issue/receive; bins.&#x20;
**Week 9–10**: Reports/KPIs; importers from Hippo CSV; role-based perms; audits.&#x20;
**Week 11–12**: UAT, polish, documentation, training, cutover.

# What You Get Immediately

* A working scaffold (Next.js + Prisma + Postgres) with WOs/Assets basics.
* Docker Compose for local dev.
* Importer templates & sample mapping files.

# Next Steps

If this plan looks right, I can generate a repo scaffold (frontend + backend + DB schema + Docker) and an initial data importer for assets & WOs. We can then iterate on PMs and inventory. Let me know any must-have fields/workflows unique to your sites so I can bake them into the defaults.
