import TankIndicator from "@/components/TankIndicator";
import CylinderStats from "@/components/CylinderStats";
import CylinderInventoryByLocation from "@/components/CylinderInventoryByLocation";
import ShrinkageReport from "@/components/ShrinkageReport";
import Layout from "@/components/Layout";

const Dashboard = () => {

  return (
    <Layout>
      <div className="space-y-8">
        {/* Tank Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TankIndicator />
        </div>

        {/* Cylinder Statistics */}
        <CylinderStats />

        {/* New Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cylinder Inventory by Location */}
          <CylinderInventoryByLocation />
          
          {/* Shrinkage Report */}
          <ShrinkageReport />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;