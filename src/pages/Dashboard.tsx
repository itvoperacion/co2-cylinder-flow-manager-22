import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from "lucide-react";

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  is_read: boolean;
  severity: string;
  created_at: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    // Set up real-time subscription for alerts
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          setAlerts(current => [payload.new as Alert, ...current]);
          
          // Show toast for new alerts
          const newAlert = payload.new as Alert;
          toast({
            title: newAlert.title,
            description: newAlert.message,
            variant: newAlert.severity === 'warning' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(current =>
        current.map(alert =>
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'default';
      case 'error':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'outline';
    }
  };

  const unreadAlertsCount = alerts.filter(alert => !alert.is_read).length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Tank Indicator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TankIndicator />
          </div>
          
          {/* Recent Alerts */}
          <div className="lg:col-span-2">
            <Card className="shadow-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Alertas Recientes
                  {unreadAlertsCount > 0 && (
                    <Badge variant="destructive">
                      {unreadAlertsCount} sin leer
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse h-12 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay alertas recientes
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          alert.is_read 
                            ? 'bg-muted/50 border-border' 
                            : 'bg-card border-primary/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getAlertIcon(alert.severity)}
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{alert.title}</h4>
                                <Badge 
                                  variant={getAlertVariant(alert.severity)}
                                  className="text-xs"
                                >
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {alert.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(alert.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {!alert.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAlertAsRead(alert.id)}
                              className="ml-2 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cylinder Statistics */}
        <CylinderStats />
      </div>
    </Layout>
  );
};

export default Dashboard;