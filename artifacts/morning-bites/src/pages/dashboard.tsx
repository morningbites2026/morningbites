import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, ShoppingBag, Receipt, IndianRupee, TrendingUp, Utensils, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { customers, walkins, bills, packages } = useStore();

  const today = new Date();
  const dayIndex = (today.getDay() + 6) % 7; // Mon=0
  const todayStr = today.toLocaleDateString('en-IN');

  const activeSubs = customers.filter(c => c.status === 'active');
  const todayPacks = activeSubs.filter(c => c.preferred_days.length === 0 || c.preferred_days.includes(dayIndex));
  const todayBills = bills.filter(b => b.bill_date === todayStr);
  const todayBillRev = todayBills.reduce((sum, b) => sum + b.total_amount, 0);
  
  const subRev = activeSubs.reduce((sum, c) => {
    const pkg = packages.find(p => p.id === c.package_id);
    return sum + ((c.renew_count + 1) * (pkg?.price || 0));
  }, 0);

  const totalMealsServed = customers.reduce((sum, c) => sum + c.used, 0);
  const lowMeals = activeSubs.filter(c => (c.total - c.used) <= 2 && c.used < c.total);

  const stats = [
    { label: "Active Subs", value: activeSubs.length, icon: Users, color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" },
    { label: "Today's Packs", value: todayPacks.length, icon: Package, color: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800" },
    { label: "Total Walk-ins", value: walkins.length, icon: ShoppingBag, color: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800" },
    { label: "Bills Today", value: todayBills.length, icon: Receipt, color: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" },
    { label: "Today's Billing", value: `₹${todayBillRev}`, icon: IndianRupee, color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" },
    { label: "Sub Revenue", value: `₹${subRev}`, icon: TrendingUp, color: "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800" },
    { label: "Meals Served", value: totalMealsServed, icon: Utensils, color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800" },
    { label: "Renewal Alerts", value: lowMeals.length, icon: AlertTriangle, color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800" }
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className={`border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${s.color.split(' ')[0]} dark:bg-card`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${s.color.split(' ')[1].replace('text-', 'bg-')}`}></div>
              <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-serif font-bold text-foreground">{s.value}</div>
                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {lowMeals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-5 bg-secondary rounded-full"></div>
            <h3 className="font-bold text-lg">Renewal Alerts</h3>
          </div>
          <div className="flex flex-col gap-3">
            {lowMeals.map(c => (
              <Card key={c.id} className="border-secondary/30 bg-secondary/5 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground font-serif font-bold text-lg">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-base leading-tight font-serif">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">{c.phone}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-bold px-3 py-1 text-sm border-none shadow-sm">
                    {c.total - c.used} left
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pb-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-5 bg-primary rounded-full"></div>
          <h3 className="font-bold text-lg">Today's Packs</h3>
        </div>
        
        {todayPacks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
            No packs scheduled for today.
          </div>
        ) : (
          <Card className="shadow-sm overflow-hidden border-border">
            <div className="divide-y divide-border">
              {todayPacks.map(c => (
                <div key={c.id} className="p-4 flex justify-between items-center bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <div className="font-bold font-serif text-base">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-semibold">
                    {c.total - c.used} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
