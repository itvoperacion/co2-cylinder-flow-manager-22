import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Plus, Search, MapPin, Edit, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

interface Client {
  id: string;
  name: string;
  zone: string | null;
  is_active: boolean;
  created_at: string;
}

const ZONES = ["ARAGUA", "CARABOBO", "CARACAS", "ORIENTE", "OCCIDENTE"];

const INITIAL_CLIENTS: { name: string; zone: string }[] = [
  // ARAGUA
  { name: "ABEINSISTEMAS MCY", zone: "ARAGUA" },
  { name: "ABEINSISTEMAS LV", zone: "ARAGUA" },
  { name: "CEBRA S.A", zone: "ARAGUA" },
  { name: "CENTRO M. SAN JOSE", zone: "ARAGUA" },
  { name: "CENTRO ESP. MED. TURMERO", zone: "ARAGUA" },
  { name: "CENTRO Q DEL SUR", zone: "ARAGUA" },
  { name: "FIREPROOF", zone: "ARAGUA" },
  { name: "EXTINTORES AMERICA", zone: "ARAGUA" },
  { name: "EXTINTORES AVILA", zone: "ARAGUA" },
  { name: "HOSP C. ARAGUA", zone: "ARAGUA" },
  { name: "MC DONALDS ARC", zone: "ARAGUA" },
  { name: "MC DONALDS LA VICTORIA", zone: "ARAGUA" },
  { name: "MC DONALDS LAS AMERICAS", zone: "ARAGUA" },
  { name: "MC DONALDS LOS AVIADORES", zone: "ARAGUA" },
  { name: "MC DONALDS SIGO MCY", zone: "ARAGUA" },
  { name: "MC DONALDS DELICIAS", zone: "ARAGUA" },
  { name: "PYROSHOW JOSE GONZALEZ", zone: "ARAGUA" },
  { name: "PYROSHOW GUSTAVO GIACOMO", zone: "ARAGUA" },
  { name: "SERVENTEX", zone: "ARAGUA" },
  // CARABOBO
  { name: "NITROX VALENCIA", zone: "CARABOBO" },
  { name: "MC DONALDS AV. CUARICENTENARIO", zone: "CARABOBO" },
  { name: "MC DONALDS EL VIÑEDO", zone: "CARABOBO" },
  { name: "MC DONALDS SAMBIL VLN", zone: "CARABOBO" },
  { name: "MC DONALDS SAN DIEGO", zone: "CARABOBO" },
  { name: "MC DONALDS METROPOLIS", zone: "CARABOBO" },
  { name: "HIDTEC", zone: "CARABOBO" },
  { name: "BIGOT", zone: "CARABOBO" },
  { name: "MC DONALDS PTO CABELLO", zone: "CARABOBO" },
  // CARACAS
  { name: "FEMSA ANTIMANO", zone: "CARACAS" },
  { name: "FEMSA LOS CORTIJOS", zone: "CARACAS" },
  { name: "FUND. BOL. Y MARTI", zone: "CARACAS" },
  { name: "ABEIN SISTEMAS CARACAS", zone: "CARACAS" },
  { name: "HOME CARE", zone: "CARACAS" },
  { name: "CLINICA AMAY", zone: "CARACAS" },
  { name: "INST. CLINICO LA FLORIDA", zone: "CARACAS" },
  { name: "CENTRO MEDICO SIEMPRE 2000", zone: "CARACAS" },
  { name: "GREGOMAR ANTIMANO", zone: "CARACAS" },
  { name: "MC DONALDS SAN ANTONIO", zone: "CARACAS" },
  { name: "ARTUROS CC LA CASCADA", zone: "CARACAS" },
  { name: "MC DONALDS EL RECREO", zone: "CARACAS" },
  { name: "MC DONALDS LA CASCADA", zone: "CARACAS" },
  { name: "MC DONALDS VIZCAYA", zone: "CARACAS" },
  { name: "MC DONALDS SANTA FE", zone: "CARACAS" },
  { name: "MC DONALDS SAN BERNARDINO", zone: "CARACAS" },
  { name: "MC DONALDS CHARALLAVE", zone: "CARACAS" },
  { name: "MC DONALDS CATIA LA MAR", zone: "CARACAS" },
  { name: "MC DONALDS PARAISO 1", zone: "CARACAS" },
  { name: "MC DONALDS PARAISO 2", zone: "CARACAS" },
  { name: "MC DONALDS CARABALLEDA", zone: "CARACAS" },
  { name: "MC DONALDS SAB. GRANDE", zone: "CARACAS" },
  { name: "MC DONALDS CCT", zone: "CARACAS" },
  { name: "MC DONALDS MILENIUN MALL", zone: "CARACAS" },
  { name: "MC DONALDS CHACAITO", zone: "CARACAS" },
  { name: "MC DONALDS SAMBIL CANDL.", zone: "CARACAS" },
  { name: "MC DONALDS SAMBIL CHACAO", zone: "CARACAS" },
  { name: "MC DONALDS PARQUE CCS", zone: "CARACAS" },
  { name: "MC DONALDS LA TRINIDAD", zone: "CARACAS" },
  { name: "MC DONALDS LA BOYERA", zone: "CARACAS" },
  { name: "MC DONALDS LA CALIFORNIA", zone: "CARACAS" },
  { name: "MC DONALDS LIDER MALL", zone: "CARACAS" },
  { name: "MC DONALDS LAS MERCEDES", zone: "CARACAS" },
  { name: "MC DONALDS EL TOLON", zone: "CARACAS" },
  { name: "MC DONALDS P LOS ILUSTRES", zone: "CARACAS" },
  { name: "MC DONALDS LA CANDELARIA", zone: "CARACAS" },
  { name: "MC DONALDS LA CASTELLANA", zone: "CARACAS" },
  { name: "MC DONALDS LA URBINA", zone: "CARACAS" },
  { name: "MC DONALDS AV BARALT", zone: "CARACAS" },
  { name: "MC DONALDS LOS TEQUES", zone: "CARACAS" },
  { name: "MC DONALDS BUENAVENTURA", zone: "CARACAS" },
  // ORIENTE
  { name: "MC DONALDS REGINA PLAZA", zone: "ORIENTE" },
  { name: "MC DONALDS INTERCOMUNAL", zone: "ORIENTE" },
  { name: "MC DONALDS PLAZA MAYOR", zone: "ORIENTE" },
  { name: "MC DONALDS CUMANA", zone: "ORIENTE" },
  { name: "MC DONALDS MARGARITA", zone: "ORIENTE" },
  { name: "MC DONALDS ORINOKIA", zone: "ORIENTE" },
  { name: "MC DONALDS ALTA VISTA", zone: "ORIENTE" },
  { name: "MC DONALDS CDAD BOLIVAR", zone: "ORIENTE" },
  { name: "MC DONALDS EL TIGRE", zone: "ORIENTE" },
  { name: "MC DONALDS MATURIN", zone: "ORIENTE" },
  { name: "MC DONALDS MARGARITA LOS ROBLES", zone: "ORIENTE" },
  { name: "FEMSA BARCELONA", zone: "ORIENTE" },
  // OCCIDENTE
  { name: "MC DONALDS GALERIAS MCBO", zone: "OCCIDENTE" },
  { name: "MC DONALDS DELICIAS NORTE", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAN FRANCISCO", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAMBIL MCBO", zone: "OCCIDENTE" },
  { name: "MC DONALDS LAGO MALL", zone: "OCCIDENTE" },
  { name: "MC DONALDS CDAD OJEDA", zone: "OCCIDENTE" },
  { name: "MC DONALDS METROPOLIS BQTO", zone: "OCCIDENTE" },
  { name: "MC DONALDS BQTO AV CENTRO", zone: "OCCIDENTE" },
  { name: "MC DONALDS BQTO AV LARA", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAMBIL BQTO", zone: "OCCIDENTE" },
  { name: "MC DONALDS MAKRO BQTO", zone: "OCCIDENTE" },
  { name: "MC DONALDS MERIDA", zone: "OCCIDENTE" },
  { name: "MC DONALDS MERIDA 57", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAMBIL S. CRISTOBAL", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAN CRISTOBAL", zone: "OCCIDENTE" },
  { name: "MC DONLADS ROTARIA S. CRISTOBAL", zone: "OCCIDENTE" },
  { name: "MC DONALDS BARINAS", zone: "OCCIDENTE" },
  { name: "MC DONALDS BARINAS 2", zone: "OCCIDENTE" },
  { name: "MC DONALDS ARAURE", zone: "OCCIDENTE" },
  { name: "MC DONALDS SAN FELIPE", zone: "OCCIDENTE" },
  { name: "MC DONALDS TRUJILLO", zone: "OCCIDENTE" },
  { name: "FEMSA SAN CRISTOBAL", zone: "OCCIDENTE" },
  { name: "INV A QUE LUIS", zone: "OCCIDENTE" },
  { name: "EXTINTORES PROINCA", zone: "OCCIDENTE" },
];

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState("");
  const [formZone, setFormZone] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      setClients((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const seedClients = async () => {
    setSeeding(true);
    try {
      // Get existing client names
      const { data: existing } = await supabase.from('clients').select('name');
      const existingNames = new Set((existing as any[])?.map(c => c.name) || []);

      const toInsert = INITIAL_CLIENTS.filter(c => !existingNames.has(c.name));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('clients').insert(toInsert as any);
        if (error) throw error;
        toast.success(`${toInsert.length} clientes agregados`);
      }

      // Update zones for existing clients that don't have one
      for (const c of INITIAL_CLIENTS) {
        if (existingNames.has(c.name)) {
          await supabase.from('clients').update({ zone: c.zone } as any).eq('name', c.name);
        }
      }

      toast.success('Zonas actualizadas correctamente');
      fetchClients();
    } catch (error) {
      console.error('Error seeding clients:', error);
      toast.error('Error al cargar clientes iniciales');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({ name: formName.trim().toUpperCase(), zone: formZone || null } as any)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({ name: formName.trim().toUpperCase(), zone: formZone || null } as any);
        if (error) throw error;
        toast.success('Cliente creado');
      }
      setDialogOpen(false);
      setEditingClient(null);
      setFormName("");
      setFormZone("");
      fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (client: Client) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active } as any)
        .eq('id', client.id);
      if (error) throw error;
      toast.success(client.is_active ? 'Cliente desactivado' : 'Cliente activado');
      fetchClients();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormZone(client.zone || "");
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setFormName("");
    setFormZone("");
    setDialogOpen(true);
  };

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = zoneFilter === "all" || c.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  const zoneCounts = ZONES.reduce((acc, z) => {
    acc[z] = clients.filter(c => c.zone === z && c.is_active).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Clientes
            </h1>
            <p className="text-muted-foreground text-sm">
              {clients.filter(c => c.is_active).length} clientes activos de {clients.length} total
            </p>
          </div>
          <div className="flex gap-2">
            {clients.filter(c => c.zone).length === 0 && (
              <Button variant="outline" onClick={seedClients} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Cargar Clientes Iniciales
              </Button>
            )}
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Zone Summary */}
        <div className="flex flex-wrap gap-2">
          {ZONES.map(z => (
            <Badge
              key={z}
              variant={zoneFilter === z ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setZoneFilter(zoneFilter === z ? "all" : z)}
            >
              <MapPin className="h-3 w-3 mr-1" />
              {z} ({zoneCounts[z] || 0})
            </Badge>
          ))}
          {zoneFilter !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setZoneFilter("all")}>
              Mostrar Todos
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        {client.zone ? (
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.zone}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin zona</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.is_active ? "default" : "secondary"}>
                          {client.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={client.is_active}
                            onCheckedChange={() => toggleActive(client)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre del Cliente *</Label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <Label>Zona</Label>
                <Select value={formZone} onValueChange={setFormZone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.map(z => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingClient ? "Guardar Cambios" : "Crear Cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Clients;
