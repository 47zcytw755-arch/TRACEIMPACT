export const siteConfig = {
  name: "TraceImpact Cloud",
  shortName: "TraceImpact",
  description: "Turn messy data into clear, trustworthy answers. Autonomous data quality, automated profiling, personalized dashboards, and secure natural-language SQL data chat.",
  tagline: "Turn messy data into clear, trustworthy answers.",
  supportingText: "Upload your data, automatically understand its structure and quality, explore personalized dashboards, and ask questions about your data in plain English.",
  links: {
    github: "https://github.com/traceimpact/traceimpact-cloud",
    docs: "/docs",
  },
  supportedFormats: [
    { ext: "CSV", mime: "text/csv", desc: "Comma-separated tabular data" },
    { ext: "XLSX", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", desc: "Excel spreadsheets (Single/Multi sheet)" },
    { ext: "JSON", mime: "application/json", desc: "Structured arrays of objects / records" },
    { ext: "TXT", mime: "text/plain", desc: "Delimited text or logs (TSV, pipe, custom)" },
  ],
  navItems: [
    { title: "Product", href: "/#product" },
    { title: "How It Works", href: "/#how-it-works" },
    { title: "Features", href: "/#features" },
    { title: "Security", href: "/#security" },
  ],
  appNavItems: [
    { title: "Overview", href: "/app", icon: "overview" },
    { title: "Datasets", href: "/app/datasets", icon: "datasets" },
    { title: "Upload", href: "/app/upload", icon: "upload" },
    { title: "Dashboard", href: "/app/dashboard", icon: "dashboard" },
    { title: "AI Data Chat", href: "/app/chat", icon: "chat" },
    { title: "Team & Members", href: "/app/team", icon: "team" },
    { title: "Audit Trail", href: "/app/audit", icon: "audit" },
  ],
};
