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
import { Check, Undo2, SkipForward, RefreshCw, Trash2, Edit, Send, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
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

  const [weekOffset, setWeekOffset] = useState<Record<number, number>>({});

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
    return true;
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
        dayStr: d.toLocaleDateString('en-IN', { weekday: 'short' }).charAt(0),
        dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })
      });
    }
    return days;
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
      {/* Filter Segmented Control */}
      <div className="bg-muted p-1.5 rounded-2xl flex overflow-x-auto hide-scrollbar shadow-inner border border-border">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 min-w-[70px] px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              filter === f.id 
                ? "bg-white dark:bg-card text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                : "text-muted-foreground hover:text-foreground"
            }`}
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
              <Card key={c.id} className={`border border-border shadow-sm overflow-hidden transition-all duration-200 ${c.status === 'cancelled' ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'}`}>
                {/* Accent Top Bar based on status */}
                <div className={`h-1.5 w-full ${isDone ? 'bg-gray-400' : isLow ? 'bg-secondary' : 'bg-primary'}`}></div>
                
                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold font-serif text-xl leading-tight text-foreground">{c.name}</div>
                      <div className="text-sm font-medium text-muted-foreground mt-0.5">{c.phone}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {c.status === 'cancelled' ? (
                        <Badge variant="destructive" className="font-bold tracking-wide">Cancelled</Badge>
                      ) : isDone ? (
                        <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold px-3 py-1 shadow-none">Pack Done</Badge>
                      ) : isLow ? (
                        <Badge className="bg-secondary text-secondary-foreground font-bold px-3 py-1 shadow-sm ring-1 ring-secondary/50">Low: {c.total - c.used} left</Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-bold px-3 py-1 shadow-none border-primary/20">{c.total - c.used} left</Badge>
                      )}
                    </div>
                  </div>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-2">
                    {isWalkin && <Badge variant="secondary" className="bg-muted text-muted-foreground font-semibold text-[11px] rounded-lg shadow-none">Walk-in</Badge>}
                    {c.renew_count === 0 ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 font-semibold text-[11px] rounded-lg">New User</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 font-semibold text-[11px] rounded-lg">Renewed ×{c.renew_count}</Badge>
                    )}
                    {pkg && <Badge variant="outline" className="font-semibold text-[11px] rounded-lg bg-card">{pkg.name}</Badge>}
                    <Badge variant="outline" className="font-semibold text-[11px] rounded-lg uppercase bg-card">{c.payment_mode}</Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 bg-muted/20 p-3 rounded-xl border border-border">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Meals Used</span>
                      <span className="text-foreground">{c.used} / {c.total}</span>
                    </div>
                    <Progress value={progressPercent} className={`h-3 bg-muted ${isDone ? '[&>div]:bg-gray-400' : isLow ? '[&>div]:bg-secondary' : '[&>div]:bg-primary'}`} />
                  </div>

                  {/* Schedule */}
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2 bg-muted/30 border-b border-border">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Schedule</div>
                      <div className="flex items-center gap-1 bg-background rounded-lg border border-border">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted" onClick={() => setWeekOffset(p => ({...p, [c.id]: offset - 1}))}>
                          <ChevronLeft className="w-3 h-3 text-foreground" />
                        </Button>
                        <span className="text-[10px] font-bold text-foreground w-12 text-center">{offset === 0 ? 'This Wk' : offset > 0 ? `+${offset} Wk` : `${offset} Wk`}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted" onClick={() => setWeekOffset(p => ({...p, [c.id]: offset + 1}))}>
                          <ChevronRight className="w-3 h-3 text-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex p-2 gap-1.5 bg-muted/10">
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
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                              isSkipped ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-800/50 dark:text-orange-400' :
                              isScheduled ? 'bg-primary border-primary text-primary-foreground shadow-md scale-[1.02]' : 'bg-card border-transparent text-muted-foreground hover:border-border'
                            } ${isToday && !isScheduled ? 'ring-2 ring-primary/30 ring-offset-1 dark:ring-offset-background' : ''}`}
                          >
                            <div className="text-[11px] font-bold tracking-wide">{d.dayStr}</div>
                            <div className={`text-[10px] mt-0.5 font-medium ${isScheduled ? 'opacity-90' : 'opacity-60'}`}>{d.dateStr.split('/')[0]}</div>
                            {isSkipped && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {/* Primary Actions Row */}
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
                        <Undo2 className="w-5 h-5 text-foreground" />
                      </Button>
                    </div>

                    {/* Secondary Actions Row */}
                    <div className="flex gap-2">
                      {isDone ? (
                        <Button 
                          onClick={() => handleRenew(c)}
                          disabled={c.status === 'cancelled'}
                          className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm font-bold"
                        >
                          <RefreshCw className="w-4 h-4 mr-1.5" /> Renew
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => openNotify(c, isLow ? 'low' : 'meal')}
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
                        className="w-10 h-10 rounded-lg p-0 border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-400"
                        title="Skip Meal"
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                      
                      <Button variant="outline" className="w-10 h-10 rounded-lg p-0 border-border bg-card hover:bg-muted" onClick={() => openEdit(c)} title="Edit">
                        <Edit className="w-4 h-4 text-foreground" />
                      </Button>
                      
                      {c.status !== 'cancelled' && (
                        <Button variant="outline" className="w-10 h-10 rounded-lg p-0 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400" onClick={() => handleCancel(c)} title="Cancel Sub">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals remain mostly the same structurally but use our theme classes */}
      <Dialog open={notifyModal.open} onOpenChange={(o) => !o && setNotifyModal({...notifyModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Send Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground font-medium">
            Send a pre-formatted WhatsApp message to <span className="font-bold text-foreground">{notifyModal.customer?.name}</span>.
          </div>
          <DialogFooter>
            <Button onClick={sendWhatsApp} className="w-full h-14 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white shadow-lg border-none font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skipModal.open} onOpenChange={(o) => !o && setSkipModal({...skipModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Skip Meal</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Skip Date</Label>
              <Input type="date" value={skipDate} onChange={e => setSkipDate(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="p-4 bg-primary/5 rounded-xl text-sm text-primary font-medium border border-primary/20">
              "This confirms your Morning Bites pack has been skipped..."
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSkip} className="w-full h-14 text-lg rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white shadow-lg border-none font-bold">
              <MessageCircle className="w-5 h-5 mr-2" /> Confirm & Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModal.open} onOpenChange={(o) => !o && setEditModal({...editModal, open: false})}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Edit Subscriber</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Phone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Package</Label>
              <Select value={editPkg} onValueChange={setEditPkg}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {packages.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()} className="rounded-lg">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Payment Mode</Label>
              <RadioGroup value={editMode} onValueChange={setEditMode} className="grid grid-cols-3 gap-3">
                <div className="flex">
                  <RadioGroupItem value="cash" id="e-cash" className="peer sr-only" />
                  <Label htmlFor="e-cash" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-3 font-semibold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">Cash</Label>
                </div>
                <div className="flex">
                  <RadioGroupItem value="upi" id="e-upi" className="peer sr-only" />
                  <Label htmlFor="e-upi" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-3 font-semibold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">UPI</Label>
                </div>
                <div className="flex">
                  <RadioGroupItem value="scanpay" id="e-scan" className="peer sr-only" />
                  <Label htmlFor="e-scan" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-3 font-semibold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">Scan</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="w-full h-14 text-lg rounded-xl shadow-lg font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
