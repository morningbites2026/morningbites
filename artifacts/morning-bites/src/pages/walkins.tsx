import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns, dbUpd, dbDel } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageCircle, Edit, Trash2, UserPlus, Search, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Walkins() {
  const { walkins, customers, packages, refresh, searchQuery } = useStore();
  const { toast } = useToast();
  
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [subName, setSubName] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subPkgId, setSubPkgId] = useState("");
  const [subPayMode, setSubPayMode] = useState<any>("cash");

  const filteredWalkins = walkins.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.phone.includes(searchQuery)
  );

  const activePackages = packages.filter(p => p.is_active);

  const getCustomerForPhone = (ph: string) => customers.find(c => c.phone === ph);

  const handleSaveWalkin = async () => {
    if (!name.trim() || !phone.trim()) return toast({ variant: "destructive", description: "Name and phone required" });
    
    try {
      if (editingId) {
        await dbUpd('walkins', editingId, { name, phone });
        toast({ title: "Walk-in updated" });
      } else {
        const today = new Date().toISOString().split('T')[0];
        await dbIns('walkins', { name, phone, visit_date: today, is_deleted: false });
        toast({ title: "Walk-in added" });
      }
      setIsWalkinModalOpen(false);
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleOpenSubscribe = (w: any) => {
    setSubName(w.name);
    setSubPhone(w.phone);
    if (activePackages.length > 0) setSubPkgId(activePackages[0].id.toString());
    setSubPayMode("cash");
    setIsSubModalOpen(true);
  };

  const handleSubscribe = async () => {
    if (!subName || !subPhone || !subPkgId) return toast({ variant: "destructive", description: "All fields required" });
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingCust = getCustomerForPhone(subPhone);
      
      if (existingCust && existingCust.status === 'cancelled') {
        await dbUpd('customers', existingCust.id, {
          status: 'active',
          used: 0,
          total: 10,
          renew_count: existingCust.renew_count + 1,
          last_renewed: today,
          pack_start_date: today,
          package_id: Number(subPkgId),
          payment_mode: subPayMode
        });
      } else if (!existingCust) {
        await dbIns('customers', {
          name: subName,
          phone: subPhone,
          type: 'subscribed',
          total: 10,
          used: 0,
          join_date: today,
          renew_count: 0,
          pack_start_date: today,
          status: 'active',
          is_deleted: false,
          preferred_days: [],
          package_id: Number(subPkgId),
          payment_mode: subPayMode
        });
      } else {
        toast({ variant: "destructive", description: "Customer already active" });
        return;
      }
      
      toast({ title: "Subscribed successfully!" });
      setIsSubModalOpen(false);
      refresh();
      
      const msg = `Hello ${subName}! 🌱\n\nWelcome to Morning Bites Subscription! 🎉\n\nYour pack is now active:\n✅ 10 fresh meals ready\n\nThank you for subscribing! See you every morning.\n\nMorning Bites 🌿`;
      window.open(`https://wa.me/91${subPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this walk-in?")) {
      try {
        await dbUpd('walkins', id, { is_deleted: true });
        toast({ title: "Deleted" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const handlePromote = (w: any) => {
    const msg = `Hello ${w.name}! 🌱\n\nWe're Morning Bites – your daily sprouts & healthy snack stall. We'd love to have you join our subscription pack!\n\n✅ Get 10 fresh meals\n🍃 Sprouts-based healthy food\n💚 Affordable daily breakfast\n\nInterested? Visit us or reply to subscribe. See you soon!`;
    window.open(`https://wa.me/91${w.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">Walk-ins</h2>
        <Button 
          onClick={() => {
            setEditingId(null);
            setName("");
            setPhone("");
            setIsWalkinModalOpen(true);
          }} 
          className="rounded-full shadow-md font-bold px-5"
        >
          <Plus className="w-5 h-5 mr-1.5" /> Add New
        </Button>
      </div>

      <div className="space-y-4 pb-8">
        {filteredWalkins.length === 0 ? (
          <div className="text-center p-12 bg-muted/30 rounded-3xl border border-dashed border-border flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="font-bold text-lg mb-1">No walk-ins found</h3>
            <p className="text-muted-foreground text-sm">Add a new walk-in or clear your search.</p>
          </div>
        ) : (
          filteredWalkins.map(w => {
            const cust = getCustomerForPhone(w.phone);
            const isSubbed = cust?.status === 'active';
            const isPrevSub = cust?.status === 'cancelled';
            
            return (
              <Card key={w.id} className="border border-border shadow-sm hover:shadow-md transition-all overflow-hidden bg-card group">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-xl shrink-0 mt-1">
                        {w.name.charAt(0)}
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
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    {!isSubbed && (
                      <Button className="flex-1 rounded-xl h-11 font-bold text-[13px] shadow-sm tracking-wide" onClick={() => handleOpenSubscribe(w)}>
                        Subscribe Now
                      </Button>
                    )}
                    {!isSubbed && (
                      <Button variant="outline" className="flex-1 rounded-xl h-11 font-bold text-[13px] border-secondary/50 text-secondary-foreground bg-secondary/10 hover:bg-secondary/20 tracking-wide" onClick={() => handlePromote(w)}>
                        <MessageCircle className="w-4 h-4 mr-2" /> Promote
                      </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border bg-card hover:bg-muted" onClick={() => {
                        setEditingId(w.id);
                        setName(w.name);
                        setPhone(w.phone);
                        setIsWalkinModalOpen(true);
                      }}>
                        <Edit className="w-4 h-4 text-foreground" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400" onClick={() => handleDelete(w.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
              <Input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-xl text-lg px-4 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Phone Number</Label>
              <Input type="tel" placeholder="10-digit number" value={phone} onChange={e => setPhone(e.target.value)} className="h-14 rounded-xl text-lg px-4 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary font-mono tracking-wider" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveWalkin} className="w-full h-14 text-lg rounded-xl shadow-lg font-bold">Save Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent className="sm:max-w-md w-[95%] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Subscribe {subName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Select Package</Label>
              <Select value={subPkgId} onValueChange={setSubPkgId}>
                <SelectTrigger className="h-14 rounded-xl text-base px-4 bg-muted/50 border-transparent focus:bg-background focus:border-primary">
                  <SelectValue placeholder="Choose a package" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {activePackages.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()} className="rounded-lg py-3">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-primary font-bold ml-4">₹{p.price}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Payment Mode</Label>
              <RadioGroup value={subPayMode} onValueChange={setSubPayMode} className="grid grid-cols-3 gap-3">
                <div className="flex">
                  <RadioGroupItem value="cash" id="s-cash" className="peer sr-only" />
                  <Label htmlFor="s-cash" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-4 font-bold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">Cash</Label>
                </div>
                <div className="flex">
                  <RadioGroupItem value="upi" id="s-upi" className="peer sr-only" />
                  <Label htmlFor="s-upi" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-4 font-bold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">UPI</Label>
                </div>
                <div className="flex">
                  <RadioGroupItem value="scanpay" id="s-scan" className="peer sr-only" />
                  <Label htmlFor="s-scan" className="flex flex-1 items-center justify-center rounded-xl border-2 border-border bg-card p-4 font-bold hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all">Scan</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubscribe} className="w-full h-14 text-lg rounded-xl shadow-lg font-bold">Activate Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
