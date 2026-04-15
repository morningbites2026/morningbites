import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { dbUpd, dbDel } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, CalendarDays, ReceiptText, QrCode, Banknote, CreditCard } from "lucide-react";

export default function BillReports() {
  const { bills, refresh } = useStore();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState("today");
  const [editBillId, setEditBillId] = useState<number | null>(null);
  
  const [editName, setEditName] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editMode, setEditMode] = useState<any>("");

  const today = new Date().toLocaleDateString('en-IN');
  
  // Basic filtering for "today"
  const filteredBills = bills.filter(b => {
    if (period === "today") return b.bill_date === today;
    // ... add this week / this month logic if needed
    return true;
  });

  const totalRev = filteredBills.reduce((s, b) => s + b.total_amount, 0);
  const cashRev = filteredBills.filter(b => b.payment_mode === 'cash').reduce((s, b) => s + b.total_amount, 0);
  const upiRev = filteredBills.filter(b => b.payment_mode === 'upi').reduce((s, b) => s + b.total_amount, 0);
  const scanRev = filteredBills.filter(b => b.payment_mode === 'scanpay').reduce((s, b) => s + b.total_amount, 0);

  const handleEditOpen = (bill: any) => {
    setEditBillId(bill.id);
    setEditName(bill.customer_name || "");
    setEditTotal(bill.total_amount.toString());
    setEditMode(bill.payment_mode);
  };

  const handleSaveEdit = async () => {
    if (!editBillId) return;
    try {
      await dbUpd('bills', editBillId, {
        customer_name: editName || null,
        total_amount: Number(editTotal),
        payment_mode: editMode
      });
      toast({ title: "Bill updated" });
      setEditBillId(null);
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this bill?")) {
      try {
        await dbDel('bills', id);
        toast({ title: "Bill deleted" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const getModeIcon = (mode: string) => {
    if (mode === 'cash') return <Banknote className="w-4 h-4 text-green-600" />;
    if (mode === 'upi') return <CreditCard className="w-4 h-4 text-blue-600" />;
    return <QrCode className="w-4 h-4 text-purple-600" />;
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold flex items-center gap-2"><ReceiptText className="w-5 h-5 text-primary" /> Bill Reports</h2>
      
      <Tabs value={period} onValueChange={setPeriod} className="w-full">
        <TabsList className="w-full bg-muted/50 p-1 grid grid-cols-4 rounded-xl">
          <TabsTrigger value="today" className="rounded-lg text-xs">Today</TabsTrigger>
          <TabsTrigger value="week" className="rounded-lg text-xs">This Week</TabsTrigger>
          <TabsTrigger value="month" className="rounded-lg text-xs">This Month</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg text-xs">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs defaultValue="summary" className="w-full mt-2">
        <TabsList className="w-full bg-transparent border-b border-border rounded-none p-0 h-auto justify-start gap-4">
          <TabsTrigger value="summary" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-2 py-2">Summary</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-2 py-2">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border bg-primary text-primary-foreground shadow-md">
              <CardContent className="p-4">
                <div className="text-sm font-medium opacity-90">Total Revenue</div>
                <div className="text-2xl font-black mt-1">₹{totalRev}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Total Bills</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{filteredBills.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 pb-2 bg-muted/30">
              <CardTitle className="text-sm">Revenue by Payment Mode</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 font-medium"><Banknote className="w-4 h-4 text-green-600" /> Cash</div>
                <div className="font-bold">₹{cashRev}</div>
              </div>
              <div className="w-full bg-muted rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: `${totalRev ? (cashRev/totalRev)*100 : 0}%`}}></div></div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 font-medium"><CreditCard className="w-4 h-4 text-blue-600" /> UPI</div>
                <div className="font-bold">₹{upiRev}</div>
              </div>
              <div className="w-full bg-muted rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: `${totalRev ? (upiRev/totalRev)*100 : 0}%`}}></div></div>

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 font-medium"><QrCode className="w-4 h-4 text-purple-600" /> Scan & Pay</div>
                <div className="font-bold">₹{scanRev}</div>
              </div>
              <div className="w-full bg-muted rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{width: `${totalRev ? (scanRev/totalRev)*100 : 0}%`}}></div></div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <div className="space-y-3 pb-8">
            {filteredBills.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                <ReceiptText className="w-12 h-12 opacity-20 mb-2" />
                <p>No bills found for this period.</p>
              </div>
            ) : (
              filteredBills.map(bill => (
                <Card key={bill.id} className="border-border shadow-sm overflow-hidden">
                  <div className="p-3 bg-muted/30 flex justify-between items-center border-b border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <CalendarDays className="w-3 h-3" /> {bill.bill_date}
                    </div>
                    <div className="flex items-center gap-1">
                      {getModeIcon(bill.payment_mode)}
                      <span className="text-xs uppercase tracking-wider font-bold opacity-70">{bill.payment_mode}</span>
                    </div>
                  </div>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-base">{bill.customer_name || "Walk-in"}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {bill.items.map((it, idx) => (
                          <div key={idx}>{it.qty}x {it.name} ({it.option})</div>
                        ))}
                      </div>
                      {bill.notes && <div className="text-xs italic text-muted-foreground mt-2 border-l-2 border-primary/30 pl-2">"{bill.notes}"</div>}
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-xl font-black text-primary">₹{bill.total_amount}</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEditOpen(bill)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(bill.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editBillId} onOpenChange={(o) => !o && setEditBillId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl w-[90%]">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount (₹)</Label>
              <Input type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <RadioGroup value={editMode} onValueChange={setEditMode} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="e-cash" />
                  <Label htmlFor="e-cash">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upi" id="e-upi" />
                  <Label htmlFor="e-upi">UPI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scanpay" id="e-scan" />
                  <Label htmlFor="e-scan">Scan</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} className="w-full h-12 rounded-xl text-lg">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
