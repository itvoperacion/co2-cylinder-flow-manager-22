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
import { 
  Users, 
  Plus, 
  MapPin, 
  Calendar, 
  Package,
  ArrowRightLeft,
  Building
} from "lucide-react";

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
  const [fromLocation, setFromLocation] = useState<'asignaciones' | 'clientes'>('asignaciones');
  const [toLocation, setToLocation] = useState<'clientes' | 'despacho' | 'devoluciones'>('clientes');
  const [selectedCylinders, setSelectedCylinders] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch cylinders from "asignaciones" for transfers
      const { data: cylinders, error: cylindersError } = await supabase
        .from('cylinders')
        .select('*')
        .in('current_location', ['asignaciones', 'clientes'])
        .eq('is_active', true);

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
      // Get cylinders from "asignaciones" location with the selected capacity and status
      const { data: availableCyls, error: fetchError } = await supabase
        .from('cylinders')
        .select('id')
        .eq('current_location', 'asignaciones')
        .eq('capacity', selectedCapacity)
        .eq('current_status', condition)
        .eq('is_active', true)
        .limit(cylinderCount);

      if (fetchError) throw fetchError;

      if (!availableCyls || availableCyls.length < cylinderCount) {
        toast.error(`No hay suficientes cilindros ${condition}s de ${selectedCapacity} en asignaciones`);
        return;
      }

      // Move cylinders to "clientes" location
      const cylinderIds = availableCyls.map(c => c.id);
      const { error: updateError } = await supabase
        .from('cylinders')
        .update({ 
          current_location: 'clientes',
          customer_info: `${clientName} - ${clientLocation}`,
          observations: observations || undefined
        })
        .in('id', cylinderIds);

      if (updateError) throw updateError;

      // Create transfer records
      const transferPromises = cylinderIds.map(cylinderId =>
        supabase
          .from('transfers')
          .insert({
            cylinder_id: cylinderId,
            from_location: 'asignaciones',
            to_location: 'clientes',
            operator_name: 'Sistema',
            observations: `Asignado a cliente: ${clientName}`,
          })
      );

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
      let updateData: any = { current_location: toLocation };
      
      if (toLocation === 'despacho' || toLocation === 'devoluciones') {
        updateData.customer_info = null;
      }

      const { error: updateError } = await supabase
        .from('cylinders')
        .update(updateData)
        .in('id', selectedCylinders);

      if (updateError) throw updateError;

      // Create transfer records
      const transferPromises = selectedCylinders.map(cylinderId =>
        supabase
          .from('transfers')
          .insert({
            cylinder_id: cylinderId,
            from_location: fromLocation,
            to_location: toLocation,
            operator_name: 'Sistema',
            observations: `Transferencia ${fromLocation} → ${toLocation}`,
          })
      );

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
  const cylindersFromAssignments = availableCylinders.filter(c => c.current_location === 'asignaciones');
  const cylindersFromClients = availableCylinders.filter(c => c.current_location === 'clientes');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Gestión de Clientes
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Asignación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Asignación a Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nombre del Cliente</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientLocation">Ubicación</Label>
                    <Input
                      id="clientLocation"
                      value={clientLocation}
                      onChange={(e) => setClientLocation(e.target.value)}
                      placeholder="Dirección del cliente"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cylinderCount">Cantidad</Label>
                      <Input
                        id="cylinderCount"
                        type="number"
                        min="1"
                        value={cylinderCount}
                        onChange={(e) => setCylinderCount(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacidad</Label>
                      <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
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
                  </div>
                  <div className="space-y-2">
                    <Label>Condición</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="observations">Observaciones</Label>
                    <Textarea
                      id="observations"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Observaciones adicionales (opcional)"
                      rows={3}
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
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferencias
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Transferir Cilindros</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origen</Label>
                      <Select value={fromLocation} onValueChange={(value: 'asignaciones' | 'clientes') => setFromLocation(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asignaciones">Asignaciones</SelectItem>
                          <SelectItem value="clientes">Clientes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Destino</Label>
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cilindros Disponibles</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-2">
                      {(fromLocation === 'asignaciones' ? cylindersFromAssignments : cylindersFromClients).map(cylinder => (
                        <div
                          key={cylinder.id}
                          className={`p-3 rounded border cursor-pointer transition-colors ${
                            selectedCylinders.includes(cylinder.id)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-background border-border hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedCylinders(prev =>
                              prev.includes(cylinder.id)
                                ? prev.filter(id => id !== cylinder.id)
                                : [...prev, cylinder.id]
                            );
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span className="font-medium">{cylinder.serial_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{cylinder.capacity}</Badge>
                              <Badge variant={cylinder.current_status === 'lleno' ? 'default' : 'secondary'}>
                                {cylinder.current_status === 'lleno' ? 'Lleno' : 'Vacío'}
                              </Badge>
                            </div>
                          </div>
                          {cylinder.customer_info && (
                            <p className="text-sm text-muted-foreground mt-1">{cylinder.customer_info}</p>
                          )}
                        </div>
                      ))}
                      {(fromLocation === 'asignaciones' ? cylindersFromAssignments : cylindersFromClients).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No hay cilindros disponibles en {fromLocation === 'asignaciones' ? 'asignaciones' : 'clientes'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {selectedCylinders.length} cilindros seleccionados
                    </span>
                    <Button onClick={handleTransfer} disabled={selectedCylinders.length === 0}>
                      Transferir
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Asignaciones Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay asignaciones activas
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-gradient-to-r from-background to-muted/30 rounded-lg p-4 border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-semibold">{assignment.client_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {assignment.client_location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {assignment.cylinder_count} × {assignment.cylinder_capacity}
                      </Badge>
                      <Badge variant={assignment.condition === 'lleno' ? 'default' : 'secondary'}>
                        {assignment.condition === 'lleno' ? 'Lleno' : 'Vacío'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Asignado: {new Date(assignment.assignment_date).toLocaleDateString()}
                    </div>
                    {assignment.observations && (
                      <div className="flex-1">
                        <span className="font-medium">Obs:</span> {assignment.observations}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientManagement;