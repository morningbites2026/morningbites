import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns, dbUpd } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Package as PackageIcon, Trash2 } from "lucide-react";

export default function Packages() {
  const { packages, refresh } = useStore();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const activePackages = packages.filter(p => p.is_active);

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ variant: "destructive", description: "Name and price are required." });
      return;
    }
    
    try {
      await dbIns('packages', {
        name,
        description: description || null,
        price: Number(price),
        is_active: true
      });
      toast({ title: "Package added" });
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setPrice("");
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm("Remove this package? Existing subscriptions won't be affected.")) {
      try {
        await dbUpd('packages', id, { is_active: false });
        toast({ title: "Package removed" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><PackageIcon className="w-5 h-5 text-primary" /> Packages</h2>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full shadow-md">
          <Plus className="w-4 h-4 mr-1" /> Add Package
        </Button>
      </div>

      <div className="space-y-4 pb-8">
        {activePackages.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No active packages.</div>
        ) : (
          activePackages.map(pkg => (
            <Card key={pkg.id} className="border-border shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="p-5 flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>}
                  <div className="inline-block mt-3 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-bold text-sm">
                    ₹{pkg.price} / 10 meals
                  </div>
                </div>
                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRemove(pkg.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input placeholder="e.g. Standard 10 Meals" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" placeholder="e.g. 500" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Details about this package..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full h-12 text-lg rounded-xl shadow-lg">Save Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
