import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Package, Gauge } from "lucide-react";
interface CustomerCylinders {
  customer_name: string;
  total_count: number;
  capacity_breakdown: {
    [capacity: string]: number;
  };
}
const CylindersByCustomer = () => {
  const [customerData, setCustomerData] = useState<CustomerCylinders[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCustomerCylinders();
    const channel = supabase.channel('cylinders-customer-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'cylinders'
    }, () => {
      fetchCustomerCylinders();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchCustomerCylinders = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('cylinders').select('customer_info, capacity').eq('is_active', true).not('customer_info', 'is', null);
      if (error) throw error;
      const customerMap: {
        [key: string]: {
          total: number;
          capacities: {
            [capacity: string]: number;
          };
        };
      } = {};
      data?.forEach(cylinder => {
        const customer = cylinder.customer_info || 'Sin Cliente';
        const capacity = cylinder.capacity || 'No especificada';
        if (!customerMap[customer]) {
          customerMap[customer] = {
            total: 0,
            capacities: {}
          };
        }
        customerMap[customer].total++;
        if (!customerMap[customer].capacities[capacity]) {
          customerMap[customer].capacities[capacity] = 0;
        }
        customerMap[customer].capacities[capacity]++;
      });
      const customerArray = Object.entries(customerMap).map(([customer, data]) => ({
        customer_name: customer,
        total_count: data.total,
        capacity_breakdown: data.capacities
      }));
      customerArray.sort((a, b) => b.total_count - a.total_count);
      setCustomerData(customerArray);
    } catch (error) {
      console.error('Error fetching customer cylinders:', error);
    } finally {
      setLoading(false);
    }
  };
  const getCapacityColor = (capacity: string) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
    const index = capacity.length % colors.length;
    return colors[index];
  };
  if (loading) {
    return <Card className="shadow-industrial">
        
        
      </Card>;
  }
  return <Card className="shadow-industrial">
      
      
    </Card>;
};
export default CylindersByCustomer;