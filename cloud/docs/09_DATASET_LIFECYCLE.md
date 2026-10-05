# Dataset Processing Lifecycle & States — TraceImpact Cloud Day 2

## 1. Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> UPLOADED: File submitted via uploader
    UPLOADED --> PROCESSING: Storage saved & parsing triggered
    PROCESSING --> READY: Parsing, schema inference & profiling succeed
    PROCESSING --> FAILED: Parse error / format violation / unhandled exception
    READY --> [*]
    FAILED --> [*]
```

---

## 2. State Definitions
- **`uploaded`:** File metadata is stored; storage buffer is recorded.
- **`processing`:** Parser is streaming file and profiler is computing metrics.
- **`ready`:** Parsing and profiling completed successfully; columns, quality score, and issues are persisted.
- **`failed`:** Processing encountered an error; `errorMessage` is recorded and displayed to the user.
