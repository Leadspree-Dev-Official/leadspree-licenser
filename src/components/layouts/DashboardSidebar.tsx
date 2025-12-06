import { NavLink } from "@/components/NavLink";
import { Home, FileKey, Package, Settings, Users, Key, LogOut, Menu, BarChart3, FolderOpen, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardSidebarProps {
  role: "admin" | "reseller";
}

const DashboardSidebar = ({ role }: DashboardSidebarProps) => {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: Home },
    { to: "/admin/licenses", label: "Generate License", icon: FileKey },
    { to: "/admin/issued", label: "Licenses Issued", icon: FolderOpen },
    { to: "/admin/software", label: "Software", icon: Package },
    { to: "/admin/allocations", label: "Reseller Allocations", icon: Settings },
    { to: "/admin/users", label: "Resellers", icon: Users },
    { to: "/admin/api-keys", label: "API Keys", icon: Key },
    { to: "/admin/buyer-data", label: "Buyer Data", icon: Database },
  ];

  const resellerLinks = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/dashboard/overview", label: "Overview", icon: BarChart3 },
    { to: "/dashboard/allocations", label: "Software Allocation", icon: Package },
    { to: "/dashboard/licenses", label: "Generate License", icon: FileKey },
    { to: "/dashboard/issued", label: "Licenses Issued", icon: FolderOpen },
  ];

  const links = role === "admin" ? adminLinks : resellerLinks;

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/admin" || link.to === "/dashboard"}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              activeClassName="bg-muted text-foreground font-medium"
              onClick={() => setOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button onClick={signOut} variant="outline" className={`w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <LogOut className={`w-4 h-4 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <aside className="h-full border-r bg-card flex flex-col">
              <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-bold">{role === "admin" ? "Admin" : "Reseller"}</h2>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>
              </div>
              <SidebarContent />
            </aside>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex border-r bg-card flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold truncate">{role === "admin" ? "Admin" : "Reseller"}</h2>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="flex-shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarContent isCollapsed={collapsed} />
      </aside>
    </>
  );
};

export default DashboardSidebar;
