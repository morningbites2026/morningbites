import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, List, CheckCircle2, AlertTriangle, RefreshCw, LayoutDashboard, Receipt, BarChart2, CalendarDays, Users, Leaf, TrendingUp, Package, UtensilsCrossed } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/billing", label: "Billing", icon: Receipt },
  { path: "/bill-reports", label: "Bill Reports", icon: BarChart2 },
  { path: "/sub-dashboard", label: "Schedule", icon: CalendarDays },
  { path: "/walkins", label: "Walk-ins", icon: Users },
  { path: "/subscribed", label: "Subscribed", icon: Leaf },
  { path: "/sub-reports", label: "Reports", icon: TrendingUp },
  { path: "/packages", label: "Packages", icon: Package },
  { path: "/menu", label: "Menu", icon: UtensilsCrossed }
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { customers, walkins, isLoading, error, searchQuery, setSearchQuery } = useStore();

  const activeSubs = customers.filter(c => c.status === 'active');
  const lowMeals = activeSubs.filter(c => (c.total - c.used) <= 2 && c.used < c.total).length;
  const packDone = activeSubs.filter(c => c.used >= c.total).length;

  return (
    <div className="min-h-[100dvh] bg-background w-full max-w-[500px] mx-auto shadow-2xl flex flex-col relative pb-10 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-brand text-primary-foreground shadow-lg flex flex-col rounded-b-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-secondary text-secondary-foreground p-1.5 rounded-lg shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-serif tracking-wide leading-none pt-1">Morning Bites</h1>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md shadow-inner border border-white/10">
            {isLoading ? "Syncing..." : error ? "Offline" : "Online"}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60 transition-colors group-focus-within:text-primary-foreground" />
            <Input 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10 rounded-full h-10 focus-visible:ring-secondary focus-visible:bg-white/20 transition-all shadow-inner"
            />
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar snap-x">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shrink-0 snap-start">
            <List className="w-3.5 h-3.5 opacity-80" /> 
            <span className="text-xs font-medium opacity-90">Walk-ins</span>
            <span className="font-bold text-sm bg-white/20 px-1.5 rounded-md">{walkins.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shrink-0 snap-start">
            <CheckCircle2 className="w-3.5 h-3.5 opacity-80" /> 
            <span className="text-xs font-medium opacity-90">Active</span>
            <span className="font-bold text-sm bg-white/20 px-1.5 rounded-md">{activeSubs.length}</span>
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md shrink-0 snap-start transition-colors", lowMeals > 0 ? "bg-secondary/20 border-secondary/40 text-secondary" : "bg-white/10 border-white/10")}>
            <AlertTriangle className="w-3.5 h-3.5 opacity-80" /> 
            <span className="text-xs font-medium opacity-90">Low</span>
            <span className={cn("font-bold text-sm px-1.5 rounded-md", lowMeals > 0 ? "bg-secondary/30 text-secondary-foreground" : "bg-white/20")}>{lowMeals}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shrink-0 snap-start">
            <RefreshCw className="w-3.5 h-3.5 opacity-80" /> 
            <span className="text-xs font-medium opacity-90">Done</span>
            <span className="font-bold text-sm bg-white/20 px-1.5 rounded-md">{packDone}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar bg-card border-b border-border shadow-sm text-foreground">
          {tabs.map(tab => {
            const active = location === tab.path;
            const Icon = tab.icon;
            return (
              <Link 
                key={tab.path} 
                href={tab.path}
                className={cn(
                  "px-4 py-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-[3px]",
                  active 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-4 h-4", active ? "text-primary" : "opacity-70")} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
