import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, Package, Building, Factory, Truck, Warehouse,
  BarChart3, Gauge, Wrench
} from "lucide-react";

interface LocationInventory {
  location: string;
  empty_count: number;
  full_count: number;
  total_count: number;
  capacity_breakdown: { [capacity: string]: { empty: number; full: number } };
}

interface StatusSummary {
  total_empty: number;
  total_full: number;
  total_cylinders: number;
  capacity_totals: { [capacity: string]: { empty: number; full: number; total: number } };
}

const UnifiedInventoryDashboard = () => {
  const [inventory, setInventory] = useState<LocationInventory[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await supabase.rpc('ensure_user_has_role');
        await fetchInventory();
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    };

    initializeData();
    
    const channel = supabase
      .channel('cylinders-unified-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cylinders' }, () => fetchInventory())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('current_location, current_status, capacity')
        .eq('is_active', true);

      if (error) throw error;

      const locationMap: { [key: string]: { 
        empty: number; full: number; 
        capacity_breakdown: { [capacity: string]: { empty: number; full: number } }
      } } = {};
      
      const capacityTotals: { [capacity: string]: { empty: number; full: number; total: number } } = {};
      let totalEmpty = 0, totalFull = 0;

      data?.forEach(cylinder => {
        const location = cylinder.current_location;
        const capacity = cylinder.capacity || 'No especificada';
        const status = cylinder.current_status;
        
        if (!locationMap[location]) {
          locationMap[location] = { empty: 0, full: 0, capacity_breakdown: {} };
        }
        if (!locationMap[location].capacity_breakdown[capacity]) {
          locationMap[location].capacity_breakdown[capacity] = { empty: 0, full: 0 };
        }
        if (!capacityTotals[capacity]) {
          capacityTotals[capacity] = { empty: 0, full: 0, total: 0 };
        }
        
        if (status === 'vacio') {
          locationMap[location].empty++;
          locationMap[location].capacity_breakdown[capacity].empty++;
          capacityTotals[capacity].empty++;
          totalEmpty++;
        } else if (status === 'lleno') {
          locationMap[location].full++;
          locationMap[location].capacity_breakdown[capacity].full++;
          capacityTotals[capacity].full++;
          totalFull++;
        }
        capacityTotals[capacity].total++;
      });

      const inventoryArray = Object.entries(locationMap)
        .map(([location, counts]) => ({
          location,
          empty_count: counts.empty,
          full_count: counts.full,
          total_count: counts.empty + counts.full,
          capacity_breakdown: counts.capacity_breakdown
        }))
        .sort((a, b) => b.total_count - a.total_count);
      
      setInventory(inventoryArray);
      setStatusSummary({
        total_empty: totalEmpty,
        total_full: totalFull,
        total_cylinders: totalEmpty + totalFull,
        capacity_totals: capacityTotals
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (location: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'despacho': <Warehouse className="h-4 w-4 text-primary" />,
      'estacion_llenado': <Factory className="h-4 w-4 text-warning" />,
      'transporte': <Truck className="h-4 w-4 text-accent" />,
      'almacen': <Warehouse className="h-4 w-4 text-muted-foreground" />,
      'rutas': <Truck className="h-4 w-4 text-blue-600" />,
      'en_mantenimiento': <Wrench className="h-4 w-4 text-orange-600" />,
      'clientes': <Building className="h-4 w-4 text-green-600" />
    };
    return icons[location] || <MapPin className="h-4 w-4 text-muted-foreground" />;
  };

  const getLocationLabel = (location: string) => {
    const labels: { [key: string]: string } = {
      'despacho': 'Despacho',
      'estacion_llenado': 'Est. Llenado',
      'transporte': 'Transporte',
      'almacen': 'Almacén',
      'rutas': 'Rutas',
      'en_mantenimiento': 'Mantenimiento',
      'clientes': 'Clientes'
    };
    return labels[location] || location.charAt(0).toUpperCase() + location.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statusSummary) return null;

  const fillPercentage = statusSummary.total_cylinders > 0 
    ? (statusSummary.total_full / statusSummary.total_cylinders) * 100 
    : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header con resumen */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Inventario de Cilindros</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-success text-success-foreground text-xs">
              {statusSummary.total_full} Llenos
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {statusSummary.total_empty} Vacíos
            </Badge>
          </div>
        </div>

        {/* Barra de progreso general */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total: {statusSummary.total_cylinders} cilindros</span>
            <span>{fillPercentage.toFixed(0)}% llenos</span>
          </div>
          <Progress value={fillPercentage} className="h-2" />
        </div>

        {/* Grid de capacidades */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusSummary.capacity_totals).map(([capacity, counts]) => (
            <Badge key={capacity} variant="outline" className="text-xs">
              <Gauge className="h-3 w-3 mr-1" />
              {capacity}: {counts.total} ({counts.full}L/{counts.empty}V)
            </Badge>
          ))}
        </div>

        {/* Grid de ubicaciones - Compacto */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {inventory.map((item) => (
            <div
              key={item.location}
              className="bg-muted/30 rounded-lg p-2 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {getLocationIcon(item.location)}
                <span className="font-medium text-xs truncate">
                  {getLocationLabel(item.location)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.total_count}</span>
                <div className="flex gap-1">
                  {item.full_count > 0 && (
                    <span className="text-success font-medium">{item.full_count}L</span>
                  )}
                  {item.empty_count > 0 && (
                    <span className="text-muted-foreground">{item.empty_count}V</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedInventoryDashboard;
