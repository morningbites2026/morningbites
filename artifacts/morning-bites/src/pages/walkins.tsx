import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns, dbUpd, dbDel, logActivity, getActivityLogs, formatIST, ActivityLog } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageCircle, Edit, Trash2, Search, CalendarDays, History, Megaphone, QrCode, Banknote, CreditCard } from "lucide-react";
import { UPI_ID } from "@/lib/supabase";

export default function Walkins() {
  const { walkins, customers, packages, promotions, refresh, searchQuery } = useStore();
  const { toast } = useToast();

  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [subWalkin, setSubWalkin] = useState<any>(null);
  const [subPkgId, setSubPkgId] = useState("");
  const [subPayMode, setSubPayMode] = useState<any>("cash");
  const [subCash, setSubCash] = useState("");
  const [subQrOpen, setSubQrOpen] = useState(false);

  const [promoteWalkin, setPromoteWalkin] = useState<any>(null);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");

  const [historyWalkin, setHistoryWalkin] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filteredWalkins = walkins.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.phone.includes(searchQuery)
  );

  const activePackages = packages.filter(p => p.is_active);
  const activePromotions = promotions.filter(p => p.is_active);
  const getCustomerForPhone = (ph: string) => customers.find(c => c.phone === ph);

  const selectedPkg = activePackages.find(p => p.id.toString() === subPkgId);
  const subTotal = selectedPkg?.price || 0;
  const subCashNum = Number(subCash) || 0;
  const subChange = subCashNum - subTotal;
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=Morning+Bites&am=${subTotal}&cu=INR`;

  const handleSaveWalkin = async () => {
    if (!name.trim() || !phone.trim()) return toast({ variant: "destructive", description: "Name and phone required" });
    try {
      if (editingId) {
        await dbUpd('walkins', editingId, { name, phone });
        const cust = getCustomerForPhone(phone);
        if (cust) await dbUpd('customers', cust.id, { name, phone });
        await logActivity(cust?.id || null, 'edit', `Walk-in info updated: ${name} / ${phone}`);
        toast({ title: "Walk-in updated" });
      } else {
        const today = new Date().toISOString().split('T')[0];
        await dbIns('walkins', { name, phone, visit_date: today, is_deleted: false });
        const cust = getCustomerForPhone(phone);
        await logActivity(cust?.id || null, 'walkin_added', `New walk-in registered: ${name}`);
        toast({ title: "Walk-in added" });
        const msg = `Hello ${name}! 🌱\n\nThank you for visiting Morning Bites today! We're happy to serve you fresh, healthy sprouts food every morning.\n\nWould you like to know about our subscription packs? Ask us in store or reply to this message!\n\nMorning Bites 🌿`;
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setIsWalkinModalOpen(false);
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleOpenSubscribe = (w: any) => {
    setSubWalkin(w);
    if (activePackages.length > 0) setSubPkgId(activePackages[0].id.toString());
    setSubPayMode("cash");
    setSubCash("");
    setSubQrOpen(false);
    setIsSubModalOpen(true);
  };

  const handleSubscribe = async () => {
    if (!subWalkin || !subPkgId) return toast({ variant: "destructive", description: "Please select a package" });
    if (subPayMode === 'scanpay' && !subQrOpen) {
      setSubQrOpen(true);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingCust = getCustomerForPhone(subWalkin.phone);
      let custId: number | null = null;

      if (existingCust && existingCust.status === 'cancelled') {
        await dbUpd('customers', existingCust.id, {
          status: 'active', used: 0, total: 10,
          renew_count: existingCust.renew_count + 1,
          last_renewed: today, pack_start_date: today,
          package_id: Number(subPkgId), payment_mode: subPayMode
        });
        custId = existingCust.id;
      } else if (!existingCust) {
        const res = await dbIns<any>('customers', {
          name: subWalkin.name, phone: subWalkin.phone,
          type: 'subscribed', total: 10, used: 0,
          join_date: today, renew_count: 0, pack_start_date: today,
          status: 'active', is_deleted: false,
          preferred_days: [], package_id: Number(subPkgId), payment_mode: subPayMode
        });
        custId = res[0]?.id || null;
      } else {
        toast({ variant: "destructive", description: "Customer already has an active subscription" });
        return;
      }

      const pkg = activePackages.find(p => p.id.toString() === subPkgId);
      await logActivity(custId, 'subscribed', `Subscribed to ${pkg?.name || 'package'} for ₹${pkg?.price || 0}. Payment: ${subPayMode}`);

      toast({ title: "Subscribed successfully!" });
      setIsSubModalOpen(false);
      setSubQrOpen(false);
      refresh();

      const msg = `Hello ${subWalkin.name}! 🌱\n\nYour Sprouts Salad subscription is now active! 🎉\n\nPack: ${pkg?.name || '10 Meals'}\n✅ 10 fresh meals ready for you\n💰 ₹${pkg?.price || 0} paid via ${subPayMode}\n\nThank you for subscribing! See you every morning.\n\nMorning Bites 🌿`;
      window.open(`https://wa.me/91${subWalkin.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleOpenPromote = (w: any) => {
    setPromoteWalkin(w);
    setSelectedPromoId(activePromotions.length > 0 ? activePromotions[0].id.toString() : "");
  };

  const handleSendPromotion = async () => {
    if (!promoteWalkin) return;
    const promo = activePromotions.find(p => p.id.toString() === selectedPromoId);
    if (!promo && activePromotions.length > 0) return toast({ variant: "destructive", description: "Select a promotion" });

    const msg = promo
      ? `Hello ${promoteWalkin.name}! 🌱\n\n${promo.title}\n\n${promo.description}\n\nMorning Bites 🌿`
      : `Hello ${promoteWalkin.name}! 🌱\n\nWe're Morning Bites – your daily sprouts & healthy snack stall.\n\n✅ Get 10 fresh meals\n🍃 Healthy food every morning\n\nInterested? Visit us or reply to subscribe!\n\nMorning Bites 🌿`;

    const cust = getCustomerForPhone(promoteWalkin.phone);
    await logActivity(cust?.id || null, 'promotion_sent', `Promotion sent: ${promo?.title || 'General promotion'}`);
    window.open(`https://wa.me/91${promoteWalkin.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setPromoteWalkin(null);
  };

  const handleOpenHistory = async (w: any) => {
    setHistoryWalkin(w);
    setHistoryLoading(true);
    const cust = getCustomerForPhone(w.phone);
    if (cust) {
      const logs = await getActivityLogs(cust.id);
      setHistoryLogs(logs);
    } else {
      setHistoryLogs([]);
    }
    setHistoryLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this walk-in?")) {
      try {
        await dbUpd('walkins', id, { is_deleted: true });
        const w = walkins.find(x => x.id === id);
        const cust = w ? getCustomerForPhone(w.phone) : null;
        if (cust) {
          await dbUpd('customers', cust.id, { is_deleted: true });
          await logActivity(cust.id, 'deleted', 'Customer deleted (soft)');
        }
        toast({ title: "Deleted from walk-ins and subscriptions" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">Walk-ins</h2>
        <Button
          onClick={() => { setEditingId(null); setName(""); setPhone(""); setIsWalkinModalOpen(true); }}
          className="rounded-full shadow-md font-bold px-5"
        >
          <Plus className="w-5 h-5 mr-1.5" /> Add New
        </Button>
      </div>

      <div className="space-y-4 pb-8">
        {filteredWalkins.length === 0 ? (
          <div className="text-center p-12 bg-muted/30 rounded-3xl border border-dashed border-border flex flex-col items-center">
            <Search className="w-8 h-8 text-muted-foreground opacity-50 mb-4" />
            <h3 className="font-bold text-lg mb-1">No walk-ins found</h3>
            <p className="text-muted-foreground text-sm">Add a new walk-in or clear your search.</p>
          </div>
        ) : (
          filteredWalkins.map(w => {
            const cust = getCustomerForPhone(w.phone);
            const isSubbed = cust?.status === 'active';
            const isPrevSub = cust?.status === 'cancelled';

            return (
              <Card key={w.id} className="border border-border shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-xl shrink-0 mt-1">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold font-serif text-xl leading-tight">{w.name}</div>
                        <div className="text-sm font-medium text-muted-foreground mt-0.5">{w.phone}</div>
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-muted-foreground/80">
                          <CalendarDays className="w-3.5 h-3.5" /> {w.visit_date}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isSubbed && <Badge className="bg-primary text-primary-foreground font-bold shadow-sm">Subscribed ✓</Badge>}
                      {isPrevSub && <Badge className="bg-secondary text-secondary-foreground font-bold shadow-sm">Prev. Sub</Badge>}
                      {!isSubbed && !isPrevSub && <Badge variant="outline" className="bg-muted font-bold text-muted-foreground border-transparent">Walk-in</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                    {!isSubbed && (
                      <Button className="flex-1 min-w-[120px] rounded-xl h-10 font-bold text-[13px] shadow-sm" onClick={() => handleOpenSubscribe(w)}>
                        Subscribe
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 min-w-[80px] rounded-xl h-10 font-bold text-[13px] border-secondary/50 text-secondary-foreground bg-secondary/10 hover:bg-secondary/20"
                      onClick={() => handleOpenPromote(w)}
                    >
                      <Megaphone className="w-4 h-4 mr-1.5" /> Promote
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-border bg-card hover:bg-muted"
                      onClick={() => handleOpenHistory(w)}
                      title="History"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-border bg-card hover:bg-muted"
                      onClick={() => { setEditingId(w.id); setName(w.name); setPhone(w.phone); setIsWalkinModalOpen(true); }}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                      onClick={() => handleDelete(w.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isWalkinModalOpen} onOpenChange={setIsWalkinModalOpen}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">{editingId ? "Edit Walk-in" : "Add Walk-in"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Name</Label>
              <Input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-xl text-lg px-4" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Phone Number</Label>
              <Input type="tel" placeholder="10-digit number" value={phone} onChange={e => setPhone(e.target.value)} className="h-14 rounded-xl text-lg px-4 font-mono tracking-wider" />
            </div>
            {!editingId && (
              <div className="p-3 bg-green-50 rounded-xl text-xs text-green-800 border border-green-200 flex items-start gap-2">
                <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>A welcome WhatsApp message will be sent to the customer after saving.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveWalkin} className="w-full h-14 text-lg rounded-xl shadow-lg font-bold">
              {editingId ? "Save Changes" : "Add Walk-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubModalOpen} onOpenChange={v => { setIsSubModalOpen(v); if (!v) setSubQrOpen(false); }}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Subscribe {subWalkin?.name}</DialogTitle>
          </DialogHeader>
          {subQrOpen ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-3xl font-black text-primary">₹{subTotal}</div>
              <div className="p-3 bg-white rounded-2xl border">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`} alt="QR" className="w-40 h-40" />
              </div>
              <p className="text-sm text-muted-foreground">Scan with any UPI app</p>
              <div className="flex gap-2 w-full">
                <Button className="flex-1 h-12 rounded-xl font-bold" onClick={handleSubscribe}>Payment Done</Button>
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setSubQrOpen(false)}>Back</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Select Package</Label>
                  <Select value={subPkgId} onValueChange={setSubPkgId}>
                    <SelectTrigger className="h-14 rounded-xl text-base px-4">
                      <SelectValue placeholder="Choose a package" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activePackages.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()} className="rounded-lg py-3">
                          <div className="flex justify-between items-center w-full gap-4">
                            <span className="font-bold">{p.name}</span>
                            <span className="text-primary font-bold">₹{p.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPkg && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-sm">
                    <span className="font-bold text-primary">₹{selectedPkg.price}</span>
                    <span className="text-muted-foreground"> — {selectedPkg.name}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Payment Mode</Label>
                  <RadioGroup value={subPayMode} onValueChange={setSubPayMode} className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
                      { value: 'upi', label: 'UPI', icon: <CreditCard className="w-4 h-4" /> },
                      { value: 'scanpay', label: 'Scan', icon: <QrCode className="w-4 h-4" /> },
                    ].map(m => (
                      <div key={m.value} className="flex">
                        <RadioGroupItem value={m.value} id={`sp-${m.value}`} className="peer sr-only" />
                        <Label htmlFor={`sp-${m.value}`} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-border bg-card p-3 font-bold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-xs">
                          {m.icon} {m.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {subPayMode === 'cash' && subTotal > 0 && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
                    <Label className="text-amber-900 font-bold text-xs">Cash Received</Label>
                    <Input type="number" placeholder="₹ Amount" value={subCash} onChange={e => setSubCash(e.target.value)} className="bg-white border-amber-300 h-11" />
                    {subCash !== "" && (
                      <div className={`flex justify-between text-sm font-bold p-2 rounded-lg ${subChange >= 0 ? 'text-green-800 bg-green-50' : 'text-red-800 bg-red-50'}`}>
                        <span>{subChange >= 0 ? 'Change:' : 'Short:'}</span>
                        <span>₹{Math.abs(subChange)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleSubscribe} className="w-full h-14 text-lg rounded-xl shadow-lg font-bold">
                  {subPayMode === 'scanpay' ? 'Show QR & Activate' : 'Activate Package'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!promoteWalkin} onOpenChange={v => !v && setPromoteWalkin(null)}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Send Promotion to {promoteWalkin?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {activePromotions.length > 0 ? (
              <>
                <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Select Promotion</Label>
                <div className="space-y-2">
                  {activePromotions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPromoId(p.id.toString())}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedPromoId === p.id.toString() ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    >
                      <div className="font-bold text-sm">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">
                No active promotions yet. Create one in the Promotions tab.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSendPromotion}
              className="w-full h-14 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white shadow-lg border-none font-bold"
            >
              <MessageCircle className="w-5 h-5 mr-2" /> Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyWalkin} onOpenChange={v => !v && setHistoryWalkin(null)}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif flex items-center gap-2">
              <History className="w-5 h-5" /> {historyWalkin?.name} — History
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {historyLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
            ) : historyLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No history yet.</div>
            ) : (
              historyLogs.map(log => (
                <div key={log.id} className="p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-sm capitalize">{log.action.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-muted-foreground text-right shrink-0">{formatIST(log.created_at)}</div>
                  </div>
                  {log.description && <div className="text-xs text-muted-foreground mt-1">{log.description}</div>}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
