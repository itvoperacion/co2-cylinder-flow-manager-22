import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Droplets, Factory, BarChart3, Calendar } from "lucide-react";
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

    // Set up real-time subscriptions
    const fillingsChannel = supabase.channel('fillings-shrinkage-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fillings'
    }, () => {
      fetchShrinkageData();
    }).subscribe();
    const tankChannel = supabase.channel('tank-movements-shrinkage-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tank_movements'
    }, () => {
      fetchShrinkageData();
    }).subscribe();
    return () => {
      supabase.removeChannel(fillingsChannel);
      supabase.removeChannel(tankChannel);
    };
  }, []);
  const fetchShrinkageData = async () => {
    try {
      // Get cylinder shrinkage data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const {
        data: cylinderData,
        error: cylinderError
      } = await supabase.from('fillings').select('weight_filled, shrinkage_amount').gte('created_at', thirtyDaysAgo.toISOString());
      if (cylinderError) throw cylinderError;

      // Get tank movement shrinkage data (last 30 days)
      const {
        data: tankData,
        error: tankError
      } = await supabase.from('tank_movements').select('movement_type, quantity, shrinkage_amount').gte('created_at', thirtyDaysAgo.toISOString());
      if (tankError) throw tankError;

      // Process cylinder data
      const cylinderShrinkage = {
        total_weight: cylinderData?.reduce((sum, item) => sum + (item.weight_filled || 0), 0) || 0,
        total_shrinkage: cylinderData?.reduce((sum, item) => sum + (item.shrinkage_amount || 0), 0) || 0,
        count: cylinderData?.length || 0,
        period: "Últimos 30 días"
      };

      // Process tank data
      const entryCount = tankData?.filter(item => item.movement_type === 'entrada').length || 0;
      const exitCount = tankData?.filter(item => item.movement_type === 'salida').length || 0;
      const tankShrinkage = {
        total_quantity: tankData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        total_shrinkage: tankData?.reduce((sum, item) => sum + (item.shrinkage_amount || 0), 0) || 0,
        entry_count: entryCount,
        exit_count: exitCount,
        period: "Últimos 30 días"
      };
      setShrinkageData({
        cylinder_shrinkage: cylinderShrinkage,
        tank_shrinkage: tankShrinkage
      });
    } catch (error) {
      console.error('Error fetching shrinkage data:', error);
    } finally {
      setLoading(false);
    }
  };
  const getShrinkagePercentage = (shrinkage: number, total: number) => {
    if (total === 0) return 0;
    return shrinkage / total * 100;
  };
  if (loading) {
    return <Card className="shadow-industrial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-warning" />
            Reporte de Merma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="animate-pulse h-24 bg-muted rounded"></div>)}
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="shadow-industrial">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-warning" />
          Reporte de Merma
          <Badge variant="outline" className="ml-auto">
            <Calendar className="h-3 w-3 mr-1" />
            {shrinkageData?.cylinder_shrinkage.period}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cylinder Filling Shrinkage */}
        <div className="border border-border rounded-lg p-4 px-0 py-0">
          <div className="flex items-center gap-2 mb-3">
            <Factory className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Merma por Llenado de Cilindros</h3>
          </div>
          
          {shrinkageData?.cylinder_shrinkage.count === 0 ? <p className="text-muted-foreground text-sm">No hay datos de llenados en este período</p> : <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {shrinkageData?.cylinder_shrinkage.count || 0}
                </div>
                <div className="text-xs text-muted-foreground">Llenados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {shrinkageData?.cylinder_shrinkage.total_weight.toFixed(1) || '0.0'} kg
                </div>
                <div className="text-xs text-muted-foreground">Peso Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {shrinkageData?.cylinder_shrinkage.total_shrinkage.toFixed(1) || '0.0'} kg
                </div>
                <div className="text-xs text-muted-foreground">Merma Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {getShrinkagePercentage(shrinkageData?.cylinder_shrinkage.total_shrinkage || 0, shrinkageData?.cylinder_shrinkage.total_weight || 0).toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">% Merma</div>
              </div>
            </div>}
        </div>

        {/* Tank Movement Shrinkage */}
        <div className="border border-border rounded-lg p-4 py-0 px-0">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Merma por Movimientos del Tanque</h3>
          </div>
          
          {shrinkageData?.tank_shrinkage.entry_count === 0 && shrinkageData?.tank_shrinkage.exit_count === 0 ? <p className="text-muted-foreground text-sm">No hay datos de movimientos en este período</p> : <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-success">
                    {shrinkageData?.tank_shrinkage.entry_count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Entradas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">
                    {shrinkageData?.tank_shrinkage.exit_count || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Salidas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">
                    {shrinkageData?.tank_shrinkage.total_quantity.toFixed(1) || '0.0'} kg
                  </div>
                  <div className="text-xs text-muted-foreground">Cantidad Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-warning">
                    {shrinkageData?.tank_shrinkage.total_shrinkage.toFixed(1) || '0.0'} kg
                  </div>
                  <div className="text-xs text-muted-foreground">Merma Total</div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {getShrinkagePercentage(shrinkageData?.tank_shrinkage.total_shrinkage || 0, shrinkageData?.tank_shrinkage.total_quantity || 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">% Merma Promedio</div>
                </div>
              </div>
            </div>}
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Resumen Total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merma Total (Cilindros + Tanque):</span>
              <span className="font-medium text-foreground">
                {((shrinkageData?.cylinder_shrinkage.total_shrinkage || 0) + (shrinkageData?.tank_shrinkage.total_shrinkage || 0)).toFixed(1)} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso/Cantidad Total:</span>
              <span className="font-medium text-foreground">
                {((shrinkageData?.cylinder_shrinkage.total_weight || 0) + (shrinkageData?.tank_shrinkage.total_quantity || 0)).toFixed(1)} kg
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default ShrinkageReport;