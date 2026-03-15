import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Building2, Users, Handshake, CreditCard, Clock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Database connection failed</p>
        <p className="text-sm text-zinc-500 mt-2">Please check your environment variables.</p>
      </div>
    );
  }

  // Fetch summary stats
  const { count: projectsCount } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const { count: customersCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
  const { data: sales } = await supabase.from("plot_sales").select("total_sale_amount, amount_paid");
  const { data: recentReminders } = await supabase
    .from("reminders")
    .select("*, customers(name)")
    .eq("is_completed", false)
    .order("reminder_date", { ascending: true })
    .limit(5);

  const totalSalesValue = sales?.reduce((sum, s) => sum + Number(s.total_sale_amount), 0) || 0;
  const totalCollected = sales?.reduce((sum, s) => sum + Number(s.amount_paid), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your real estate CRM"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={projectsCount?.toString() || "0"}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Customers"
          value={customersCount?.toString() || "0"}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Sales"
          value={formatCurrency(totalSalesValue)}
          icon={Handshake}
          color="orange"
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(totalCollected)}
          icon={CreditCard}
          color="zinc"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Upcoming Reminders
            </CardTitle>
            <Link href="/reminders">
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReminders?.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{reminder.title}</p>
                    <p className="text-xs text-zinc-500">{reminder.customers?.name || 'General'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-900">{reminder.reminder_date}</p>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">{reminder.reminder_time || 'All Day'}</p>
                  </div>
                </div>
              ))}
              {(!recentReminders || recentReminders.length === 0) && (
                <p className="text-sm text-zinc-400 text-center py-4">No pending reminders</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/sales/new">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 flex-col items-start gap-1">
                <span className="font-bold text-sm text-zinc-900">New Sale</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Record booking</span>
              </Button>
            </Link>
            <Link href="/payments/new">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 flex-col items-start gap-1">
                <span className="font-bold text-sm text-zinc-900">Collect Payment</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Record installment</span>
              </Button>
            </Link>
            <Link href="/customers/new">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 flex-col items-start gap-1">
                <span className="font-bold text-sm text-zinc-900">Add Customer</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">New lead/buyer</span>
              </Button>
            </Link>
            <Link href="/expenses/new">
              <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 flex-col items-start gap-1">
                <span className="font-bold text-sm text-zinc-900">Add Expense</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Office outflow</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
