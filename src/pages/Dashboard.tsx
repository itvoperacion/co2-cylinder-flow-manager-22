import TankIndicator from "@/components/TankIndicator";
import TankConsumptionHistory from "@/components/TankConsumptionHistory";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import ShrinkageReport from "@/components/ShrinkageReport";
import ClientManagement from "@/components/ClientManagement";
import CylindersByCustomer from "@/components/CylindersByCustomer";
import Layout from "@/components/Layout";
const Dashboard = () => {
  return <Layout>
      <div className="space-y-8 p-6">
        {/* Tank Indicator - Enhanced contrast */}
        <div className="bg-card rounded-xl p-2 border-2 border-border shadow-industrial py-0">
          <TankIndicator />
        </div>

        {/* Tank Consumption History Chart */}
        

        {/* Cylinder Statistics - Enhanced contrast */}
        

        {/* Reporte de Merma - Enhanced contrast */}
        <div className="bg-card rounded-xl p-6 border-2 border-border shadow-industrial px-[11px] py-0">
          <ShrinkageReport />
        </div>

        {/* Inventario Unificado - Componente principal */}
        <UnifiedInventoryDashboard />
        
        {/* Cilindros por Cliente y Capacidad */}
        <CylindersByCustomer />
        
        {/* Gestión de Asignaciones */}
        <ClientManagement />
      </div>
    </Layout>;
};
export default Dashboard;