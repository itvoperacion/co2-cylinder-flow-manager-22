import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  Package,
  Droplets,
  ArrowRightLeft,
  FileSpreadsheet,
  Bell,
  RefreshCw
} from "lucide-react";

interface NavigationProps {
  className?: string;
  unreadAlertsCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const Navigation = ({ className, unreadAlertsCount, onRefresh, refreshing }: NavigationProps) => {
  const navItems = [
    {
      to: "/",
      icon: LayoutDashboard,
      label: "Dashboard",
      end: true
    },
    {
      to: "/cylinders",
      icon: Package,
      label: "Cilindros"
    },
    {
      to: "/fillings",
      icon: Droplets,
      label: "Llenados"
    },
    {
      to: "/transfers",
      icon: ArrowRightLeft,
      label: "Traslados"
    },
    {
      to: "/reports",
      icon: FileSpreadsheet,
      label: "Reportes"
    }
  ];

  return (
    <nav className={cn("flex items-center space-x-1", className)}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
      
      <div className="ml-4 flex items-center space-x-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        )}
        
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertas
          {unreadAlertsCount && unreadAlertsCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
              {unreadAlertsCount}
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;