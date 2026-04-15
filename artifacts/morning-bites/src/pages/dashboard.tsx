import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    { label: "Active Subs", value: activeSubs.length },
    { label: "Today's Packs", value: todayPacks.length },
    { label: "Total Walk-ins", value: walkins.length },
    { label: "Bills Today", value: todayBills.length },
    { label: "Today's Billing", value: `₹${todayBillRev}` },
    { label: "Sub Revenue", value: `₹${subRev}` },
    { label: "Meals Served", value: totalMealsServed },
    { label: "Renewal Alerts", value: lowMeals.length }
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">Dashboard</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="shadow-sm border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="p-4 bg-muted/30">
          <CardTitle className="text-sm">Renewal Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lowMeals.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No alerts.</div>
          ) : (
            <div className="divide-y divide-border">
              {lowMeals.map(c => (
                <div key={c.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </div>
                  <Badge variant="destructive">{c.total - c.used} left</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
