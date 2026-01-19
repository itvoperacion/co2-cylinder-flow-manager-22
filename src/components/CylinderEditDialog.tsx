import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  customer_owned: boolean;
  customer_info: string | null;
}

interface CylinderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cylinder: Cylinder | null;
  onSuccess: () => void;
}

const CylinderEditDialog = ({ 
  open, 
  onOpenChange, 
  cylinder,
  onSuccess 
}: CylinderEditDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: "",
    capacity: "",
    valve_type: "industrial",
    manufacturing_date: "",
    last_hydrostatic_test: "",
    observations: "",
    customer_owned: false,
    customer_info: "",
    current_status: "vacio",
    current_location: "despacho",
    edit_comments: ""
  });

  useEffect(() => {
    if (cylinder) {
      setFormData({
        serial_number: cylinder.serial_number,
        capacity: cylinder.capacity,
        valve_type: cylinder.valve_type,
        manufacturing_date: cylinder.manufacturing_date,
        last_hydrostatic_test: cylinder.last_hydrostatic_test,
        observations: cylinder.observations || "",
        customer_owned: cylinder.customer_owned,
        customer_info: cylinder.customer_info || "",
        current_status: cylinder.current_status,
        current_location: cylinder.current_location,
        edit_comments: ""
      });
    }
  }, [cylinder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cylinder) return;
    
    if (!formData.edit_comments.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar un comentario para la edición.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate next test due date
      const nextTestDate = new Date(formData.last_hydrostatic_test);
      nextTestDate.setFullYear(nextTestDate.getFullYear() + 5);

      // Store previous data for audit
      const previousData = {
        serial_number: cylinder.serial_number,
        capacity: cylinder.capacity,
        valve_type: cylinder.valve_type,
        manufacturing_date: cylinder.manufacturing_date,
        last_hydrostatic_test: cylinder.last_hydrostatic_test,
        observations: cylinder.observations,
        customer_owned: cylinder.customer_owned,
        customer_info: cylinder.customer_info,
        current_status: cylinder.current_status,
        current_location: cylinder.current_location
      };

      // Update cylinder
      const { error: updateError } = await supabase
        .from('cylinders')
        .update({
          serial_number: formData.serial_number,
          capacity: formData.capacity,
          valve_type: formData.valve_type,
          manufacturing_date: formData.manufacturing_date,
          last_hydrostatic_test: formData.last_hydrostatic_test,
          next_test_due: nextTestDate.toISOString().split('T')[0],
          observations: formData.observations || null,
          customer_owned: formData.customer_owned,
          customer_info: formData.customer_owned ? formData.customer_info : null,
          current_status: formData.current_status,
          current_location: formData.current_location
        })
        .eq('id', cylinder.id);

      if (updateError) throw updateError;

      // Log the edit action
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert({
          record_id: cylinder.id,
          table_name: 'cylinders',
          action: 'edit',
          previous_data: previousData,
          new_data: {
            serial_number: formData.serial_number,
            capacity: formData.capacity,
            valve_type: formData.valve_type,
            manufacturing_date: formData.manufacturing_date,
            last_hydrostatic_test: formData.last_hydrostatic_test,
            observations: formData.observations,
            customer_owned: formData.customer_owned,
            customer_info: formData.customer_info,
            current_status: formData.current_status,
            current_location: formData.current_location
          },
          performed_by: 'Usuario',
          comments: formData.edit_comments
        });

      if (logError) {
        console.error('Error logging edit:', logError);
      }

      toast({
        title: "Éxito",
        description: "Cilindro actualizado correctamente.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating cylinder:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el cilindro. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Editar Cilindro
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_serial_number">Número de Serie</Label>
              <Input
                id="edit_serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_capacity">Capacidad</Label>
              <Select
                value={formData.capacity}
                onValueChange={(value) => setFormData(prev => ({ ...prev, capacity: value }))}
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
              <Label htmlFor="edit_valve_type">Tipo de Válvula</Label>
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
              <Label htmlFor="edit_manufacturing_date">Fecha de Fabricación</Label>
              <Input
                id="edit_manufacturing_date"
                type="date"
                value={formData.manufacturing_date}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturing_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_last_hydrostatic_test">Última Prueba Hidrostática</Label>
              <Input
                id="edit_last_hydrostatic_test"
                type="date"
                value={formData.last_hydrostatic_test}
                onChange={(e) => setFormData(prev => ({ ...prev, last_hydrostatic_test: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_current_status">Estado Actual</Label>
              <Select
                value={formData.current_status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, current_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacio">Vacío</SelectItem>
                  <SelectItem value="lleno">Lleno</SelectItem>
                  <SelectItem value="en_llenado">En Llenado</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit_current_location">Ubicación Actual</Label>
              <Select
                value={formData.current_location}
                onValueChange={(value) => setFormData(prev => ({ ...prev, current_location: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despacho">Despacho</SelectItem>
                  <SelectItem value="estacion_llenado">Estación de Llenado</SelectItem>
                  <SelectItem value="rutas">Rutas</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="devolucion_clientes">Devolución Clientes</SelectItem>
                  <SelectItem value="cierre_rutas">Cierre de Rutas</SelectItem>
                  <SelectItem value="en_mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Customer Owned Checkbox */}
            <div className="col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_customer_owned"
                  checked={formData.customer_owned}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    customer_owned: checked as boolean,
                    customer_info: checked ? prev.customer_info : ""
                  }))}
                />
                <Label htmlFor="edit_customer_owned" className="cursor-pointer">
                  Cilindro propiedad del cliente
                </Label>
              </div>
            </div>

            {/* Customer Info */}
            {formData.customer_owned && (
              <div className="col-span-2">
                <Label htmlFor="edit_customer_info">Información del Cliente</Label>
                <Input
                  id="edit_customer_info"
                  value={formData.customer_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_info: e.target.value }))}
                  placeholder="Nombre/Empresa del cliente"
                  required={formData.customer_owned}
                />
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="edit_observations">Observaciones</Label>
              <Textarea
                id="edit_observations"
                value={formData.observations}
                onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Edit Comments - Required */}
            <div className="col-span-2 border-t pt-4">
              <Label htmlFor="edit_comments" className="text-destructive">
                Comentarios de la Edición *
              </Label>
              <Textarea
                id="edit_comments"
                value={formData.edit_comments}
                onChange={(e) => setFormData(prev => ({ ...prev, edit_comments: e.target.value }))}
                placeholder="Describe el motivo de la edición..."
                required
                className="border-destructive/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este comentario quedará registrado en el historial de auditoría.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CylinderEditDialog;
