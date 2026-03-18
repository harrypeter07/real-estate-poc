"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setUserInfo(null);
        return;
      }

      const meta = (user.user_metadata || {}) as any;
      let displayName =
        meta.name || meta.full_name || user.user_metadata?.name || null;

      // For advisors, prefer the name from the advisors table instead of the login email
      if (meta.role === "advisor" && meta.advisor_id) {
        const { data: advisor } = await supabase
          .from("advisors")
          .select("name")
          .eq("id", meta.advisor_id)
          .single();

        if (advisor?.name) {
          displayName = advisor.name;
        }
      }

      setUserInfo({
        name: displayName,
        email: user.email,
        role: meta.role || null,
      });
    };

    loadUser();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 lg:px-6 dark:bg-zinc-950 dark:border-zinc-800">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {userInfo && (
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
            <User className="h-4 w-4 text-zinc-500" />
            <div className="flex flex-col items-end">
              <span className="font-medium text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-full px-3 py-0.5">
                {userInfo.name || userInfo.email || "User"}
              </span>
              <div className="flex gap-2 text-[10px] text-zinc-500">
                {userInfo.role && <span className="uppercase">{userInfo.role}</span>}
                {userInfo.email && (
                  <span className="hidden sm:inline text-zinc-400">
                    {userInfo.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-500 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}
