import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, TrendingDown } from "lucide-react";

const entrySchema = z.object({
  quantity: z.number().min(0.1, "La cantidad debe ser mayor a 0"),
  operator_name: z.string().min(1, "El nombre del operador es requerido"),
  supplier: z.string().min(1, "El proveedor es requerido"),
  observations: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface TankEntryFormProps {
  onEntryAdded: () => void;
}

const TankEntryForm = ({ onEntryAdded }: TankEntryFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      quantity: 0,
      operator_name: "",
      supplier: "",
      observations: "",
    },
  });

  const onSubmit = async (data: EntryFormData) => {
    setIsSubmitting(true);
    try {
      // Obtener el ID del tanque principal
      const { data: tankData, error: tankError } = await supabase
        .from('co2_tank')
        .select('id')
        .single();

      if (tankError) throw tankError;

      // Calcular la merma del 3% y actualizar datos
      const shrinkageAmount = data.quantity * 0.03;
      const totalWithShrinkage = data.quantity + shrinkageAmount;

      // Registrar la entrada con información de merma
      const { error: entryError } = await supabase
        .from('tank_movements')
        .insert({
          tank_id: tankData.id,
          movement_type: 'entrada',
          quantity: data.quantity,
          operator_name: data.operator_name,
          supplier: data.supplier,
          observations: data.observations,
          shrinkage_percentage: 3.0,
          shrinkage_amount: shrinkageAmount,
        });

      if (entryError) throw entryError;

      toast({
        title: "Entrada registrada",
        description: `Se agregaron ${data.quantity} kg de CO2 + ${shrinkageAmount.toFixed(1)} kg de merma (3%) = ${totalWithShrinkage.toFixed(1)} kg total al tanque.`,
      });

      form.reset();
      onEntryAdded();
    } catch (error) {
      console.error('Error registrando entrada:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Registrar Entrada de CO2
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="0.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="operator_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operador</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del operador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observaciones adicionales..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shrinkage Indicator */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">Indicador de Merma (3% para Recargas)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                <div>
                  <span className="font-medium">Cantidad base:</span>
                  <div>{form.watch('quantity') || 0} kg</div>
                </div>
                <div>
                  <span className="font-medium">Merma (3%):</span>
                  <div>{((form.watch('quantity') || 0) * 0.03).toFixed(1)} kg</div>
                </div>
                <div>
                  <span className="font-medium">Total al tanque:</span>
                  <div>{((form.watch('quantity') || 0) * 1.03).toFixed(1)} kg</div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Entrada'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TankEntryForm;