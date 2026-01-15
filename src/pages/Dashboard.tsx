import TankIndicator from "@/components/TankIndicator";
import TankConsumptionHistory from "@/components/TankConsumptionHistory";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import ShrinkageReport from "@/components/ShrinkageReport";
import ClientManagement from "@/components/ClientManagement";
import CylindersByCustomer from "@/components/CylindersByCustomer";
import Layout from "@/components/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Panel de Control
          </h1>
        </div>

        {/* Top Section - Tank Indicator & Shrinkage Report */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tank Indicator */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <TankIndicator />
          </div>
          
          {/* Shrinkage Report - Compact Version */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <ShrinkageReport />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Inventario Unificado */}
          <UnifiedInventoryDashboard />
          
          {/* Cilindros por Cliente */}
          <CylindersByCustomer />
          
          {/* Gestión de Asignaciones */}
          <ClientManagement />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
