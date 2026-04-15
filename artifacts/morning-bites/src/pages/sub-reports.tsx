import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, CreditCard, QrCode, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SubReports() {
  const { customers, packages } = useStore();

  const activeSubs = customers.filter(c => c.status === 'active' && !c.is_deleted);
  const activePacks = activeSubs.filter(c => c.used < c.total);
  const cancelled = customers.filter(c => c.status === 'cancelled' && !c.is_deleted);
  
  const totalMealsServed = customers.reduce((s, c) => s + c.used, 0);

  let totalRev = 0;
  let cashRev = 0;
  let upiRev = 0;
  let scanRev = 0;

  activeSubs.forEach(c => {
    const pkg = packages.find(p => p.id === c.package_id);
    const rev = (c.renew_count + 1) * (pkg?.price || 0);
    totalRev += rev;
    if (c.payment_mode === 'cash') cashRev += rev;
    if (c.payment_mode === 'upi') upiRev += rev;
    if (c.payment_mode === 'scanpay') scanRev += rev;
  });

  const alerts = activeSubs.filter(c => (c.total - c.used) <= 2 && c.used < c.total);
  const newCust = activeSubs.filter(c => c.renew_count === 0);
  const renewedCust = activeSubs.filter(c => c.renew_count > 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-8">
      <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Subscription Reports</h2>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border bg-primary text-primary-foreground shadow-md col-span-2">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-sm font-medium opacity-90">Total Sub Revenue</div>
              <div className="text-3xl font-black mt-1">₹{totalRev}</div>
            </div>
            <Users className="w-10 h-10 opacity-20" />
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Subscribed</div>
            <div className="text-2xl font-bold mt-1">{activeSubs.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Active Packs</div>
            <div className="text-2xl font-bold mt-1">{activePacks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Meals Served</div>
            <div className="text-2xl font-bold mt-1">{totalMealsServed}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 pb-2 bg-muted/30">
          <CardTitle className="text-sm">Revenue by Payment Mode</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 font-medium"><Banknote className="w-4 h-4 text-green-600" /> Cash</div>
            <div className="font-bold">₹{cashRev}</div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{width: `${totalRev ? (cashRev/totalRev)*100 : 0}%`}}></div></div>
          
          <div className="flex justify-between items-center text-sm mt-3">
            <div className="flex items-center gap-2 font-medium"><CreditCard className="w-4 h-4 text-blue-600" /> UPI</div>
            <div className="font-bold">₹{upiRev}</div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${totalRev ? (upiRev/totalRev)*100 : 0}%`}}></div></div>

          <div className="flex justify-between items-center text-sm mt-3">
            <div className="flex items-center gap-2 font-medium"><QrCode className="w-4 h-4 text-purple-600" /> Scan & Pay</div>
            <div className="font-bold">₹{scanRev}</div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${totalRev ? (scanRev/totalRev)*100 : 0}%`}}></div></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-orange-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Renewal Alerts</h3>
            <div className="flex flex-col gap-2">
              {alerts.map(c => (
                <div key={c.id} className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl flex justify-between items-center">
                  <div className="text-sm font-semibold">{c.name} <span className="font-normal text-muted-foreground ml-1 text-xs">{c.phone}</span></div>
                  <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">{c.total - c.used} left</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {newCust.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-sm text-blue-600">🆕 New Customers</h3>
            <div className="flex flex-col gap-2">
              {newCust.slice(0, 5).map(c => (
                <div key={c.id} className="p-3 bg-card border border-border rounded-xl flex justify-between items-center shadow-sm">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.join_date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cancelled.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-sm text-destructive">❌ Cancelled</h3>
            <div className="flex flex-col gap-2">
              {cancelled.slice(0, 5).map(c => (
                <div key={c.id} className="p-3 bg-card border border-border rounded-xl flex justify-between items-center shadow-sm opacity-70">
                  <div className="text-sm font-medium line-through decoration-destructive/50">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
