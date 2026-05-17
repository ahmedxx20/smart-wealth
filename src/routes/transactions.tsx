import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";

type Tx = { id: string; type: string; amount: number; status: string; created_at: string; meta: any };

export const Route = createFileRoute("/transactions")({ component: Page });

function Page() {
  const [list, setList] = useState<Tx[]>([]);
  useEffect(() => {
    supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setList((data as Tx[]) || []));
  }, []);

  const label = (t: string) => ({
    deposit: "Deposit", withdrawal: "Withdrawal",
    first_deposit_bonus: "First-deposit bonus", referral_commission: "Referral commission",
    robot_profit: "Robot profit", robot_principal_return: "Robot principal",
    admin_credit: "Admin credit", admin_debit: "Admin debit",
  } as Record<string,string>)[t] || t;

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-4">Transactions</h1>
      <div className="space-y-2">
        {list.length === 0 && <div className="glass p-6 text-center text-muted-foreground">No transactions yet</div>}
        {list.map(tx => {
          const positive = !["withdrawal","admin_debit"].includes(tx.type);
          return (
            <div key={tx.id} className="glass p-3 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{label(tx.type)}</div>
                <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-semibold ${positive ? "text-primary" : "text-destructive"}`}>
                {positive ? "+" : "−"}{Number(tx.amount).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </AuthShell>
  );
}
