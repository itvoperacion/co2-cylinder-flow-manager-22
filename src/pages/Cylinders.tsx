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
  Package,
  MapPin,
  Calendar,
  Weight,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  valve_type: string;
  manufacturing_date: string;
  last_hydrostatic_test: string;
  next_test_due: string | null;
  current_location: string;
  current_status: string;
  is_active: boolean;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

import Layout from "@/components/Layout";

const Cylinders = () => {
  const { toast } = useToast();
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [capacityFilter, setCapacityFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: "",
    capacity: "",
    valve_type: "industrial",
    manufacturing_date: "",
    last_hydrostatic_test: "",
    observations: ""
  });

  useEffect(() => {
    fetchCylinders();
  }, []);

  const fetchCylinders = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCylinders(data || []);
    } catch (error) {
      console.error('Error fetching cylinders:', error);
      toast({
        title: "Error",
        description: "Error al cargar los cilindros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCylinder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nextTestDate = new Date(formData.last_hydrostatic_test);
      nextTestDate.setFullYear(nextTestDate.getFullYear() + 5);

      const { error } = await supabase
        .from('cylinders')
        .insert({
          serial_number: formData.serial_number,
          capacity: formData.capacity as "9kg" | "22kg" | "25kg",
          valve_type: formData.valve_type as "industrial" | "special",
          manufacturing_date: formData.manufacturing_date,
          last_hydrostatic_test: formData.last_hydrostatic_test,
          next_test_due: nextTestDate.toISOString().split('T')[0],
          observations: formData.observations || null
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cilindro registrado correctamente.",
      });

      setShowAddDialog(false);
      setFormData({
        serial_number: "",
        capacity: "",
        valve_type: "industrial",
        manufacturing_date: "",
        last_hydrostatic_test: "",
        observations: ""
      });
      fetchCylinders();
    } catch (error) {
      console.error('Error adding cylinder:', error);
      toast({
        title: "Error",
        description: "Error al registrar el cilindro.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'vacio': { label: 'Vacío', variant: 'outline' as const, icon: Package },
      'lleno': { label: 'Lleno', variant: 'default' as const, icon: CheckCircle },
      'en_llenado': { label: 'En Llenado', variant: 'secondary' as const, icon: Clock },
      'mantenimiento': { label: 'Mantenimiento', variant: 'destructive' as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'outline' as const, icon: Package };
    
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getLocationBadge = (location: string) => {
    const locationConfig = {
      'despacho': { label: 'Despacho', color: 'text-blue-600' },
      'estacion_llenado': { label: 'Estación de Llenado', color: 'text-green-600' },
      'mantenimiento': { label: 'Mantenimiento', color: 'text-orange-600' },
      'entregado': { label: 'Entregado', color: 'text-purple-600' }
    };

    const config = locationConfig[location as keyof typeof locationConfig] || 
                  { label: location, color: 'text-gray-600' };
    
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        <MapPin className="h-3 w-3" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  };

  const filteredCylinders = cylinders.filter(cylinder => {
    const matchesSearch = cylinder.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cylinder.current_status === statusFilter;
    const matchesLocation = locationFilter === "all" || cylinder.current_location === locationFilter;
    const matchesCapacity = capacityFilter === "all" || cylinder.capacity === capacityFilter;
    return matchesSearch && matchesStatus && matchesLocation && matchesCapacity;
  });

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Cilindros</h1>
          <p className="text-muted-foreground">Administra el inventario de cilindros de CO2</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Cilindro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Cilindro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCylinder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serial_number">Número de Serie</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacidad</Label>
                  <Select
                    value={formData.capacity}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, capacity: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona capacidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9kg">9 kg</SelectItem>
                      <SelectItem value="22kg">22 kg</SelectItem>
                      <SelectItem value="25kg">25 kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valve_type">Tipo de Válvula</Label>
                  <Select
                    value={formData.valve_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, valve_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="special">Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="manufacturing_date">Fecha de Fabricación</Label>
                  <Input
                    id="manufacturing_date"
                    type="date"
                    value={formData.manufacturing_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturing_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="last_hydrostatic_test">Última Prueba Hidrostática</Label>
                  <Input
                    id="last_hydrostatic_test"
                    type="date"
                    value={formData.last_hydrostatic_test}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_hydrostatic_test: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Cilindro</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="shadow-industrial">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Número de serie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vacio">Vacío</SelectItem>
                  <SelectItem value="lleno">Lleno</SelectItem>
                  <SelectItem value="en_llenado">En Llenado</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ubicación</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="despacho">Despacho</SelectItem>
                  <SelectItem value="estacion_llenado">Estación de Llenado</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacidad</Label>
              <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger>
                  <Weight className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="9kg">9 kg</SelectItem>
                  <SelectItem value="22kg">22 kg</SelectItem>
                  <SelectItem value="25kg">25 kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setLocationFilter("all");
                  setCapacityFilter("all");
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cylinders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
      ) : filteredCylinders.length === 0 ? (
        <Card className="shadow-industrial">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron cilindros</h3>
            <p className="text-muted-foreground mb-4">
              {cylinders.length === 0 
                ? "Comienza registrando tu primer cilindro." 
                : "Intenta ajustar los filtros de búsqueda."
              }
            </p>
            {cylinders.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Cilindro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCylinders.map((cylinder) => (
            <Card key={cylinder.id} className="shadow-industrial hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{cylinder.serial_number}</CardTitle>
                  {getStatusBadge(cylinder.current_status)}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {cylinder.capacity}
                  </span>
                  {getLocationBadge(cylinder.current_location)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Válvula:</span>
                    <br />
                    <span className="text-muted-foreground capitalize">
                      {cylinder.valve_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Fabricación:</span>
                    <br />
                    <span className="text-muted-foreground">
                      {new Date(cylinder.manufacturing_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Próxima prueba:</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    cylinder.next_test_due && new Date(cylinder.next_test_due) < new Date() 
                      ? 'text-destructive' 
                      : 'text-foreground'
                  }`}>
                    {cylinder.next_test_due 
                      ? new Date(cylinder.next_test_due).toLocaleDateString()
                      : 'No definida'
                    }
                  </span>
                </div>

                {cylinder.observations && (
                  <div className="border-t pt-3">
                    <span className="text-xs font-medium text-muted-foreground">Observaciones:</span>
                    <p className="text-sm mt-1">{cylinder.observations}</p>
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

export default Cylinders;