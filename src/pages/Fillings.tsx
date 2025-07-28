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
  CheckCircle2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    selected_cylinders: [] as string[],
    weight_filled: "",
    operator_name: "",
    batch_number: "",
    observations: ""
  });

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
    setFormData(prev => ({
      ...prev,
      selected_cylinders: checked 
        ? [...prev.selected_cylinders, cylinderId]
        : prev.selected_cylinders.filter(id => id !== cylinderId)
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_cylinders: checked ? availableCylinders.map(c => c.id) : []
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

      // Crear registros de llenado para cada cilindro seleccionado
      const fillingRecords = formData.selected_cylinders.map(cylinderId => ({
        cylinder_id: cylinderId,
        tank_id: tanks[0].id,
        weight_filled: parseFloat(formData.weight_filled),
        operator_name: formData.operator_name,
        batch_number: formData.batch_number || null,
        observations: formData.observations || null
      }));

      const { error: fillingsError } = await supabase
        .from('fillings')
        .insert(fillingRecords);

      if (fillingsError) throw fillingsError;

      // Actualizar el estado de los cilindros a "lleno"
      const { error: statusError } = await supabase
        .from('cylinders')
        .update({ current_status: 'lleno' })
        .in('id', formData.selected_cylinders);

      if (statusError) throw statusError;

      toast({
        title: "Éxito",
        description: `${formData.selected_cylinders.length} llenado(s) registrado(s) correctamente.`,
      });

      setShowAddDialog(false);
      setFormData({
        selected_cylinders: [],
        weight_filled: "",
        operator_name: "",
        batch_number: "",
        observations: ""
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
                         filling.operator_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight_filled">Peso Llenado (kg)</Label>
                  <Input
                    id="weight_filled"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight_filled}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_filled: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="operator_name">Operador</Label>
                  <Input
                    id="operator_name"
                    value={formData.operator_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="batch_number">Número de Lote</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observaciones del llenado..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={availableCylinders.length === 0 || formData.selected_cylinders.length === 0}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
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
        <div className="space-y-4">
          {filteredFillings.map((filling) => (
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
                        {filling.cylinders?.capacity || 'N/A'}
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
                      <span>{new Date(filling.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {filling.batch_number && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Lote:</span>
                        <br />
                        <span>{filling.batch_number}</span>
                      </div>
                    </div>
                  )}
                </div>

                {filling.observations && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Observaciones:</span>
                    <p className="text-sm mt-1">{filling.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </Layout>
  );
};

export default Fillings;