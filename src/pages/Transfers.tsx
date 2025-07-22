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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus,
  Search,
  Filter,
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Truck,
  FileText,
  Package,
  CheckCircle2
} from "lucide-react";
import Layout from "@/components/Layout";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
  current_weight: number | null;
}

interface Transfer {
  id: string;
  cylinder_id: string;
  from_location: string;
  to_location: string;
  operator_name: string;
  driver_name: string | null;
  customer_name: string | null;
  delivery_note_number: string | null;
  transfer_date: string;
  observations: string | null;
  cylinder_quantity: number;
  created_at: string;
  cylinders?: Cylinder;
}

interface TransferFormData {
  from_location: string;
  to_location: string;
  operator_name: string;
  driver_name: string;
  customer_name: string;
  delivery_note_number: string;
  observations: string;
  transfer_date: string;
  selected_cylinders: string[];
}

const locationLabels = {
  'despacho': 'Despacho',
  'estacion_llenado': 'Estación de Llenado',
  'asignaciones': 'Asignaciones',
  'devoluciones': 'Devoluciones',
  'en_mantenimiento': 'Mantenimiento',
  'fuera_de_servicio': 'Fuera de Servicio'
};

const Transfers = () => {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [availableCylinders, setAvailableCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<TransferFormData>({
    from_location: "",
    to_location: "",
    operator_name: "",
    driver_name: "",
    customer_name: "",
    delivery_note_number: "",
    observations: "",
    transfer_date: new Date().toISOString().split('T')[0],
    selected_cylinders: []
  });

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    if (formData.from_location) {
      fetchAvailableCylinders(formData.from_location);
    } else {
      setAvailableCylinders([]);
    }
  }, [formData.from_location]);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinder_transfers')
        .select(`
          *,
          cylinders (
            id,
            serial_number,
            capacity,
            current_status,
            current_location,
            current_weight
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        title: "Error",
        description: "Error al cargar los traslados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCylinders = async (location: string) => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('*')
        .eq('current_location', location as any)
        .eq('is_active', true)
        .order('serial_number');

      if (error) throw error;
      setAvailableCylinders(data || []);
      // Reset selected cylinders when location changes
      setFormData(prev => ({ ...prev, selected_cylinders: [] }));
    } catch (error) {
      console.error('Error fetching available cylinders:', error);
      setAvailableCylinders([]);
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

  const getRequiredFields = () => {
    const { from_location, to_location } = formData;
    
    const needsCustomerInfo = (from_location === 'despacho' && to_location === 'asignaciones') ||
                             (from_location === 'asignaciones' && to_location === 'devoluciones');
    
    return {
      needsCustomerInfo,
      needsDriverInfo: needsCustomerInfo
    };
  };

  const validateForm = () => {
    const { needsCustomerInfo } = getRequiredFields();
    
    if (!formData.from_location || !formData.to_location || !formData.operator_name) {
      return false;
    }
    
    if (formData.selected_cylinders.length === 0) {
      return false;
    }
    
    if (needsCustomerInfo && (!formData.customer_name || !formData.delivery_note_number)) {
      return false;
    }
    
    return true;
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create transfer records for each selected cylinder
      const transferRecords = formData.selected_cylinders.map(cylinderId => ({
        cylinder_id: cylinderId,
        from_location: formData.from_location as any,
        to_location: formData.to_location as any,
        operator_name: formData.operator_name,
        driver_name: formData.driver_name || null,
        customer_name: formData.customer_name || null,
        delivery_note_number: formData.delivery_note_number || null,
        transfer_date: formData.transfer_date,
        observations: formData.observations || null,
        cylinder_quantity: 1
      }));

      const { error } = await supabase
        .from('cylinder_transfers')
        .insert(transferRecords);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${formData.selected_cylinders.length} traslado(s) registrado(s) correctamente.`,
      });

      setShowAddDialog(false);
      setFormData({
        from_location: "",
        to_location: "",
        operator_name: "",
        driver_name: "",
        customer_name: "",
        delivery_note_number: "",
        observations: "",
        transfer_date: new Date().toISOString().split('T')[0],
        selected_cylinders: []
      });
      setAvailableCylinders([]);
      fetchTransfers();
    } catch (error) {
      console.error('Error adding transfer:', error);
      toast({
        title: "Error",
        description: "Error al registrar el traslado.",
        variant: "destructive",
      });
    }
  };

  const getTransferBadge = (fromLocation: string, toLocation: string) => {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">{locationLabels[fromLocation as keyof typeof locationLabels]}</Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="default">{locationLabels[toLocation as keyof typeof locationLabels]}</Badge>
      </div>
    );
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.cylinders?.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.operator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transfer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || 
                           transfer.from_location === locationFilter || 
                           transfer.to_location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const { needsCustomerInfo, needsDriverInfo } = getRequiredFields();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Control de Traslados</h1>
            <p className="text-muted-foreground">Registra y controla el movimiento interno de cilindros</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Registrar Traslado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Traslado</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransfer} className="space-y-6">
                {/* Location Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_location">Ubicación Origen *</Label>
                    <Select
                      value={formData.from_location}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, from_location: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona origen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despacho">Despacho</SelectItem>
                        <SelectItem value="estacion_llenado">Estación de Llenado</SelectItem>
                        <SelectItem value="asignaciones">Asignaciones</SelectItem>
                        <SelectItem value="devoluciones">Devoluciones</SelectItem>
                        <SelectItem value="en_mantenimiento">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="to_location">Ubicación Destino *</Label>
                    <Select
                      value={formData.to_location}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, to_location: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despacho">Despacho</SelectItem>
                        <SelectItem value="estacion_llenado">Estación de Llenado</SelectItem>
                        <SelectItem value="asignaciones">Asignaciones</SelectItem>
                        <SelectItem value="devoluciones">Devoluciones</SelectItem>
                        <SelectItem value="en_mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="operator_name">Operador *</Label>
                    <Input
                      id="operator_name"
                      value={formData.operator_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="transfer_date">Fecha de Traslado *</Label>
                    <Input
                      id="transfer_date"
                      type="date"
                      value={formData.transfer_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, transfer_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Conditional Fields for Customer Information */}
                {needsCustomerInfo && (
                  <div className="border p-4 rounded-lg bg-muted/50">
                    <h3 className="font-medium mb-3">Información del Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customer_name">Nombre del Cliente *</Label>
                        <Input
                          id="customer_name"
                          value={formData.customer_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                          required={needsCustomerInfo}
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery_note_number">
                          {formData.to_location === 'asignaciones' ? 'Nro. Nota de Entrega' : 'Nro. Nota de Devolución'} *
                        </Label>
                        <Input
                          id="delivery_note_number"
                          value={formData.delivery_note_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, delivery_note_number: e.target.value }))}
                          required={needsCustomerInfo}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver Information */}
                {needsDriverInfo && (
                  <div>
                    <Label htmlFor="driver_name">Conductor</Label>
                    <Input
                      id="driver_name"
                      value={formData.driver_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                      placeholder="Nombre del conductor"
                    />
                  </div>
                )}

                {/* Cylinder Selection */}
                {formData.from_location && (
                  <div className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Seleccionar Cilindros</h3>
                      {availableCylinders.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all"
                            checked={formData.selected_cylinders.length === availableCylinders.length}
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="select-all" className="text-sm">
                            Seleccionar todos ({availableCylinders.length})
                          </Label>
                        </div>
                      )}
                    </div>
                    
                    {availableCylinders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay cilindros disponibles en la ubicación seleccionada
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                        {availableCylinders.map((cylinder) => (
                          <div key={cylinder.id} className="flex items-center space-x-2 p-2 border rounded">
                            <Checkbox
                              id={cylinder.id}
                              checked={formData.selected_cylinders.includes(cylinder.id)}
                              onCheckedChange={(checked) => handleCylinderSelection(cylinder.id, checked as boolean)}
                            />
                            <Label htmlFor={cylinder.id} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium">{cylinder.serial_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {cylinder.capacity} • {cylinder.current_status}
                                {cylinder.current_weight && ` • ${cylinder.current_weight}kg`}
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
                )}

                {/* Observations */}
                <div>
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observaciones del traslado..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!validateForm()}>
                    Registrar Traslado{formData.selected_cylinders.length > 1 ? 's' : ''}
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
                  <p className="text-sm font-medium text-muted-foreground">Total Traslados</p>
                  <p className="text-2xl font-bold">{transfers.length}</p>
                </div>
                <ArrowRight className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-industrial">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hoy</p>
                  <p className="text-2xl font-bold text-green-600">
                    {transfers.filter(t => new Date(t.transfer_date).toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-industrial">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {transfers.filter(t => {
                      const transferDate = new Date(t.transfer_date);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return transferDate >= weekAgo;
                    }).length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
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
                    placeholder="Cilindro, operador o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="despacho">Despacho</SelectItem>
                    <SelectItem value="estacion_llenado">Estación de Llenado</SelectItem>
                    <SelectItem value="asignaciones">Asignaciones</SelectItem>
                    <SelectItem value="devoluciones">Devoluciones</SelectItem>
                    <SelectItem value="en_mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setLocationFilter("all");
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfers List */}
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
        ) : filteredTransfers.length === 0 ? (
          <Card className="shadow-industrial">
            <CardContent className="p-12 text-center">
              <ArrowRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron traslados</h3>
              <p className="text-muted-foreground mb-4">
                {transfers.length === 0 
                  ? "Comienza registrando tu primer traslado." 
                  : "Intenta ajustar los filtros de búsqueda."
                }
              </p>
              {transfers.length === 0 && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primer Traslado
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="shadow-industrial hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          Cilindro: {transfer.cylinders?.serial_number || 'N/A'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {transfer.cylinders?.capacity || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {getTransferBadge(transfer.from_location, transfer.to_location)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Operador:</span>
                        <br />
                        <span>{transfer.operator_name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Fecha:</span>
                        <br />
                        <span>{new Date(transfer.transfer_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {transfer.customer_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Cliente:</span>
                          <br />
                          <span>{transfer.customer_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {transfer.driver_name && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Conductor:</span>
                          <br />
                          <span>{transfer.driver_name}</span>
                        </div>
                      </div>
                    )}

                    {transfer.delivery_note_number && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Nota:</span>
                          <br />
                          <span>{transfer.delivery_note_number}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {transfer.observations && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Observaciones:</span>
                      <p className="text-sm mt-1">{transfer.observations}</p>
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

export default Transfers;