import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { CalendarDays, AlertCircle } from "lucide-react";

export default function SubDashboard() {
  const { customers, mealSkips } = useStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const dayIndex = (today.getDay() + 6) % 7; // Mon=0
  const todayStr = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIndex = (tomorrow.getDay() + 6) % 7;

  const activeSubs = customers.filter(c => c.status === 'active');
  
  // A customer is scheduled for a day index if preferred_days is empty or includes the day index
  const isScheduled = (c: any, dIndex: number) => c.preferred_days.length === 0 || c.preferred_days.includes(dIndex);
  
  const todaySkips = mealSkips.filter(s => s.skip_date === todayIso && !s.unskipped);
  const skipCustomerIds = new Set(todaySkips.map(s => s.customer_id));

  const todayPacks = activeSubs.filter(c => isScheduled(c, dayIndex) && !skipCustomerIds.has(c.id));
  const tomorrowPacks = activeSubs.filter(c => isScheduled(c, tomorrowIndex)); // Not checking skips for tomorrow for simplicity here, but could

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const weekGrid = days.map((d, i) => {
    return {
      day: d,
      index: i,
      count: activeSubs.filter(c => isScheduled(c, i)).length
    };
  });

  const selectedDayCustomers = selectedDay !== null ? activeSubs.filter(c => isScheduled(c, selectedDay)) : [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Schedule Dashboard</h2>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> {todayStr}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-primary text-primary-foreground shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Today's Packs</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-black">{todayPacks.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tomorrow's Prep</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold">{tomorrowPacks.length}</div>
          </CardContent>
        </Card>
      </div>

      {todaySkips.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm text-orange-800 dark:text-orange-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Skipped Today ({todaySkips.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-xs text-orange-700 dark:text-orange-500 space-y-1">
              {todaySkips.map(skip => {
                const c = customers.find(c => c.id === skip.customer_id);
                return <div key={skip.id}>• {c?.name || 'Unknown'}</div>;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 bg-muted/30">
          <CardTitle className="text-sm">Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {weekGrid.map(d => (
              <div 
                key={d.day} 
                onClick={() => setSelectedDay(d.index)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  d.index === dayIndex 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="text-xs text-muted-foreground font-medium mb-1">{d.day}</div>
                <div className={`text-xl font-bold ${d.index === dayIndex ? 'text-primary' : ''}`}>
                  {d.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 bg-muted/30 border-b border-border">
          <CardTitle className="text-sm">Today's List</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {todayPacks.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No packs scheduled for today.</div>
          ) : (
            todayPacks.map(c => (
              <div key={c.id} className="p-4 flex justify-between items-center">
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.used} / {c.total} used</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedDay !== null} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDay !== null ? days[selectedDay] : ''} Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="font-medium text-sm mb-2">Total expected: {selectedDayCustomers.length}</div>
            <div className="divide-y divide-border border rounded-lg">
              {selectedDayCustomers.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No customers scheduled.</div>
              ) : (
                selectedDayCustomers.map(c => (
                  <div key={c.id} className="p-3 text-sm">{c.name}</div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
