import React, { useState, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Search, Trash2, ShoppingCart, UtensilsCrossed, Package, User, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import ReceiptViewer from "@/components/talli/ReceiptViewer";
import BottomNav from "@/components/talli/BottomNav";
import Header from "@/components/talli/Header";
import PullToRefresh from "@/components/talli/PullToRefresh";

const CATEGORY_CONFIG = {
  groceries: { label: "Groceries", icon: ShoppingCart, color: "text-chart-1", bg: "bg-chart-1/15" },
  meals: { label: "Meals", icon: UtensilsCrossed, color: "text-chart-2", bg: "bg-chart-2/15" },
  misc: { label: "Misc", icon: Package, color: "text-chart-3", bg: "bg-chart-3/15" },
  personal: { label: "Personal", icon: User, color: "text-chart-4", bg: "bg-chart-4/15" },
};

const FILTERS = ["all", "groceries", "meals", "misc", "personal"];

export default function History() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const contentRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["all-expenses-history"],
    queryFn: () => base44.entities.Expense.list("-date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-expenses-history"] }),
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["all-expenses-history"] });
  }, [queryClient]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCat = activeFilter === "all" || e.category === activeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (e.description || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.date.includes(q) ||
        e.amount.toString().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [expenses, activeFilter, search]);

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="h-full bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-lg mx-auto px-5 pb-28" ref={contentRef}>
          <Header />

        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground mb-1">History</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} expenses · ${totalFiltered.toFixed(2)} total</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-card border-border"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : CATEGORY_CONFIG[f]?.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No expenses found</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((expense) => {
                const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.misc;
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 rounded-xl bg-card border border-border p-4"
                  >
                    <div className={`h-10 w-10 rounded-xl ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${cat.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {expense.description || cat.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(expense.date), "EEE, MMM d, yyyy")}
                        {expense.counts_toward_per_diem === false && (
                          <span className="ml-1 text-muted-foreground/60">· Non per diem</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        -${expense.amount.toFixed(2)}
                      </span>

                      {expense.receipt_url && (
                        <button
                          onClick={() => setViewingReceipt(expense.receipt_url)}
                          className="h-9 w-9 rounded-lg overflow-hidden border border-border flex-shrink-0"
                        >
                          <img src={expense.receipt_url} alt="Receipt" className="w-full h-full object-cover" />
                        </button>
                      )}

                      <button
                        onClick={() => deleteMutation.mutate(expense.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </div>
      </PullToRefresh>

      <BottomNav onTabChange={() => contentRef.current?.scrollTo(0, 0)} />

      <ReceiptViewer url={viewingReceipt} open={!!viewingReceipt} onClose={() => setViewingReceipt(null)} />
    </div>
  );
}