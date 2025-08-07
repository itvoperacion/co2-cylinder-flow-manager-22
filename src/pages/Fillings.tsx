import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus,
  Search,
  Filter,
  Droplets,
  User,
  Calendar,
  Weight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  TrendingDown,
  RotateCcw
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import BatchFillingManager from "@/components/BatchFillingManager";
import ReversalDialog from "@/components/ReversalDialog";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
}

interface Filling {
  id: string;
  cylinder_id: string;
  tank_id: string;
  weight_filled: number;
  operator_name: string;
  batch_number: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  filling_datetime?: string;
  is_approved?: boolean;
  approved_by?: string | null;
  shrinkage_percentage?: number;
  shrinkage_amount?: number;
  is_reversed?: boolean;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  cylinders?: Cylinder;
}

import Layout from "@/components/Layout";

const Fillings = () => {
  const { toast } = useToast();
  const [fillings, setFillings] = useState<Filling[]>([]);
  const [availableCylinders, setAvailableCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [capacityFilter, setCapacityFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    selected_cylinders: [] as string[],
    cylinder_weights: {} as { [cylinderId: string]: string },
    operator_name: "",
    batch_number: "",
    observations: "",
    filling_datetime: new Date().toISOString().slice(0, 16),
    is_approved: false,
    approved_by: ""
  });
  const [reversalDialog, setReversalDialog] = useState<{
    open: boolean;
    recordId: string;
    description: string;
  }>({ open: false, recordId: "", description: "" });

  useEffect(() => {
    fetchFillings();
    fetchAvailableCylinders();
  }, []);

  const fetchFillings = async () => {
    try {
      const { data, error } = await supabase
        .from('fillings')
        .select(`
          *,
          cylinders (
            id,
            serial_number,
            capacity,
            current_status,
            current_location
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFillings(data || []);
    } catch (error) {
      console.error('Error fetching fillings:', error);
      toast({
        title: "Error",
        description: "Error al cargar los llenados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCylinders = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('*')
        .eq('current_status', 'vacio')
        .eq('current_location', 'estacion_llenado')
        .eq('is_active', true)
        .order('serial_number');

      if (error) throw error;
      setAvailableCylinders(data || []);
    } catch (error) {
      console.error('Error fetching available cylinders:', error);
    }
  };

  const handleCylinderSelection = (cylinderId: string, checked: boolean) => {
    setFormData(prev => {
      if (checked) {
        return {
          ...prev,
          selected_cylinders: [...prev.selected_cylinders, cylinderId],
          cylinder_weights: { ...prev.cylinder_weights, [cylinderId]: "" }
        };
      } else {
        const newCylinderWeights = { ...prev.cylinder_weights };
        delete newCylinderWeights[cylinderId];
        return {
          ...prev,
          selected_cylinders: prev.selected_cylinders.filter(id => id !== cylinderId),
          cylinder_weights: newCylinderWeights
        };
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => {
      if (checked) {
        const cylinderWeights: { [key: string]: string } = {};
        availableCylinders.forEach(cylinder => {
          cylinderWeights[cylinder.id] = "";
        });
        return {
          ...prev,
          selected_cylinders: availableCylinders.map(c => c.id),
          cylinder_weights: cylinderWeights
        };
      } else {
        return {
          ...prev,
          selected_cylinders: [],
          cylinder_weights: {}
        };
      }
    });
  };

  const handleWeightChange = (cylinderId: string, weight: string) => {
    setFormData(prev => ({
      ...prev,
      cylinder_weights: { ...prev.cylinder_weights, [cylinderId]: weight }
    }));
  };

  const handleAddFilling = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selected_cylinders.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un cilindro.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.is_approved) {
      toast({
        title: "Error",
        description: "Debes marcar la aprobación del llenado antes de registrar.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Obtener el tank_id (asumiendo que hay un solo tanque por ahora)
      const { data: tanks, error: tanksError } = await supabase
        .from('co2_tank')
        .select('id')
        .limit(1);

      if (tanksError) throw tanksError;
      if (!tanks || tanks.length === 0) {
        throw new Error('No se encontró tanque de CO2');
      }

      // Validar que todos los cilindros tengan peso
      const missingWeights = formData.selected_cylinders.filter(
        cylinderId => !formData.cylinder_weights[cylinderId] || formData.cylinder_weights[cylinderId].trim() === ""
      );
      
      if (missingWeights.length > 0) {
        toast({
          title: "Error",
          description: "Debes ingresar el peso para todos los cilindros seleccionados.",
          variant: "destructive",
        });
        return;
      }

      // Crear registros de llenado para cada cilindro seleccionado
      const fillingRecords = formData.selected_cylinders.map(cylinderId => ({
        cylinder_id: cylinderId,
        tank_id: tanks[0].id,
        weight_filled: parseFloat(formData.cylinder_weights[cylinderId]),
        operator_name: formData.operator_name,
        batch_number: formData.batch_number || null,
        observations: formData.observations || null,
        filling_datetime: formData.filling_datetime,
        is_approved: formData.is_approved,
        approved_by: formData.approved_by || null
      }));

      const { error: fillingsError } = await supabase
        .from('fillings')
        .insert(fillingRecords);

      if (fillingsError) throw fillingsError;

      // Actualizar el estado y ubicación de los cilindros
      const { error: statusError } = await supabase
        .from('cylinders')
        .update({ 
          current_status: 'lleno',
          current_location: 'estacion_llenado' // Asegurar que estén en estación de llenado
        })
        .in('id', formData.selected_cylinders);

      if (statusError) throw statusError;

      toast({
        title: "Éxito",
        description: `${formData.selected_cylinders.length} llenado(s) registrado(s) correctamente.`,
      });

      setShowAddDialog(false);
      setFormData({
        selected_cylinders: [],
        cylinder_weights: {},
        operator_name: "",
        batch_number: "",
        observations: "",
        filling_datetime: new Date().toISOString().slice(0, 16),
        is_approved: false,
        approved_by: ""
      });
      fetchFillings();
      fetchAvailableCylinders();
    } catch (error) {
      console.error('Error adding filling:', error);
      toast({
        title: "Error",
        description: "Error al registrar el llenado.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Completado
      </Badge>
    );
  };

  const filteredFillings = fillings.filter(filling => {
    const matchesSearch = filling.cylinders?.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         filling.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (filling.batch_number && filling.batch_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCapacity = capacityFilter === "all" || filling.cylinders?.capacity === capacityFilter;
    return matchesSearch && matchesCapacity;
  });

  // Group fillings by batch number
  const groupedFillings = filteredFillings.reduce((groups: { [key: string]: Filling[] }, filling) => {
    const batchKey = filling.batch_number || `individual-${filling.id}`;
    if (!groups[batchKey]) {
      groups[batchKey] = [];
    }
    groups[batchKey].push(filling);
    return groups;
  }, {});

  const sortedBatches = Object.entries(groupedFillings).sort(([, a], [, b]) => {
    // Sort by most recent filling in each batch
    const aLatest = Math.max(...a.map(f => new Date(f.created_at).getTime()));
    const bLatest = Math.max(...b.map(f => new Date(f.created_at).getTime()));
    return bLatest - aLatest;
  });

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Llenado de Cilindros</h1>
          <p className="text-muted-foreground">Registra y controla el llenado de cilindros de CO2</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Llenado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Llenado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddFilling} className="space-y-4">
              {/* Cylinder Selection */}
              <div className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Seleccionar Cilindros para Llenar</h3>
                  {availableCylinders.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-fillings"
                        checked={formData.selected_cylinders.length === availableCylinders.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all-fillings" className="text-sm">
                        Seleccionar todos ({availableCylinders.length})
                      </Label>
                    </div>
                  )}
                </div>
                
                {availableCylinders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay cilindros vacíos disponibles para llenado
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {availableCylinders.map((cylinder) => (
                      <div key={cylinder.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          id={`filling-${cylinder.id}`}
                          checked={formData.selected_cylinders.includes(cylinder.id)}
                          onCheckedChange={(checked) => handleCylinderSelection(cylinder.id, checked as boolean)}
                        />
                        <Label htmlFor={`filling-${cylinder.id}`} className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium">{cylinder.serial_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {cylinder.capacity} • {cylinder.current_status}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.selected_cylinders.length > 0 && (
                  <div className="mt-3 p-2 bg-primary/10 rounded text-sm">
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    {formData.selected_cylinders.length} cilindro(s) seleccionado(s)
                  </div>
                )}
              </div>

              {/* Individual Cylinder Weights */}
              {formData.selected_cylinders.length > 0 && (
                <div className="border p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Peso Individual por Cilindro (kg)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                    {formData.selected_cylinders.map((cylinderId) => {
                      const cylinder = availableCylinders.find(c => c.id === cylinderId);
                      return (
                        <div key={cylinderId} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label htmlFor={`weight-${cylinderId}`} className="text-sm font-medium">
                              {cylinder?.serial_number}
                            </Label>
                            <div className="text-xs text-muted-foreground">{cylinder?.capacity}</div>
                          </div>
                          <Input
                            id={`weight-${cylinderId}`}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            value={formData.cylinder_weights[cylinderId] || ""}
                            onChange={(e) => handleWeightChange(cylinderId, e.target.value)}
                            className="w-24"
                            required
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Shrinkage Information */}
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm font-medium">Indicador de Merma</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <div>
                        <span className="font-medium">Total a llenar:</span>
                        <div>
                          {formData.selected_cylinders.reduce((total, cylinderId) => {
                            const weight = parseFloat(formData.cylinder_weights[cylinderId] || "0");
                            return total + weight;
                          }, 0).toFixed(1)} kg
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Merma (1%):</span>
                        <div>
                          {(formData.selected_cylinders.reduce((total, cylinderId) => {
                            const weight = parseFloat(formData.cylinder_weights[cylinderId] || "0");
                            return total + weight;
                          }, 0) * 0.01).toFixed(1)} kg
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Total del tanque:</span>
                        <div>
                          {(formData.selected_cylinders.reduce((total, cylinderId) => {
                            const weight = parseFloat(formData.cylinder_weights[cylinderId] || "0");
                            return total + weight;
                          }, 0) * 1.01).toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Date/Time and QR Scanner Section */}
              <div className="border p-4 rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Información del Llenado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="filling_datetime">Fecha y Hora del Llenado *</Label>
                    <Input
                      id="filling_datetime"
                      type="datetime-local"
                      value={formData.filling_datetime}
                      onChange={(e) => setFormData(prev => ({ ...prev, filling_datetime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="operator_name">Operador *</Label>
                    <Input
                      id="operator_name"
                      value={formData.operator_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                {/* QR Scanner Placeholder */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <QrCode className="h-4 w-4" />
                    <span className="text-sm font-medium">Escáner QR/Código de Barras</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Funcionalidad de escaneo próximamente disponible. Por ahora, selecciona cilindros manualmente.
                  </p>
                </div>
              </div>

              {/* Batch and Approval Section */}
              <div className="border p-4 rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Control de Calidad y Lote
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batch_number">Número de Lote</Label>
                    <Input
                      id="batch_number"
                      value={formData.batch_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="approved_by">Aprobado por</Label>
                    <Input
                      id="approved_by"
                      value={formData.approved_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, approved_by: e.target.value }))}
                      placeholder="Supervisor (opcional)"
                    />
                  </div>
                </div>
                
                {/* Approval Checkbox */}
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_approved"
                      checked={formData.is_approved}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_approved: checked as boolean }))}
                    />
                    <Label htmlFor="is_approved" className="text-sm font-medium text-red-900 dark:text-red-100">
                      * OBLIGATORIO: Marcar lote como APROBADO para proceder
                    </Label>
                    {formData.is_approved && (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprobado
                      </Badge>
                    )}
                  </div>
                  {!formData.is_approved && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      El registro de llenados no estará disponible hasta que se marque esta aprobación.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Observaciones del llenado..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    availableCylinders.length === 0 || 
                    formData.selected_cylinders.length === 0 || 
                    !formData.is_approved
                  }
                >
                  Registrar Llenado
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-industrial">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Llenados</p>
                <p className="text-2xl font-bold">{fillings.length}</p>
              </div>
              <Droplets className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-industrial">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-orange-600">
                  {fillings.filter(f => {
                    const fillingDate = new Date(f.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return fillingDate >= weekAgo;
                  }).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-industrial">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cilindros Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{availableCylinders.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-industrial">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Cilindro o operador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label>Filtro de Fecha</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacidad</Label>
                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                  <SelectTrigger>
                    <Package className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Array.from(new Set(fillings.map(f => f.cylinders?.capacity).filter(Boolean))).map(capacity => (
                      <SelectItem key={capacity} value={capacity!}>
                        {capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCapacityFilter("all");
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
            
            {/* Cylinder Count Indicator */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cantidad de cilindros:</span>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="font-bold">{filteredFillings.length}</span>
                <span>llenado{filteredFillings.length !== 1 ? 's' : ''}</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fillings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="shadow-industrial">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFillings.length === 0 ? (
        <Card className="shadow-industrial">
          <CardContent className="p-12 text-center">
            <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron llenados</h3>
            <p className="text-muted-foreground mb-4">
              {fillings.length === 0 
                ? "Comienza registrando tu primer llenado." 
                : "Intenta ajustar los filtros de búsqueda."
              }
            </p>
            {fillings.length === 0 && availableCylinders.length > 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Llenado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedBatches.map(([batchKey, batchFillings]) => {
            // Check if it's a real batch or individual filling
            const isRealBatch = !batchKey.startsWith('individual-');
            const batchNumber = isRealBatch ? batchKey : `Individual-${batchFillings[0].id.slice(0, 8)}`;
            
            if (isRealBatch) {
              // Use BatchFillingManager for real batches
              return (
                <BatchFillingManager
                  key={batchKey}
                  batchNumber={batchNumber}
                  fillings={batchFillings}
                  onUpdate={fetchFillings}
                />
              );
            } else {
              // Render individual filling as before
              const filling = batchFillings[0];
              return (
                <Card key={filling.id} className="shadow-industrial hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Droplets className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            Cilindro: {filling.cylinders?.serial_number || 'N/A'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {filling.cylinders?.capacity || 'N/A'} • Individual
                          </p>
                        </div>
                      </div>
                      {getStatusBadge()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Peso:</span>
                          <br />
                          <span>{filling.weight_filled} kg</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Operador:</span>
                          <br />
                          <span>{filling.operator_name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Fecha:</span>
                          <br />
                          <span>
                            {filling.filling_datetime 
                              ? new Date(filling.filling_datetime).toLocaleDateString() + ' ' + 
                                new Date(filling.filling_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : new Date(filling.created_at).toLocaleDateString()
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Estado:</span>
                          <br />
                          <div className="flex items-center gap-1">
                            {filling.is_approved ? (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprobado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shrinkage Information Display */}
                    {(filling.shrinkage_percentage || filling.shrinkage_amount) && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-1">
                          <TrendingDown className="h-4 w-4" />
                          <span className="text-sm font-medium">Información de Merma</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                          <div>
                            <span className="font-medium">Peso llenado:</span> {filling.weight_filled} kg
                          </div>
                          <div>
                            <span className="font-medium">Merma ({filling.shrinkage_percentage || 1}%):</span> {(filling.shrinkage_amount || (filling.weight_filled * 0.01)).toFixed(1)} kg
                          </div>
                          <div>
                            <span className="font-medium">Total del tanque:</span> {(filling.weight_filled + (filling.shrinkage_amount || (filling.weight_filled * 0.01))).toFixed(1)} kg
                          </div>
                        </div>
                      </div>
                    )}

                    {filling.observations && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Observaciones:</span>
                        <p className="text-sm mt-1">{filling.observations}</p>
                      </div>
                    )}

                    {/* Reversal Info */}
                    {filling.is_reversed && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <RotateCcw className="h-4 w-4" />
                          <span className="text-sm font-medium">Registro Reversado</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>Reversado por: {filling.reversed_by}</div>
                          <div>Fecha: {filling.reversed_at ? new Date(filling.reversed_at).toLocaleString() : 'N/A'}</div>
                          {filling.reversal_reason && <div>Motivo: {filling.reversal_reason}</div>}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {!filling.is_reversed && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReversalDialog({
                            open: true,
                            recordId: filling.id,
                            description: `Llenado de ${filling.weight_filled} kg - Cilindro ${filling.cylinders?.serial_number || 'N/A'}`
                          })}
                          className="text-destructive hover:text-destructive"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reversar Llenado
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>
      )}
      
      <ReversalDialog
        open={reversalDialog.open}
        onOpenChange={(open) => setReversalDialog(prev => ({ ...prev, open }))}
        recordId={reversalDialog.recordId}
        recordType="filling"
        recordDescription={reversalDialog.description}
        onSuccess={fetchFillings}
      />
      </div>
    </Layout>
  );
};

export default Fillings;
