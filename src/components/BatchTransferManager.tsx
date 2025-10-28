import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRightLeft, Package, Loader2 } from "lucide-react";

const BatchTransferManager = () => {
  const [batchNumber, setBatchNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [cylinders, setCylinders] = useState<any[]>([]);
  const [operatorName, setOperatorName] = useState("");

  const handleSearchBatch = async () => {
    if (!batchNumber.trim()) {
      toast.error("Por favor ingrese un número de lote");
      return;
    }

    setLoading(true);
    try {
      // Buscar cilindros en estacion_llenado con ese número de lote
      const { data: fillings, error } = await supabase
        .from('fillings')
        .select(`
          id,
          cylinder_id,
          batch_number,
          cylinders (
            id,
            serial_number,
            capacity,
            current_status,
            current_location
          )
        `)
        .eq('batch_number', batchNumber)
        .eq('is_reversed', false);

      if (error) throw error;

      // Filtrar solo los cilindros que están en estacion_llenado
      const cylindersInStation = fillings?.filter(
        f => f.cylinders?.current_location === 'estacion_llenado'
      ) || [];

      if (cylindersInStation.length === 0) {
        toast.error(`No se encontraron cilindros del lote ${batchNumber} en Estación de Llenado`);
        setCylinders([]);
        return;
      }

      setCylinders(cylindersInStation);
      toast.success(`Se encontraron ${cylindersInStation.length} cilindros del lote ${batchNumber}`);
    } catch (error) {
      console.error('Error searching batch:', error);
      toast.error('Error al buscar el lote');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferBatch = async () => {
    if (cylinders.length === 0) {
      toast.error("No hay cilindros para transferir");
      return;
    }

    if (!operatorName.trim()) {
      toast.error("Por favor ingrese el nombre del operador");
      return;
    }

    setLoading(true);
    try {
      const cylinderIds = cylinders.map(c => c.cylinders.id);

      // Actualizar ubicación de los cilindros
      const { error: updateError } = await supabase
        .from('cylinders')
        .update({ 
          current_location: 'despacho',
          current_status: 'lleno'
        })
        .in('id', cylinderIds);

      if (updateError) throw updateError;

      // Crear registros de traslado
      const transferPromises = cylinderIds.map(cylinderId =>
        supabase.from('transfers').insert({
          cylinder_id: cylinderId,
          from_location: 'estacion_llenado',
          to_location: 'despacho',
          operator_name: operatorName,
          observations: `Traslado por lote: ${batchNumber}`
        })
      );

      await Promise.all(transferPromises);

      toast.success(`Se trasladaron ${cylinders.length} cilindros del lote ${batchNumber} a Despacho`);
      
      // Limpiar formulario
      setBatchNumber("");
      setCylinders([]);
      setOperatorName("");
    } catch (error) {
      console.error('Error transferring batch:', error);
      toast.error('Error al realizar el traslado del lote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-industrial">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Traslado por Lote: Estación de Llenado → Despacho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda de Lote */}
        <div className="space-y-2">
          <Label htmlFor="batch-search">Número de Lote</Label>
          <div className="flex gap-2">
            <Input
              id="batch-search"
              placeholder="Ej: LOTE-001"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchBatch()}
            />
            <Button 
              onClick={handleSearchBatch} 
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </div>
        </div>

        {/* Cilindros encontrados */}
        {cylinders.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Cilindros en el Lote ({cylinders.length})
              </Label>
              <div className="border rounded-lg p-3 bg-muted/30 max-h-48 overflow-y-auto space-y-2">
                {cylinders.map((item) => (
                  <div 
                    key={item.cylinder_id}
                    className="flex items-center justify-between p-2 bg-background rounded border"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {item.cylinders?.serial_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.cylinders?.capacity}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {item.cylinders?.current_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator">Operador</Label>
              <Input
                id="operator"
                placeholder="Nombre del operador"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleTransferBatch}
              disabled={loading || !operatorName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir {cylinders.length} Cilindros a Despacho
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchTransferManager;
