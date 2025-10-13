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
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import Layout from "@/components/Layout";
import ReversalDialog from "@/components/ReversalDialog";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  current_status: string;
  current_location: string;
}

interface Transfer {
  id: string;
  cylinder_id: string;
  from_location: string;
  to_location: string;
  operator_name: string;
  observations: string | null;
  created_at: string;
  transfer_number?: string | null;
  is_reversed?: boolean;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  cylinders?: Cylinder;
}

interface TransferFormData {
  from_location: string;
  to_location: string;
  operator_name: string;
  driver_name: string;
  customer_name: string;
  delivery_note_number: string;
  transfer_number: string;
  observations: string;
  transfer_date: string;
  selected_cylinders: string[];
  cylinders_status: { [key: string]: string };
  trip_closure: boolean;
}

const locationLabels = {
  'despacho': 'Despacho',
  'estacion_llenado': 'Estación de Llenado',
  'rutas': 'Rutas',
  'clientes': 'Clientes',
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
  const [capacityFilter, setCapacityFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<TransferFormData>({
    from_location: "",
    to_location: "",
    operator_name: "",
    driver_name: "",
    customer_name: "",
    delivery_note_number: "",
    transfer_number: "",
    observations: "",
    transfer_date: new Date().toISOString().split('T')[0],
    selected_cylinders: [],
    cylinders_status: {},
    trip_closure: false
  });
  const [availableTransfers, setAvailableTransfers] = useState<Transfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<string>("");
  const [selectedTransferCylinders, setSelectedTransferCylinders] = useState<Cylinder[]>([]);
  const [reversalDialog, setReversalDialog] = useState<{
    open: boolean;
    recordId: string;
    description: string;
  }>({ open: false, recordId: "", description: "" });

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    if (formData.from_location) {
      // Si es de rutas a clientes o de rutas a devoluciones, cargar traslados disponibles
      if ((formData.from_location === 'rutas' && formData.to_location === 'clientes') ||
          (formData.from_location === 'rutas' && formData.to_location === 'devoluciones') ||
          (formData.from_location === 'clientes' && formData.to_location === 'devoluciones')) {
        fetchAvailableTransfers();
        setAvailableCylinders([]);
        setSelectedTransfer("");
        setSelectedTransferCylinders([]);
      } else {
        fetchAvailableCylinders(formData.from_location);
        setAvailableTransfers([]);
      }
    } else {
      setAvailableCylinders([]);
      setAvailableTransfers([]);
    }
  }, [formData.from_location, formData.to_location]);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
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
      let query = supabase
        .from('cylinders')
        .select('*')
        .eq('current_location', location as any)
        .eq('is_active', true);

      // Si es traslado de estación de llenado a despacho, solo cilindros llenos
      if (formData.from_location === 'estacion_llenado' && formData.to_location === 'despacho') {
        query = query.eq('current_status', 'lleno');
      }

      const { data, error } = await query.order('serial_number');

      if (error) throw error;
      setAvailableCylinders(data || []);
      // Reset selected cylinders when location changes
      setFormData(prev => ({ ...prev, selected_cylinders: [], cylinders_status: {} }));
    } catch (error) {
      console.error('Error fetching available cylinders:', error);
      setAvailableCylinders([]);
    }
  };

  const fetchAvailableTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
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
        .eq('to_location', 'rutas')
        .eq('is_reversed', false)
        .eq('trip_closure', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Group by transfer_number and show only one entry per transfer
      const uniqueTransfers = data?.reduce((acc, transfer) => {
        const existing = acc.find(t => t.transfer_number === transfer.transfer_number);
        if (!existing) {
          acc.push(transfer);
        }
        return acc;
      }, [] as Transfer[]);
      
      setAvailableTransfers(uniqueTransfers || []);
    } catch (error) {
      console.error('Error fetching available transfers:', error);
      setAvailableTransfers([]);
    }
  };

  const fetchCylindersFromSelectedTransfer = async (transferNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('transfers')
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
        .eq('transfer_number', transferNumber)
        .eq('to_location', 'rutas')
        .eq('is_reversed', false);

      if (error) throw error;
      
      // Extraer los cilindros únicos de los traslados
      const cylinders = data?.map(transfer => transfer.cylinders).filter(Boolean) as Cylinder[];
      const uniqueCylinders = cylinders.filter((cylinder, index, self) => 
        cylinder && self.findIndex(c => c && c.id === cylinder.id) === index
      );
      
      setSelectedTransferCylinders(uniqueCylinders);
      setFormData(prev => ({ ...prev, selected_cylinders: [], cylinders_status: {} }));
    } catch (error) {
      console.error('Error fetching cylinders from transfer:', error);
      setSelectedTransferCylinders([]);
    }
  };

  const handleTransferSelection = (transferNumber: string) => {
    setSelectedTransfer(transferNumber);
    if (transferNumber) {
      fetchCylindersFromSelectedTransfer(transferNumber);
    } else {
      setSelectedTransferCylinders([]);
      setFormData(prev => ({ ...prev, selected_cylinders: [], cylinders_status: {} }));
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
    const cylindersToSelect = formData.from_location === 'rutas' && formData.to_location === 'devoluciones' 
      ? selectedTransferCylinders 
      : availableCylinders;
      
    setFormData(prev => ({
      ...prev,
      selected_cylinders: checked ? cylindersToSelect.map(c => c.id) : []
    }));
  };

  const getRequiredFields = () => {
    const { from_location, to_location } = formData;
    
    const needsCustomerInfo = (from_location === 'despacho' && to_location === 'rutas') ||
                             (from_location === 'rutas' && to_location === 'devoluciones') ||
                             (from_location === 'rutas' && to_location === 'clientes') ||
                             (from_location === 'clientes' && to_location === 'devoluciones');
    
    const needsTransferNumber = from_location === 'despacho' && to_location === 'rutas';
    const needsTransferList = (from_location === 'rutas' && to_location === 'devoluciones') ||
                              (from_location === 'rutas' && to_location === 'clientes') ||
                              (from_location === 'clientes' && to_location === 'devoluciones');
    const needsStatusEdit = from_location === 'devoluciones' && to_location === 'despacho';
    const needsTripClosure = (from_location === 'rutas' && to_location === 'devoluciones') ||
                             (from_location === 'devoluciones' && to_location === 'despacho') ||
                             (from_location === 'clientes' && to_location === 'devoluciones');
    
    return {
      needsCustomerInfo,
      needsDriverInfo: needsCustomerInfo,
      needsTransferNumber,
      needsTransferList,
      needsStatusEdit,
      needsTripClosure
    };
  };

  const validateForm = () => {
    const { needsCustomerInfo, needsTransferNumber, needsTransferList } = getRequiredFields();
    
    if (!formData.from_location || !formData.to_location || !formData.operator_name) {
      return false;
    }
    
    if (formData.selected_cylinders.length === 0) {
      return false;
    }
    
    if (needsCustomerInfo && (!formData.customer_name || !formData.delivery_note_number)) {
      return false;
    }

    if (needsTransferNumber && !formData.transfer_number) {
      return false;
    }

    if (needsTransferList && !selectedTransfer) {
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
        transfer_number: formData.transfer_number || null,
        observations: formData.observations || null
      }));

      const { error: transferError } = await supabase
        .from('transfers')
        .insert(transferRecords);

      if (transferError) throw transferError;

      // Update cylinder locations
      const { error: locationError } = await supabase
        .from('cylinders')
        .update({ current_location: formData.to_location })
        .in('id', formData.selected_cylinders);

      if (locationError) throw locationError;

      // If transferring from "despacho" to "estacion_llenado", update status to "vacio"
      if (formData.from_location === 'despacho' && formData.to_location === 'estacion_llenado') {
        const { error: statusError } = await supabase
          .from('cylinders')
          .update({ current_status: 'vacio' })
          .in('id', formData.selected_cylinders);

        if (statusError) throw statusError;
      }

      // Si es de rutas a devoluciones, actualizar estados según selección
      if (formData.from_location === 'rutas' && formData.to_location === 'devoluciones') {
        const updates = formData.selected_cylinders.map(cylinderId => {
          const status = formData.cylinders_status[cylinderId] || 'vacio';
          return supabase
            .from('cylinders')
            .update({ current_status: status })
            .eq('id', cylinderId);
        });

        const results = await Promise.all(updates);
        const errors = results.filter(result => result.error);
        if (errors.length > 0) throw errors[0].error;
      }

      // Si es de devoluciones a despacho, actualizar estados según selección
      if (formData.from_location === 'devoluciones' && formData.to_location === 'despacho') {
        const updates = formData.selected_cylinders.map(cylinderId => {
          const status = formData.cylinders_status[cylinderId] || 'vacio';
          return supabase
            .from('cylinders')
            .update({ current_status: status })
            .eq('id', cylinderId);
        });

        const results = await Promise.all(updates);
        const errors = results.filter(result => result.error);
        if (errors.length > 0) throw errors[0].error;
      }

      // Si "Cierre de Viaje" está marcado, actualizar todos los traslados del transfer_number seleccionado
      if (formData.trip_closure && selectedTransfer) {
        const { error: tripClosureError } = await supabase
          .from('transfers')
          .update({ trip_closure: true })
          .eq('transfer_number', selectedTransfer);

        if (tripClosureError) throw tripClosureError;
        
        // Remover de la lista local también
        setAvailableTransfers(prev => 
          prev.filter(transfer => transfer.transfer_number !== selectedTransfer)
        );
      }

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
        transfer_number: "",
        observations: "",
        transfer_date: new Date().toISOString().split('T')[0],
        selected_cylinders: [],
        cylinders_status: {},
        trip_closure: false
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
                         transfer.operator_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "all" || 
                           transfer.from_location === locationFilter || 
                           transfer.to_location === locationFilter;
    const matchesCapacity = capacityFilter === "all" || transfer.cylinders?.capacity === capacityFilter;
    return matchesSearch && matchesLocation && matchesCapacity;
  });

  const { needsCustomerInfo, needsDriverInfo, needsTransferNumber, needsTransferList, needsStatusEdit, needsTripClosure } = getRequiredFields();

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
                        <SelectItem value="rutas">Rutas</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
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
                        <SelectItem value="rutas">Rutas</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
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

                {/* Campo de número de traslado para despacho -> rutas */}
                {needsTransferNumber && (
                  <div className="border p-4 rounded-lg bg-blue-50 border-blue-200">
                    <h3 className="font-medium mb-3 text-blue-800">Información de Traslado</h3>
                    <div>
                      <Label htmlFor="transfer_number">Número de Traslado *</Label>
                      <Input
                        id="transfer_number"
                        value={formData.transfer_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, transfer_number: e.target.value }))}
                        placeholder="Ingrese el número de traslado"
                        required={needsTransferNumber}
                      />
                    </div>
                  </div>
                )}

                {/* Lista de traslados para rutas -> clientes/devoluciones o clientes -> devoluciones */}
                {needsTransferList && (
                  <div className="border p-4 rounded-lg bg-yellow-50 border-yellow-200">
                    <h3 className="font-medium mb-3 text-yellow-800">
                      {formData.from_location === 'rutas' 
                        ? 'Seleccionar Traslado de Rutas' 
                        : 'Seleccionar Traslado de Clientes'}
                    </h3>
                    <div className="mb-4">
                      <Label htmlFor="transfer_select">Número de Traslado *</Label>
                      <Select
                        value={selectedTransfer}
                        onValueChange={handleTransferSelection}
                        required={needsTransferList}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el número de traslado" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(availableTransfers.map(t => t.transfer_number).filter(Boolean))).map(transferNumber => (
                            <SelectItem key={transferNumber} value={transferNumber!}>
                              Traslado: {transferNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedTransfer && (
                      <div className="p-3 bg-white rounded border">
                        <h4 className="text-sm font-medium mb-2">Cilindros en el traslado {selectedTransfer}:</h4>
                        {selectedTransferCylinders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay cilindros en este traslado</p>
                        ) : (
                          <div className="space-y-1">
                            {selectedTransferCylinders.map((cylinder) => (
                              <div key={cylinder.id} className="text-sm">
                                • {cylinder.serial_number} ({cylinder.capacity})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                          {formData.to_location === 'rutas' ? 'Nro. Nota de Entrega' : 
                           formData.to_location === 'clientes' ? 'Nro. Nota de Entrega' :
                           'Nro. Nota de Devolución'} *
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
                {(formData.from_location && !needsTransferList) || (needsTransferList && selectedTransfer) ? (
                  <div className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">
                        Seleccionar Cilindros
                        {formData.from_location === 'estacion_llenado' && formData.to_location === 'despacho' && (
                          <span className="text-sm font-normal text-blue-600 ml-2">
                            (Solo cilindros llenos)
                          </span>
                        )}
                        {needsTransferList && selectedTransfer && (
                          <span className="text-sm font-normal text-yellow-600 ml-2">
                            (Del traslado {selectedTransfer})
                          </span>
                        )}
                      </h3>
                      {((needsTransferList && selectedTransferCylinders.length > 0) || 
                        (!needsTransferList && availableCylinders.length > 0)) && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all"
                            checked={needsTransferList 
                              ? formData.selected_cylinders.length === selectedTransferCylinders.length
                              : formData.selected_cylinders.length === availableCylinders.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="select-all" className="text-sm">
                            Seleccionar todos ({needsTransferList ? selectedTransferCylinders.length : availableCylinders.length})
                          </Label>
                        </div>
                      )}
                    </div>
                    
                    {((needsTransferList && selectedTransferCylinders.length === 0) || 
                      (!needsTransferList && availableCylinders.length === 0)) ? (
                      <p className="text-sm text-muted-foreground">
                        {needsTransferList 
                          ? "Selecciona un número de traslado para ver los cilindros disponibles"
                          : formData.from_location === 'estacion_llenado' && formData.to_location === 'despacho' 
                            ? "No hay cilindros llenos disponibles en la estación de llenado"
                            : "No hay cilindros disponibles en la ubicación seleccionada"
                        }
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                        {(needsTransferList ? selectedTransferCylinders : availableCylinders).map((cylinder) => (
                          <div key={cylinder.id} className="flex flex-col space-y-2 p-3 border rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={cylinder.id}
                                checked={formData.selected_cylinders.includes(cylinder.id)}
                                onCheckedChange={(checked) => handleCylinderSelection(cylinder.id, checked as boolean)}
                              />
                              <Label htmlFor={cylinder.id} className="flex-1 cursor-pointer">
                                <div className="text-sm font-medium">{cylinder.serial_number}</div>
                                <div className="text-xs text-muted-foreground">
                                  {cylinder.capacity} • {cylinder.current_status}
                                </div>
                              </Label>
                            </div>
                            
                            {/* Editor de estado para rutas -> devoluciones y devoluciones -> despacho */}
                            {(formData.from_location === 'rutas' && formData.to_location === 'devoluciones' && formData.selected_cylinders.includes(cylinder.id)) && (
                              <div className="mt-2 ml-6">
                                <Label className="text-xs">Estado del cilindro:</Label>
                                <Select
                                  value={formData.cylinders_status[cylinder.id] || 'vacio'}
                                  onValueChange={(value) => 
                                    setFormData(prev => ({
                                      ...prev,
                                      cylinders_status: {
                                        ...prev.cylinders_status,
                                        [cylinder.id]: value
                                      }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vacio">Vacío</SelectItem>
                                    <SelectItem value="lleno">Lleno</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            {/* Editor de estado para devoluciones -> despacho */}
                            {needsStatusEdit && formData.selected_cylinders.includes(cylinder.id) && (
                              <div className="mt-2 ml-6">
                                <Label className="text-xs">Estado del cilindro:</Label>
                                <Select
                                  value={formData.cylinders_status[cylinder.id] || 'vacio'}
                                  onValueChange={(value) => 
                                    setFormData(prev => ({
                                      ...prev,
                                      cylinders_status: {
                                        ...prev.cylinders_status,
                                        [cylinder.id]: value
                                      }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vacio">Vacío</SelectItem>
                                    <SelectItem value="lleno">Lleno</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
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
                ) : formData.from_location && needsTransferList && !selectedTransfer && (
                  <div className="border p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Selecciona un número de traslado para ver los cilindros disponibles
                    </p>
                  </div>
                )}

                {/* Trip Closure Option */}
                {needsTripClosure && (
                  <div className="border p-4 rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trip_closure"
                        checked={formData.trip_closure}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, trip_closure: checked as boolean }))
                        }
                      />
                      <Label htmlFor="trip_closure" className="text-orange-800 font-medium">
                        Cierre de Viaje
                      </Label>
                    </div>
                    <p className="text-sm text-orange-700 mt-2 ml-6">
                      Al marcar esta opción, el traslado será removido de la lista de traslados disponibles.
                    </p>
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
                           {transfers.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).length}
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
                       const transferDate = new Date(t.created_at);
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
            <div className="flex flex-col gap-4">
              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <SelectItem value="rutas">Rutas</SelectItem>
                      <SelectItem value="devoluciones">Devoluciones</SelectItem>
                      <SelectItem value="en_mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
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
                      {Array.from(new Set(transfers.map(t => t.cylinders?.capacity).filter(Boolean))).map(capacity => (
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
                      setLocationFilter("all");
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
                  <span className="font-bold">{filteredTransfers.length}</span>
                  <span>traslado{filteredTransfers.length !== 1 ? 's' : ''}</span>
                </Badge>
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
                         <span>{new Date(transfer.created_at).toLocaleDateString()}</span>
                       </div>
                    </div>
                    
                  </div>

                  {transfer.observations && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Observaciones:</span>
                      <p className="text-sm mt-1">{transfer.observations}</p>
                    </div>
                  )}

                  {/* Reversal Info */}
                  {transfer.is_reversed && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <RotateCcw className="h-4 w-4" />
                        <span className="text-sm font-medium">Traslado Reversado</span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Reversado por: {transfer.reversed_by}</div>
                        <div>Fecha: {transfer.reversed_at ? new Date(transfer.reversed_at).toLocaleString() : 'N/A'}</div>
                        {transfer.reversal_reason && <div>Motivo: {transfer.reversal_reason}</div>}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!transfer.is_reversed && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReversalDialog({
                          open: true,
                          recordId: transfer.id,
                          description: `Traslado de ${transfer.cylinders?.serial_number || 'N/A'} de ${locationLabels[transfer.from_location as keyof typeof locationLabels]} a ${locationLabels[transfer.to_location as keyof typeof locationLabels]}`
                        })}
                        className="text-destructive hover:text-destructive"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reversar Traslado
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <ReversalDialog
          open={reversalDialog.open}
          onOpenChange={(open) => setReversalDialog(prev => ({ ...prev, open }))}
          recordId={reversalDialog.recordId}
          recordType="transfer"
          recordDescription={reversalDialog.description}
          onSuccess={fetchTransfers}
        />
      </div>
    </Layout>
  );
};

export default Transfers;