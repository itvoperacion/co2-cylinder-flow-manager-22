import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import ShrinkageReport from "@/components/ShrinkageReport";
import ClientManagement from "@/components/ClientManagement";
import CylindersByCustomer from "@/components/CylindersByCustomer";
import Layout from "@/components/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-4 p-3 md:p-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Panel de Control
          </h1>
        </div>

        {/* Grid Principal - 3 columnas en desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Columna 1: Tanque CO2 */}
          <div className="lg:col-span-1">
            <TankIndicator />
          </div>
          
          {/* Columna 2-3: Merma + Inventario */}
          <div className="lg:col-span-2 space-y-3">
            <ShrinkageReport />
            <UnifiedInventoryDashboard />
          </div>
        </div>

        {/* Segunda fila - Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CylindersByCustomer />
          <ClientManagement />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
