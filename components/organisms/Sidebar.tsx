'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  Receipt,
  CreditCard,
  Users,
  Home,
  X,
  LayoutDashboard,
  ShoppingCart,
  Trash2,
  LogOut,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const allNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['company_admin', 'user'] },
  { name: "Billing", href: "/billing", icon: Receipt, roles: ['company_admin', 'user'] },
  { name: "History", href: "/history", icon: FileText, roles: ['company_admin', 'user'] },
  { name: "Products", href: "/products", icon: Package, roles: ['company_admin'] },
  { name: "Settings", href: "/settings", icon: Home, roles: ['company_admin'] },
];

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export const Sidebar = ({
  isMobile,
  isOpen,
  isCollapsed,
  onClose,
}: SidebarProps) => {
  const pathname = usePathname();
  const { role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // If no role is assigned, show all navigation items (fallback)
  let navigation = role ? allNavigation.filter(item => item.roles.includes(role)) : allNavigation;

  // Fallback: if no navigation items are found, show at least basic items
  if (navigation.length === 0) {
    navigation = [
      { name: "Billing", href: "/billing", icon: Receipt, roles: ['admin', 'manager', 'staff'] },
      { name: "Products", href: "/products", icon: Package, roles: ['admin', 'manager'] },
    ];
  }

  const handleLogout = async () => {
    signOut();
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    router.push('/auth');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "p-4 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            isCollapsed && "justify-center"
          )}
        >
          {/* New Logo Mark */}
          <img
            src="/favicon-laabham.svg"
            alt="Logo"
            className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0"
          />
          {!isCollapsed && (
            <div>
              <h1 className="text-xl leading-tight">
                <span className="font-serif font-medium text-[#0E1F40] dark:text-white">Laabham</span>
                <span className="font-bold text-[#D4A017] ml-1">Pro</span>
              </h1>
              <div className="text-[0.65rem] leading-tight text-muted-foreground mt-0.5">
                <span className="block font-medium">லாபம் உங்கள் கையில்</span>
                <span>Profit in your hands</span>
              </div>
            </div>
          )}
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>

      <nav
        className={cn(
          "px-4 space-y-1 flex-1",
          isCollapsed && "px-2 text-center"
        )}
      >
        <TooltipProvider>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      isCollapsed && "justify-center"
                    )}
                    onClick={isMobile ? onClose : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={cn(isCollapsed && "hidden")}>
                      {item.name}
                    </span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{item.name}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="p-4 border-t border-border">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full flex items-center gap-3 text-muted-foreground hover:text-foreground",
                  isCollapsed && "justify-center"
                )}
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span className={cn(isCollapsed && "hidden")}>Logout</span>
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Logout</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />
        <aside
          className={cn(
            "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full bg-card border-r border-border z-20 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent />
    </aside>
  );
};