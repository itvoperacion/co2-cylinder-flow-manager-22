import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "./Navigation";
interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  is_read: boolean;
  severity: string;
  created_at: string;
}
interface LayoutProps {
  children: React.ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription for alerts
    const channel = supabase.channel('layout-alerts-changes').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'system_alerts'
    }, payload => {
      setAlerts(current => [payload.new as Alert, ...current]);

      // Show toast for new alerts
      const newAlert = payload.new as Alert;
      toast({
        title: newAlert.title,
        description: newAlert.message,
        variant: newAlert.severity === 'warning' ? 'destructive' : 'default'
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
  const fetchAlerts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('system_alerts').select('*').order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setTimeout(() => setRefreshing(false), 1000);
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión.",
        variant: "destructive"
      });
    }
  };
  const unreadAlertsCount = alerts.filter(alert => !alert.is_read).length;
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-industrial">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="font-bold text-primary text-lg">MANAGER CO2 ITV</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenido, {user?.email}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Navigation unreadAlertsCount={unreadAlertsCount} onRefresh={handleRefresh} refreshing={refreshing} />
              
              <Button variant="outline" onClick={handleSignOut}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>;
};
export default Layout;