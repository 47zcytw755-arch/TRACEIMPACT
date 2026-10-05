# File Parsing Engine — TraceImpact Cloud Day 2

## 1. Modular Parser Architecture
TraceImpact Cloud implements a decoupled parser architecture adhering to the `IFileParser` interface:

```typescript
export interface IFileParser {
  extension: SupportedFileType;
  parse(buffer: Buffer | Uint8Array | string, options?: ParserOptions): Promise<ParsedTabularData>;
}
```

---

## 2. Supported Formats & Parsing Strategies

### 1. Comma-Separated Values (`.csv`)
- **Engine:** `PapaParse` integration.
- **Features:** Greedy newline skipping, quoted string handling with embedded commas and linebreaks, header transformation and whitespace trimming.

### 2. Excel Workbooks (`.xlsx`)
- **Engine:** SheetJS (`xlsx`) workbook reader.
- **Features:** Reads OpenXML binary buffers, auto-selects active or specified sheet, safely converts worksheet cells to structured headers and tabular rows.

### 3. JSON & JSON Lines (`.json`, `.jsonl`)
- **Engine:** Native JSON parsing with wrapper unpacking.
- **Features:** Supports JSON arrays of uniform or non-uniform objects, nested record keys (`data`, `records`, `results`), and newline-delimited JSON Lines (`.jsonl`).

### 4. Delimited Text (`.txt`)
- **Engine:** Heuristic delimiter sniffer + `PapaParse`.
- **Features:** Analyzes the first 10 rows to detect dominant delimiter: Tab (`\t`), Pipe (`|`), Semicolon (`;`), or Comma (`,`).

---

## 3. Normalized Output Structure
All parsers return a standardized `ParsedTabularData` contract:
- `headers`: string[]
- `rows`: Record<string, unknown>[]
- `totalRows`: number
- `totalColumns`: number
- `delimiter`?: string
- `sheetName`?: string
