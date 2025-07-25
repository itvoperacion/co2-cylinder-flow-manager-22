import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fuel, TrendingDown, AlertTriangle } from "lucide-react";

interface TankData {
  id: string;
  tank_name: string;
  current_level: number;
  capacity: number;
  minimum_threshold: number;
  last_updated: string;
}

const TankIndicator = () => {
  const [tankData, setTankData] = useState<TankData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTankData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('tank-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'co2_tank'
        },
        () => fetchTankData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTankData = async () => {
    try {
      const { data, error } = await supabase
        .from('co2_tank')
        .select('*')
        .single();

      if (error) throw error;
      setTankData(data);
    } catch (error) {
      console.error('Error fetching tank data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-tank">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Tanque Principal CO2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tankData) return null;

  const percentage = (tankData.current_level / tankData.capacity) * 100;
  const isLow = percentage <= tankData.minimum_threshold;
  const isCritical = percentage <= 5;

  const getStatusColor = () => {
    if (isCritical) return "destructive";
    if (isLow) return "warning";
    return "success";
  };

  const getStatusText = () => {
    if (isCritical) return "Crítico";
    if (isLow) return "Bajo";
    return "Normal";
  };

  const getProgressColor = () => {
    if (isCritical) return "bg-tank-critical";
    if (isLow) return "bg-tank-low";
    if (percentage > 50) return "bg-tank-full";
    return "bg-tank-medium";
  };

  return (
    <Card className="shadow-tank">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          {tankData?.tank_name || 'Tanque Principal CO2'}
        </div>
          <Badge variant={getStatusColor() === "destructive" ? "destructive" : 
                         getStatusColor() === "warning" ? "default" : "default"}
                 className={getStatusColor() === "success" ? "bg-success text-success-foreground" :
                           getStatusColor() === "warning" ? "bg-warning text-warning-foreground" : ""}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nivel actual</span>
            <span className="font-semibold">{tankData.current_level.toLocaleString()} kg</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 kg</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
            <span>{tankData.capacity.toLocaleString()} kg</span>
          </div>
        </div>

        {isLow && (
          <div className={`p-3 rounded-lg border-l-4 ${
            isCritical 
              ? "bg-destructive/10 border-l-destructive text-destructive" 
              : "bg-warning/10 border-l-warning text-warning-foreground"
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isCritical ? "¡Nivel crítico!" : "¡Nivel bajo!"}
              </span>
            </div>
            <p className="text-xs mt-1 opacity-90">
              Se requiere reabastecimiento urgente del tanque principal.
            </p>
          </div>
        )}

        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Umbral mínimo
            </span>
            <span>{tankData.minimum_threshold}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Última actualización:</span>
            <span>{new Date(tankData.last_updated).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TankIndicator;