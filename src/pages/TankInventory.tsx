import { useState } from "react";
import Layout from "@/components/Layout";
import TankIndicator from "@/components/TankIndicator";
import TankEntryForm from "@/components/TankEntryForm";
import TankExitForm from "@/components/TankExitForm";
import TankMovementsHistory from "@/components/TankMovementsHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TankInventory = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEntryAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Control de Inventario - Tanque CO2</h1>
        </div>

        {/* Indicador del tanque siempre visible */}
        <div key={refreshKey}>
          <TankIndicator />
        </div>

        {/* Pestañas para las diferentes funcionalidades */}
        <Tabs defaultValue="entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entry">Registrar Entrada</TabsTrigger>
            <TabsTrigger value="exit">Registrar Salida</TabsTrigger>
            <TabsTrigger value="history">Historial de Movimientos</TabsTrigger>
          </TabsList>

          <TabsContent value="entry" className="space-y-6">
            <TankEntryForm onEntryAdded={handleEntryAdded} />
          </TabsContent>

          <TabsContent value="exit" className="space-y-6">
            <TankExitForm onExitAdded={handleEntryAdded} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TankMovementsHistory />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default TankInventory;