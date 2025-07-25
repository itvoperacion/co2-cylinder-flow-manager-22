import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ArrowUp, ArrowDown, User, Truck } from "lucide-react";

interface TankMovement {
  id: string;
  movement_type: string;
  quantity: number;
  operator_name: string;
  supplier: string | null;
  observations: string | null;
  created_at: string;
  reference_filling_id: string | null;
}

const TankMovementsHistory = () => {
  const [movements, setMovements] = useState<TankMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('tank-movements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tank_movements'
        },
        () => fetchMovements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('tank_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    return type === 'entrada' ? (
      <ArrowUp className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-red-600" />
    );
  };

  const getMovementBadge = (type: string) => {
    return type === 'entrada' ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        Entrada
      </Badge>
    ) : (
      <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">
        Salida
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Movimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad (kg)</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Proveedor/Ref</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        {getMovementBadge(movement.movement_type)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.movement_type === 'entrada' ? '+' : '-'}
                      {movement.quantity.toLocaleString()} kg
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {movement.operator_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {movement.movement_type === 'entrada' ? (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          {movement.supplier || 'N/A'}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {movement.reference_filling_id ? 'Llenado' : 'Manual'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.observations || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TankMovementsHistory;