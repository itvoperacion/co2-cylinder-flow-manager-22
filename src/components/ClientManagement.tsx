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
  const [transferStatus, setTransferStatus] = useState<'vacio' | 'lleno'>('vacio');
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
      
      // Update status when transferring to despacho or devoluciones
      if (toLocation === 'despacho' || toLocation === 'devoluciones') {
        updateData.current_status = transferStatus;
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
        observations: `Transferencia ${fromLocation} → ${toLocation}${(toLocation === 'despacho' || toLocation === 'devoluciones') ? ` - Estado: ${transferStatus}` : ''}`
      }));
      await Promise.all(transferPromises);
      toast.success('Transferencia completada exitosamente');
      setTransferDialogOpen(false);
      setSelectedCylinders([]);
      setTransferStatus('vacio');
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
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Asignaciones
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Asignación
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Asignación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="clientName">Nombre del Cliente</Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ingrese nombre del cliente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientLocation">Ubicación del Cliente</Label>
                      <Input
                        id="clientLocation"
                        value={clientLocation}
                        onChange={(e) => setClientLocation(e.target.value)}
                        placeholder="Ingrese ubicación"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity">Capacidad de Cilindro</Label>
                      <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione capacidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueCapacities.map(capacity => (
                            <SelectItem key={capacity} value={capacity}>
                              {capacity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="condition">Condición</Label>
                      <Select value={condition} onValueChange={(value: 'vacio' | 'lleno') => setCondition(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacio">Vacío</SelectItem>
                          <SelectItem value="lleno">Lleno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cylinderCount">Cantidad de Cilindros</Label>
                      <Input
                        id="cylinderCount"
                        type="number"
                        min={1}
                        value={cylinderCount}
                        onChange={(e) => setCylinderCount(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="observations">Observaciones</Label>
                      <Textarea
                        id="observations"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Observaciones adicionales (opcional)"
                      />
                    </div>
                    <Button onClick={handleCreateAssignment} className="w-full">
                      Crear Asignación
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transferir Cilindros
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Transferir Cilindros</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Desde</Label>
                      <Select value={fromLocation} onValueChange={(value: 'rutas' | 'clientes') => setFromLocation(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rutas">Rutas</SelectItem>
                          <SelectItem value="clientes">Clientes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Hacia</Label>
                      <Select value={toLocation} onValueChange={(value: 'clientes' | 'despacho' | 'devoluciones') => setToLocation(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clientes">Clientes</SelectItem>
                          <SelectItem value="despacho">Despacho</SelectItem>
                          <SelectItem value="devoluciones">Devoluciones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(toLocation === 'despacho' || toLocation === 'devoluciones') && (
                      <div>
                        <Label>Estado del Cilindro</Label>
                        <Select value={transferStatus} onValueChange={(value: 'vacio' | 'lleno') => setTransferStatus(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacio">Vacío</SelectItem>
                            <SelectItem value="lleno">Lleno</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label>Seleccionar Cilindros</Label>
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                        {(fromLocation === 'rutas' ? cylindersFromAssignments : cylindersFromClients).map(cylinder => (
                          <div key={cylinder.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                            <input
                              type="checkbox"
                              checked={selectedCylinders.includes(cylinder.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCylinders([...selectedCylinders, cylinder.id]);
                                } else {
                                  setSelectedCylinders(selectedCylinders.filter(id => id !== cylinder.id));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{cylinder.serial_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {cylinder.capacity} - {cylinder.current_status}
                              </div>
                            </div>
                            <Badge variant={cylinder.current_status === 'lleno' ? 'default' : 'secondary'}>
                              {cylinder.current_status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleTransfer} className="w-full" disabled={selectedCylinders.length === 0}>
                      Transferir {selectedCylinders.length} Cilindro(s)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay asignaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => (
                <Card key={assignment.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Cliente</div>
                        <div className="font-medium">{assignment.client_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Ubicación
                        </div>
                        <div className="font-medium">{assignment.client_location}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Cilindros
                        </div>
                        <div className="font-medium">
                          {assignment.cylinder_count} × {assignment.cylinder_capacity}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Condición</div>
                        <Badge variant={assignment.condition === 'lleno' ? 'default' : 'secondary'}>
                          {assignment.condition}
                        </Badge>
                      </div>
                    </div>
                    {assignment.observations && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                        {assignment.observations}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default ClientManagement;