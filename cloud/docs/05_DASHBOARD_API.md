# Day 3 — Dashboard API Endpoint Specification

## 1. Route Definition
`GET /api/datasets/[id]/dashboard`

## 2. Query Parameters
- `workspaceId` (optional, defaults to `'default-workspace'`)

## 3. Response Status Codes
- `200 OK`: Dashboard configuration generated and returned.
- `202 Accepted`: Dataset is in `processing` status; client should retry after ingestion completes.
- `404 Not Found`: Dataset does not exist or belongs to another workspace.
- `422 Unprocessable Entity`: Dataset status is `failed`.
- `500 Internal Server Error`: Unexpected server or dashboard generation failure.

## 4. Response Payload Example
```json
{
  "success": true,
  "dashboard": {
    "datasetId": "ds_101",
    "workspaceId": "default-workspace",
    "datasetName": "transactions.csv",
    "generatedAt": "2026-09-29T23:18:00.000Z",
    "version": "1.0.0",
    "kpis": [...],
    "charts": [...],
    "qualitySummary": {...},
    "columnsSummary": [...]
  }
}
```
