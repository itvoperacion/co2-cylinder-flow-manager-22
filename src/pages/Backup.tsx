import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TABLES = [
  "approval_logs",
  "clients",
  "co2_tank",
  "cylinders",
  "fillings",
  "inventory_adjustments",
  "notifications",
  "system_alerts",
  "tank_movements",
  "tanks",
  "transfers",
  "user_roles",
] as const;

type TableName = typeof TABLES[number];

const escapeSQL = (val: any): string => {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
};

const Backup = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const { toast } = useToast();

  const fetchAllRows = async (table: string) => {
    const allRows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase.from(table as any).select("*").range(from, from + pageSize - 1) as any);
      if (error) throw error;
      if (data && data.length > 0) {
        allRows.push(...data);
        from += pageSize;
        if (data.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return allRows;
  };

  const generateBackup = async () => {
    setIsGenerating(true);
    setStatus("generating");
    setProgress(0);

    try {
      const lines: string[] = [];
      lines.push("-- =============================================");
      lines.push("-- RESPALDO COMPLETO DE BASE DE DATOS");
      lines.push(`-- Proyecto: TransVictoria CO2 Cylinder Manager`);
      lines.push(`-- Fecha: ${new Date().toISOString()}`);
      lines.push("-- =============================================");
      lines.push("");

      // Enum
      lines.push("-- ENUM: app_role");
      lines.push("DO $$ BEGIN");
      lines.push("  CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');");
      lines.push("EXCEPTION WHEN duplicate_object THEN NULL;");
      lines.push("END $$;");
      lines.push("");

      // Table definitions (DDL)
      const tableDDL: Record<string, string> = {
        approval_logs: `CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  comments TEXT,
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
        clients: `CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        co2_tank: `CREATE TABLE IF NOT EXISTS public.co2_tank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_name TEXT NOT NULL DEFAULT 'Tanque Principal CO2',
  capacity NUMERIC NOT NULL DEFAULT 3200,
  current_level NUMERIC NOT NULL DEFAULT 0,
  minimum_threshold NUMERIC NOT NULL DEFAULT 10,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        cylinders: `CREATE TABLE IF NOT EXISTS public.cylinders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL UNIQUE,
  capacity TEXT NOT NULL,
  valve_type TEXT NOT NULL,
  manufacturing_date DATE NOT NULL,
  last_hydrostatic_test DATE NOT NULL,
  next_test_due DATE NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'vacio',
  current_location TEXT NOT NULL DEFAULT 'despacho',
  is_active BOOLEAN NOT NULL DEFAULT true,
  customer_owned BOOLEAN NOT NULL DEFAULT false,
  customer_info TEXT,
  observations TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        fillings: `CREATE TABLE IF NOT EXISTS public.fillings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id),
  tank_id UUID NOT NULL REFERENCES public.co2_tank(id),
  weight_filled NUMERIC NOT NULL,
  operator_name TEXT NOT NULL,
  batch_number TEXT,
  filling_datetime TIMESTAMPTZ DEFAULT now(),
  observations TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  is_reversed BOOLEAN DEFAULT false,
  reversed_by TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  shrinkage_percentage NUMERIC DEFAULT 0.5,
  shrinkage_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        inventory_adjustments: `CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  location TEXT NOT NULL,
  cylinder_id UUID REFERENCES public.cylinders(id),
  quantity_adjusted INTEGER DEFAULT 1,
  previous_status TEXT,
  new_status TEXT,
  previous_location TEXT,
  observations TEXT,
  adjustment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        notifications: `CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        system_alerts: `CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        tank_movements: `CREATE TABLE IF NOT EXISTS public.tank_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.co2_tank(id),
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  operator_name TEXT NOT NULL,
  supplier TEXT,
  observations TEXT,
  reference_filling_id UUID REFERENCES public.fillings(id),
  is_approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_reversed BOOLEAN DEFAULT false,
  reversed_by TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  shrinkage_percentage NUMERIC DEFAULT 1.0,
  shrinkage_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        tanks: `CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_number TEXT NOT NULL UNIQUE,
  capacity_kg NUMERIC NOT NULL,
  current_weight_kg NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_refill_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        transfers: `CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  observations TEXT,
  transfer_number TEXT,
  unit_number TEXT,
  crew_name TEXT,
  zone TEXT,
  delivery_order_number TEXT,
  nota_envio_number TEXT,
  trip_closure BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_reversed BOOLEAN DEFAULT false,
  reversed_by TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
        user_roles: `CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);`,
      };

      // Write DDL
      lines.push("-- =============================================");
      lines.push("-- ESTRUCTURA DE TABLAS (DDL)");
      lines.push("-- =============================================");
      lines.push("");
      for (const table of TABLES) {
        lines.push(`-- Tabla: ${table}`);
        lines.push(tableDDL[table]);
        lines.push("");
      }

      // Write data
      lines.push("-- =============================================");
      lines.push("-- DATOS (DML)");
      lines.push("-- =============================================");
      lines.push("");

      for (let i = 0; i < TABLES.length; i++) {
        const table = TABLES[i];
        setCurrentTable(table);
        setProgress(Math.round(((i) / TABLES.length) * 100));

        const rows = await fetchAllRows(table);

        if (rows.length === 0) {
          lines.push(`-- Tabla: ${table} (sin datos)`);
          lines.push("");
          continue;
        }

        lines.push(`-- Tabla: ${table} (${rows.length} registros)`);

        const columns = Object.keys(rows[0]);

        // Batch inserts in groups of 100
        for (let j = 0; j < rows.length; j += 100) {
          const batch = rows.slice(j, j + 100);
          lines.push(
            `INSERT INTO public.${table} (${columns.map(c => `"${c}"`).join(", ")}) VALUES`
          );
          const valueLines = batch.map((row, idx) => {
            const vals = columns.map(col => {
              const val = row[col];
              if (val !== null && typeof val === "object") {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
              }
              return escapeSQL(val);
            });
            return `  (${vals.join(", ")})${idx < batch.length - 1 ? "," : ""}`;
          });
          lines.push(...valueLines);
          lines.push("ON CONFLICT DO NOTHING;");
          lines.push("");
        }
      }

      setProgress(100);

      // Generate and download
      const content = lines.join("\n");
      const blob = new Blob([content], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_transvictoria_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("done");
      toast({
        title: "Respaldo generado",
        description: `Archivo .sql descargado exitosamente con datos de ${TABLES.length} tablas.`,
      });
    } catch (error: any) {
      console.error("Error generating backup:", error);
      setStatus("error");
      toast({
        title: "Error",
        description: `Error al generar respaldo: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Respaldo de Base de Datos</h1>
          <p className="text-muted-foreground mt-1">
            Genera y descarga un respaldo completo en formato .sql
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Generar Respaldo Completo
            </CardTitle>
            <CardDescription>
              Se exportarán {TABLES.length} tablas: estructura (DDL) y datos (DML) en un solo archivo .sql
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Tablas incluidas:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {TABLES.map(t => (
                  <span key={t} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {status === "generating" && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">
                  Exportando tabla: <strong>{currentTable}</strong> ({progress}%)
                </p>
              </div>
            )}

            {status === "done" && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Respaldo generado y descargado exitosamente</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Error al generar el respaldo</span>
              </div>
            )}

            <Button
              onClick={generateBackup}
              disabled={isGenerating}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Generando respaldo..." : "Descargar Respaldo .sql"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Backup;
