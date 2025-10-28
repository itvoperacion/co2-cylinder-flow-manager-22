import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus, MapPin, Calendar, Package, ArrowRightLeft, Building } from "lucide-react";
interface ClientAssignment {
  id: string;
  client_name: string;
  client_location: string;
  assignment_date: string;
  cylinder_count: number;
  cylinder_capacity: string;
  condition: 'vacio' | 'lleno';
  observations?: string;
}
interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
  customer_info?: string;
}
const ClientManagement = () => {
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [availableCylinders, setAvailableCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [cylinderCount, setCylinderCount] = useState(1);
  const [selectedCapacity, setSelectedCapacity] = useState("");
  const [condition, setCondition] = useState<'vacio' | 'lleno'>('vacio');
  const [observations, setObservations] = useState("");

  // Transfer state
  const [fromLocation, setFromLocation] = useState<'rutas' | 'clientes'>('rutas');
  const [toLocation, setToLocation] = useState<'clientes' | 'despacho' | 'devoluciones'>('clientes');
  const [selectedCylinders, setSelectedCylinders] = useState<string[]>([]);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      // Fetch cylinders from "rutas" for transfers
      const {
        data: cylinders,
        error: cylindersError
      } = await supabase.from('cylinders').select('*').in('current_location', ['rutas', 'clientes']).eq('is_active', true);
      if (cylindersError) throw cylindersError;
      setAvailableCylinders(cylinders || []);

      // Note: Client assignments would be stored in a separate table in a real implementation
      // For now, we'll show cylinders in "clientes" location as assignments
      const clientCylinders = cylinders?.filter(c => c.current_location === 'clientes') || [];

      // Group by client info (would come from a proper clients table)
      const mockAssignments: ClientAssignment[] = [];
      const capacityGroups = clientCylinders.reduce((acc, cylinder) => {
        const key = cylinder.capacity;
        if (!acc[key]) acc[key] = [];
        acc[key].push(cylinder);
        return acc;
      }, {} as Record<string, Cylinder[]>);
      Object.entries(capacityGroups).forEach(([capacity, cyls]) => {
        mockAssignments.push({
          id: `client-${capacity}`,
          client_name: "Cliente Ejemplo",
          client_location: "Ubicación del Cliente",
          assignment_date: new Date().toISOString(),
          cylinder_count: cyls.length,
          cylinder_capacity: capacity,
          condition: cyls[0]?.current_status as 'vacio' | 'lleno',
          observations: "Asignación registrada"
        });
      });
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };
  const handleCreateAssignment = async () => {
    if (!clientName.trim() || !clientLocation.trim() || !selectedCapacity) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    try {
      // Get cylinders from "rutas" location with the selected capacity and status
      const {
        data: availableCyls,
        error: fetchError
      } = await supabase.from('cylinders').select('id').eq('current_location', 'rutas').eq('capacity', selectedCapacity).eq('current_status', condition).eq('is_active', true).limit(cylinderCount);
      if (fetchError) throw fetchError;
      if (!availableCyls || availableCyls.length < cylinderCount) {
        toast.error(`No hay suficientes cilindros ${condition}s de ${selectedCapacity} en rutas`);
        return;
      }

      // Move cylinders to "clientes" location
      const cylinderIds = availableCyls.map(c => c.id);
      const {
        error: updateError
      } = await supabase.from('cylinders').update({
        current_location: 'clientes',
        customer_info: `${clientName} - ${clientLocation}`,
        observations: observations || undefined
      }).in('id', cylinderIds);
      if (updateError) throw updateError;

      // Create transfer records
      const transferPromises = cylinderIds.map(cylinderId => supabase.from('transfers').insert({
        cylinder_id: cylinderId,
        from_location: 'rutas',
        to_location: 'clientes',
        operator_name: 'Sistema',
        observations: `Asignado a cliente: ${clientName}`
      }));
      await Promise.all(transferPromises);
      toast.success('Asignación creada exitosamente');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Error al crear la asignación');
    }
  };
  const handleTransfer = async () => {
    if (selectedCylinders.length === 0) {
      toast.error('Seleccione al menos un cilindro para transferir');
      return;
    }
    try {
      let updateData: any = {
        current_location: toLocation
      };
      if (toLocation === 'despacho' || toLocation === 'devoluciones') {
        updateData.customer_info = null;
      }
      const {
        error: updateError
      } = await supabase.from('cylinders').update(updateData).in('id', selectedCylinders);
      if (updateError) throw updateError;

      // Create transfer records
      const transferPromises = selectedCylinders.map(cylinderId => supabase.from('transfers').insert({
        cylinder_id: cylinderId,
        from_location: fromLocation,
        to_location: toLocation,
        operator_name: 'Sistema',
        observations: `Transferencia ${fromLocation} → ${toLocation}`
      }));
      await Promise.all(transferPromises);
      toast.success('Transferencia completada exitosamente');
      setTransferDialogOpen(false);
      setSelectedCylinders([]);
      fetchData();
    } catch (error) {
      console.error('Error in transfer:', error);
      toast.error('Error al realizar la transferencia');
    }
  };
  const resetForm = () => {
    setClientName("");
    setClientLocation("");
    setCylinderCount(1);
    setSelectedCapacity("");
    setCondition('vacio');
    setObservations("");
  };
  const uniqueCapacities = [...new Set(availableCylinders.map(c => c.capacity))];
  const cylindersFromAssignments = availableCylinders.filter(c => c.current_location === 'rutas');
  const cylindersFromClients = availableCylinders.filter(c => c.current_location === 'clientes');
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg"></div>)}
          </div>
        </CardContent>
      </Card>;
  }
  return;
};
export default ClientManagement;