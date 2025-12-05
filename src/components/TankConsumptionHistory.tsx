import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface DailyConsumption {
  date: string;
  consumo: number;
  entrada: number;
}

const TankConsumptionHistory = () => {
  const [data, setData] = useState<DailyConsumption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsumptionHistory();
  }, []);

  const fetchConsumptionHistory = async () => {
    try {
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      
      const { data: movements, error } = await supabase
        .from('tank_movements')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_reversed', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const dailyData: Record<string, { consumo: number; entrada: number }> = {};
      
      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData[date] = { consumo: 0, entrada: 0 };
      }

      // Sum movements by day
      movements?.forEach((movement) => {
        const date = format(new Date(movement.created_at), 'yyyy-MM-dd');
        if (dailyData[date]) {
          if (movement.movement_type === 'salida') {
            dailyData[date].consumo += Number(movement.quantity) + Number(movement.shrinkage_amount || 0);
          } else if (movement.movement_type === 'entrada') {
            dailyData[date].entrada += Number(movement.quantity);
          }
        }
      });

      // Also get fillings data (cylinder fills consume from tank)
      const { data: fillings, error: fillingsError } = await supabase
        .from('fillings')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_reversed', false);

      if (!fillingsError && fillings) {
        fillings.forEach((filling) => {
          const date = format(new Date(filling.created_at), 'yyyy-MM-dd');
          if (dailyData[date]) {
            dailyData[date].consumo += Number(filling.weight_filled) + Number(filling.shrinkage_amount || 0);
          }
        });
      }

      // Convert to array
      const chartData = Object.entries(dailyData).map(([date, values]) => ({
        date: format(new Date(date), 'EEE dd', { locale: es }),
        consumo: Math.round(values.consumo * 100) / 100,
        entrada: Math.round(values.entrada * 100) / 100,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching consumption history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalConsumo = data.reduce((sum, d) => sum + d.consumo, 0);
  const totalEntrada = data.reduce((sum, d) => sum + d.entrada, 0);

  if (loading) {
    return (
      <Card className="shadow-tank">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-primary" />
            Historial de Consumo CO2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-tank">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-primary" />
            Historial de Consumo CO2
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Últimos 7 días
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-xs text-muted-foreground">Consumo Total</p>
            <p className="text-xl font-bold text-destructive">{totalConsumo.toLocaleString()} kg</p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-xs text-muted-foreground">Entradas Total</p>
            <p className="text-xl font-bold text-success">{totalEntrada.toLocaleString()} kg</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}kg`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} kg`,
                  name === 'consumo' ? 'Consumo' : 'Entradas'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="consumo" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="entrada" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <span className="text-muted-foreground">Consumo (salidas + llenados)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-muted-foreground">Entradas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TankConsumptionHistory;
