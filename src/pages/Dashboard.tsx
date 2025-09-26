import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import ShrinkageReport from "@/components/ShrinkageReport";
import ClientManagement from "@/components/ClientManagement";
import Layout from "@/components/Layout";
const Dashboard = () => {
  return <Layout>
      <div className="space-y-8 p-6">
        {/* Tank Indicator - Enhanced contrast */}
        <div className="bg-card rounded-xl p-6 border-2 border-border shadow-industrial py-0">
          <TankIndicator />
        </div>

        {/* Cylinder Statistics - Enhanced contrast */}
        <div className="bg-card rounded-xl p-6 border-2 border-border shadow-industrial py-0 px-[29px]">
          <CylinderStats />
        </div>

        {/* Reporte de Merma - Enhanced contrast */}
        <div className="bg-card rounded-xl p-6 border-2 border-border shadow-industrial px-[11px] py-0">
          <ShrinkageReport />
        </div>

        {/* Inventario Unificado - Componente principal */}
        <UnifiedInventoryDashboard />
        
        {/* Gestión de Clientes */}
        <ClientManagement />
      </div>
    </Layout>;
};
export default Dashboard;