import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, CheckCircle, XCircle } from "lucide-react";

interface RecordActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  tableName: string;
  action: 'edit' | 'delete' | 'approve' | 'reject';
  recordData?: any;
  onSuccess?: () => void;
}

export const RecordActionsDialog = ({ 
  isOpen, 
  onClose, 
  recordId, 
  tableName, 
  action,
  recordData,
  onSuccess 
}: RecordActionsDialogProps) => {
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getActionTitle = () => {
    switch(action) {
      case 'delete': return 'Eliminar Registro';
      case 'approve': return 'Aprobar Registro';
      case 'reject': return 'Rechazar Registro';
      default: return 'Editar Registro';
    }
  };

  const getActionIcon = () => {
    switch(action) {
      case 'delete': return <Trash2 className="h-5 w-5 text-destructive" />;
      case 'approve': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'reject': return <XCircle className="h-5 w-5 text-warning" />;
      default: return <Edit className="h-5 w-5 text-primary" />;
    }
  };

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const performedBy = user?.email || 'Unknown';

      if (action === 'delete') {
        // Log the deletion
        await supabase.from('approval_logs').insert({
          table_name: tableName,
          record_id: recordId,
          action: 'deleted',
          performed_by: performedBy,
          comments,
          previous_data: recordData as any
        });

        // Delete the record
        const { error } = await (supabase as any)
          .from(tableName)
          .delete()
          .eq('id', recordId);

        if (error) throw error;

        toast({
          title: "Registro eliminado",
          description: "El registro ha sido eliminado exitosamente."
        });
      } else if (action === 'approve') {
        // Update record with approval
        const { error } = await (supabase as any)
          .from(tableName)
          .update({
            is_approved: true,
            approved_by: performedBy,
            approved_at: new Date().toISOString(),
            rejection_reason: null
          })
          .eq('id', recordId);

        if (error) throw error;

        // Log the approval
        await supabase.from('approval_logs').insert({
          table_name: tableName,
          record_id: recordId,
          action: 'approved',
          performed_by: performedBy,
          comments
        });

        toast({
          title: "Registro aprobado",
          description: "El registro ha sido aprobado exitosamente."
        });
      } else if (action === 'reject') {
        // Update record with rejection
        const { error } = await (supabase as any)
          .from(tableName)
          .update({
            is_approved: false,
            approved_by: performedBy,
            approved_at: new Date().toISOString(),
            rejection_reason: comments
          })
          .eq('id', recordId);

        if (error) throw error;

        // Log the rejection
        await supabase.from('approval_logs').insert({
          table_name: tableName,
          record_id: recordId,
          action: 'rejected',
          performed_by: performedBy,
          comments
        });

        toast({
          title: "Registro rechazado",
          description: "El registro ha sido rechazado."
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: "Error",
        description: `No se pudo completar la acción: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <DialogTitle>{getActionTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            {action === 'delete' && 'Esta acción no se puede deshacer. El registro será eliminado permanentemente.'}
            {action === 'approve' && 'El registro será marcado como aprobado.'}
            {action === 'reject' && 'El registro será rechazado. Proporciona una razón.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="comments">
              {action === 'reject' ? 'Razón del rechazo *' : 'Comentarios (opcional)'}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={action === 'reject' ? 'Explica por qué se rechaza este registro...' : 'Agrega comentarios adicionales...'}
              className="mt-2"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant={action === 'delete' ? 'destructive' : action === 'approve' ? 'success' : 'warning'}
            onClick={handleAction}
            disabled={isLoading || (action === 'reject' && !comments.trim())}
          >
            {isLoading ? 'Procesando...' : getActionTitle()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};