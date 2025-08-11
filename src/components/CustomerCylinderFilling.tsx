import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, User, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerCylinder {
  id: string;
  serial_number: string;
  capacity: string;
  customer_info: string;
  valve_type: string;
}

const CustomerCylinderFilling = () => {
  const { toast } = useToast();
  const [customerCylinders, setCustomerCylinders] = useState<CustomerCylinder[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    selected_cylinders: [] as string[],
    cylinder_weights: {} as { [cylinderId: string]: string },
    operator_name: "",
    customer_info: "",
    observations: "",
    filling_datetime: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchCustomerCylinders();
  }, []);

  const fetchCustomerCylinders = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('*')
        .eq('customer_owned', true)
        .eq('current_status', 'vacio')
        .eq('is_active', true)
        .order('serial_number');

      if (error) throw error;
      setCustomerCylinders(data || []);
    } catch (error) {
      console.error('Error fetching customer cylinders:', error);
      toast({
        title: "Error",
        description: "Error al cargar los cilindros de clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

    try {
      // Get tank ID
      const { data: tanks, error: tanksError } = await supabase
        .from('co2_tank')
        .select('id')
        .limit(1);

      if (tanksError) throw tanksError;
      if (!tanks || tanks.length === 0) {
        throw new Error('No se encontró tanque de CO2');
      }

      // Validate weights
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

      // Create filling records for customer cylinders
      const fillingRecords = formData.selected_cylinders.map(cylinderId => ({
        cylinder_id: cylinderId,
        tank_id: tanks[0].id,
        weight_filled: parseFloat(formData.cylinder_weights[cylinderId]),
        operator_name: formData.operator_name,
        batch_number: `CLIENTE-${Date.now()}`,
        observations: `Cliente: ${formData.customer_info}. ${formData.observations || ''}`.trim(),
        filling_datetime: formData.filling_datetime,
        is_approved: true, // Customer cylinders are auto-approved
        approved_by: formData.operator_name
      }));

      const { error: fillingsError } = await supabase
        .from('fillings')
        .insert(fillingRecords);

      if (fillingsError) throw fillingsError;

      // Update cylinder status
      const { error: statusError } = await supabase
        .from('cylinders')
        .update({ current_status: 'lleno' })
        .in('id', formData.selected_cylinders);

      if (statusError) throw statusError;

      toast({
        title: "Éxito",
        description: `${formData.selected_cylinders.length} cilindro(s) de cliente llenado(s) correctamente.`,
      });

      setShowAddDialog(false);
      setFormData({
        selected_cylinders: [],
        cylinder_weights: {},
        operator_name: "",
        customer_info: "",
        observations: "",
        filling_datetime: new Date().toISOString().slice(0, 16),
      });
      fetchCustomerCylinders();
    } catch (error) {
      console.error('Error adding customer filling:', error);
      toast({
        title: "Error",
        description: "Error al registrar el llenado de cilindros de cliente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-industrial">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Llenado de Cilindros de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <p className="text-muted-foreground">
            Gestiona el llenado de cilindros propiedad de los clientes
          </p>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Llenar Cilindros de Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Llenado de Cilindros de Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFilling} className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_info">Información del Cliente</Label>
                    <Input
                      id="customer_info"
                      value={formData.customer_info}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_info: e.target.value }))}
                      placeholder="Nombre/Empresa del cliente"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="operator_name">Operador</Label>
                    <Input
                      id="operator_name"
                      value={formData.operator_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                      placeholder="Nombre del operador"
                      required
                    />
                  </div>
                </div>

                {/* Cylinder Selection */}
                <div className="border p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Cilindros de Cliente Disponibles</h3>
                  
                  {customerCylinders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay cilindros de cliente vacíos disponibles para llenado
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {customerCylinders.map((cylinder) => (
                        <div key={cylinder.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Checkbox
                            id={`customer-${cylinder.id}`}
                            checked={formData.selected_cylinders.includes(cylinder.id)}
                            onCheckedChange={(checked) => handleCylinderSelection(cylinder.id, checked as boolean)}
                          />
                          <Label htmlFor={`customer-${cylinder.id}`} className="flex-1 cursor-pointer">
                            <div className="text-sm font-medium">{cylinder.serial_number}</div>
                            <div className="text-xs text-muted-foreground">
                              {cylinder.capacity} • Cliente: {cylinder.customer_info}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Individual Cylinder Weights */}
                {formData.selected_cylinders.length > 0 && (
                  <div className="border p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Peso Individual por Cilindro (kg)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {formData.selected_cylinders.map((cylinderId) => {
                        const cylinder = customerCylinders.find(c => c.id === cylinderId);
                        return (
                          <div key={cylinderId} className="flex items-center gap-3">
                            <div className="flex-1">
                              <Label htmlFor={`weight-${cylinderId}`} className="text-sm font-medium">
                                {cylinder?.serial_number}
                              </Label>
                              <div className="text-xs text-muted-foreground">
                                {cylinder?.capacity} • {cylinder?.customer_info}
                              </div>
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
                  </div>
                )}

                {/* Date and Observations */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="filling_datetime">Fecha y Hora</Label>
                    <Input
                      id="filling_datetime"
                      type="datetime-local"
                      value={formData.filling_datetime}
                      onChange={(e) => setFormData(prev => ({ ...prev, filling_datetime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="observations">Observaciones</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar Llenado</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Customer Cylinders Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Cilindros Disponibles</p>
                  <p className="text-2xl font-bold">{customerCylinders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCylinderFilling;