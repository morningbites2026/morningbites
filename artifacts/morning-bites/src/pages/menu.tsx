import { useState } from "react";
import { useStore } from "@/lib/store";
import { dbIns, dbUpd, dbDel } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Tag, UtensilsCrossed } from "lucide-react";

export default function Menu() {
  const { menuItems, refresh } = useStore();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [options, setOptions] = useState<{name: string, price: number}[]>([{name: "Regular", price: 0}]);
  
  const handleOpenNew = () => {
    setEditingId(null);
    setName("");
    setSortOrder((menuItems.length * 10).toString());
    setOptions([{name: "Regular", price: 0}]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setSortOrder(item.sort_order.toString());
    setOptions([...item.options]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast({ variant: "destructive", description: "Name required" });
    if (options.length === 0) return toast({ variant: "destructive", description: "Add at least one option" });
    
    try {
      const data = {
        name,
        sort_order: Number(sortOrder),
        options,
        is_active: editingId ? undefined : true
      };
      
      if (editingId) {
        await dbUpd('menu_items', editingId, data);
        toast({ title: "Menu item updated" });
      } else {
        await dbIns('menu_items', data);
        toast({ title: "Menu item added" });
      }
      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this menu item?")) {
      try {
        await dbDel('menu_items', id);
        toast({ title: "Menu item deleted" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", description: err.message });
      }
    }
  };

  const handleToggleActive = async (id: number, current: boolean) => {
    try {
      await dbUpd('menu_items', id, { is_active: !current });
      refresh();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-primary" /> Menu Management</h2>
        <Button onClick={handleOpenNew} className="rounded-full shadow-md"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
      </div>

      <div className="space-y-3 pb-8">
        {menuItems.sort((a,b) => a.sort_order - b.sort_order).map(item => (
          <Card key={item.id} className={`border-border shadow-sm transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-4 flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <div className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-mono">#{item.sort_order}</div>
                </div>
                <div className="space-y-1">
                  {item.options.map((opt, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-muted/30 p-1.5 px-3 rounded-md">
                      <span className="font-medium text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" /> {opt.name}</span>
                      <span className="font-bold">₹{opt.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Switch 
                  checked={item.is_active} 
                  onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                  className="data-[state=checked]:bg-green-500"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenEdit(item)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="e.g. Sprouts Salad" value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs rounded-full"
                  onClick={() => setOptions([...options, {name: "", price: 0}])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              </div>
              
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/50">
                    <div className="space-y-1 flex-1">
                      <Input 
                        placeholder="Name (e.g. Regular)" 
                        value={opt.name} 
                        onChange={e => {
                          const newOpts = [...options];
                          newOpts[i].name = e.target.value;
                          setOptions(newOpts);
                        }} 
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 w-24">
                      <Input 
                        type="number" 
                        placeholder="Price" 
                        value={opt.price} 
                        onChange={e => {
                          const newOpts = [...options];
                          newOpts[i].price = Number(e.target.value);
                          setOptions(newOpts);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    {options.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive shrink-0" 
                        onClick={() => {
                          const newOpts = [...options];
                          newOpts.splice(i, 1);
                          setOptions(newOpts);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full h-12 text-lg rounded-xl shadow-lg">Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
