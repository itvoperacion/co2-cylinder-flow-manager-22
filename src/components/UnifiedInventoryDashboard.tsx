import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin,
  Package,
  Building,
  Factory,
  Truck,
  Warehouse,
  BarChart3,
  Activity,
  TrendingUp,
  Gauge
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
    // Ensure user has a role before fetching data
    const initializeData = async () => {
      try {
        // Call function to ensure user has a role
        await supabase.rpc('ensure_user_has_role');
        await fetchInventory();
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
      }
    };

    initializeData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('cylinders-unified-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cylinders'
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('current_location, current_status, capacity')
        .eq('is_active', true);

      if (error) throw error;

      // Process data to group by location, status, and capacity
      const locationMap: { [key: string]: { 
        empty: number; 
        full: number; 
        capacity_breakdown: { [capacity: string]: { empty: number; full: number } }
      } } = {};
      
      const capacityTotals: { [capacity: string]: { empty: number; full: number; total: number } } = {};
      let totalEmpty = 0;
      let totalFull = 0;

      data?.forEach(cylinder => {
        const location = cylinder.current_location;
        const capacity = cylinder.capacity || 'No especificada';
        const status = cylinder.current_status;
        
        // Initialize location if not exists
        if (!locationMap[location]) {
          locationMap[location] = { empty: 0, full: 0, capacity_breakdown: {} };
        }
        
        // Initialize capacity breakdown for location if not exists
        if (!locationMap[location].capacity_breakdown[capacity]) {
          locationMap[location].capacity_breakdown[capacity] = { empty: 0, full: 0 };
        }
        
        // Initialize capacity totals if not exists
        if (!capacityTotals[capacity]) {
          capacityTotals[capacity] = { empty: 0, full: 0, total: 0 };
        }
        
        // Count by status
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

      // Convert to array format
      const inventoryArray = Object.entries(locationMap).map(([location, counts]) => ({
        location,
        empty_count: counts.empty,
        full_count: counts.full,
        total_count: counts.empty + counts.full,
        capacity_breakdown: counts.capacity_breakdown
      }));

      // Sort by total count descending
      inventoryArray.sort((a, b) => b.total_count - a.total_count);
      
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
    switch (location) {
      case 'despacho':
        return <Building className="h-5 w-5 text-primary" />;
      case 'estacion_llenado':
        return <Factory className="h-5 w-5 text-warning" />;
      case 'transporte':
        return <Truck className="h-5 w-5 text-accent" />;
      case 'almacen':
        return <Warehouse className="h-5 w-5 text-muted-foreground" />;
      case 'asignaciones':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'en_mantenimiento':
        return <Activity className="h-5 w-5 text-orange-600" />;
      case 'clientes':
        return <Building className="h-5 w-5 text-green-600" />;
      default:
        return <MapPin className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getLocationLabel = (location: string) => {
    switch (location) {
      case 'despacho':
        return 'Despacho';
      case 'estacion_llenado':
        return 'Estación de Llenado';
      case 'transporte':
        return 'En Transporte';
      case 'almacen':
        return 'Almacén';
      case 'asignaciones':
        return 'Asignaciones';
      case 'en_mantenimiento':
        return 'En Mantenimiento';
      case 'clientes':
        return 'Clientes';
      default:
        return location.charAt(0).toUpperCase() + location.slice(1).replace('_', ' ');
    }
  };

  const getCapacityColor = (capacity: string) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    const index = capacity.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-industrial bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary animate-pulse" />
              Inventario Unificado de Cilindros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statusSummary) return null;

  const fillPercentage = statusSummary.total_cylinders > 0 
    ? (statusSummary.total_full / statusSummary.total_cylinders) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <Card className="shadow-industrial bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
            Inventario Unificado de Cilindros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total General */}
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="h-5 w-5 text-primary" />
                <span className="font-medium">Total General</span>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {statusSummary.total_cylinders}
                </div>
                <Progress value={fillPercentage} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{statusSummary.total_full} Llenos</span>
                  <span>{statusSummary.total_empty} Vacíos</span>
                </div>
              </div>
            </div>

            {/* Estado Actual */}
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="font-medium">Estado Operativo</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <Package className="h-3 w-3 mr-1" />
                    Llenos
                  </Badge>
                  <span className="font-semibold">{statusSummary.total_full}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    <Package className="h-3 w-3 mr-1" />
                    Vacíos
                  </Badge>
                  <span className="font-semibold">{statusSummary.total_empty}</span>
                </div>
              </div>
            </div>

            {/* Capacidades */}
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <Gauge className="h-5 w-5 text-accent" />
                <span className="font-medium">Por Capacidad</span>
              </div>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {Object.entries(statusSummary.capacity_totals).map(([capacity, counts]) => (
                  <div key={capacity} className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${getCapacityColor(capacity)}`}>
                      {capacity}
                    </span>
                    <span className="text-muted-foreground">
                      {counts.total} ({counts.full}L/{counts.empty}V)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventario por Ubicación */}
      <Card className="shadow-industrial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Distribución por Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay datos de inventario disponibles
            </p>
          ) : (
            <div className="space-y-4">
              {inventory.map((item) => (
                <div
                  key={item.location}
                  className="bg-gradient-to-r from-background to-muted/30 rounded-lg p-5 border border-border hover:shadow-md transition-all duration-200"
                >
                  {/* Header de ubicación */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getLocationIcon(item.location)}
                      <div>
                        <h4 className="font-semibold text-foreground text-lg">
                          {getLocationLabel(item.location)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Total: {item.total_count} cilindros
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.empty_count > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {item.empty_count} Vacíos
                        </Badge>
                      )}
                      {item.full_count > 0 && (
                        <Badge variant="default" className="flex items-center gap-1 bg-success text-success-foreground">
                          <Package className="h-3 w-3" />
                          {item.full_count} Llenos
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Desglose por capacidad */}
                  {Object.keys(item.capacity_breakdown).length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Gauge className="h-4 w-4" />
                          Desglose por Capacidad
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(item.capacity_breakdown).map(([capacity, counts]) => (
                            <div
                              key={capacity}
                              className="bg-background/50 rounded-md p-3 border border-border/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${getCapacityColor(capacity)}`}>
                                  {capacity}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {counts.empty + counts.full} total
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {counts.full > 0 && (
                                  <Badge variant="default" className="bg-success/80 text-success-foreground text-xs">
                                    {counts.full}L
                                  </Badge>
                                )}
                                {counts.empty > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {counts.empty}V
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedInventoryDashboard;