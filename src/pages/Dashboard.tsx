import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import Layout from "@/components/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-8 p-6">
        {/* Tank Indicator - Mejorado visualmente */}
        <div className="bg-gradient-to-r from-background to-muted/30 rounded-xl p-6 border border-border/50 shadow-industrial">
          <TankIndicator />
        </div>

        {/* Cylinder Statistics - Mejorado visualmente */}
        <div className="bg-gradient-to-r from-background to-muted/30 rounded-xl p-6 border border-border/50 shadow-industrial">
          <CylinderStats />
        </div>

        {/* Inventario Unificado - Componente principal */}
        <UnifiedInventoryDashboard />
      </div>
    </Layout>
  );
};

export default Dashboard;