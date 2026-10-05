# User Flows & Interaction Models — TraceImpact Cloud

## 1. End-to-End User Flow

```
+-------------------------------------------------------------+
|                      1. Landing Page (/)                    |
|  - Value proposition & feature overview                     |
|  - Platform security architecture                           |
|  - CTAs: "Get started" / "Create your workspace"            |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               2. Workspace Shell (/app)                     |
|  - Workspace status & telemetry placeholders                |
|  - Quick-start onboarding & action triggers                 |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               3. Dataset Ingestion (/app/upload)            |
|  - Drag-and-drop or browse files (CSV, XLSX, JSON, TXT)     |
|  - Client-side validation of file extension & size          |
|  - Ready for backend ingestion engine (Day 2)               |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|           4. Ingestion & Quality Analysis (Day 2)           |
|  - Upload to Cloudflare R2 via presigned endpoint           |
|  - Automated schema inference & quality scoring             |
|  - Detection of missing fields, anomalies, duplicates       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|           5. Personalized Dashboard (/app/dashboard)        |
|  - Automatic rendering of tailored ECharts charts           |
|  - KPIs, category distributions, temporal trends            |
|  - Quality health scorecard & anomaly highlights            |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              6. AI Data Chat (/app/chat)                    |
|  - Ask ad-hoc questions in natural English                  |
|  - Server-side SQL generator + AST security validator       |
|  - Safe read-only execution & transparent explanation       |
+-------------------------------------------------------------+
```

---

## 2. Detailed Journey Specifications

### Flow A: Public Visitor Onboarding
1. User lands on `/`.
2. Reads value proposition and inspects the 5-step pipeline visualization (Upload → Analyze → Clean → Visualize → Ask).
3. Clicks "Get started" or "Create your workspace".
4. Navigates seamlessly to `/app`.

### Flow B: Dataset Upload & Inspection
1. User clicks "Upload Dataset" in header or sidebar.
2. Selects a `.csv`, `.xlsx`, `.json`, or `.txt` file.
3. The UI computes the size in human-readable format (`KB/MB`), displays the extension badge, and confirms eligibility for automated processing.
4. User is presented with clear status indicators regarding ingestion availability.

### Flow C: Interactive Analytics & Chat
1. User navigates to `/app/dashboard` to inspect automated visualizations.
2. User navigates to `/app/chat` to select suggested queries or compose custom natural language inquiries.
