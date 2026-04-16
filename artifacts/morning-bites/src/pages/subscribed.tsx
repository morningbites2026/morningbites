import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbUpd, dbIns, logActivity, getActivityLogs, formatIST, ActivityLog, UPI_ID } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Check, Undo2, SkipForward, RefreshCw, Trash2, Edit, MessageCircle, ChevronLeft, ChevronRight, History, Plus, Banknote, CreditCard, QrCode } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PaymentModeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-3 gap-2">
      {[
        { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
        { value: 'upi', label: 'UPI', icon: <CreditCard className="w-4 h-4" /> },
        { value: 'scanpay', label: 'Scan', icon: <QrCode className="w-4 h-4" /> },
      ].map(m => (
        <div key={m.value}>
          <RadioGroupItem value={m.value} id={`pm-sub-${m.value}`} className="peer sr-only" />
          <Label htmlFor={`pm-sub-${m.value}`} className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all text-xs font-semibold">
            {m.icon}{m.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export default function Subscribed() {
  const { customers, packages, walkins, mealSkips, refresh, searchQuery } = useStore();
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");

  const [notifyModal, setNotifyModal] = useState<{ open: boolean; customer: any; type: string }>({ open: false, customer: null, type: "" });
  const [skipModal, setSkipModal] = useState<{ open: boolean; customer: any }>({ open: false, customer: null });
  const [skipDate, setSkipDate] = useState(new Date().toISOString().split('T')[0]);
  const [editModal, setEditModal] = useState<{ open: boolean; customer: any }>({ open: false, customer: null });
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPkg, setEditPkg] = useState("");
  const [editMode, setEditMode] = useState<any>("");
  const [weekOffset, setWeekOffset] = useState<Record<number, number>>({});

  const [cancelModal, setCancelModal] = useState<{ open: boolean; customer: any }>({ open: false, customer: null });

  const [addModal, setAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPkgId, setAddPkgId] = useState("");
  const [addPayMode, setAddPayMode] = useState("cash");
  const [addCash, setAddCash] = useState("");
  const [addQrOpen, setAddQrOpen] = useState(false);

  const [historyModal, setHistoryModal] = useState<{ open: boolean; customer: any }>({ open: false, customer: null });
  const [historyLogs, setHistoryLogs] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [mealUsedModal, setMealUsedModal] = useState<{ open: boolean; customer: any }>({ open: false, customer: null });

  const activeSubs = customers.filter(c => !c.is_deleted);

  const filteredSubs = activeSubs.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.phone.includes(searchQuery)) return false;
    if (filter === "active") return c.status === 'active' && c.used < c.total;
    if (filter === "low") return c.status === 'active' && (c.total - c.used) <= 2 && c.used < c.total;
    if (filter === "done") return c.status === 'active' && c.used >= c.total;
    if (filter === "new") return c.status === 'active' && c.renew_count === 0;
    if (filter === "renewed") return c.status === 'active' && c.renew_count > 0;
    return true;
  });

  const activePackages = packages.filter(p => p.is_active);
  const selectedAddPkg = activePackages.find(p => p.id.toString() === addPkgId);
  const addTotal = selectedAddPkg?.price || 0;
  const addCashNum = Number(addCash) || 0;
  const addChange = addCashNum - addTotal;
  const addUpiUrl = `upi://pay?pa=${UPI_ID}&pn=Morning+Bites&am=${addTotal}&cu=INR`;

  const handleAddCustomer = async () => {
    if (!addName.trim() || !addPhone.trim() || !addPkgId) return toast({ variant: "destructive", description: "All fields required" });
    if (addPayMode === 'scanpay' && !addQrOpen) { setAddQrOpen(true); return; }
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingCust = customers.find(c => c.phone === addPhone);
      let custId: number | null = null;

      if (existingCust && existingCust.status === 'cancelled') {
        await dbUpd('customers', existingCust.id, {
          name: addName, status: 'active', used: 0, total: 10,
          renew_count: existingCust.renew_count + 1,
          last_renewed: today, pack_start_date: today,
          package_id: Number(addPkgId), payment_mode: addPayMode
        });
        custId = existingCust.id;
      } else if (!existingCust) {
        const res = await dbIns<any>('customers', {
          name: addName, phone: addPhone, type: 'subscribed',
          total: 10, used: 0, join_date: today, renew_count: 0,
          pack_start_date: today, status: 'active', is_deleted: false,
          preferred_days: [], package_id: Number(addPkgId), payment_mode: addPayMode
        });
        custId = res[0]?.id || null;
        await dbIns('walkins', { name: addName, phone: addPhone, visit_date: today, is_deleted: false });
      } else {
        toast({ variant: "destructive", description: "Customer already has an active subscription" });
        return;
      }

      const pkg = selectedAddPkg;
      await logActivity(custId, 'subscribed', `Subscribed to ${pkg?.name || 'package'} for ₹${pkg?.price || 0}. Payment: ${addPayMode}`);

      toast({ title: "Customer added and subscribed!" });
      setAddModal(false);
      setAddQrOpen(false);
      setAddName(""); setAddPhone(""); setAddPkgId(""); setAddPayMode("cash"); setAddCash("");
      refresh();

      const msg = `Hello ${addName}! 🌱\n\nYour Sprouts Salad subscription is now active! 🎉\n\nPack: ${pkg?.name || '10 Meals'}\n✅ 10 fresh meals ready for you\n\nThank you for subscribing! See you every morning.\n\nMorning Bites 🌿`;
      window.open(`https://wa.me/91${addPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleUseMeal = async (c: any) => {
    try {
      await dbUpd('customers', c.id, { used: c.used + 1 });
      await logActivity(c.id, 'meal_used', `Meal used. Now ${c.used + 1} / ${c.total}`);
      refresh();
      setMealUsedModal({ open: true, customer: { ...c, used: c.used + 1 } });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleSendMealUpdate = (c: any) => {
    const remaining = c.total - c.used;
    const msg = `Hello ${c.name},\n\nMeal update for your Morning Bites pack:\n\n✅ Meals used: ${c.used}\n⏳ Remaining: ${remaining}\n\n${remaining <= 2 ? '⚠️ Your pack is running low! Visit us to renew soon.' : 'Enjoy your fresh meal! 🌿'}\n\nThank you,\nMorning Bites 🌿`;
    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setMealUsedModal({ open: false, customer: null });
  };

  const handleUndo = async (c: any) => {
    if (c.used === 0) return;
    try {
      await dbUpd('customers', c.id, { used: c.used - 1 });
      await logActivity(c.id, 'meal_undo', `Meal use undone. Now ${c.used - 1} / ${c.total}`);
      toast({ title: "Meal use undone" });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleRenew = async (c: any) => {
    if (!confirm(`Renew pack for ${c.name}?`)) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await dbUpd('customers', c.id, {
        used: 0, total: 10,
        renew_count: c.renew_count + 1,
        last_renewed: today, pack_start_date: today, status: 'active'
      });
      const pkg = packages.find(p => p.id === c.package_id);
      await logActivity(c.id, 'renewed', `Pack renewed (×${c.renew_count + 1}). Package: ${pkg?.name || 'unknown'}`);
      toast({ title: "Pack renewed successfully!" });
      refresh();

      const msg = `Hello ${c.name}! 🔄\n\nGreat news — your Morning Bites pack has been renewed! 🎉\n\n✅ 10 fresh meals ready again\n📦 Pack #${c.renew_count + 1}\n\nSee you every morning!\n\nMorning Bites 🌿`;
      window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleCancel = async (c: any) => {
    setCancelModal({ open: true, customer: c });
  };

  const handleConfirmCancel = async (sendReturn: boolean) => {
    const c = cancelModal.customer;
    if (!c) return;
    try {
      await dbUpd('customers', c.id, { status: 'cancelled' });
      await logActivity(c.id, 'cancelled', `Subscription cancelled. ${c.total - c.used} meals remaining.`);
      toast({ title: "Subscription cancelled" });
      setCancelModal({ open: false, customer: null });
      refresh();

      if (sendReturn) {
        const pkg = packages.find(p => p.id === c.package_id);
        const pricePerMeal = pkg ? Math.round(pkg.price / 10) : 0;
        const refundAmount = (c.total - c.used) * pricePerMeal;
        const msg = `Hello ${c.name},\n\nYour Morning Bites subscription has been cancelled.\n\n📊 Meals Used: ${c.used}/${c.total}\n💰 Refund Amount: ₹${refundAmount} (${c.total - c.used} meals × ₹${pricePerMeal})\n\nWe hope to see you again! 🌿\n\nMorning Bites`;
        window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleDelete = async (c: any) => {
    if (confirm("Delete this customer? They will be removed from both Subscribed and Walk-ins.")) {
      try {
        await dbUpd('customers', c.id, { is_deleted: true });
        const walkin = walkins.find(w => w.phone === c.phone);
        if (walkin) await dbUpd('walkins', walkin.id, { is_deleted: true });
        await logActivity(c.id, 'deleted', 'Customer deleted (soft)');
        toast({ title: "Customer deleted from both screens" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const sendWhatsApp = () => {
    const c = notifyModal.customer;
    if (!c) return;
    let msg = "";
    if (notifyModal.type === 'meal') {
      msg = `Hello ${c.name},\n\nMeal Update — Morning Bites 🌿\n\n✅ Meals used: ${c.used}/${c.total}\n⏳ Remaining: ${c.total - c.used}\n\nThank you!`;
    } else if (notifyModal.type === 'low') {
      msg = `Hello ${c.name},\n\nYour Morning Bites pack is running low!\n\n⚠️ Only ${c.total - c.used} meal(s) remaining\n\n🔄 Ready to renew? Visit us to activate your next pack!\n\nMorning Bites 🌿`;
    } else if (notifyModal.type === 'done') {
      msg = `Hello ${c.name},\n\nPack Complete! 🎉\n\nYou've enjoyed all ${c.total} meals in this pack.\n\n🔄 Visit us to renew and keep the momentum going!\n\nMorning Bites 🌿`;
    }
    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setNotifyModal({ open: false, customer: null, type: "" });
  };

  const handleSkip = async () => {
    const c = skipModal.customer;
    if (!c || !skipDate) return;
    try {
      await dbIns('meal_skips', { customer_id: c.id, skip_date: skipDate, notified: true, unskipped: false });
      await logActivity(c.id, 'meal_skipped', `Meal skipped for ${skipDate}`);
      const d = new Date(skipDate);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('en-IN');
      const msg = `Hello ${c.name},\n\nConfirmed — your Morning Bites pack is skipped for:\n\n📅 ${dayName}, ${dateStr}\n\nYour remaining meals stay the same. See you on your next day!\n\nMorning Bites 🌿`;
      window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      setSkipModal({ open: false, customer: null });
      toast({ title: "Meal skipped & WhatsApp opened" });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleTogglePrefDay = async (c: any, dayIdx: number) => {
    let newPrefs = [...(c.preferred_days || [])];
    if (newPrefs.length === 0) {
      newPrefs = [0, 1, 2, 3, 4, 5].filter(d => d !== dayIdx);
    } else {
      if (newPrefs.includes(dayIdx)) {
        newPrefs = newPrefs.filter(d => d !== dayIdx);
      } else {
        newPrefs.push(dayIdx);
      }
    }
    if (newPrefs.length === 6) newPrefs = [];
    try {
      await dbUpd('customers', c.id, { preferred_days: newPrefs });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const openEdit = (c: any) => {
    setEditModal({ open: true, customer: c });
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditPkg(c.package_id ? c.package_id.toString() : "");
    setEditMode(c.payment_mode);
  };

  const saveEdit = async () => {
    const c = editModal.customer;
    if (!c) return;
    try {
      await dbUpd('customers', c.id, {
        name: editName, phone: editPhone,
        package_id: editPkg ? Number(editPkg) : null,
        payment_mode: editMode
      });
      const walkin = walkins.find(w => w.phone === c.phone || w.phone === editPhone);
      if (walkin) await dbUpd('walkins', walkin.id, { name: editName, phone: editPhone });
      await logActivity(c.id, 'edit', `Info updated: name=${editName}, phone=${editPhone}, pkg=${editPkg}, mode=${editMode}`);
      toast({ title: "Customer updated" });
      setEditModal({ open: false, customer: null });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const openHistory = async (c: any) => {
    setHistoryModal({ open: true, customer: c });
    setHistoryLoading(true);
    const logs = await getActivityLogs(c.id);
    setHistoryLogs(logs);
    setHistoryLoading(false);
  };

  const getWeekDays = (offset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + offset * 7);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        iso: d.toISOString().split('T')[0],
        dayStr: DAYS[i][0],
        dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })
      };
    });
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "low", label: "Low" },
    { id: "done", label: "Done" },
    { id: "new", label: "New" },
    { id: "renewed", label: "Renewed" }
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Subscribed</h2>
        <Button onClick={() => { setAddModal(true); setAddQrOpen(false); setAddName(""); setAddPhone(""); setAddPkgId(activePackages[0]?.id.toString() || ""); setAddPayMode("cash"); setAddCash(""); }} className="rounded-full shadow-md font-bold px-4">
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>

      <div className="bg-muted p-1.5 rounded-2xl flex overflow-x-auto hide-scrollbar shadow-inner border border-border">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex-1 min-w-[60px] px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200",
              filter === f.id
                ? "bg-white dark:bg-card text-primary shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {filteredSubs.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground bg-muted/30 rounded-3xl border border-dashed">
            No subscribers match this filter.
          </div>
        ) : (
          filteredSubs.map(c => {
            const pkg = packages.find(p => p.id === c.package_id);
            const isDone = c.used >= c.total;
            const isLow = (c.total - c.used) <= 2 && !isDone;
            const progressPercent = (c.used / c.total) * 100;
            const isWalkin = walkins.some(w => w.phone === c.phone);
            const offset = weekOffset[c.id] || 0;
            const weekDays = getWeekDays(offset);

            return (
              <Card key={c.id} className={cn("border border-border shadow-sm overflow-hidden transition-all duration-200", c.status === 'cancelled' ? 'opacity-60' : 'hover:shadow-md')}>
                <div className={cn("h-1.5 w-full", isDone ? 'bg-gray-400' : isLow ? 'bg-secondary' : 'bg-primary')}></div>

                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold font-serif text-xl leading-tight">{c.name}</div>
                      <div className="text-sm font-medium text-muted-foreground mt-0.5">{c.phone}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {c.status === 'cancelled' ? (
                        <Badge variant="destructive" className="font-bold">Cancelled</Badge>
                      ) : isDone ? (
                        <Badge className="bg-gray-200 text-gray-700 font-bold">Pack Done</Badge>
                      ) : isLow ? (
                        <Badge className="bg-secondary text-secondary-foreground font-bold">Low: {c.total - c.used} left</Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary font-bold border-primary/20">{c.total - c.used} left</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isWalkin && <Badge variant="secondary" className="text-[11px] rounded-lg">Walk-in</Badge>}
                    {c.renew_count === 0 ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] rounded-lg">New User</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] rounded-lg">Renewed ×{c.renew_count}</Badge>
                    )}
                    {pkg && <Badge variant="outline" className="text-[11px] rounded-lg">{pkg.name}</Badge>}
                    <Badge variant="outline" className="text-[11px] rounded-lg uppercase">{c.payment_mode}</Badge>
                  </div>

                  <div className="space-y-2 bg-muted/20 p-3 rounded-xl border border-border">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Meals Used</span>
                      <span className="text-foreground">{c.used} / {c.total}</span>
                    </div>
                    <Progress value={progressPercent} className={cn("h-3 bg-muted", isDone ? '[&>div]:bg-gray-400' : isLow ? '[&>div]:bg-secondary' : '[&>div]:bg-primary')} />
                  </div>

                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2 bg-muted/30 border-b border-border">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Schedule</div>
                      <div className="flex items-center gap-1 bg-background rounded-lg border border-border">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => setWeekOffset(p => ({ ...p, [c.id]: offset - 1 }))}>
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <span className="text-[10px] font-bold w-12 text-center">{offset === 0 ? 'This Wk' : offset > 0 ? `+${offset} Wk` : `${offset} Wk`}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => setWeekOffset(p => ({ ...p, [c.id]: offset + 1 }))}>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex p-2 gap-1.5 bg-muted/10">
                      {weekDays.map((d, i) => {
                        const isScheduled = c.preferred_days.length === 0 || c.preferred_days.includes(i);
                        const skip = mealSkips.find(s => s.customer_id === c.id && s.skip_date === d.iso && !s.unskipped);
                        const isSkipped = !!skip;
                        const isToday = d.iso === new Date().toISOString().split('T')[0];
                        return (
                          <div
                            key={i}
                            onClick={() => handleTogglePrefDay(c, i)}
                            className={cn(
                              "flex flex-col items-center justify-center flex-1 py-2 rounded-lg cursor-pointer border-2 transition-all duration-200",
                              isSkipped ? 'bg-orange-50 border-orange-200 text-orange-800' :
                                isScheduled ? 'bg-primary border-primary text-primary-foreground shadow-md' :
                                  'bg-card border-transparent text-muted-foreground hover:border-border',
                              isToday && !isScheduled ? 'ring-2 ring-primary/30 ring-offset-1' : ''
                            )}
                          >
                            <div className="text-[11px] font-bold">{d.dayStr}</div>
                            <div className={cn("text-[10px] mt-0.5 font-medium", isScheduled ? 'opacity-90' : 'opacity-60')}>{d.dateStr.split('/')[0]}</div>
                            {isSkipped && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex gap-3 mb-3">
                      <Button
                        onClick={() => handleUseMeal(c)}
                        disabled={isDone || c.status === 'cancelled'}
                        className="flex-1 h-14 rounded-xl shadow-md font-bold text-lg"
                      >
                        <Check className="w-5 h-5 mr-2" /> Mark Used
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleUndo(c)}
                        disabled={c.used === 0 || c.status === 'cancelled'}
                        className="w-14 h-14 rounded-xl border-border bg-card hover:bg-muted"
                      >
                        <Undo2 className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {isDone ? (
                        <Button
                          onClick={() => handleRenew(c)}
                          disabled={c.status === 'cancelled'}
                          className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold"
                        >
                          <RefreshCw className="w-4 h-4 mr-1.5" /> Renew
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setNotifyModal({ open: true, customer: c, type: isLow ? 'low' : 'meal' })}
                          disabled={c.status === 'cancelled'}
                          className="flex-1 h-10 rounded-lg border-primary/20 text-primary hover:bg-primary/5 font-semibold"
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" /> Notify
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => { setSkipModal({ open: true, customer: c }); setSkipDate(new Date().toISOString().split('T')[0]); }}
                        disabled={isDone || c.status === 'cancelled'}
                        className="w-10 h-10 rounded-lg p-0 border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100"
                        title="Skip Meal"
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>

                      <Button variant="outline" className="w-10 h-10 rounded-lg p-0" onClick={() => openHistory(c)} title="History">
                        <History className="w-4 h-4" />
                      </Button>

                      <Button variant="outline" className="w-10 h-10 rounded-lg p-0" onClick={() => openEdit(c)} title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>

                      {c.status !== 'cancelled' && (
                        <Button variant="outline" className="w-10 h-10 rounded-lg p-0 border-red-200 text-red-600 bg-red-50 hover:bg-red-100" onClick={() => handleCancel(c)} title="Cancel Sub">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}

                      <Button variant="outline" className="w-10 h-10 rounded-lg p-0 border-red-300 text-red-700 bg-red-100 hover:bg-red-200" onClick={() => handleDelete(c)} title="Delete Customer">
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      <Dialog open={addModal} onOpenChange={v => { setAddModal(v); if (!v) setAddQrOpen(false); }}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Add Subscriber</DialogTitle>
          </DialogHeader>
          {addQrOpen ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-3xl font-black text-primary">₹{addTotal}</div>
              <div className="p-3 bg-white rounded-2xl border">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(addUpiUrl)}`} alt="QR" className="w-40 h-40" />
              </div>
              <div className="flex gap-2 w-full">
                <Button className="flex-1 h-12 rounded-xl font-bold" onClick={handleAddCustomer}>Payment Done</Button>
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setAddQrOpen(false)}>Back</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input placeholder="Enter name" value={addName} onChange={e => setAddName(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input type="tel" placeholder="10-digit number" value={addPhone} onChange={e => setAddPhone(e.target.value)} className="h-12 rounded-xl font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Package</Label>
                  <Select value={addPkgId} onValueChange={setAddPkgId}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Choose a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePackages.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} — ₹{p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAddPkg && (
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-sm">
                    Amount: <span className="font-bold text-primary">₹{selectedAddPkg.price}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <PaymentModeSelect value={addPayMode} onChange={setAddPayMode} />
                </div>
                {addPayMode === 'cash' && addTotal > 0 && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                    <Label className="text-amber-900 font-bold text-xs">Cash Received</Label>
                    <Input type="number" placeholder="₹" value={addCash} onChange={e => setAddCash(e.target.value)} className="bg-white border-amber-300 h-11" />
                    {addCash !== "" && (
                      <div className={`flex justify-between text-sm font-bold p-2 rounded-lg ${addChange >= 0 ? 'text-green-800 bg-green-50' : 'text-red-800 bg-red-50'}`}>
                        <span>{addChange >= 0 ? 'Change:' : 'Short:'}</span>
                        <span>₹{Math.abs(addChange)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleAddCustomer} className="w-full h-14 text-lg rounded-xl font-bold">
                  {addPayMode === 'scanpay' ? 'Show QR & Activate' : 'Activate Subscription'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Notify Modal */}
      <Dialog open={notifyModal.open} onOpenChange={o => !o && setNotifyModal({ ...notifyModal, open: false })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Send Notification</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-muted-foreground">Choose a message template for <span className="font-bold text-foreground">{notifyModal.customer?.name}</span>:</p>
            {['meal', 'low', 'done'].map(type => (
              <button
                key={type}
                onClick={() => setNotifyModal(prev => ({ ...prev, type }))}
                className={cn(
                  "w-full text-left p-3 rounded-xl border-2 transition-all",
                  notifyModal.type === type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="font-bold text-sm capitalize">
                  {type === 'meal' ? 'Meal Update' : type === 'low' ? 'Renew Pack (Low)' : 'Pack Done'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {type === 'meal' ? `Meals: ${notifyModal.customer?.used}/${notifyModal.customer?.total} used` :
                    type === 'low' ? `${notifyModal.customer?.total - notifyModal.customer?.used} meals left — urge renewal` :
                      'Pack complete — request renewal'}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={sendWhatsApp} className="w-full h-14 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meal Used WhatsApp Prompt */}
      <Dialog open={mealUsedModal.open} onOpenChange={o => !o && setMealUsedModal({ open: false, customer: null })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Meal Marked Used ✓</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <div className="text-4xl font-black text-primary">{mealUsedModal.customer?.used} / {mealUsedModal.customer?.total}</div>
            <div className="text-sm text-muted-foreground">Send a meal update to {mealUsedModal.customer?.name}?</div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={() => handleSendMealUpdate(mealUsedModal.customer)} className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Send WhatsApp Update
            </Button>
            <Button variant="outline" onClick={() => setMealUsedModal({ open: false, customer: null })} className="w-full h-12 rounded-xl">
              Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Modal */}
      <Dialog open={skipModal.open} onOpenChange={o => !o && setSkipModal({ ...skipModal, open: false })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Skip Meal</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label>Skip Date</Label>
              <Input type="date" value={skipDate} onChange={e => setSkipDate(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="p-4 bg-primary/5 rounded-xl text-sm text-primary border border-primary/20">
              A skip confirmation message will be sent to {skipModal.customer?.name} on WhatsApp.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSkip} className="w-full h-14 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Confirm Skip & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModal.open} onOpenChange={o => !o && setCancelModal({ open: false, customer: null })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-red-600">Cancel Subscription</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Cancel subscription for <span className="font-bold text-foreground">{cancelModal.customer?.name}</span>?</p>
            {cancelModal.customer && (() => {
              const pkg = packages.find(p => p.id === cancelModal.customer.package_id);
              const pricePerMeal = pkg ? Math.round(pkg.price / 10) : 0;
              const remaining = cancelModal.customer.total - cancelModal.customer.used;
              const refund = remaining * pricePerMeal;
              return (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="font-bold text-sm text-amber-900">Meal Return Calculation</div>
                  <div className="text-sm text-amber-800 space-y-1">
                    <div>Meals Used: <span className="font-bold">{cancelModal.customer.used}/{cancelModal.customer.total}</span></div>
                    <div>Remaining Meals: <span className="font-bold">{remaining}</span></div>
                    <div>Price per Meal: <span className="font-bold">₹{pricePerMeal}</span></div>
                    <div className="text-base font-black pt-1">Refund Amount: ₹{refund}</div>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button onClick={() => handleConfirmCancel(true)} className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Cancel & Send Refund Details
            </Button>
            <Button variant="outline" onClick={() => handleConfirmCancel(false)} className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50">
              Cancel Without Notification
            </Button>
            <Button variant="ghost" onClick={() => setCancelModal({ open: false, customer: null })} className="w-full h-10 rounded-xl">
              Keep Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={o => !o && setEditModal({ ...editModal, open: false })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Edit Subscriber</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-12 rounded-xl font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={editPkg} onValueChange={setEditPkg}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name} — ₹{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <RadioGroup value={editMode} onValueChange={setEditMode} className="flex gap-4">
                {['cash', 'upi', 'scanpay'].map(m => (
                  <div key={m} className="flex items-center space-x-2">
                    <RadioGroupItem value={m} id={`em-${m}`} />
                    <Label htmlFor={`em-${m}`} className="capitalize">{m === 'scanpay' ? 'Scan' : m}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-200">
              Changes will also update this customer's Walk-in record.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="w-full h-12 rounded-xl text-base font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyModal.open} onOpenChange={o => !o && setHistoryModal({ open: false, customer: null })}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif flex items-center gap-2">
              <History className="w-5 h-5" /> {historyModal.customer?.name} — History
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {historyLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
            ) : historyLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No activity recorded yet.</div>
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
