import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin,
  Package,
  Building,
  Factory,
  Truck,
  Warehouse
} from "lucide-react";

interface LocationInventory {
  location: string;
  empty_count: number;
  full_count: number;
  total_count: number;
}

const CylinderInventoryByLocation = () => {
  const [inventory, setInventory] = useState<LocationInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('cylinders-location-changes')
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
        .select('current_location, current_status')
        .eq('is_active', true);

      if (error) throw error;

      // Process data to group by location and status
      const locationMap: { [key: string]: { empty: number; full: number } } = {};
      
      data?.forEach(cylinder => {
        const location = cylinder.current_location;
        if (!locationMap[location]) {
          locationMap[location] = { empty: 0, full: 0 };
        }
        
        if (cylinder.current_status === 'vacio') {
          locationMap[location].empty++;
        } else if (cylinder.current_status === 'lleno') {
          locationMap[location].full++;
        }
      });

      // Convert to array format
      const inventoryArray = Object.entries(locationMap).map(([location, counts]) => ({
        location,
        empty_count: counts.empty,
        full_count: counts.full,
        total_count: counts.empty + counts.full
      }));

      // Sort by total count descending
      inventoryArray.sort((a, b) => b.total_count - a.total_count);
      
      setInventory(inventoryArray);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'despacho':
        return <Building className="h-4 w-4 text-primary" />;
      case 'estacion_llenado':
        return <Factory className="h-4 w-4 text-warning" />;
      case 'transporte':
        return <Truck className="h-4 w-4 text-accent" />;
      case 'almacen':
        return <Warehouse className="h-4 w-4 text-muted-foreground" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
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
      default:
        return location.charAt(0).toUpperCase() + location.slice(1);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-industrial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Inventario por Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-industrial">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Inventario por Ubicación
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
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getLocationIcon(item.location)}
                  <div>
                    <h4 className="font-medium text-foreground">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CylinderInventoryByLocation;