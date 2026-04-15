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
import { Plus, MessageCircle, Edit, Trash2, UserPlus, Search } from "lucide-react";
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
      
      // WhatsApp message logic could go here
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Walk-ins</h2>
        <Button 
          onClick={() => {
            setEditingId(null);
            setName("");
            setPhone("");
            setIsWalkinModalOpen(true);
          }} 
          className="rounded-full shadow-md"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Walk-in
        </Button>
      </div>

      <div className="space-y-3 pb-8">
        {filteredWalkins.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
            <Search className="w-10 h-10 opacity-20 mb-2" />
            <p>No walk-ins found.</p>
          </div>
        ) : (
          filteredWalkins.map(w => {
            const cust = getCustomerForPhone(w.phone);
            const isSubbed = cust?.status === 'active';
            const isPrevSub = cust?.status === 'cancelled';
            
            return (
              <Card key={w.id} className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-base">{w.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{w.phone}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 max-w-[150px]">
                      <Badge variant="outline" className="bg-muted/50 text-[10px]">Walk-in</Badge>
                      {isSubbed && <Badge className="bg-primary text-primary-foreground text-[10px]">Subscribed ✓</Badge>}
                      {isPrevSub && <Badge variant="secondary" className="text-[10px]">Prev. Sub</Badge>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
                    {!isSubbed && (
                      <Button size="sm" className="flex-1 rounded-xl h-9 text-xs font-semibold" onClick={() => handleOpenSubscribe(w)}>
                        Subscribe
                      </Button>
                    )}
                    {!isSubbed && (
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 text-xs font-semibold border-green-200 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-900/50 dark:text-green-400 dark:bg-green-900/20" onClick={() => handlePromote(w)}>
                        <MessageCircle className="w-3 h-3 mr-1" /> Promote
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl ml-auto" onClick={() => {
                      setEditingId(w.id);
                      setName(w.name);
                      setPhone(w.phone);
                      setIsWalkinModalOpen(true);
                    }}>
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Walk-in Modal */}
      <Dialog open={isWalkinModalOpen} onOpenChange={setIsWalkinModalOpen}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Walk-in" : "Add Walk-in"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" placeholder="Enter 10-digit number" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveWalkin} className="w-full h-12 text-lg rounded-xl shadow-lg">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribe Modal */}
      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Subscribe {subName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={subPkgId} onValueChange={setSubPkgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {activePackages.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name} - ₹{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3 pt-2">
              <Label>Payment Mode</Label>
              <RadioGroup value={subPayMode} onValueChange={setSubPayMode} className="grid grid-cols-3 gap-2">
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="cash" id="s-cash" className="peer sr-only" />
                  <Label htmlFor="s-cash" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">Cash</Label>
                </div>
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="upi" id="s-upi" className="peer sr-only" />
                  <Label htmlFor="s-upi" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">UPI</Label>
                </div>
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="scanpay" id="s-scan" className="peer sr-only" />
                  <Label htmlFor="s-scan" className="flex w-full items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer">Scan</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubscribe} className="w-full h-12 text-lg rounded-xl shadow-lg">Activate Pack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
