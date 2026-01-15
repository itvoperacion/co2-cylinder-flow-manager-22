import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus, ArrowRightLeft } from "lucide-react";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
  customer_info?: string;
}

const ClientManagement = () => {
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
      const { data: cylinders, error } = await supabase
        .from('cylinders')
        .select('*')
        .in('current_location', ['rutas', 'clientes'])
        .eq('is_active', true);

      if (error) throw error;
      setAvailableCylinders(cylinders || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!clientName.trim() || !clientLocation.trim() || !selectedCapacity) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    try {
      const { data: availableCyls, error: fetchError } = await supabase
        .from('cylinders')
        .select('id')
        .eq('current_location', 'rutas')
        .eq('capacity', selectedCapacity)
        .eq('current_status', condition)
        .eq('is_active', true)
        .limit(cylinderCount);

      if (fetchError) throw fetchError;
      if (!availableCyls || availableCyls.length < cylinderCount) {
        toast.error(`No hay suficientes cilindros ${condition}s de ${selectedCapacity} en rutas`);
        return;
      }

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

      await Promise.all(cylinderIds.map(cylinderId => 
        supabase.from('transfers').insert({
          cylinder_id: cylinderId,
          from_location: 'rutas',
          to_location: 'clientes',
          operator_name: 'Sistema',
          observations: `Asignado a cliente: ${clientName}`
        })
      ));

      toast.success('Asignación creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Error al crear asignación');
    }
  };

  const handleTransfer = async () => {
    if (selectedCylinders.length === 0) {
      toast.error('Seleccione cilindros para transferir');
      return;
    }
    try {
      const updateData: { current_location: string; customer_info?: null; current_status?: string } = {
        current_location: toLocation
      };

      if (fromLocation === 'clientes') updateData.customer_info = null;
      if (toLocation === 'despacho' || toLocation === 'devoluciones') updateData.current_status = transferStatus;

      const { error: updateError } = await supabase
        .from('cylinders')
        .update(updateData)
        .in('id', selectedCylinders);

      if (updateError) throw updateError;

      await Promise.all(selectedCylinders.map(cylinderId =>
        supabase.from('transfers').insert({
          cylinder_id: cylinderId,
          from_location: fromLocation,
          to_location: toLocation,
          operator_name: 'Sistema',
          observations: `Transferencia ${fromLocation} → ${toLocation}`
        })
      ));

      toast.success('Transferencia completada');
      setTransferDialogOpen(false);
      setSelectedCylinders([]);
      fetchData();
    } catch (error) {
      console.error('Error in transfer:', error);
      toast.error('Error al realizar transferencia');
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
  const cylindersInRoutes = availableCylinders.filter(c => c.current_location === 'rutas').length;
  const cylindersWithClients = availableCylinders.filter(c => c.current_location === 'clientes').length;

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Gestión de Asignaciones</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            En rutas: {cylindersInRoutes}
          </Badge>
          <Badge variant="outline" className="text-xs">
            En clientes: {cylindersWithClients}
          </Badge>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Nueva Asignación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Asignación de Cilindros</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Ubicación</Label>
                  <Input value={clientLocation} onChange={(e) => setClientLocation(e.target.value)} placeholder="Dirección" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Capacidad</Label>
                    <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {uniqueCapacities.map(cap => <SelectItem key={cap} value={cap}>{cap}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" min={1} value={cylinderCount} onChange={(e) => setCylinderCount(parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Condición</Label>
                  <Select value={condition} onValueChange={(v) => setCondition(v as 'vacio' | 'lleno')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacio">Vacío</SelectItem>
                      <SelectItem value="lleno">Lleno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="h-16 text-sm" />
                </div>
                <Button onClick={handleCreateAssignment} className="w-full">Crear Asignación</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 text-xs">
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Transferir
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Transferir Cilindros</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Desde</Label>
                    <Select value={fromLocation} onValueChange={(v) => setFromLocation(v as 'rutas' | 'clientes')}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rutas">Rutas</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Hacia</Label>
                    <Select value={toLocation} onValueChange={(v) => setToLocation(v as 'clientes' | 'despacho' | 'devoluciones')}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="despacho">Despacho</SelectItem>
                        <SelectItem value="devoluciones">Devoluciones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cilindros disponibles</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 mt-1">
                    {availableCylinders.filter(c => c.current_location === fromLocation).map(cyl => (
                      <label key={cyl.id} className="flex items-center gap-2 text-xs p-1 hover:bg-muted rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCylinders.includes(cyl.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCylinders([...selectedCylinders, cyl.id]);
                            } else {
                              setSelectedCylinders(selectedCylinders.filter(id => id !== cyl.id));
                            }
                          }}
                          className="rounded"
                        />
                        {cyl.serial_number} - {cyl.capacity} ({cyl.current_status})
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleTransfer} className="w-full" disabled={selectedCylinders.length === 0}>
                  Transferir ({selectedCylinders.length})
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientManagement;
