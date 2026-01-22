import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AlertsDialog from "./AlertsDialog";
import { 
  LayoutDashboard,
  Package,
  Droplets,
  ArrowRightLeft,
  FileSpreadsheet,
  RefreshCw,
  Gauge,
  ClipboardList
} from "lucide-react";

interface NavigationProps {
  className?: string;
  unreadAlertsCount?: number;
  alerts?: any[];
  onRefresh?: () => void;
  onAlertsChange?: () => void;
  refreshing?: boolean;
}

const Navigation = ({ className, unreadAlertsCount, alerts = [], onRefresh, onAlertsChange, refreshing }: NavigationProps) => {
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
      to: "/tank-inventory",
      icon: Gauge,
      label: "Tanque CO2"
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
      to: "/adjustments",
      icon: ClipboardList,
      label: "Ajustes"
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
        
        <AlertsDialog 
          alerts={alerts} 
          unreadCount={unreadAlertsCount || 0}
          onAlertsChange={onAlertsChange || (() => {})}
        />
      </div>
    </nav>
  );
};

export default Navigation;