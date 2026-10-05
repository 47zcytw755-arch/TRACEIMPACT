# Day 4 — Dataset Chat API Specification

## 1. Route Definition
`POST /api/datasets/[id]/chat`

## 2. Request Headers & Body
```http
POST /api/datasets/ds_101/chat?workspaceId=default-workspace HTTP/1.1
Content-Type: application/json

{
  "message": "What is the total revenue by category?"
}
```

## 3. Response Structure
```json
{
  "success": true,
  "answer": "Analysis across 2 groups shows Electronics has the highest value with 2,200.\n\nSummary breakdown: Electronics (2,200), Furniture (500).",
  "query": {
    "intent": {
      "datasetId": "ds_101",
      "operation": "group_by",
      "targetTable": "dataset",
      "dimensions": ["category"],
      "measures": [{ "field": "revenue", "aggregation": "sum", "alias": "total_revenue" }],
      "filters": [],
      "sort": [{ "column": "total_revenue", "direction": "DESC" }],
      "limit": 20,
      "rawQuestion": "What is the total revenue by category?",
      "confidence": 0.95,
      "explanation": "Extracted group_by intent on [revenue] grouped by [category]."
    },
    "sql": "SELECT \"category\", SUM(\"revenue\") AS \"total_revenue\" FROM \"dataset\" GROUP BY \"category\" ORDER BY \"total_revenue\" DESC LIMIT 20",
    "parameters": []
  },
  "result": {
    "columns": ["category", "total_revenue"],
    "rows": [
      { "category": "Electronics", "total_revenue": 2200 },
      { "category": "Furniture", "total_revenue": 500 }
    ],
    "rowCount": 2
  },
  "visualization": {
    "type": "bar",
    "title": "total revenue by category",
    "options": { ... }
  },
  "metadata": {
    "executionTimeMs": 3,
    "evidenceRowsCount": 2,
    "provider": "deterministic-rule-engine",
    "model": "v1-controlled-sql"
  }
}
```

## 4. Status Codes
- `200 OK`: Successful query execution with evidence and answer.
- `400 Bad Request`: Empty message, invalid intent schema, or SQL validation failure.
- `404 Not Found`: Dataset does not exist or access denied for tenant.
- `500 Internal Server Error`: Unexpected runtime error.
