import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import UnifiedInventoryDashboard from "@/components/UnifiedInventoryDashboard";
import ShrinkageReport from "@/components/ShrinkageReport";
import Layout from "@/components/Layout";
const Dashboard = () => {
  return <Layout>
      <div className="space-y-8 p-6">
        {/* Tank Indicator - Mejorado visualmente */}
        <div className="bg-gradient-to-r from-background to-muted/30 rounded-xl p-6 border border-border/50 shadow-industrial py-0">
          <TankIndicator />
        </div>

        {/* Cylinder Statistics - Mejorado visualmente */}
        <div className="bg-gradient-to-r from-background to-muted/30 rounded-xl p-6 border border-border/50 shadow-industrial py-0 px-[29px]">
          <CylinderStats />
        </div>

        {/* Reporte de Merma - Indicador detallado */}
        <div className="bg-gradient-to-r from-background to-muted/30 rounded-xl p-6 border border-border/50 shadow-industrial px-[11px] py-0">
          <ShrinkageReport />
        </div>

        {/* Inventario Unificado - Componente principal */}
        <UnifiedInventoryDashboard />
      </div>
    </Layout>;
};
export default Dashboard;