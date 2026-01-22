import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
}

interface Adjustment {
  id: string;
  adjustment_date: string;
  location: string;
  cylinder_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_location: string | null;
  adjustment_type: string;
  quantity_adjusted: number;
  reason: string;
  performed_by: string;
  observations: string | null;
  created_at: string;
}

const LOCATIONS = [
  { value: "despacho", label: "Despacho" },
  { value: "estacion_llenado", label: "Estación de Llenado" },
  { value: "rutas", label: "Rutas" },
  { value: "clientes", label: "Clientes" },
  { value: "devolucion_clientes", label: "Devolución Clientes" },
  { value: "cierre_rutas", label: "Cierre de Rutas" },
  { value: "mantenimiento", label: "En Mantenimiento" },
  { value: "fuera_servicio", label: "Fuera de Servicio" },
];

const STATUS_OPTIONS = [
  { value: "vacio", label: "Vacío" },
  { value: "lleno", label: "Lleno" },
  { value: "en_llenado", label: "En Llenado" },
  { value: "en_transito", label: "En Tránsito" },
  { value: "mantenimiento", label: "En Mantenimiento" },
  { value: "fuera_servicio", label: "Fuera de Servicio" },
];

const ADJUSTMENT_TYPES = [
  { value: "status_change", label: "Cambio de Estado" },
  { value: "location_change", label: "Cambio de Ubicación" },
  { value: "correction", label: "Corrección de Inventario" },
];

const Adjustments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCylinder, setSelectedCylinder] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adjustmentsRes, cylindersRes] = await Promise.all([
        supabase
          .from("inventory_adjustments" as any)
          .select("*")
          .order("adjustment_date", { ascending: false })
          .limit(100),
        supabase
          .from("cylinders")
          .select("id, serial_number, capacity, current_status, current_location")
          .eq("is_active", true)
          .order("serial_number"),
      ]);

      if (adjustmentsRes.error) throw adjustmentsRes.error;
      if (cylindersRes.error) throw cylindersRes.error;

      setAdjustments((adjustmentsRes.data as unknown as Adjustment[]) || []);
      setCylinders(cylindersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCylinders = cylinders.filter((c) =>
    selectedLocation ? c.current_location === selectedLocation : true
  );

  const selectedCylinderData = cylinders.find((c) => c.id === selectedCylinder);

  const handleSubmit = async () => {
    if (!selectedLocation || !adjustmentType || !reason) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    if (adjustmentType === "status_change" && !newStatus) {
      toast({
        title: "Error",
        description: "Seleccione el nuevo estado.",
        variant: "destructive",
      });
      return;
    }

    if (adjustmentType === "location_change" && !newLocation) {
      toast({
        title: "Error",
        description: "Seleccione la nueva ubicación.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const cylinderId = selectedCylinder && selectedCylinder !== "none" ? selectedCylinder : null;
      const adjustmentData = {
        location: selectedLocation,
        cylinder_id: cylinderId,
        adjustment_type: adjustmentType,
        previous_status: selectedCylinderData?.current_status || null,
        new_status: adjustmentType === "status_change" ? newStatus : null,
        previous_location: selectedCylinderData?.current_location || null,
        reason,
        performed_by: user?.email || "Usuario desconocido",
        observations: observations || null,
      };

      const { error: adjustmentError } = await supabase
        .from("inventory_adjustments" as any)
        .insert(adjustmentData as any);

      if (adjustmentError) throw adjustmentError;

      // Update cylinder if specific cylinder selected
      if (cylinderId && selectedCylinderData) {
        const updateData: Record<string, string> = {};
        
        if (adjustmentType === "status_change" && newStatus) {
          updateData.current_status = newStatus;
        }
        
        if (adjustmentType === "location_change" && newLocation) {
          updateData.current_location = newLocation;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: cylinderError } = await supabase
            .from("cylinders")
            .update(updateData)
            .eq("id", selectedCylinder);

          if (cylinderError) throw cylinderError;
        }
      }

      toast({
        title: "Ajuste registrado",
        description: "El ajuste de inventario se ha registrado correctamente.",
      });

      // Reset form
      setSelectedLocation("");
      setSelectedCylinder("");
      setAdjustmentType("");
      setNewStatus("");
      setNewLocation("");
      setReason("");
      setObservations("");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving adjustment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ajuste.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesLocation = locationFilter === "all" || adj.location === locationFilter;
    const matchesSearch = !searchTerm || 
      adj.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLocation && matchesSearch;
  });

  const getLocationLabel = (value: string) => {
    return LOCATIONS.find((l) => l.value === value)?.label || value;
  };

  const getStatusLabel = (value: string | null) => {
    if (!value) return "-";
    return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
  };

  const getAdjustmentTypeLabel = (value: string) => {
    return ADJUSTMENT_TYPES.find((t) => t.value === value)?.label || value;
  };

  const getAdjustmentTypeBadge = (type: string) => {
    switch (type) {
      case "status_change":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Cambio Estado</Badge>;
      case "location_change":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Cambio Ubicación</Badge>;
      case "correction":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Corrección</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Ajustes de Inventario
            </h1>
            <p className="text-muted-foreground">
              Gestione ajustes manuales basados en toma física
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Ajuste
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Usuario o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Filtrar por ubicación</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las ubicaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={fetchData} className="w-full">
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adjustments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Ajustes ({filteredAdjustments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAdjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay ajustes registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cambio</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Realizado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjustments.map((adj) => (
                      <TableRow key={adj.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(adj.adjustment_date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>{getLocationLabel(adj.location)}</TableCell>
                        <TableCell>{getAdjustmentTypeBadge(adj.adjustment_type)}</TableCell>
                        <TableCell>
                          {adj.adjustment_type === "status_change" && (
                            <span className="text-sm">
                              {getStatusLabel(adj.previous_status)} → {getStatusLabel(adj.new_status)}
                            </span>
                          )}
                          {adj.adjustment_type === "location_change" && (
                            <span className="text-sm">
                              {getLocationLabel(adj.previous_location || "")} → Nueva ubicación
                            </span>
                          )}
                          {adj.adjustment_type === "correction" && (
                            <span className="text-sm text-muted-foreground">Corrección manual</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={adj.reason}>
                          {adj.reason}
                        </TableCell>
                        <TableCell>{adj.performed_by}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ubicación *</Label>
              <Select value={selectedLocation} onValueChange={(val) => {
                setSelectedLocation(val);
                setSelectedCylinder("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLocation && (
              <div className="space-y-2">
                <Label>Cilindro (opcional)</Label>
                <Select value={selectedCylinder} onValueChange={setSelectedCylinder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione cilindro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cilindro específico</SelectItem>
                    {filteredCylinders.map((cyl) => (
                      <SelectItem key={cyl.id} value={cyl.id}>
                        {cyl.serial_number} - {cyl.capacity}kg ({getStatusLabel(cyl.current_status)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo de Ajuste *</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {adjustmentType === "status_change" && (
              <div className="space-y-2">
                <Label>Nuevo Estado *</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {adjustmentType === "location_change" && (
              <div className="space-y-2">
                <Label>Nueva Ubicación *</Label>
                <Select value={newLocation} onValueChange={setNewLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.filter((l) => l.value !== selectedLocation).map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo del Ajuste *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Toma física realizada, diferencia encontrada..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Guardando..." : "Registrar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Adjustments;
