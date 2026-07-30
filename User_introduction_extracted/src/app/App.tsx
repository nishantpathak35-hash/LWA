import { useState } from "react";
import {
  LayoutDashboard, FolderKanban, ShoppingCart, Users, CreditCard,
  BarChart3, Settings, ChevronLeft, ChevronRight, Bell, Search,
  Plus, ChevronDown, MoreHorizontal, Filter, RefreshCw, TrendingUp,
  TrendingDown, Clock, CheckCircle, AlertCircle, XCircle, Eye,
  Edit2, Download, Building2, FileText, Layers, Activity, User,
  LogOut, Package, Banknote, PieChart, MapPin, CheckCheck, Zap,
  Target, AlertTriangle, X
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "dashboard" | "projects" | "vendors" | "purchase-orders" | "payments" | "payment-tracker" | "reports" | "settings" | "users";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const revenueData = [
  { month: "Jan", revenue: 4200000, expenses: 2800000 },
  { month: "Feb", revenue: 3800000, expenses: 2400000 },
  { month: "Mar", revenue: 5100000, expenses: 3200000 },
  { month: "Apr", revenue: 4700000, expenses: 2900000 },
  { month: "May", revenue: 6200000, expenses: 3800000 },
  { month: "Jun", revenue: 5800000, expenses: 3500000 },
  { month: "Jul", revenue: 7100000, expenses: 4200000 },
];

const cashFlowData = [
  { week: "W1", inflow: 1800000, outflow: 1200000 },
  { week: "W2", inflow: 2100000, outflow: 1600000 },
  { week: "W3", inflow: 1600000, outflow: 1900000 },
  { week: "W4", inflow: 2400000, outflow: 1400000 },
];

const poStatusData = [
  { name: "Approved", value: 38, color: "#10B981" },
  { name: "Pending", value: 24, color: "#F59E0B" },
  { name: "Draft", value: 18, color: "#94A3B8" },
  { name: "Rejected", value: 6, color: "#EF4444" },
];

const projects = [
  { id: "PRJ-001", name: "The Ritz Hotel Lobby", client: "Ritz Carlton Group", budget: 42000000, spent: 28500000, status: "active", progress: 68, pos: 24, payments: 18, pm: "Arjun Mehta", location: "Mumbai", startDate: "Jan 2025", endDate: "Sep 2025" },
  { id: "PRJ-002", name: "Oberoi Corporate HQ", client: "Oberoi Realty", budget: 18500000, spent: 7200000, status: "active", progress: 39, pos: 11, payments: 8, pm: "Priya Sharma", location: "Delhi NCR", startDate: "Mar 2025", endDate: "Dec 2025" },
  { id: "PRJ-003", name: "Azure Sky Residences", client: "Lodha Developers", budget: 31000000, spent: 31000000, status: "completed", progress: 100, pos: 38, payments: 38, pm: "Vikram Nair", location: "Pune", startDate: "Aug 2024", endDate: "Jun 2025" },
  { id: "PRJ-004", name: "ITC Grand Ballroom", client: "ITC Hotels", budget: 9800000, spent: 1200000, status: "active", progress: 12, pos: 6, payments: 3, pm: "Sneha Patel", location: "Bangalore", startDate: "Jun 2025", endDate: "Feb 2026" },
  { id: "PRJ-005", name: "Taj Business Center", client: "Taj Group", budget: 55000000, spent: 0, status: "on-hold", progress: 0, pos: 0, payments: 0, pm: "Rahul Gupta", location: "Chennai", startDate: "TBD", endDate: "TBD" },
  { id: "PRJ-006", name: "LeEla Palace Suite", client: "LeEla Hotels", budget: 22000000, spent: 19800000, status: "active", progress: 90, pos: 19, payments: 17, pm: "Ananya Roy", location: "Udaipur", startDate: "Nov 2024", endDate: "Aug 2025" },
];

const vendors = [
  { id: "VEN-001", name: "Artisan Marble Works", gst: "27AABCA1234F1Z5", category: "Stone & Marble", contact: "Suresh Kumar", phone: "+91 98200 11234", outstanding: 1850000, status: "active", pos: 14 },
  { id: "VEN-002", name: "Elara Lighting Studio", gst: "27BBBEL5678G2Z1", category: "Lighting & Fixtures", contact: "Deepika Nair", phone: "+91 98765 43210", outstanding: 320000, status: "active", pos: 8 },
  { id: "VEN-003", name: "Premium Fabrics Co.", gst: "06CCCPF9012H3Z8", category: "Upholstery & Textiles", contact: "Ramesh Verma", phone: "+91 98112 65432", outstanding: 0, status: "pending", pos: 3 },
  { id: "VEN-004", name: "TechInstall Systems", gst: "27DDDTI3456I4Z2", category: "AV & Automation", contact: "Kiran Joshi", phone: "+91 90000 12345", outstanding: 2450000, status: "active", pos: 21 },
  { id: "VEN-005", name: "Global Steel Craft", gst: "24EEEGSC7890J5Z9", category: "Metal & Structural", contact: "Anand Pillai", phone: "+91 97700 98765", outstanding: 890000, status: "active", pos: 9 },
  { id: "VEN-006", name: "Heritage Wood Studios", gst: "27FFFHW2345K6Z3", category: "Joinery & Wood", contact: "Meena Iyer", phone: "+91 99100 54321", outstanding: 0, status: "suspended", pos: 5 },
  { id: "VEN-007", name: "AquaDesign Plumbing", gst: "27GGGAD6789L7Z6", category: "Plumbing & Sanitary", contact: "Rajan Das", phone: "+91 88800 23456", outstanding: 560000, status: "active", pos: 12 },
];

const purchaseOrders = [
  { id: "PO-2025-0482", vendor: "Artisan Marble Works", project: "PRJ-001", amount: 4200000, status: "approved", priority: "high", raised: "12 Jul 2025", due: "28 Jul 2025", category: "Stone & Marble" },
  { id: "PO-2025-0481", vendor: "Elara Lighting Studio", project: "PRJ-002", amount: 780000, status: "pending", priority: "medium", raised: "11 Jul 2025", due: "25 Jul 2025", category: "Lighting" },
  { id: "PO-2025-0480", vendor: "TechInstall Systems", project: "PRJ-001", amount: 1950000, status: "pending", priority: "high", raised: "10 Jul 2025", due: "24 Jul 2025", category: "AV & Automation" },
  { id: "PO-2025-0479", vendor: "Premium Fabrics Co.", project: "PRJ-006", amount: 320000, status: "approved", priority: "low", raised: "09 Jul 2025", due: "23 Jul 2025", category: "Textiles" },
  { id: "PO-2025-0478", vendor: "Global Steel Craft", project: "PRJ-004", amount: 680000, status: "rejected", priority: "medium", raised: "08 Jul 2025", due: "22 Jul 2025", category: "Metal" },
  { id: "PO-2025-0477", vendor: "AquaDesign Plumbing", project: "PRJ-002", amount: 215000, status: "draft", priority: "low", raised: "07 Jul 2025", due: "21 Jul 2025", category: "Plumbing" },
  { id: "PO-2025-0476", vendor: "Artisan Marble Works", project: "PRJ-006", amount: 1100000, status: "approved", priority: "high", raised: "05 Jul 2025", due: "19 Jul 2025", category: "Stone & Marble" },
  { id: "PO-2025-0475", vendor: "Heritage Wood Studios", project: "PRJ-001", amount: 890000, status: "pending", priority: "medium", raised: "04 Jul 2025", due: "18 Jul 2025", category: "Joinery" },
];

const payments = [
  { id: "PAY-2025-0214", po: "PO-2025-0476", vendor: "Artisan Marble Works", project: "PRJ-001", amount: 1100000, status: "pending", type: "partial", requestedBy: "Arjun Mehta", requestedOn: "14 Jul 2025", dueDate: "28 Jul 2025" },
  { id: "PAY-2025-0213", po: "PO-2025-0479", vendor: "Premium Fabrics Co.", project: "PRJ-006", amount: 160000, status: "approved", type: "partial", requestedBy: "Ananya Roy", requestedOn: "13 Jul 2025", dueDate: "27 Jul 2025" },
  { id: "PAY-2025-0212", po: "PO-2025-0473", vendor: "Elara Lighting Studio", project: "PRJ-002", amount: 390000, status: "paid", type: "full", requestedBy: "Priya Sharma", requestedOn: "10 Jul 2025", dueDate: "24 Jul 2025" },
  { id: "PAY-2025-0211", po: "PO-2025-0471", vendor: "TechInstall Systems", project: "PRJ-001", amount: 975000, status: "overdue", type: "partial", requestedBy: "Vikram Nair", requestedOn: "02 Jul 2025", dueDate: "16 Jul 2025" },
  { id: "PAY-2025-0210", po: "PO-2025-0468", vendor: "Global Steel Craft", project: "PRJ-004", amount: 340000, status: "paid", type: "full", requestedBy: "Sneha Patel", requestedOn: "28 Jun 2025", dueDate: "12 Jul 2025" },
];

const approvalQueue = [
  { id: "APQ-001", type: "Purchase Order", ref: "PO-2025-0481", amount: 780000, from: "Priya Sharma", project: "PRJ-002", age: "2 days" },
  { id: "APQ-002", type: "Purchase Order", ref: "PO-2025-0480", amount: 1950000, from: "Vikram Nair", project: "PRJ-001", age: "3 days" },
  { id: "APQ-003", type: "Payment Request", ref: "PAY-2025-0214", amount: 1100000, from: "Arjun Mehta", project: "PRJ-001", age: "1 day" },
  { id: "APQ-004", type: "Purchase Order", ref: "PO-2025-0475", amount: 890000, from: "Vikram Nair", project: "PRJ-001", age: "4 days" },
];

const recentActivity = [
  { time: "10:42 AM", text: "PO-2025-0482 approved by Finance Controller", type: "success" },
  { time: "09:18 AM", text: "Vendor onboarding completed — Premium Fabrics Co.", type: "info" },
  { time: "Yesterday", text: "Payment PAY-2025-0211 is overdue — TechInstall Systems", type: "warning" },
  { time: "Yesterday", text: "PO-2025-0478 rejected — insufficient documentation", type: "danger" },
  { time: "14 Jul", text: "Project PRJ-004 ITC Grand Ballroom kicked off", type: "info" },
  { time: "13 Jul", text: "Payment PAY-2025-0212 processed — ₹3,90,000", type: "success" },
];

const usersData = [
  { name: "Farhan Contractor", email: "farhan@luxeworx.in", role: "Finance Controller", status: "active", lastLogin: "Today, 09:14 AM" },
  { name: "Arjun Mehta", email: "arjun@luxeworx.in", role: "Project Manager", status: "active", lastLogin: "Today, 08:52 AM" },
  { name: "Priya Sharma", email: "priya@luxeworx.in", role: "Project Manager", status: "active", lastLogin: "Yesterday" },
  { name: "Vikram Nair", email: "vikram@luxeworx.in", role: "Project Manager", status: "active", lastLogin: "13 Jul 2025" },
  { name: "Sneha Patel", email: "sneha@luxeworx.in", role: "Site Engineer", status: "active", lastLogin: "Today, 10:01 AM" },
  { name: "Rahul Gupta", email: "rahul@luxeworx.in", role: "Project Manager", status: "inactive", lastLogin: "28 Jun 2025" },
  { name: "Ananya Roy", email: "ananya@luxeworx.in", role: "Procurement Lead", status: "active", lastLogin: "Today, 11:30 AM" },
  { name: "Divya Iyer", email: "divya@luxeworx.in", role: "Accounts", status: "active", lastLogin: "Yesterday" },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function fmtFull(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    draft: "bg-slate-50 text-slate-600 border-slate-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    inactive: "bg-slate-50 text-slate-500 border-slate-200",
  };
  const labels: Record<string, string> = {
    "on-hold": "On Hold",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Priority Pill ────────────────────────────────────────────────────────────
function PriorityPill({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: "text-red-600", medium: "text-amber-600", low: "text-slate-500" };
  const dots: Record<string, string> = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${colors[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority]}`} />
      {priority}
    </span>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, color = "blue" }: {
  label: string; value: string; sub?: string; trend?: string; trendUp?: boolean;
  icon: React.ElementType; color?: string;
}) {
  const iconColors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconColors[color]}`}>
          <Icon size={14} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({ children, variant = "primary", size = "sm", icon: Icon, onClick, className = "" }: {
  children?: React.ReactNode; variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md"; icon?: React.ElementType; onClick?: () => void; className?: string;
}) {
  const v: Record<string, string> = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
    secondary: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100",
    outline: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700",
    danger: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
  };
  const s: Record<string, string> = { xs: "px-2 py-1 text-xs", sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-medium rounded-md border transition-colors cursor-pointer ${v[variant]} ${s[size]} ${className}`}>
      {Icon && <Icon size={size === "xs" ? 11 : 13} />}
      {children}
    </button>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────
function SearchInput({ placeholder = "Search...", className = "" }: { placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="text" placeholder={placeholder} className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400" />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const navGroups = [
  { label: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Procurement", items: [
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
    { id: "vendors", label: "Vendors", icon: Building2 },
  ]},
  { label: "Finance", items: [
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "payment-tracker", label: "Payment Tracker", icon: Activity },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ]},
  { label: "Administration", items: [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "users", label: "Users", icon: Users },
  ]},
];

function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: Page; setPage: (p: Page) => void; collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside className="relative flex flex-col border-r border-slate-200 bg-white h-full transition-all duration-200 shrink-0" style={{ width: collapsed ? 52 : 216 }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-[52px] border-b border-slate-200 shrink-0 overflow-hidden">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <Layers size={13} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 leading-tight">Luxeworx</div>
            <div className="text-[10px] text-slate-400">Atelier ERP</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 mb-1.5">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = page === id;
                return (
                  <button key={id} onClick={() => setPage(id as Page)} title={collapsed ? label : undefined}
                    className={`w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer ${active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <Icon size={14} className={active ? "text-blue-600" : "text-slate-400"} />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-3 shrink-0">
        {collapsed ? (
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center mx-auto">
            <span className="text-[10px] font-bold text-white">FC</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">FC</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate">Farhan Contractor</div>
              <div className="text-[10px] text-slate-400 truncate">Finance Controller</div>
            </div>
            <LogOut size={12} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] w-6 h-6 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors z-20 cursor-pointer shadow-sm">
        {collapsed ? <ChevronRight size={11} className="text-slate-500" /> : <ChevronLeft size={11} className="text-slate-500" />}
      </button>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
const pageLabels: Record<Page, string[]> = {
  dashboard: ["Dashboard"],
  projects: ["Procurement", "Projects"],
  vendors: ["Procurement", "Vendors"],
  "purchase-orders": ["Procurement", "Purchase Orders"],
  payments: ["Finance", "Payments"],
  "payment-tracker": ["Finance", "Payment Tracker"],
  reports: ["Finance", "Reports"],
  settings: ["Administration", "Settings"],
  users: ["Administration", "Users"],
};

function TopBar({ page }: { page: Page }) {
  const crumbs = pageLabels[page] ?? [page];
  return (
    <header className="h-[52px] border-b border-slate-200 bg-white flex items-center px-5 gap-4 shrink-0">
      <div className="flex items-center gap-1.5 text-xs flex-1">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-slate-400" />}
            <span className={i === crumbs.length - 1 ? "font-semibold text-slate-900" : "text-slate-400"}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <SearchInput placeholder="Search anything…" className="w-52" />
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
          <Bell size={14} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        <Btn variant="primary" icon={Plus} size="sm">New PO</Btn>
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">FC</span>
          </div>
          <ChevronDown size={12} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Monday, 14 July 2025 · Luxeworx Atelier Pvt. Ltd.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" icon={RefreshCw} size="sm">Refresh</Btn>
          <Btn variant="outline" icon={Download} size="sm">Export</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Revenue YTD" value="₹3.71Cr" trend="+12.4%" trendUp icon={TrendingUp} color="blue" />
        <MetricCard label="Pending Payments" value="₹12.75L" trend="3 items" trendUp={false} icon={CreditCard} color="amber" />
        <MetricCard label="Open Purchase Orders" value="86" sub="₹5.4Cr value" trend="+8 this week" trendUp icon={ShoppingCart} color="purple" />
        <MetricCard label="Active Projects" value="4" sub="of 6 total" icon={FolderKanban} color="green" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Revenue vs Expenses</div>
              <div className="text-xs text-slate-400">Jan – Jul 2025</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500" />Revenue</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-300" />Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
              <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 6 }} formatter={(v: number) => [fmt(v)]} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="expenses" stroke="#CBD5E1" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-900 mb-1">PO Status</div>
          <div className="text-xs text-slate-400 mb-3">86 total purchase orders</div>
          <ResponsiveContainer width="100%" height={140}>
            <RechartsPie>
              <Pie data={poStatusData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                {poStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 6 }} />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {poStatusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-slate-500">{d.name}</span>
                <span className="text-xs font-semibold text-slate-900 ml-auto font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-900">Approval Queue</div>
            <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">{approvalQueue.length}</span>
          </div>
          <div className="space-y-2">
            {approvalQueue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.type === "Purchase Order" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                  {item.type === "Purchase Order" ? <ShoppingCart size={11} /> : <Banknote size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-900">{item.ref}</div>
                  <div className="text-[11px] text-slate-500">{item.from} · {item.project}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-slate-900 font-mono">{fmt(item.amount)}</div>
                  <div className="text-[10px] text-slate-400">{item.age} ago</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="w-6 h-6 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"><CheckCheck size={10} /></button>
                  <button className="w-6 h-6 rounded flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer"><X size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-900 mb-3">Recent Activity</div>
          <div className="space-y-3">
            {recentActivity.map((a, i) => {
              const iconEl = {
                success: <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />,
                info: <Activity size={12} className="text-blue-500 mt-0.5 shrink-0" />,
                warning: <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />,
                danger: <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />,
              }[a.type];
              return (
                <div key={i} className="flex items-start gap-2">
                  {iconEl}
                  <div className="flex-1 text-xs text-slate-700">{a.text}</div>
                  <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{a.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-900 mb-1">Cash Flow — July 2025</div>
          <div className="text-xs text-slate-400 mb-3">Weekly inflow vs outflow</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={cashFlowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
              <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 6 }} formatter={(v: number) => [fmt(v)]} />
              <Bar dataKey="inflow" fill="#2563EB" radius={[3, 3, 0, 0]} name="Inflow" />
              <Bar dataKey="outflow" fill="#E2E8F0" radius={[3, 3, 0, 0]} name="Outflow" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-900 mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "New PO", icon: ShoppingCart, color: "bg-blue-50 text-blue-600" },
              { label: "Payment Req.", icon: Banknote, color: "bg-purple-50 text-purple-600" },
              { label: "Add Vendor", icon: Building2, color: "bg-emerald-50 text-emerald-600" },
              { label: "New Project", icon: FolderKanban, color: "bg-amber-50 text-amber-600" },
              { label: "Reports", icon: BarChart3, color: "bg-slate-100 text-slate-600" },
              { label: "Approvals", icon: CheckCheck, color: "bg-red-50 text-red-600" },
            ].map(({ label, icon: Icon, color }) => (
              <button key={label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}><Icon size={12} /></div>
                <span className="text-[11px] text-slate-500 group-hover:text-slate-900 font-medium text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function ProjectsPage() {
  const [view, setView] = useState<"cards" | "table">("cards");
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">{projects.length} projects · 4 active</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex border border-slate-200 rounded-md overflow-hidden">
            <button onClick={() => setView("cards")} className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${view === "cards" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Cards</button>
            <button onClick={() => setView("table")} className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${view === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Table</button>
          </div>
          <Btn variant="outline" icon={Filter} size="sm">Filter</Btn>
          <Btn variant="primary" icon={Plus} size="sm">New Project</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Budget" value="₹17.83Cr" icon={Target} color="blue" />
        <MetricCard label="Total Spent" value="₹8.77Cr" sub="49.2% utilized" icon={TrendingUp} color="green" />
        <MetricCard label="Active Projects" value="4" icon={Activity} color="purple" />
        <MetricCard label="Avg. Progress" value="51.5%" icon={PieChart} color="amber" />
      </div>

      {view === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400">{p.id}</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5 group-hover:text-blue-600 transition-colors">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.client}</div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><MapPin size={10} />{p.location}</span>
                  <span className="flex items-center gap-1"><User size={10} />{p.pm}</span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Budget used</span>
                    <span className="font-semibold text-slate-900 font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Spent: {fmt(p.spent)}</span><span>Budget: {fmt(p.budget)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  {[["Progress", `${p.progress}%`], ["POs", p.pos], ["Payments", p.payments]].map(([l, v]) => (
                    <div key={String(l)} className="text-center">
                      <div className="text-sm font-semibold text-slate-900 font-mono">{v}</div>
                      <div className="text-[10px] text-slate-400">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                  <span>{p.startDate}</span><ChevronRight size={11} /><span>{p.endDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["ID", "Name", "Client", "PM", "Budget", "Spent", "Progress", "POs", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400">{p.id}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{p.client}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{p.pm}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{fmt(p.budget)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{fmt(p.spent)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-center">{p.pos}</td>
                  <td className="px-4 py-2.5"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-2.5"><button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><MoreHorizontal size={12} className="text-slate-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
function VendorsPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Vendor Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and monitor all onboarded vendors</p>
        </div>
        <div className="flex gap-2">
          <SearchInput placeholder="Search vendors…" className="w-48" />
          <Btn variant="outline" icon={Filter} size="sm">Filters</Btn>
          <Btn variant="primary" icon={Plus} size="sm">Onboard Vendor</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Vendors" value="7" icon={Building2} color="blue" />
        <MetricCard label="Active" value="5" icon={CheckCircle} color="green" />
        <MetricCard label="Pending Verification" value="1" icon={Clock} color="amber" />
        <MetricCard label="Outstanding" value="₹60.7L" icon={Banknote} color="red" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-xs font-medium text-slate-700">{vendors.length} vendors</span>
          <div className="flex gap-2">
            <Btn variant="ghost" icon={Download} size="xs">Export</Btn>
            <Btn variant="ghost" icon={Filter} size="xs">Columns</Btn>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Vendor", "GST Number", "Category", "Contact", "Phone", "Outstanding", "POs", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{v.name.charAt(0)}</div>
                    <div>
                      <div className="text-xs font-medium text-slate-900">{v.name}</div>
                      <div className="text-[10px] text-slate-400">{v.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{v.gst}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{v.category}</td>
                <td className="px-4 py-3 text-xs text-slate-700">{v.contact}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{v.phone}</td>
                <td className="px-4 py-3 text-xs font-mono font-semibold">{v.outstanding > 0 ? <span className="text-slate-900">{fmt(v.outstanding)}</span> : <span className="text-emerald-600">Nil</span>}</td>
                <td className="px-4 py-3 text-xs font-mono text-center text-slate-700">{v.pos}</td>
                <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><Eye size={12} className="text-slate-400" /></button>
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><Edit2 size={12} className="text-slate-400" /></button>
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><MoreHorizontal size={12} className="text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200">
          <span className="text-xs text-slate-400">Showing 7 of 7</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-400 cursor-not-allowed opacity-40">Prev</button>
            <button className="px-2 py-1 text-xs rounded bg-blue-600 text-white">1</button>
            <button className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-400 cursor-not-allowed opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────
function PurchaseOrdersPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("All");

  const tabs = ["All", "Pending", "Approved", "Draft", "Rejected"];
  const counts = purchaseOrders.reduce((acc, po) => { acc[po.status] = (acc[po.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const filtered = activeTab === "All" ? purchaseOrders : purchaseOrders.filter(po => po.status === activeTab.toLowerCase());

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">{purchaseOrders.length} orders · {fmt(purchaseOrders.reduce((s, p) => s + p.amount, 0))} total value</p>
        </div>
        <div className="flex gap-2">
          <SearchInput placeholder="Search POs…" className="w-48" />
          <Btn variant="outline" icon={Filter} size="sm">Filters</Btn>
          <Btn variant="primary" icon={Plus} size="sm">New PO</Btn>
        </div>
      </div>

      <div className="flex gap-0.5 border-b border-slate-200">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === activeTab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
            {tab}
            {tab !== "All" && counts[tab.toLowerCase()] && (
              <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{counts[tab.toLowerCase()]}</span>
            )}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-xs font-medium text-blue-700">{selected.size} selected</span>
          <Btn variant="secondary" size="xs" icon={CheckCheck}>Approve</Btn>
          <Btn variant="danger" size="xs" icon={XCircle}>Reject</Btn>
          <Btn variant="ghost" size="xs" icon={Download}>Export</Btn>
          <button className="ml-auto text-xs text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 w-8"><input type="checkbox" className="rounded border-slate-300 cursor-pointer" /></th>
              {["PO Number", "Vendor", "Project", "Category", "Amount", "Priority", "Raised", "Due", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((po) => (
              <tr key={po.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${selected.has(po.id) ? "bg-blue-50/60" : ""}`}>
                <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(po.id)} onChange={() => toggle(po.id)} className="rounded border-slate-300 cursor-pointer" onClick={(e) => e.stopPropagation()} /></td>
                <td className="px-4 py-2.5 text-xs font-mono font-semibold text-blue-600">{po.id}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{po.vendor}</td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400">{po.project}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{po.category}</td>
                <td className="px-4 py-2.5 text-xs font-mono font-semibold text-slate-900">{fmt(po.amount)}</td>
                <td className="px-4 py-2.5"><PriorityPill priority={po.priority} /></td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{po.raised}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{po.due}</td>
                <td className="px-4 py-2.5"><StatusPill status={po.status} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><Eye size={11} className="text-slate-400" /></button>
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><MoreHorizontal size={11} className="text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200">
          <span className="text-xs text-slate-400">Showing {filtered.length} of {purchaseOrders.length}</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-400 opacity-40 cursor-not-allowed">Prev</button>
            <button className="px-2 py-1 text-xs rounded bg-blue-600 text-white">1</button>
            <button className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-400 opacity-40 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payments ─────────────────────────────────────────────────────────────────
function PaymentsPage() {
  const totals = {
    pending: payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    approved: payments.filter(p => p.status === "approved").reduce((s, p) => s + p.amount, 0),
    paid: payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    overdue: payments.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0),
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Finance workspace — payment requests and transactions</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" icon={Download} size="sm">Export</Btn>
          <Btn variant="primary" icon={Plus} size="sm">Payment Request</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Pending Approval" value={fmt(totals.pending)} sub={`${payments.filter(p => p.status === "pending").length} requests`} icon={Clock} color="amber" />
        <MetricCard label="Approved" value={fmt(totals.approved)} sub="Ready to process" icon={CheckCircle} color="green" />
        <MetricCard label="Paid This Month" value={fmt(totals.paid)} icon={Banknote} color="blue" />
        <MetricCard label="Overdue" value={fmt(totals.overdue)} trend="Urgent" trendUp={false} icon={AlertCircle} color="red" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex gap-4">
            {["All", "Pending", "Approved", "Paid", "Overdue"].map((tab, i) => (
              <button key={tab} className={`text-xs font-medium cursor-pointer pb-0.5 ${i === 0 ? "text-blue-600 border-b border-blue-600" : "text-slate-500 hover:text-slate-900"}`}>{tab}</button>
            ))}
          </div>
          <SearchInput placeholder="Search payments…" className="w-44" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Payment ID", "PO Reference", "Vendor", "Project", "Amount", "Type", "Requested By", "Requested On", "Due Date", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-xs font-mono font-semibold text-blue-600">{p.id}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{p.po}</td>
                <td className="px-4 py-3 text-xs text-slate-900">{p.vendor}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{p.project}</td>
                <td className="px-4 py-3 text-xs font-mono font-semibold text-slate-900">{fmtFull(p.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${p.type === "full" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                    {p.type === "full" ? "Full" : "Partial"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.requestedBy}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.requestedOn}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.dueDate}</td>
                <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.status === "pending" && (
                      <>
                        <button className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"><CheckCheck size={10} /></button>
                        <button className="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer"><X size={10} /></button>
                      </>
                    )}
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><Eye size={11} className="text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payment Tracker ──────────────────────────────────────────────────────────
function PaymentTrackerPage() {
  const stages = ["PO Raised", "PO Approved", "Pay Requested", "Finance Approved", "Paid"];
  const stageMap: Record<string, number> = { draft: 0, pending: 2, approved: 3, paid: 4, overdue: 2 };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Payment Tracker</h1>
          <p className="text-xs text-slate-500 mt-0.5">End-to-end payment lifecycle — from PO to bank transfer</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" icon={Filter} size="sm">Filters</Btn>
          <Btn variant="outline" icon={Download} size="sm">Export</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {payments.map((p) => {
          const current = stageMap[p.status] ?? 2;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[11px] font-mono text-blue-600 font-semibold">{p.id}</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">{p.vendor}</div>
                  <div className="text-xs text-slate-400">{p.po} · {p.project}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900 font-mono">{fmtFull(p.amount)}</div>
                  <StatusPill status={p.status} />
                </div>
              </div>

              <div className="relative flex items-start justify-between">
                <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-100" />
                <div className="absolute top-3 left-3 h-0.5 bg-blue-500 transition-all" style={{ width: `${(current / (stages.length - 1)) * (100 - (6 / stages.length * 100))}%` }} />
                {stages.map((stage, i) => (
                  <div key={stage} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${i < current ? "bg-blue-600 border-blue-600" : i === current ? (p.status === "overdue" ? "bg-red-500 border-red-500" : "bg-blue-600 border-blue-600") : "bg-white border-slate-200"}`}>
                      {i < current ? <CheckCheck size={9} className="text-white" /> : i === current ? (p.status === "overdue" ? <AlertCircle size={9} className="text-white" /> : <Clock size={9} className="text-white" />) : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    </div>
                    <div className={`text-[9px] font-medium text-center leading-tight max-w-[52px] ${i <= current ? "text-slate-700" : "text-slate-400"}`}>{stage}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 pt-3 mt-3 border-t border-slate-100">
                <span>Requested: {p.requestedOn}</span>
                <span>Due: {p.dueDate}</span>
                <span>By: {p.requestedBy}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsPage() {
  const [activeReport, setActiveReport] = useState("Revenue Summary");
  const reportList = [
    { name: "Revenue Summary", icon: TrendingUp },
    { name: "Procurement Report", icon: ShoppingCart },
    { name: "Vendor Analysis", icon: Building2 },
    { name: "Payment Aging", icon: CreditCard },
    { name: "Project Budget", icon: Target },
    { name: "Cash Flow", icon: Activity },
  ];
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Executive reporting and data export</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" icon={Download} size="sm">Export PDF</Btn>
          <Btn variant="outline" icon={FileText} size="sm">Export Excel</Btn>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-lg p-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 py-2">Saved Reports</div>
          {reportList.map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => setActiveReport(name)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${activeReport === name ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon size={12} />{name}
            </button>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{activeReport}</div>
                <div className="text-xs text-slate-400">Jan 2025 – Jul 2025 · Luxeworx Atelier Pvt. Ltd.</div>
              </div>
              <div className="flex gap-2">
                <select className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none cursor-pointer text-slate-700">
                  <option>This Year</option><option>Last Quarter</option><option>This Month</option>
                </select>
                <Btn variant="outline" icon={Filter} size="xs">Filters</Btn>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <MetricCard label="Total Revenue" value="₹3.71Cr" trend="+12.4% vs LY" trendUp icon={TrendingUp} color="blue" />
              <MetricCard label="Total Expenses" value="₹2.33Cr" trend="-4.1% vs LY" trendUp icon={TrendingDown} color="green" />
              <MetricCard label="Net Margin" value="37.2%" trend="+5.8% vs LY" trendUp icon={PieChart} color="purple" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
                <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 6 }} formatter={(v: number) => [fmt(v)]} />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#rg2)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#10B981" strokeWidth={1.5} fill="none" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-xs font-medium text-slate-900">Project Budget Utilization</div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Project", "Budget", "Spent", "Remaining", "Utilization", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const remaining = p.budget - p.spent;
                  const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-xs font-mono">{fmt(p.budget)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono">{fmt(p.spent)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono">{remaining >= 0 ? fmt(remaining) : <span className="text-red-600">{fmt(Math.abs(remaining))} over</span>}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><StatusPill status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage() {
  const sections = [
    { title: "Company", desc: "Business name, address, GST, branding", icon: Building2 },
    { title: "Users & Permissions", desc: "Manage team access and roles", icon: Users },
    { title: "Approval Workflows", desc: "Configure multi-level approval chains", icon: CheckCheck },
    { title: "Notifications", desc: "Email, SMS, and in-app alerts", icon: Bell },
    { title: "Integrations", desc: "Connect accounting, banking, and ERP systems", icon: Zap },
    { title: "Data & Export", desc: "Backup, archive, and export settings", icon: Download },
  ];
  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">System configuration and preferences</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sections.map(({ title, desc, icon: Icon }) => (
          <button key={title} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3 hover:shadow-sm hover:border-blue-200 transition-all cursor-pointer text-left group">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors"><Icon size={15} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
            <ChevronRight size={13} className="text-slate-400 mt-0.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="text-sm font-semibold text-slate-900 mb-4">Company Information</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Company Name", "Luxeworx Atelier Pvt. Ltd."],
            ["GST Number", "27AAALX1234F1Z2"],
            ["Industry", "Commercial Interior Design & Fit-out"],
            ["Registered Address", "Mumbai, Maharashtra – 400001"],
            ["Finance Controller", "Farhan Contractor"],
            ["ERP Version", "v3.2.1 · Enterprise"],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{l}</div>
              <div className="text-sm text-slate-900 font-medium">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
          <Btn variant="primary" icon={Edit2} size="sm">Edit Details</Btn>
          <Btn variant="outline" icon={Download} size="sm">Export Config</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">{usersData.length} team members</p>
        </div>
        <div className="flex gap-2">
          <SearchInput placeholder="Search users…" className="w-44" />
          <Btn variant="primary" icon={Plus} size="sm">Add User</Btn>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Name", "Email", "Role", "Last Login", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usersData.map((u) => (
              <tr key={u.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-white">{u.name.split(" ").map((n: string) => n[0]).join("")}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">{u.role}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400">{u.lastLogin}</td>
                <td className="px-4 py-3"><StatusPill status={u.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><Edit2 size={11} className="text-slate-400" /></button>
                    <button className="p-1 rounded hover:bg-slate-100 cursor-pointer"><MoreHorizontal size={11} className="text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage />,
    projects: <ProjectsPage />,
    vendors: <VendorsPage />,
    "purchase-orders": <PurchaseOrdersPage />,
    payments: <PaymentsPage />,
    "payment-tracker": <PaymentTrackerPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
    users: <UsersPage />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14 }}>
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar page={page} />
        <main className="flex-1 overflow-y-auto">
          {pages[page]}
        </main>
      </div>
    </div>
  );
}
