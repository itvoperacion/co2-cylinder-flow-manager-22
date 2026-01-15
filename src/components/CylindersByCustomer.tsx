import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package } from "lucide-react";

interface CustomerCylinders {
  customer_name: string;
  total_count: number;
  capacity_breakdown: { [capacity: string]: number };
}

const CylindersByCustomer = () => {
  const [customerData, setCustomerData] = useState<CustomerCylinders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerCylinders();
    const channel = supabase.channel('cylinders-customer-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cylinders' }, () => fetchCustomerCylinders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCustomerCylinders = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('customer_info, capacity')
        .eq('is_active', true)
        .not('customer_info', 'is', null);

      if (error) throw error;

      const customerMap: { [key: string]: { total: number; capacities: { [capacity: string]: number } } } = {};

      data?.forEach(cylinder => {
        const customer = cylinder.customer_info || 'Sin Cliente';
        const capacity = cylinder.capacity || 'N/A';
        
        if (!customerMap[customer]) {
          customerMap[customer] = { total: 0, capacities: {} };
        }
        customerMap[customer].total++;
        if (!customerMap[customer].capacities[capacity]) {
          customerMap[customer].capacities[capacity] = 0;
        }
        customerMap[customer].capacities[capacity]++;
      });

      const customerArray = Object.entries(customerMap)
        .map(([customer, data]) => ({
          customer_name: customer,
          total_count: data.total,
          capacity_breakdown: data.capacities
        }))
        .sort((a, b) => b.total_count - a.total_count);

      setCustomerData(customerArray);
    } catch (error) {
      console.error('Error fetching customer cylinders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Cilindros por Cliente</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {customerData.length} clientes
          </Badge>
        </div>

        {/* Lista de clientes */}
        {customerData.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No hay cilindros asignados a clientes
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {customerData.map((customer) => (
              <div
                key={customer.customer_name}
                className="bg-muted/30 rounded-lg p-2 border border-border/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate max-w-[60%]">
                    {customer.customer_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-bold">{customer.total_count}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(customer.capacity_breakdown).map(([capacity, count]) => (
                    <Badge key={capacity} variant="secondary" className="text-xs py-0">
                      {capacity}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CylindersByCustomer;
