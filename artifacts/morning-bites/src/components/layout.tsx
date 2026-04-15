import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, Menu, List, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", label: "Dashboard" },
  { path: "/billing", label: "Billing" },
  { path: "/bill-reports", label: "Bill Reports" },
  { path: "/sub-dashboard", label: "Sub Dashboard" },
  { path: "/walkins", label: "Walk-ins" },
  { path: "/subscribed", label: "Subscribed" },
  { path: "/sub-reports", label: "Sub Reports" },
  { path: "/packages", label: "Packages" },
  { path: "/menu", label: "Menu" }
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { customers, walkins, isLoading, error, searchQuery, setSearchQuery } = useStore();

  const activeSubs = customers.filter(c => c.status === 'active');
  const lowMeals = activeSubs.filter(c => (c.total - c.used) <= 2 && c.used < c.total).length;
  const packDone = activeSubs.filter(c => c.used >= c.total).length;

  return (
    <div className="min-h-[100dvh] bg-background w-full max-w-[500px] mx-auto shadow-xl flex flex-col relative pb-10 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md flex flex-col">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold font-serif tracking-wide">Morning Bites</h1>
          <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
            {isLoading ? "⚡ Connecting..." : error ? "❌ Error" : "✅ Connected"}
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="bg-primary/95 text-white/90 text-xs px-4 py-2 flex justify-between items-center border-t border-white/10 overflow-x-auto whitespace-nowrap gap-4 hide-scrollbar">
          <div className="flex items-center gap-1"><List className="w-3 h-3" /> Walk-ins: <span className="font-bold">{walkins.length}</span></div>
          <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active: <span className="font-bold">{activeSubs.length}</span></div>
          <div className={cn("flex items-center gap-1", lowMeals > 0 ? "text-secondary font-bold" : "")}>
            <AlertTriangle className="w-3 h-3" /> Low: <span>{lowMeals}</span>
          </div>
          <div className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Done: <span className="font-bold">{packDone}</span></div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 bg-primary">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-9 rounded-full focus-visible:ring-secondary"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar bg-white dark:bg-card border-b border-border">
          {tabs.map(tab => {
            const active = location === tab.path;
            return (
              <Link 
                key={tab.path} 
                href={tab.path}
                className={cn(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  active 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {children}
      </main>
    </div>
  );
}
