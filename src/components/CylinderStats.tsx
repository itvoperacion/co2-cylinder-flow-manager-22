import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cylinder, Package, MapPin, CheckCircle, XCircle, Settings, AlertTriangle, ArrowUpDown, Undo } from "lucide-react";
interface CylinderStat {
  status: string;
  location: string;
  capacity: string;
  count: number;
}
interface LocationStat {
  location: string;
  count: number;
}
const CylinderStats = () => {
  const [cylinderStats, setCylinderStats] = useState<CylinderStat[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchStats();

    // Set up real-time subscription
    const channel = supabase.channel('cylinder-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'cylinders'
    }, () => fetchStats()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchStats = async () => {
    try {
      // Fetch cylinder stats by status, location, and capacity
      const {
        data: statsData,
        error: statsError
      } = await supabase.from('cylinders').select('current_status, current_location, capacity').eq('is_active', true);
      if (statsError) throw statsError;

      // Process stats by status and capacity
      const statsMap = new Map<string, number>();
      const locationMap = new Map<string, number>();
      statsData?.forEach(cylinder => {
        const key = `${cylinder.current_status}-${cylinder.capacity}`;
        statsMap.set(key, (statsMap.get(key) || 0) + 1);
        locationMap.set(cylinder.current_location, (locationMap.get(cylinder.current_location) || 0) + 1);
      });

      // Convert to arrays
      const cylinderStatsArray: CylinderStat[] = [];
      const capacities = ['9kg', '22kg', '25kg'];
      const statuses = ['vacio', 'lleno', 'en_llenado', 'en_mantenimiento', 'fuera_de_servicio'];
      statuses.forEach(status => {
        capacities.forEach(capacity => {
          const key = `${status}-${capacity}`;
          const count = statsMap.get(key) || 0;
          cylinderStatsArray.push({
            status,
            location: '',
            capacity,
            count
          });
        });
      });
      const locationStatsArray: LocationStat[] = Array.from(locationMap.entries()).map(([location, count]) => ({
        location,
        count
      }));
      setCylinderStats(cylinderStatsArray);
      setLocationStats(locationStatsArray);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lleno':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'vacio':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case 'en_llenado':
        return <ArrowUpDown className="h-4 w-4 text-primary" />;
      case 'en_mantenimiento':
        return <Settings className="h-4 w-4 text-warning" />;
      case 'fuera_de_servicio':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'lleno':
        return 'Llenos';
      case 'vacio':
        return 'Vacíos';
      case 'en_llenado':
        return 'En Llenado';
      case 'en_mantenimiento':
        return 'Mantenimiento';
      case 'fuera_de_servicio':
        return 'Fuera de Servicio';
      default:
        return status;
    }
  };
  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'despacho':
        return <Package className="h-4 w-4 text-primary" />;
      case 'estacion_llenado':
        return <ArrowUpDown className="h-4 w-4 text-primary" />;
      case 'en_mantenimiento':
        return <Settings className="h-4 w-4 text-warning" />;
      case 'fuera_de_servicio':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'asignaciones':
        return <MapPin className="h-4 w-4 text-accent" />;
      case 'devoluciones':
        return <Undo className="h-4 w-4 text-secondary-foreground" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };
  const getLocationLabel = (location: string) => {
    switch (location) {
      case 'despacho':
        return 'Despacho';
      case 'estacion_llenado':
        return 'Estación de Llenado';
      case 'en_mantenimiento':
        return 'En Mantenimiento';
      case 'fuera_de_servicio':
        return 'Fuera de Servicio';
      case 'asignaciones':
        return 'Asignaciones';
      case 'devoluciones':
        return 'Devoluciones';
      default:
        return location;
    }
  };
  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cylinder className="h-5 w-5 text-primary" />
              Inventario por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-muted rounded"></div>)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-industrial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Inventario por Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-muted rounded"></div>)}
            </div>
          </CardContent>
        </Card>
      </div>;
  }

  // Group stats by status for display
  const groupedStats = cylinderStats.reduce((acc, stat) => {
    if (!acc[stat.status]) {
      acc[stat.status] = [];
    }
    acc[stat.status].push(stat);
    return acc;
  }, {} as Record<string, CylinderStat[]>);

  // Calculate totals by capacity
  const capacityTotals = cylinderStats.reduce((acc, stat) => {
    if (!acc[stat.capacity]) {
      acc[stat.capacity] = {
        llenos: 0,
        vacios: 0,
        total: 0
      };
    }
    if (stat.status === 'lleno') {
      acc[stat.capacity].llenos += stat.count;
    } else if (stat.status === 'vacio') {
      acc[stat.capacity].vacios += stat.count;
    }
    acc[stat.capacity].total += stat.count;
    return acc;
  }, {} as Record<string, {
    llenos: number;
    vacios: number;
    total: number;
  }>);
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-0">
      {/* Cylinder Stats by Status */}
      <Card className="shadow-industrial">
        
        
      </Card>

      {/* Location Stats */}
      

      {/* Totals by Capacity */}
      <Card className="shadow-industrial lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Resumen por Capacidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(capacityTotals).map(([capacity, totals]) => <div key={capacity} className="p-4 border rounded-lg space-y-3">
                <h4 className="font-semibold text-center">{capacity}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-success" />
                      Llenos:
                    </span>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      {totals.llenos}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      Vacíos:
                    </span>
                    <Badge variant="outline">
                      {totals.vacios}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <Badge variant="secondary">
                      {totals.total}
                    </Badge>
                  </div>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default CylinderStats;