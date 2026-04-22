import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Minus, ClipboardList, CalendarDays, Banknote, CreditCard, QrCode } from "lucide-react";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Preorder() {
  const { menuItems, refresh } = useStore();
  const { toast } = useToast();

  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }, []);

  const [pickupDate, setPickupDate] = useState(tomorrowIso);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "scanpay">("cash");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMenuItems = menuItems
    .filter((m) => m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleQtyChange = (itemId: number, optIdx: number, delta: number) => {
    const key = `${itemId}-${optIdx}`;
    setQuantities((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const { items, total } = useMemo(() => {
    const out: Array<{ name: string; option: string; price: number; qty: number }> = [];
    let sum = 0;
    activeMenuItems.forEach((item) => {
      item.options.forEach((opt, idx) => {
        const qty = quantities[`${item.id}-${idx}`] || 0;
        if (qty > 0) {
          out.push({ name: item.name, option: opt.name, price: opt.price, qty });
          sum += opt.price * qty;
        }
      });
    });
    return { items: out, total: sum };
  }, [activeMenuItems, quantities]);

  const handleSave = async () => {
    if (!pickupDate) {
      toast({ variant: "destructive", description: "Select pickup date." });
      return;
    }
    if (items.length === 0) {
      toast({ variant: "destructive", description: "Add at least one item." });
      return;
    }

    setIsSubmitting(true);
    try {
      await dbIns("preorders", {
        customer_name: customerName || null,
        phone: phone || null,
        pickup_date: pickupDate,
        items,
        total_amount: total,
        payment_mode: paymentMode,
        notes: notes || null,
        is_fulfilled: false,
      });
      toast({ title: "Preorder saved" });
      setCustomerName("");
      setPhone("");
      setNotes("");
      setPaymentMode("cash");
      setQuantities({});
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Preorder
        </h2>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" /> Pickup Date
            </Label>
            <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer Name (Optional)</Label>
              <Input placeholder="Enter name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input placeholder="10-digit" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base">Menu Items</Label>
            <div className="flex flex-col gap-3">
              {activeMenuItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{item.name}</span>
                    {(item.category || "daily") === "week_special" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold">
                        Week Special
                      </span>
                    )}
                  </div>
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
                {[
                  { value: "cash", label: "Cash", icon: <Banknote className="w-4 h-4" /> },
                  { value: "upi", label: "UPI", icon: <CreditCard className="w-4 h-4" /> },
                  { value: "scanpay", label: "Scan & Pay", icon: <QrCode className="w-4 h-4" /> },
                ].map((m) => (
                  <div key={m.value}>
                    <RadioGroupItem value={m.value} id={`po-pm-${m.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`po-pm-${m.value}`}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-xs font-semibold"
                    >
                      {m.icon}
                      {m.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button className="w-full text-lg h-14 rounded-xl shadow-lg" onClick={handleSave} disabled={isSubmitting || items.length === 0}>
            Save Preorder
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

