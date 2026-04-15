import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UPI_ID } from "@/lib/supabase";
import { Plus, Minus, Receipt, QrCode } from "lucide-react";

export default function Billing() {
  const { menuItems, refresh } = useStore();
  const { toast } = useToast();
  
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'scanpay'>('cash');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const activeMenuItems = menuItems.filter(m => m.is_active).sort((a, b) => a.sort_order - b.sort_order);

  const handleQtyChange = (itemId: number, optIdx: number, delta: number) => {
    const key = `${itemId}-${optIdx}`;
    setQuantities(prev => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const getCartItems = () => {
    const items: Array<{name: string, option: string, price: number, qty: number}> = [];
    let total = 0;
    
    activeMenuItems.forEach(item => {
      item.options.forEach((opt, idx) => {
        const qty = quantities[`${item.id}-${idx}`] || 0;
        if (qty > 0) {
          items.push({
            name: item.name,
            option: opt.name,
            price: opt.price,
            qty
          });
          total += opt.price * qty;
        }
      });
    });
    
    return { items, total };
  };

  const { items, total } = getCartItems();

  const handleGenerateBill = async () => {
    if (items.length === 0) {
      toast({ variant: "destructive", description: "Add at least one item." });
      return;
    }
    
    if (paymentMode === 'scanpay' && !showQrModal) {
      setShowQrModal(true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const today = new Date().toLocaleDateString('en-IN');
      await dbIns('bills', {
        customer_name: customerName || null,
        items,
        total_amount: total,
        payment_mode: paymentMode,
        notes: notes || null,
        bill_date: today
      });
      
      toast({ title: "Bill generated successfully" });
      
      // Reset form
      setCustomerName("");
      setNotes("");
      setPaymentMode("cash");
      setQuantities({});
      setCashReceived("");
      setShowQrModal(false);
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=Morning+Bites&am=${total}&cu=INR`;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> New Bill</h2>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Customer Name (Optional)</Label>
            <Input 
              placeholder="Enter name" 
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base">Menu Items</Label>
            <div className="flex flex-col gap-3">
              {activeMenuItems.map(item => (
                <div key={item.id} className="flex flex-col gap-2">
                  <div className="font-semibold text-sm">{item.name}</div>
                  {item.options.map((opt, idx) => {
                    const qty = quantities[`${item.id}-${idx}`] || 0;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{opt.name}</span>
                          <span className="text-xs text-muted-foreground">₹{opt.price}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleQtyChange(item.id, idx, -1)}
                            disabled={qty === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-6 text-center font-bold text-lg">{qty}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleQtyChange(item.id, idx, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex justify-between items-end">
              <Label className="text-base text-muted-foreground">Total Amount</Label>
              <div className="text-3xl font-black text-primary">₹{total}</div>
            </div>

            <div className="space-y-3">
              <Label>Payment Mode</Label>
              <RadioGroup 
                value={paymentMode} 
                onValueChange={(val: any) => setPaymentMode(val)}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                  <Label 
                    htmlFor="cash" 
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    Cash
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="upi" id="upi" className="peer sr-only" />
                  <Label 
                    htmlFor="upi" 
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    UPI
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="scanpay" id="scanpay" className="peer sr-only" />
                  <Label 
                    htmlFor="scanpay" 
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-1"><QrCode className="w-4 h-4" /> Scan</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMode === 'cash' && total > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
                <Label className="text-amber-900 dark:text-amber-500">Cash Received</Label>
                <Input 
                  type="number" 
                  placeholder="₹ Amount" 
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  className="bg-white dark:bg-black/50 border-amber-300 dark:border-amber-800"
                />
                {cashReceived && Number(cashReceived) >= total && (
                  <div className="flex justify-between items-center text-amber-900 dark:text-amber-500 font-medium">
                    <span>Change to return:</span>
                    <span className="text-xl font-bold">₹{Number(cashReceived) - total}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Any special requests..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full text-lg h-14 rounded-xl shadow-lg hover-elevate-2 transition-all" 
            onClick={handleGenerateBill}
            disabled={isSubmitting || items.length === 0}
          >
            {paymentMode === 'scanpay' ? "Generate & Show QR" : "Generate Bill"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md text-center max-w-[90%] w-full rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-center">Scan & Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
            <div className="text-4xl font-black text-primary">₹{total}</div>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`} 
                alt="UPI QR Code" 
                className="w-48 h-48"
              />
            </div>
            <div className="text-sm text-muted-foreground">Scan with any UPI app</div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button 
              className="w-full h-12 text-lg rounded-xl" 
              onClick={handleGenerateBill}
              disabled={isSubmitting}
            >
              Payment Done
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl" 
              onClick={() => {
                setShowQrModal(false);
                setPaymentMode('cash');
              }}
            >
              Change to Cash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
