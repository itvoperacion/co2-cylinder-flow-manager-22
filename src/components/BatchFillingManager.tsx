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
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const [isApprovalEditMode, setIsApprovalEditMode] = useState(false);
  const [editedApproval, setEditedApproval] = useState({
    is_approved: false,
    approved_by: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize edited weights with current values
    const initialWeights: { [fillingId: string]: string } = {};
    fillings.forEach(filling => {
      initialWeights[filling.id] = filling.weight_filled.toString();
    });
    setEditedWeights(initialWeights);
    
    // Initialize approval status (use first filling as reference since it's a batch)
    if (fillings.length > 0) {
      setEditedApproval({
        is_approved: fillings[0].is_approved || false,
        approved_by: fillings[0].approved_by || ""
      });
    }
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

  const handleSaveApprovalChanges = async () => {
    setSaving(true);
    try {
      // Update all fillings in the batch with the new approval status
      const updatePromises = fillings.map(filling => {
        return supabase
          .from('fillings')
          .update({ 
            is_approved: editedApproval.is_approved,
            approved_by: editedApproval.approved_by || null
          })
          .eq('id', filling.id);
      });

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        throw new Error('Error updating some filling approval records');
      }

      toast({
        title: "Éxito",
        description: `Se actualizó la aprobación del lote ${batchNumber}.`,
      });

      setIsApprovalEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating filling approval:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la aprobación del lote.",
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

  const handleCancelApprovalEdit = () => {
    // Reset approval to original values
    if (fillings.length > 0) {
      setEditedApproval({
        is_approved: fillings[0].is_approved || false,
        approved_by: fillings[0].approved_by || ""
      });
    }
    setIsApprovalEditMode(false);
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
            {fillings.length > 0 && (
              <Badge variant={fillings[0].is_approved ? "secondary" : "outline"} className="flex items-center gap-1">
                {fillings[0].is_approved ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Aprobado
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Pendiente
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditMode && !isApprovalEditMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  Editar Pesos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsApprovalEditMode(true)}
                  className="flex items-center gap-1"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Editar Aprobación
                </Button>
              </>
            )}
            {isEditMode && (
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
            {isApprovalEditMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelApprovalEdit}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveApprovalChanges}
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

          {/* Approval Edit Section */}
          {isApprovalEditMode && (
            <div className="border p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Editar Estado de Aprobación
              </h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="batch-approval"
                    checked={editedApproval.is_approved}
                    onCheckedChange={(checked) => setEditedApproval(prev => ({ ...prev, is_approved: checked as boolean }))}
                  />
                  <Label htmlFor="batch-approval" className="text-sm font-medium">
                    Marcar lote como APROBADO
                  </Label>
                </div>
                <div>
                  <Label htmlFor="batch-approved-by" className="text-sm font-medium">
                    Aprobado por
                  </Label>
                  <Input
                    id="batch-approved-by"
                    value={editedApproval.approved_by}
                    onChange={(e) => setEditedApproval(prev => ({ ...prev, approved_by: e.target.value }))}
                    placeholder="Nombre del supervisor"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

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