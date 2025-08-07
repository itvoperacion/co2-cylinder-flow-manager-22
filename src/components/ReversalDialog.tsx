import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReversalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  recordType: "filling" | "transfer" | "tank_movement";
  recordDescription: string;
  onSuccess: () => void;
}

const ReversalDialog = ({ 
  open, 
  onOpenChange, 
  recordId, 
  recordType, 
  recordDescription,
  onSuccess 
}: ReversalDialogProps) => {
  const { toast } = useToast();
  const [reversedBy, setReversedBy] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReverse = async () => {
    if (!reversedBy.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar quién realiza la reversión.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let rpcCall;
      switch (recordType) {
        case "filling":
          rpcCall = supabase.rpc("reverse_filling", {
            filling_id: recordId,
            reversed_by: reversedBy,
            reversal_reason: reason || null
          });
          break;
        case "transfer":
          rpcCall = supabase.rpc("reverse_transfer", {
            transfer_id: recordId,
            reversed_by: reversedBy,
            reversal_reason: reason || null
          });
          break;
        case "tank_movement":
          rpcCall = supabase.rpc("reverse_tank_movement", {
            movement_id: recordId,
            reversed_by: reversedBy,
            reversal_reason: reason || null
          });
          break;
        default:
          throw new Error("Tipo de registro no válido");
      }

      const { error } = await rpcCall;

      if (error) throw error;

      toast({
        title: "Reversión exitosa",
        description: `${recordDescription} ha sido reversado correctamente.`,
      });

      onSuccess();
      onOpenChange(false);
      setReversedBy("");
      setReason("");
    } catch (error) {
      console.error('Error reversing record:', error);
      toast({
        title: "Error",
        description: "No se pudo reversar el registro. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Reversión
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-1">
              ¿Estás seguro de que deseas reversar este registro?
            </p>
            <p className="text-xs text-muted-foreground">
              {recordDescription}
            </p>
            <p className="text-xs text-destructive mt-2">
              Esta acción no se puede deshacer y afectará el inventario.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="reversed-by">Reversado por *</Label>
              <Input
                id="reversed-by"
                placeholder="Nombre de quien realiza la reversión"
                value={reversedBy}
                onChange={(e) => setReversedBy(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Motivo de la reversión (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Describe el motivo de la reversión..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reversando...
                </>
              ) : (
                'Confirmar Reversión'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReversalDialog;