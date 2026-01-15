import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cylinder, AlertTriangle } from "lucide-react";

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
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded"></div>
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

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cylinder className="h-6 w-6 text-primary" />
            <span className="font-semibold text-sm">
              {tankData?.tank_name || 'Tanque CO2'}
            </span>
          </div>
          <Badge 
            variant={getStatusColor() === "destructive" ? "destructive" : "default"}
            className={`text-xs ${
              getStatusColor() === "success" ? "bg-success text-success-foreground" :
              getStatusColor() === "warning" ? "bg-warning text-warning-foreground" : ""
            }`}
          >
            {getStatusText()}
          </Badge>
        </div>

        {/* Nivel y Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-primary">
              {tankData.current_level.toLocaleString()} kg
            </span>
            <span className="text-sm text-muted-foreground">
              {percentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>Capacidad: {tankData.capacity.toLocaleString()} kg</span>
          </div>
        </div>

        {/* Alerta si nivel bajo */}
        {isLow && (
          <div className={`p-2 rounded-md flex items-center gap-2 text-xs ${
            isCritical 
              ? "bg-destructive/10 text-destructive" 
              : "bg-warning/10 text-warning-foreground"
          }`}>
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>
              {isCritical ? "¡Nivel crítico! Reabastecer urgente" : "Nivel bajo - Programar reabastecimiento"}
            </span>
          </div>
        )}

        {/* Info adicional */}
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Umbral mínimo:</span>
            <span>{tankData.minimum_threshold}%</span>
          </div>
          <div className="flex justify-between">
            <span>Actualizado:</span>
            <span>{new Date(tankData.last_updated).toLocaleString('es', { 
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TankIndicator;
