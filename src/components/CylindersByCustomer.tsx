import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Package, Gauge } from "lucide-react";

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
    
    const channel = supabase
      .channel('cylinders-customer-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cylinders'
        },
        () => {
          fetchCustomerCylinders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCustomerCylinders = async () => {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select('customer_info, capacity')
        .eq('is_active', true)
        .not('customer_info', 'is', null);

      if (error) throw error;

      const customerMap: { 
        [key: string]: { 
          total: number; 
          capacities: { [capacity: string]: number } 
        } 
      } = {};

      data?.forEach(cylinder => {
        const customer = cylinder.customer_info || 'Sin Cliente';
        const capacity = cylinder.capacity || 'No especificada';
        
        if (!customerMap[customer]) {
          customerMap[customer] = { total: 0, capacities: {} };
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
    return (
      <Card className="shadow-industrial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary animate-pulse" />
            Cilindros por Cliente y Capacidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-industrial">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Cilindros por Cliente y Capacidad
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customerData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay cilindros asignados a clientes
          </p>
        ) : (
          <div className="space-y-4">
            {customerData.map((customer) => (
              <div
                key={customer.customer_name}
                className="bg-gradient-to-r from-background to-muted/30 rounded-lg p-5 border border-border hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground text-lg">
                        {customer.customer_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Total: {customer.total_count} cilindros
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    <Package className="h-3 w-3 mr-1" />
                    {customer.total_count}
                  </Badge>
                </div>

                {Object.keys(customer.capacity_breakdown).length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Desglose por Capacidad
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(customer.capacity_breakdown).map(([capacity, count]) => (
                          <div
                            key={capacity}
                            className="bg-background/50 rounded-md p-3 border border-border/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${getCapacityColor(capacity)}`}>
                                {capacity}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {count} {count === 1 ? 'cilindro' : 'cilindros'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CylindersByCustomer;
