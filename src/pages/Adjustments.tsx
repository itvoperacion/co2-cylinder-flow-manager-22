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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { ClipboardList, Plus, Search, Calendar, CheckSquare } from "lucide-react";
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
  { value: "en_mantenimiento", label: "En Mantenimiento" },
  { value: "fuera_de_servicio", label: "Fuera de Servicio" },
];

const STATUS_OPTIONS = [
  { value: "vacio", label: "Vacío" },
  { value: "lleno", label: "Lleno" },
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

  // Form state - multi-select approach
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCylinderIds, setSelectedCylinderIds] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [reason, setReason] = useState("");
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

  // Cylinders filtered by selected location
  const filteredCylinders = cylinders.filter((c) =>
    selectedLocation ? c.current_location === selectedLocation : false
  );

  // Toggle cylinder selection
  const toggleCylinderSelection = (cylinderId: string) => {
    setSelectedCylinderIds((prev) =>
      prev.includes(cylinderId)
        ? prev.filter((id) => id !== cylinderId)
        : [...prev, cylinderId]
    );
  };

  // Select/deselect all cylinders
  const toggleSelectAll = () => {
    if (selectedCylinderIds.length === filteredCylinders.length) {
      setSelectedCylinderIds([]);
    } else {
      setSelectedCylinderIds(filteredCylinders.map((c) => c.id));
    }
  };

  // Check if form is valid to submit
  const isFormValid = 
    selectedLocation && 
    selectedCylinderIds.length > 0 && 
    (newStatus || newLocation) && 
    reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Determine adjustment type
      const adjustmentType = newStatus ? "status_change" : "location_change";

      // Create adjustments for each selected cylinder
      const adjustmentsToInsert = selectedCylinderIds.map((cylinderId) => {
        const cylinder = cylinders.find((c) => c.id === cylinderId);
        return {
          location: selectedLocation,
          cylinder_id: cylinderId,
          adjustment_type: adjustmentType,
          previous_status: cylinder?.current_status || null,
          new_status: newStatus || null,
          previous_location: cylinder?.current_location || null,
          reason,
          performed_by: user?.email || "Usuario desconocido",
          quantity_adjusted: 1,
        };
      });

      // Insert all adjustments
      const { error: adjustmentError } = await supabase
        .from("inventory_adjustments" as any)
        .insert(adjustmentsToInsert as any);

      if (adjustmentError) throw adjustmentError;

      // Update cylinders
      for (const cylinderId of selectedCylinderIds) {
        const updateData: Record<string, string> = {};

        if (newStatus) {
          updateData.current_status = newStatus;
        }

        if (newLocation) {
          updateData.current_location = newLocation;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: cylinderError } = await supabase
            .from("cylinders")
            .update(updateData)
            .eq("id", cylinderId);

          if (cylinderError) throw cylinderError;
        }
      }

      toast({
        title: "Ajuste registrado",
        description: `Se ajustaron ${selectedCylinderIds.length} cilindro(s) correctamente.`,
      });

      // Reset form
      resetForm();
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

  const resetForm = () => {
    setSelectedLocation("");
    setSelectedCylinderIds([]);
    setNewStatus("");
    setNewLocation("");
    setReason("");
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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            {/* Step 1: Select Location */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">1. Seleccionar Ubicación *</Label>
              <Select 
                value={selectedLocation} 
                onValueChange={(val) => {
                  setSelectedLocation(val);
                  setSelectedCylinderIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione la ubicación a ajustar" />
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

            {/* Step 2: Show cylinders with checkboxes */}
            {selectedLocation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    2. Seleccionar Cilindros a Ajustar ({selectedCylinderIds.length} seleccionados)
                  </Label>
                  {filteredCylinders.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2"
                    >
                      <CheckSquare className="h-4 w-4" />
                      {selectedCylinderIds.length === filteredCylinders.length 
                        ? "Deseleccionar todos" 
                        : "Seleccionar todos"}
                    </Button>
                  )}
                </div>
                
                {filteredCylinders.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border rounded-md bg-muted/30">
                    No hay cilindros en esta ubicación
                  </div>
                ) : (
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-3 space-y-2">
                      {filteredCylinders.map((cyl) => (
                        <div
                          key={cyl.id}
                          className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                            selectedCylinderIds.includes(cyl.id)
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleCylinderSelection(cyl.id)}
                        >
                          <Checkbox 
                            checked={selectedCylinderIds.includes(cyl.id)}
                            onCheckedChange={() => toggleCylinderSelection(cyl.id)}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{cyl.serial_number}</span>
                            <span className="text-muted-foreground ml-2">- {cyl.capacity}kg</span>
                          </div>
                          <Badge variant={cyl.current_status === "lleno" ? "default" : "secondary"}>
                            {getStatusLabel(cyl.current_status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Step 3: Change options - only show when cylinders are selected */}
            {selectedCylinderIds.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">3. Tipo de Ajuste</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cambiar Estado a:</Label>
                    <Select 
                      value={newStatus} 
                      onValueChange={(val) => {
                        setNewStatus(val);
                        if (val) setNewLocation(""); // Clear new location if status is selected
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cambio de estado</SelectItem>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nueva Ubicación:</Label>
                    <Select 
                      value={newLocation} 
                      onValueChange={(val) => {
                        setNewLocation(val);
                        if (val) setNewStatus(""); // Clear status if location is selected
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ubicación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cambio de ubicación</SelectItem>
                        {LOCATIONS.filter((l) => l.value !== selectedLocation).map((loc) => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Reason - only show when type is selected */}
            {(newStatus || newLocation) && newStatus !== "none" && newLocation !== "none" && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">4. Motivo del Ajuste *</Label>
                <Textarea
                  placeholder="Describa el motivo del ajuste basado en la toma física..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid || submitting}
            >
              {submitting ? "Registrando..." : `Registrar Ajuste (${selectedCylinderIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Adjustments;
