import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit3,
  Save,
  X,
  Package,
  Weight,
  AlertTriangle
} from "lucide-react";

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
  filling_datetime?: string;
  is_approved?: boolean;
  approved_by?: string | null;
  shrinkage_percentage?: number;
  shrinkage_amount?: number;
  cylinders?: {
    id: string;
    serial_number: string;
    capacity: string;
    current_status: string;
    current_location: string;
  };
}

interface BatchFillingManagerProps {
  batchNumber: string;
  fillings: Filling[];
  onUpdate: () => void;
}

const BatchFillingManager = ({ batchNumber, fillings, onUpdate }: BatchFillingManagerProps) => {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedWeights, setEditedWeights] = useState<{ [fillingId: string]: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize edited weights with current values
    const initialWeights: { [fillingId: string]: string } = {};
    fillings.forEach(filling => {
      initialWeights[filling.id] = filling.weight_filled.toString();
    });
    setEditedWeights(initialWeights);
  }, [fillings]);

  const handleWeightChange = (fillingId: string, newWeight: string) => {
    setEditedWeights(prev => ({
      ...prev,
      [fillingId]: newWeight
    }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Validate all weights
      const hasInvalidWeight = Object.entries(editedWeights).some(([_, weight]) => {
        const numWeight = parseFloat(weight);
        return isNaN(numWeight) || numWeight <= 0;
      });

      if (hasInvalidWeight) {
        toast({
          title: "Error",
          description: "Todos los pesos deben ser números válidos mayores a 0.",
          variant: "destructive",
        });
        return;
      }

      // Update each filling record
      const updatePromises = Object.entries(editedWeights).map(([fillingId, weight]) => {
        return supabase
          .from('fillings')
          .update({ weight_filled: parseFloat(weight) })
          .eq('id', fillingId);
      });

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        throw new Error('Error updating some filling records');
      }

      toast({
        title: "Éxito",
        description: `Se actualizaron ${fillings.length} registros del lote ${batchNumber}.`,
      });

      setIsEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating filling weights:', error);
      toast({
        title: "Error",
        description: "Error al actualizar los pesos de llenado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset weights to original values
    const originalWeights: { [fillingId: string]: string } = {};
    fillings.forEach(filling => {
      originalWeights[filling.id] = filling.weight_filled.toString();
    });
    setEditedWeights(originalWeights);
    setIsEditMode(false);
  };

  const getTotalWeight = () => {
    if (isEditMode) {
      return Object.values(editedWeights).reduce((sum, weight) => {
        const numWeight = parseFloat(weight) || 0;
        return sum + numWeight;
      }, 0);
    }
    return fillings.reduce((sum, filling) => sum + filling.weight_filled, 0);
  };

  const getShrinkageAmount = () => {
    return getTotalWeight() * 0.01; // 1% shrinkage
  };

  return (
    <Card className="shadow-industrial">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Lote {batchNumber}
            <Badge variant="outline">
              {fillings.length} cilindros
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                Editar Pesos
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-1"
                >
                  <Save className="h-3 w-3" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Batch Summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg text-foreground">
                  {fillings.length}
                </div>
                <div className="text-muted-foreground">Cilindros</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-primary">
                  {getTotalWeight().toFixed(1)} kg
                </div>
                <div className="text-muted-foreground">Peso Total</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-warning">
                  {getShrinkageAmount().toFixed(1)} kg
                </div>
                <div className="text-muted-foreground">Merma (1%)</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-accent">
                  {(getTotalWeight() + getShrinkageAmount()).toFixed(1)} kg
                </div>
                <div className="text-muted-foreground">Del Tanque</div>
              </div>
            </div>
          </div>

          {/* Individual Fillings */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Cilindros en el Lote
            </h4>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {fillings.map((filling) => (
                <div
                  key={filling.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {filling.cylinders?.serial_number || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {filling.cylinders?.capacity || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editedWeights[filling.id] || ""}
                          onChange={(e) => handleWeightChange(filling.id, e.target.value)}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">kg</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        {filling.weight_filled} kg
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for edit mode */}
          {isEditMode && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">Modo de Edición Activo</p>
                <p>Los cambios en los pesos afectarán los cálculos de merma y el inventario del tanque. 
                Asegúrate de verificar todos los valores antes de guardar.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchFillingManager;