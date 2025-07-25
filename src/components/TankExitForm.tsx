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
import { Minus, Loader2 } from "lucide-react";

const exitSchema = z.object({
  quantity: z.number().min(0.1, "La cantidad debe ser mayor a 0"),
  operator_name: z.string().min(1, "El nombre del operador es requerido"),
  observations: z.string().optional(),
});

type ExitFormData = z.infer<typeof exitSchema>;

interface TankExitFormProps {
  onExitAdded: () => void;
}

const TankExitForm = ({ onExitAdded }: TankExitFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ExitFormData>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      quantity: 0,
      operator_name: "",
      observations: "",
    },
  });

  const onSubmit = async (data: ExitFormData) => {
    setIsSubmitting(true);
    try {
      // Obtener el ID del tanque principal
      const { data: tankData, error: tankError } = await supabase
        .from('co2_tank')
        .select('id, current_level')
        .single();

      if (tankError) throw tankError;

      // Verificar que hay suficiente inventario
      if (tankData.current_level < data.quantity) {
        toast({
          title: "Inventario insuficiente",
          description: `No hay suficiente CO2 en el tanque. Disponible: ${tankData.current_level} kg`,
          variant: "destructive",
        });
        return;
      }

      // Registrar la salida
      const { error: exitError } = await supabase
        .from('tank_movements')
        .insert({
          tank_id: tankData.id,
          movement_type: 'salida',
          quantity: data.quantity,
          operator_name: data.operator_name,
          observations: data.observations,
        });

      if (exitError) throw exitError;

      toast({
        title: "Salida registrada",
        description: `Se descontaron ${data.quantity} kg de CO2 del tanque principal.`,
      });

      form.reset();
      onExitAdded();
    } catch (error) {
      console.error('Error registrando salida:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la salida. Intente nuevamente.",
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
          <Minus className="h-5 w-5" />
          Registrar Salida de CO2
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
            </div>

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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Salida'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TankExitForm;