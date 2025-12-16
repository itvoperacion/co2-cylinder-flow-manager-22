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
        {/* Tank Indicator y Reporte de Merma - Side by side */}
        <div className="flex gap-4">
          <div className="bg-card rounded-xl p-1 border border-border shadow-industrial py-0 w-1/2 max-h-[200px] overflow-hidden">
            <TankIndicator />
          </div>
          
          <div className="rounded-xl p-1 border-2 shadow-industrial px-1 py-1 bg-primary-foreground border-secondary w-[60%] text-[50%] scale-75 origin-top-left max-h-[150px] overflow-hidden">
            <ShrinkageReport />
          </div>
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