import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { dbGet, Customer, Walkin, MenuItem, Bill, MealSkip, Package, Promotion } from "./supabase";
import { useToast } from "@/hooks/use-toast";

type StoreState = {
  customers: Customer[];
  walkins: Walkin[];
  menuItems: MenuItem[];
  bills: Bill[];
  mealSkips: MealSkip[];
  packages: Package[];
  promotions: Promotion[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [walkins, setWalkins] = useState<Walkin[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [mealSkips, setMealSkips] = useState<MealSkip[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [c, w, m, b, s, p] = await Promise.all([
        dbGet<Customer>('customers', 'select=*&is_deleted=eq.false'),
        dbGet<Walkin>('walkins', 'select=*&is_deleted=eq.false'),
        dbGet<MenuItem>('menu_items'),
        dbGet<Bill>('bills'),
        dbGet<MealSkip>('meal_skips'),
        dbGet<Package>('packages')
      ]);
      setCustomers(c);
      setWalkins(w);
      setMenuItems(m);
      setBills(b);
      setMealSkips(s);
      setPackages(p);

      try {
        const promo = await dbGet<Promotion>('promotions');
        setPromotions(promo);
      } catch {
        setPromotions([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err);
      toast({ variant: "destructive", title: "Error loading data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <StoreContext.Provider value={{
      customers, walkins, menuItems, bills, mealSkips, packages, promotions,
      isLoading, error, refresh: loadData,
      searchQuery, setSearchQuery
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
