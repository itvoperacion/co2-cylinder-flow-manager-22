import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type ReportType = "cylinders" | "fillings" | "transfers" | "tank_movements" | "system_alerts" | "shrinkage";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>("cylinders");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Fetch data based on selected report type
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', selectedReport, dateFrom, dateTo],
    queryFn: async () => {
      // Handle shrinkage report separately
      if (selectedReport === 'shrinkage') {
        const [fillingsData, tankMovementsData] = await Promise.all([
          supabase.from('fillings').select('*, cylinders(serial_number, capacity)'),
          supabase.from('tank_movements').select('*')
        ]);
        
        const combinedData = [
          ...(fillingsData.data || []).map(f => ({
            ...f,
            source_type: 'cylinder_filling',
            description: `Llenado cilindro ${f.cylinders?.serial_number} (${f.cylinders?.capacity})`,
            shrinkage_kg: f.shrinkage_amount || 0
          })),
          ...(tankMovementsData.data || []).map(t => ({
            ...t,
            source_type: 'tank_movement',
            description: `Movimiento tanque - ${t.movement_type}`,
            shrinkage_kg: t.shrinkage_amount || 0
          }))
        ];
        
        return combinedData.filter(item => item.shrinkage_kg > 0);
      }
      
      // Handle other report types
      let query;
      if (selectedReport === 'fillings') {
        query = supabase.from('fillings').select('*, cylinders(serial_number, capacity, current_status)');
      } else if (selectedReport === 'transfers') {
        query = supabase.from('transfers').select('*, cylinders(serial_number, capacity, current_status, current_location)');
      } else {
        query = supabase.from(selectedReport).select('*');
      }
      
      // Add date filtering if dates are selected
      if (dateFrom && dateTo) {
        const fromDate = format(dateFrom, 'yyyy-MM-dd');
        const toDate = format(dateTo, 'yyyy-MM-dd');
        query = query.gte('created_at', fromDate).lte('created_at', toDate + 'T23:59:59');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedReport
  });

  const reportOptions = [
    { value: "cylinders", label: "Cilindros", description: "Reporte completo de cilindros" },
    { value: "fillings", label: "Llenados", description: "Historial de llenados de cilindros" },
    { value: "transfers", label: "Traslados", description: "Movimientos entre ubicaciones" },
    { value: "tank_movements", label: "Movimientos Tanque", description: "Entradas y salidas del tanque principal" },
    { value: "shrinkage", label: "Reporte de Merma", description: "Análisis de merma en llenados y movimientos" },
    { value: "system_alerts", label: "Alertas", description: "Alertas del sistema" }
  ];

  const getReportInfo = (type: ReportType) => {
    const option = reportOptions.find(opt => opt.value === type);
    return option || { label: "Reporte", description: "" };
  };

  const exportToExcel = async () => {
    if (!data || data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    let transformedData;

    // Special handling for tank movements report
    if (selectedReport === 'tank_movements') {
      // Get tank stock information
      const { data: tankData } = await supabase
        .from('co2_tank')
        .select('current_level, capacity')
        .single();

      // Group movements by month
      const movementsByMonth = new Map();
      
      data.forEach((movement: any) => {
        const monthKey = format(new Date(movement.created_at), 'yyyy-MM');
        if (!movementsByMonth.has(monthKey)) {
          movementsByMonth.set(monthKey, []);
        }
        movementsByMonth.get(monthKey).push(movement);
      });

      // Calculate stock at beginning of each month
      const currentStock = tankData?.current_level || 0;
      let runningStock = currentStock;
      
      // Sort months in descending order and calculate backwards
      const sortedMonths = Array.from(movementsByMonth.keys()).sort().reverse();
      const monthlyStocks = new Map();
      
      // Calculate stock backwards from current stock
      for (const monthKey of sortedMonths) {
        const movements = movementsByMonth.get(monthKey);
        const monthTotal = movements.reduce((sum: number, movement: any) => {
          const totalQuantity = movement.quantity + (movement.shrinkage_amount || 0);
          return movement.movement_type === 'entrada' ? sum - totalQuantity : sum + totalQuantity;
        }, 0);
        
        monthlyStocks.set(monthKey, runningStock - monthTotal);
        runningStock = runningStock - monthTotal;
      }

      // Create final data with stock headers
      transformedData = [];
      
      // Sort months chronologically for display
      const sortedMonthsAsc = Array.from(movementsByMonth.keys()).sort();
      
      for (const monthKey of sortedMonthsAsc) {
        const movements = movementsByMonth.get(monthKey);
        const stockAtBeginning = monthlyStocks.get(monthKey);
        
        // Add month header with stock
        transformedData.push({
          id: `STOCK_${monthKey}`,
          movement_type: `STOCK INICIAL ${format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: es }).toUpperCase()}`,
          quantity: stockAtBeginning,
          tank_id: 'STOCK',
          operator_name: `${stockAtBeginning} KG DISPONIBLES`,
          created_at: '',
          updated_at: '',
          shrinkage_percentage: '',
          shrinkage_amount: '',
          is_reversed: '',
          reversed_at: '',
          reversed_by: '',
          reversal_reason: '',
          supplier: '',
          observations: '',
          reference_filling_id: ''
        });

        // Add movements for this month
        movements.forEach((movement: any) => {
          const baseData = { ...movement };
          
          // Format dates
          if (baseData.created_at) {
            baseData.created_at = format(new Date(baseData.created_at), 'dd/MM/yyyy HH:mm', { locale: es });
          }
          if (baseData.updated_at) {
            baseData.updated_at = format(new Date(baseData.updated_at), 'dd/MM/yyyy HH:mm', { locale: es });
          }
          if (baseData.reversed_at) {
            baseData.reversed_at = format(new Date(baseData.reversed_at), 'dd/MM/yyyy HH:mm', { locale: es });
          }
          
          transformedData.push(baseData);
        });
      }
    } else {
      // Standard transformation for other reports
      transformedData = data.map((item: any) => {
        const baseData = { ...item };
        
        // Format dates
        if (baseData.created_at) {
          baseData.created_at = format(new Date(baseData.created_at), 'dd/MM/yyyy HH:mm', { locale: es });
        }
        if (baseData.updated_at) {
          baseData.updated_at = format(new Date(baseData.updated_at), 'dd/MM/yyyy HH:mm', { locale: es });
        }
        if (baseData.manufacturing_date) {
          baseData.manufacturing_date = format(new Date(baseData.manufacturing_date), 'dd/MM/yyyy', { locale: es });
        }
        if (baseData.last_hydrostatic_test) {
          baseData.last_hydrostatic_test = format(new Date(baseData.last_hydrostatic_test), 'dd/MM/yyyy', { locale: es });
        }
        if (baseData.next_test_due) {
          baseData.next_test_due = format(new Date(baseData.next_test_due), 'dd/MM/yyyy', { locale: es });
        }
        if (baseData.transfer_date) {
          baseData.transfer_date = format(new Date(baseData.transfer_date), 'dd/MM/yyyy HH:mm', { locale: es });
        }

        // Flatten nested objects (for fillings and transfers with cylinder data)
        if (baseData.cylinders) {
          baseData.serial_number_cilindro = baseData.cylinders.serial_number;
          baseData.capacidad_cilindro = baseData.cylinders.capacity;
          baseData.estado_cilindro = baseData.cylinders.current_status;
          baseData.ubicacion_cilindro = baseData.cylinders.current_location;
          delete baseData.cylinders;
        }

        return baseData;
      });
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(transformedData);

    // Add the worksheet to the workbook
    const reportInfo = getReportInfo(selectedReport);
    XLSX.utils.book_append_sheet(wb, ws, reportInfo.label);

    // Generate filename
    const dateRange = dateFrom && dateTo 
      ? `_${format(dateFrom, 'yyyy-MM-dd')}_a_${format(dateTo, 'yyyy-MM-dd')}`
      : `_${format(new Date(), 'yyyy-MM-dd')}`;
    
    const filename = `reporte_${selectedReport}${dateRange}.xlsx`;

    // Save the file
    XLSX.writeFile(wb, filename);
    
    toast.success(`Reporte exportado como ${filename}`);
  };

  const getRecordCount = () => {
    return data ? data.length : 0;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground">Genera y descarga reportes en Excel</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Configuración del Reporte
            </CardTitle>
            <CardDescription>
              Selecciona el tipo de reporte y el rango de fechas (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Reporte</label>
                <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un reporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {getRecordCount()} registros encontrados
                </Badge>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
              
              <Button
                onClick={exportToExcel}
                disabled={isLoading || !data || data.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isLoading ? "Cargando..." : "Descargar Excel"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
            <CardDescription>
              {getReportInfo(selectedReport).description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : data && data.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <div className="text-sm text-muted-foreground mb-2">
                  Mostrando los primeros {Math.min(data.length, 10)} registros de {data.length} total
                </div>
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {data[0] && Object.keys(data[0]).slice(0, 6).map((key) => (
                          <th key={key} className="text-left p-2 font-medium">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((item: any, index) => (
                        <tr key={index} className="border-b">
                          {Object.values(item).slice(0, 6).map((value: any, i) => (
                            <td key={i} className="p-2">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value)
                                : String(value || '').slice(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles para el reporte seleccionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;