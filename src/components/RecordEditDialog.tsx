import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";

interface RecordEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  tableName: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'textarea' | 'select';
    options?: string[];
    readonly?: boolean;
  }>;
  currentData: any;
  onSuccess?: () => void;
}

export const RecordEditDialog = ({ 
  isOpen, 
  onClose, 
  recordId, 
  tableName, 
  fields,
  currentData,
  onSuccess 
}: RecordEditDialogProps) => {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentData) {
      setFormData(currentData);
    }
  }, [currentData]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const performedBy = user?.email || 'Unknown';

      // Log the edit
      await supabase.from('approval_logs').insert({
        table_name: tableName,
        record_id: recordId,
        action: 'edited',
        performed_by: performedBy,
        previous_data: currentData as any,
        new_data: formData as any
      });

      // Update the record
      const { error } = await (supabase as any)
        .from(tableName)
        .update(formData)
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Registro actualizado",
        description: "El registro ha sido actualizado exitosamente."
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: `No se pudo actualizar el registro: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            <DialogTitle>Editar Registro</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  disabled={field.readonly}
                  className="mt-2"
                  rows={3}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  disabled={field.readonly}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                >
                  {field.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                  disabled={field.readonly}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};