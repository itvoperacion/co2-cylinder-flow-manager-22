import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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

interface CylinderDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cylinder: Cylinder | null;
  onSuccess: () => void;
}

const CylinderDeleteDialog = ({ 
  open, 
  onOpenChange, 
  cylinder,
  onSuccess 
}: CylinderDeleteDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState("");

  const handleDelete = async () => {
    if (!cylinder) return;
    
    if (!comments.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar un comentario para la eliminación.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Store data for audit before deletion
      const previousData = {
        id: cylinder.id,
        serial_number: cylinder.serial_number,
        capacity: cylinder.capacity,
        valve_type: cylinder.valve_type,
        manufacturing_date: cylinder.manufacturing_date,
        last_hydrostatic_test: cylinder.last_hydrostatic_test,
        next_test_due: cylinder.next_test_due,
        current_location: cylinder.current_location,
        current_status: cylinder.current_status,
        is_active: cylinder.is_active,
        observations: cylinder.observations,
        customer_owned: cylinder.customer_owned,
        customer_info: cylinder.customer_info
      };

      // Log the deletion action first
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert({
          record_id: cylinder.id,
          table_name: 'cylinders',
          action: 'delete',
          previous_data: previousData,
          new_data: null,
          performed_by: 'Usuario',
          comments: comments
        });

      if (logError) {
        console.error('Error logging deletion:', logError);
      }

      // Instead of hard delete, set is_active to false (soft delete)
      const { error: deleteError } = await supabase
        .from('cylinders')
        .update({ is_active: false })
        .eq('id', cylinder.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Éxito",
        description: "Cilindro eliminado correctamente.",
      });

      setComments("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting cylinder:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cilindro. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComments("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Eliminar Cilindro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Warning */}
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive mb-1">
                  ¿Estás seguro de eliminar este cilindro?
                </p>
                <p className="text-xs text-muted-foreground">
                  El cilindro será desactivado y ya no aparecerá en las listas activas.
                </p>
              </div>
            </div>
          </div>

          {/* Cylinder Info */}
          {cylinder && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Número de Serie:</span>
                <span className="text-sm">{cylinder.serial_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Capacidad:</span>
                <span className="text-sm">{cylinder.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Ubicación:</span>
                <span className="text-sm capitalize">{cylinder.current_location.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Estado:</span>
                <span className="text-sm capitalize">{cylinder.current_status.replace('_', ' ')}</span>
              </div>
            </div>
          )}

          {/* Comments - Required */}
          <div>
            <Label htmlFor="delete_comments" className="text-destructive">
              Motivo de Eliminación *
            </Label>
            <Textarea
              id="delete_comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Describe el motivo de la eliminación..."
              required
              rows={3}
              className="border-destructive/50 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este comentario quedará registrado en el historial de auditoría.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CylinderDeleteDialog;
