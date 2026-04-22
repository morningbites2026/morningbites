import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dbUpd, formatIST } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, IndianRupee, TrendingUp, ReceiptText, Banknote, CreditCard, QrCode, Share2, ClipboardList, CheckCircle2 } from "lucide-react";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function weekStart(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = x.getDate() - (day === 0 ? 6 : day - 1); // Monday
  x.setHours(0, 0, 0, 0);
  x.setDate(diff);
  return x;
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function toLocalDateStr(d: Date) {
  return d.toLocaleDateString("en-IN");
}

function openWhatsAppShare(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Dashboard() {
  const { bills, preorders, refresh } = useStore();
  const { toast } = useToast();

  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const ws = weekStart(now);
  const ms = monthStart(now);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const todayBills = bills.filter((b) => b.bill_date === todayStr);
  const todayRevenue = todayBills.reduce((s, b) => s + b.total_amount, 0);

  const weekBills = bills.filter((b) => new Date(b.created_at) >= ws);
  const weekRevenue = weekBills.reduce((s, b) => s + b.total_amount, 0);

  const monthBills = bills.filter((b) => new Date(b.created_at) >= ms);
  const monthRevenue = monthBills.reduce((s, b) => s + b.total_amount, 0);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;
    return bills
      .filter((b) => {
        const created = new Date(b.created_at);
        if (from && created < from) return false;
        if (to && created > to) return false;
        if (q) {
          const name = (b.customer_name || "walk-in").toLowerCase();
          if (!name.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bills, fromDate, toDate, historySearch]);

  const historyTotal = filteredHistory.reduce((s, b) => s + b.total_amount, 0);
  const historyCash = filteredHistory.filter((b) => b.payment_mode === "cash").reduce((s, b) => s + b.total_amount, 0);
  const historyUpi = filteredHistory.filter((b) => b.payment_mode === "upi").reduce((s, b) => s + b.total_amount, 0);
  const historyScan = filteredHistory.filter((b) => b.payment_mode === "scanpay").reduce((s, b) => s + b.total_amount, 0);

  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }, []);

  const tomorrowPreorders = useMemo(
    () => preorders.filter((p) => p.pickup_date === tomorrowIso && !p.is_fulfilled),
    [preorders, tomorrowIso]
  );

  const prepSummary = useMemo(() => {
    const map = new Map<string, { name: string; option: string; qty: number }>();
    for (const po of tomorrowPreorders) {
      for (const it of po.items) {
        const k = `${it.name}||${it.option}`;
        const existing = map.get(k);
        map.set(k, existing ? { ...existing, qty: existing.qty + it.qty } : { name: it.name, option: it.option, qty: it.qty });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [tomorrowPreorders]);

  const shareToday = () => {
    const lines = [
      `Morning Bites – Earnings`,
      ``,
      `Today (${todayStr})`,
      `Total: ₹${todayRevenue}`,
      `Bills: ${todayBills.length}`,
      `Cash: ₹${todayBills.filter((b) => b.payment_mode === "cash").reduce((s, b) => s + b.total_amount, 0)}`,
      `UPI: ₹${todayBills.filter((b) => b.payment_mode === "upi").reduce((s, b) => s + b.total_amount, 0)}`,
      `Scan & Pay: ₹${todayBills.filter((b) => b.payment_mode === "scanpay").reduce((s, b) => s + b.total_amount, 0)}`,
    ];
    openWhatsAppShare(lines.join("\n"));
  };

  const sharePrep = () => {
    if (prepSummary.length === 0) {
      toast({ description: "No preorders for tomorrow." });
      return;
    }
    const prettyDate = new Date(tomorrowIso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "2-digit" });
    const lines = [
      `Morning Bites – Tomorrow Prep`,
      `${prettyDate}`,
      ``,
      ...prepSummary.map((x) => `- ${x.qty} × ${x.name} (${x.option})`),
      ``,
      `Preorders: ${tomorrowPreorders.length}`,
    ];
    openWhatsAppShare(lines.join("\n"));
  };

  const markFulfilled = async (id: number) => {
    try {
      await dbUpd("preorders", id, { is_fulfilled: true });
      toast({ title: "Marked fulfilled" });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pb-8">
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="w-full bg-muted/50 p-1 grid grid-cols-3 rounded-xl">
          <TabsTrigger value="earnings" className="rounded-lg text-xs">Earnings</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs">History</TabsTrigger>
          <TabsTrigger value="preorders" className="rounded-lg text-xs">Preorders</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border bg-primary text-primary-foreground shadow-md">
              <CardContent className="p-4">
                <div className="text-sm font-medium opacity-90 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" /> Today
                </div>
                <div className="text-2xl font-black mt-1">₹{todayRevenue}</div>
                <div className="text-xs opacity-90 mt-1">{todayBills.length} bills</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> This Week
                </div>
                <div className="text-2xl font-black mt-1 text-foreground">₹{weekRevenue}</div>
                <div className="text-xs text-muted-foreground mt-1">{weekBills.length} bills</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm col-span-2">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ReceiptText className="w-4 h-4" /> This Month
                  </div>
                  <div className="text-3xl font-black mt-1 text-primary">₹{monthRevenue}</div>
                  <div className="text-xs text-muted-foreground mt-1">{monthBills.length} bills</div>
                </div>
                <Button variant="outline" className="rounded-full" onClick={shareToday}>
                  <Share2 className="w-4 h-4 mr-2" /> Share Today
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <Input
                placeholder="Search customer name..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-9 text-sm"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Card className="border-border bg-primary text-primary-foreground">
                  <CardContent className="p-3">
                    <div className="text-xs opacity-90">Total</div>
                    <div className="text-xl font-black">₹{historyTotal}</div>
                    <div className="text-[11px] opacity-90">{filteredHistory.length} entries</div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-3 space-y-2">
                    {[
                      { label: "Cash", icon: <Banknote className="w-3.5 h-3.5 text-green-600" />, rev: historyCash },
                      { label: "UPI", icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />, rev: historyUpi },
                      { label: "Scan", icon: <QrCode className="w-3.5 h-3.5 text-purple-600" />, rev: historyScan },
                    ].map((m) => (
                      <div key={m.label} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 font-medium">{m.icon} {m.label}</div>
                        <div className="font-bold">₹{m.rev}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                <ReceiptText className="w-12 h-12 opacity-20 mb-2" />
                <p>No entries found.</p>
              </div>
            ) : (
              filteredHistory.slice(0, 80).map((bill) => (
                <Card key={bill.id} className="border-border shadow-sm overflow-hidden">
                  <div className="p-3 bg-muted/30 flex justify-between items-center border-b border-border">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <CalendarDays className="w-3 h-3" />
                        {bill.bill_date}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">{formatIST(bill.created_at)}</div>
                    </div>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-bold">
                      {bill.payment_mode === "scanpay" ? "scan & pay" : bill.payment_mode}
                    </Badge>
                  </div>
                  <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-base truncate">{bill.customer_name || "Walk-in"}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {bill.items.map((it, idx) => (
                          <div key={idx} className="truncate">
                            {it.qty}× {it.name} ({it.option}) — ₹{it.price * it.qty}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xl font-black text-primary shrink-0">₹{bill.total_amount}</div>
                  </CardContent>
                </Card>
              ))
            )}
            {filteredHistory.length > 80 && (
              <div className="text-center text-xs text-muted-foreground">Showing latest 80 entries. Narrow the filters to see more.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preorders" className="mt-4 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 pb-2 bg-muted/30">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Tomorrow Prep ({tomorrowPreorders.length})
                </span>
                <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={sharePrep}>
                  <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {prepSummary.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">No preorders for tomorrow.</div>
              ) : (
                <div className="space-y-2">
                  {prepSummary.map((x) => (
                    <div key={`${x.name}||${x.option}`} className="flex justify-between items-center bg-muted/30 rounded-lg p-2">
                      <div className="text-sm font-medium">
                        {x.name} <span className="text-xs text-muted-foreground">({x.option})</span>
                      </div>
                      <div className="text-lg font-black text-primary">{x.qty}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {tomorrowPreorders.length > 0 && (
            <div className="space-y-3 pb-4">
              {tomorrowPreorders.map((po) => (
                <Card key={po.id} className="border-border shadow-sm overflow-hidden">
                  <div className="p-3 bg-muted/30 flex justify-between items-center border-b border-border">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{po.customer_name || "Customer"}</div>
                      <div className="text-[10px] text-muted-foreground/70 truncate">{po.phone || ""}</div>
                    </div>
                    <div className="text-lg font-black text-primary">₹{po.total_amount}</div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {po.items.map((it, idx) => (
                        <div key={idx}>{it.qty}× {it.name} ({it.option})</div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => markFulfilled(po.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Fulfilled
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
