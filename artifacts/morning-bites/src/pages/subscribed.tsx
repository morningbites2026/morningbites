import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbUpd, dbIns } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Undo2, SkipForward, RefreshCw, Trash2, Edit, Send, ChevronLeft, ChevronRight, CalendarDays, History } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Subscribed() {
  const { customers, packages, walkins, mealSkips, refresh, searchQuery } = useStore();
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [notifyModal, setNotifyModal] = useState<{open: boolean, customer: any, type: string}>({open: false, customer: null, type: ""});
  
  const [skipModal, setSkipModal] = useState<{open: boolean, customer: any}>({open: false, customer: null});
  const [skipDate, setSkipDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [editModal, setEditModal] = useState<{open: boolean, customer: any}>({open: false, customer: null});
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPkg, setEditPkg] = useState("");
  const [editMode, setEditMode] = useState<any>("");

  const [weekOffset, setWeekOffset] = useState<Record<number, number>>({}); // Customer ID -> week offset

  const activeSubs = customers.filter(c => !c.is_deleted);
  
  const filteredSubs = activeSubs.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.phone.includes(searchQuery)) {
      return false;
    }
    if (filter === "active") return c.status === 'active' && c.used < c.total;
    if (filter === "low") return c.status === 'active' && (c.total - c.used) <= 2 && c.used < c.total;
    if (filter === "done") return c.status === 'active' && c.used >= c.total;
    if (filter === "new") return c.status === 'active' && c.renew_count === 0;
    if (filter === "renewed") return c.status === 'active' && c.renew_count > 0;
    return true; // all
  });

  const handleUseMeal = async (c: any) => {
    try {
      await dbUpd('customers', c.id, { used: c.used + 1 });
      toast({ title: "Meal used" });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleUndo = async (c: any) => {
    if (c.used === 0) return;
    try {
      await dbUpd('customers', c.id, { used: c.used - 1 });
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
        used: 0,
        total: 10,
        renew_count: c.renew_count + 1,
        last_renewed: today,
        pack_start_date: today,
        status: 'active'
      });
      toast({ title: "Pack renewed successfully!" });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleCancel = async (c: any) => {
    if (confirm("Cancel this subscription?")) {
      try {
        await dbUpd('customers', c.id, { status: 'cancelled' });
        toast({ title: "Subscription cancelled" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const handleDelete = async (c: any) => {
    if (confirm("Delete this customer? This is irreversible in the UI.")) {
      try {
        await dbUpd('customers', c.id, { is_deleted: true });
        toast({ title: "Customer deleted" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const openNotify = (customer: any, type: string) => {
    setNotifyModal({ open: true, customer, type });
  };

  const sendWhatsApp = () => {
    const c = notifyModal.customer;
    if (!c) return;
    let msg = "";
    
    if (notifyModal.type === 'meal') {
      msg = `Hello ${c.name},\n\nMeal update for your Morning Bites pack:\n\n✅ Meals used: ${c.used}\n⏳ Remaining: ${c.total - c.used}\n📦 Pack: ${c.renew_count + 1} of 10\n\nThank you for choosing Morning Bites! 🌿`;
    } else if (notifyModal.type === 'low') {
      msg = `Hello ${c.name},\n\nYour Morning Bites pack is running low! Only ${c.total - c.used} meal(s) remaining.\n\n🔄 Ready to renew? Visit us to activate your next pack.\n\nMorning Bites 🌿`;
    } else if (notifyModal.type === 'done') {
      msg = `Hello ${c.name},\n\nYour Morning Bites pack is complete! 🎉\n\nTotal meals enjoyed: ${c.total}\n\nWe hope you enjoyed every bite! Visit us to renew your subscription.\n\nMorning Bites 🌿`;
    }

    window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setNotifyModal({ open: false, customer: null, type: "" });
  };

  const handleSkip = async () => {
    const c = skipModal.customer;
    if (!c || !skipDate) return;

    try {
      await dbIns('meal_skips', {
        customer_id: c.id,
        skip_date: skipDate,
        notified: true,
        unskipped: false
      });
      
      const d = new Date(skipDate);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('en-IN');
      
      const msg = `Hello ${c.name},\n\nThis confirms your Morning Bites pack has been skipped for:\n\n📅 ${dayName}, ${dateStr}\n\nYour remaining meals count stays the same. See you on your next scheduled day!\n\nThank you,\nMorning Bites 🌿`;
      
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
      newPrefs = [0,1,2,3,4,5].filter(d => d !== dayIdx);
    } else {
      if (newPrefs.includes(dayIdx)) {
        newPrefs = newPrefs.filter(d => d !== dayIdx);
        if (newPrefs.length === 0) {
          toast({ variant: "destructive", description: "Must select at least one day or it defaults to all." });
        }
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
        name: editName,
        phone: editPhone,
        package_id: editPkg ? Number(editPkg) : null,
        payment_mode: editMode
      });
      toast({ title: "Customer updated" });
      setEditModal({ open: false, customer: null });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const getWeekDays = (offset: number) => {
    const today = new Date();
    // Get Monday of current week
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + (offset * 7));
    
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        iso: d.toISOString().split('T')[0],
        dayStr: d.toLocaleDateString('en-IN', { weekday: 'short' }).charAt(0), // M, T, W...
        dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })
      });
    }
    return days;
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "low", label: "⚠️ Low" },
    { id: "done", label: "Done" },
    { id: "new", label: "🆕 New" },
    { id: "renewed", label: "🔄 Renewed" }
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 pb-8">
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
        <div className="flex gap-2 w-max">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mt-2">
        {filteredSubs.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No subscribers match this filter.</div>
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
              <Card key={c.id} className={`border-border shadow-sm ${c.status === 'cancelled' ? 'opacity-70' : ''}`}>
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg leading-none">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.phone} • Joined: {c.join_date}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {c.status === 'cancelled' ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : isDone ? (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Pack Done</Badge>
                      ) : isLow ? (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800">⚠️ {c.total - c.used} left</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800">{c.total - c.used} left</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {isWalkin && <Badge variant="outline" className="text-[10px] bg-muted/50">Walk-in</Badge>}
                    <Badge variant="outline" className="text-[10px] bg-primary text-primary-foreground border-primary">Subscribed ✓</Badge>
                    {c.renew_count === 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50">🆕 New</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/50">🔄 ×{c.renew_count}</Badge>
                    )}
                    {pkg && <Badge variant="outline" className="text-[10px]">{pkg.name}</Badge>}
                    <Badge variant="outline" className="text-[10px] uppercase">{c.payment_mode}</Badge>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3 border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold">Schedule</div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setWeekOffset(p => ({...p, [c.id]: offset - 1}))}>
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <span className="text-[10px] text-muted-foreground w-12 text-center">{offset === 0 ? 'This Wk' : offset > 0 ? `+${offset} Wk` : `${offset} Wk`}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setWeekOffset(p => ({...p, [c.id]: offset + 1}))}>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between gap-1">
                      {weekDays.map((d, i) => {
                        const isScheduled = c.preferred_days.length === 0 || c.preferred_days.includes(i);
                        const skip = mealSkips.find(s => s.customer_id === c.id && s.skip_date === d.iso && !s.unskipped);
                        const isSkipped = !!skip;
                        const todayIso = new Date().toISOString().split('T')[0];
                        const isToday = d.iso === todayIso;
                        
                        return (
                          <div 
                            key={i} 
                            onClick={() => handleTogglePrefDay(c, i)}
                            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-lg cursor-pointer border transition-colors ${
                              isSkipped ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-800' :
                              isScheduled ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border hover:bg-muted text-muted-foreground'
                            } ${isToday && !isScheduled ? 'ring-2 ring-primary/50' : ''}`}
                          >
                            <div className="text-[10px] font-bold opacity-80">{d.dayStr}</div>
                            <div className="text-[9px] mt-0.5">{d.dateStr.split('/')[0]}</div>
                            {isSkipped && <div className="text-[8px] mt-0.5 text-orange-700 dark:text-orange-400 font-bold">⏭</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Progress</span>
                      <span>{c.used} / {c.total}</span>
                    </div>
                    <Progress value={progressPercent} className="h-2.5" />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button 
                      onClick={() => handleUseMeal(c)} 
                      disabled={isDone || c.status === 'cancelled'}
                      className="flex-1 rounded-xl h-10 shadow-sm"
                    >
                      <Check className="w-4 h-4 mr-1" /> Use
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleUndo(c)}
                      disabled={c.used === 0 || c.status === 'cancelled'}
                      className="w-12 h-10 rounded-xl px-0"
                    >
                      <Undo2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => { setSkipModal({ open: true, customer: c }); setSkipDate(new Date().toISOString().split('T')[0]); }}
                      disabled={isDone || c.status === 'cancelled'}
                      className="w-12 h-10 rounded-xl px-0 border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    
                    {isDone ? (
                      <Button 
                        onClick={() => handleRenew(c)}
                        disabled={c.status === 'cancelled'}
                        className="flex-1 rounded-xl h-10 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm font-bold"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Renew
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => openNotify(c, isLow ? 'low' : 'meal')}
                        disabled={c.status === 'cancelled'}
                        className="flex-1 rounded-xl h-10 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Send className="w-4 h-4 mr-1" /> Notify
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl" onClick={() => openEdit(c)}>
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    {c.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-orange-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleCancel(c)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl" onClick={() => handleDelete(c)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={notifyModal.open} onOpenChange={(o) => !o && setNotifyModal({...notifyModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Send a pre-formatted WhatsApp message to {notifyModal.customer?.name}.
          </div>
          <DialogFooter>
            <Button onClick={sendWhatsApp} className="w-full h-12 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white">
              <Send className="w-5 h-5 mr-2" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skipModal.open} onOpenChange={(o) => !o && setSkipModal({...skipModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Skip Meal for {skipModal.customer?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Skip Date</Label>
              <Input type="date" value={skipDate} onChange={e => setSkipDate(e.target.value)} />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground italic border-l-2 border-primary">
              "This confirms your Morning Bites pack has been skipped for..."
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSkip} className="w-full h-12 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white shadow-lg">
              <Send className="w-5 h-5 mr-2" /> Skip & Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModal.open} onOpenChange={(o) => !o && setEditModal({...editModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={editPkg} onValueChange={setEditPkg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <Label>Payment Mode</Label>
              <RadioGroup value={editMode} onValueChange={setEditMode} className="grid grid-cols-3 gap-2">
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="cash" id="e-cash" className="peer sr-only" />
                  <Label htmlFor="e-cash" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">Cash</Label>
                </div>
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="upi" id="e-upi" className="peer sr-only" />
                  <Label htmlFor="e-upi" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">UPI</Label>
                </div>
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="scanpay" id="e-scan" className="peer sr-only" />
                  <Label htmlFor="e-scan" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">Scan</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="w-full h-12 text-lg rounded-xl shadow-lg">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
