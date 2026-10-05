# Storage Provider Integration & Partitioning — TraceImpact Cloud Day 2

## 1. Storage Architecture
TraceImpact Cloud defines a unified storage interface (`IStorageProvider`) with two concrete implementations:
- **`LocalStorageProvider`:** In-memory buffer map used for zero-dependency local development and CI testing.
- **`R2StorageProvider`:** S3-compatible Cloudflare R2 adapter utilizing environment variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).

---

## 2. Partition Hierarchy & Storage Key Convention
All uploaded objects are partitioned strictly by workspace and dataset:

```
workspaces/{workspace_id}/datasets/{dataset_id}/raw/{file_uuid}_{safe_filename}
```

### Security Measures:
- **Path Traversal Defense:** Sanitizes `..`, `/`, `\`, and special characters from filenames.
- **Checksum Verification:** Generates and verifies SHA-256 hashes for all uploaded file buffers.
- **Zero Public Access:** Raw file objects are private and accessible only through server-side authorization or time-limited presigned URLs.
