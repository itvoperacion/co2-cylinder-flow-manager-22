import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Factory, Droplets, Calendar } from "lucide-react";

interface ShrinkageData {
  cylinder_shrinkage: {
    total_weight: number;
    total_shrinkage: number;
    count: number;
    period: string;
  };
  tank_shrinkage: {
    total_quantity: number;
    total_shrinkage: number;
    entry_count: number;
    exit_count: number;
    period: string;
  };
}

const ShrinkageReport = () => {
  const [shrinkageData, setShrinkageData] = useState<ShrinkageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShrinkageData();

    const fillingsChannel = supabase.channel('fillings-shrinkage-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fillings'
    }, () => fetchShrinkageData()).subscribe();
    
    const tankChannel = supabase.channel('tank-movements-shrinkage-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tank_movements'
    }, () => fetchShrinkageData()).subscribe();

    return () => {
      supabase.removeChannel(fillingsChannel);
      supabase.removeChannel(tankChannel);
    };
  }, []);

  const fetchShrinkageData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ data: cylinderData }, { data: tankData }] = await Promise.all([
        supabase.from('fillings').select('weight_filled, shrinkage_amount').gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('tank_movements').select('movement_type, quantity, shrinkage_amount').gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      const cylinderShrinkage = {
        total_weight: cylinderData?.reduce((sum, item) => sum + (item.weight_filled || 0), 0) || 0,
        total_shrinkage: cylinderData?.reduce((sum, item) => sum + (item.shrinkage_amount || 0), 0) || 0,
        count: cylinderData?.length || 0,
        period: "30 días"
      };

      const entryCount = tankData?.filter(item => item.movement_type === 'entrada').length || 0;
      const exitCount = tankData?.filter(item => item.movement_type === 'salida').length || 0;
      
      const tankShrinkage = {
        total_quantity: tankData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        total_shrinkage: tankData?.reduce((sum, item) => sum + (item.shrinkage_amount || 0), 0) || 0,
        entry_count: entryCount,
        exit_count: exitCount,
        period: "30 días"
      };

      setShrinkageData({ cylinder_shrinkage: cylinderShrinkage, tank_shrinkage: tankShrinkage });
    } catch (error) {
      console.error('Error fetching shrinkage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getShrinkagePercentage = (shrinkage: number, total: number) => {
    if (total === 0) return 0;
    return (shrinkage / total) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const totalShrinkage = (shrinkageData?.cylinder_shrinkage.total_shrinkage || 0) + 
                         (shrinkageData?.tank_shrinkage.total_shrinkage || 0);
  const totalWeight = (shrinkageData?.cylinder_shrinkage.total_weight || 0) + 
                      (shrinkageData?.tank_shrinkage.total_quantity || 0);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-warning" />
            <span className="font-semibold text-sm">Reporte de Merma</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {shrinkageData?.cylinder_shrinkage.period}
          </Badge>
        </div>

        {/* Grid de estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Cilindros */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Factory className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">
              {shrinkageData?.cylinder_shrinkage.count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Llenados</div>
          </div>

          {/* Entradas/Salidas Tanque */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Droplets className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">
              {(shrinkageData?.tank_shrinkage.entry_count || 0) + (shrinkageData?.tank_shrinkage.exit_count || 0)}
            </div>
            <div className="text-xs text-muted-foreground">Movimientos</div>
          </div>

          {/* Merma Total */}
          <div className="bg-warning/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-warning">
              {totalShrinkage.toFixed(1)} kg
            </div>
            <div className="text-xs text-muted-foreground">Merma Total</div>
          </div>

          {/* % Merma */}
          <div className="bg-accent/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent-foreground">
              {getShrinkagePercentage(totalShrinkage, totalWeight).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">% Merma</div>
          </div>
        </div>

        {/* Detalle compacto */}
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Merma Cilindros:</span>
            <span className="font-medium text-foreground">{shrinkageData?.cylinder_shrinkage.total_shrinkage.toFixed(1) || '0.0'} kg</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Merma Tanque:</span>
            <span className="font-medium text-foreground">{shrinkageData?.tank_shrinkage.total_shrinkage.toFixed(1) || '0.0'} kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShrinkageReport;
