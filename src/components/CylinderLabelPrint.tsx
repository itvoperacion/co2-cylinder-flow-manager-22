import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

interface Cylinder {
  id: string;
  serial_number: string;
  capacity: string;
  valve_type: string;
  manufacturing_date: string;
  next_test_due: string | null;
  current_status: string;
  current_location: string;
  customer_owned?: boolean;
  customer_info?: string | null;
}

interface CylinderLabelPrintProps {
  cylinder: Cylinder;
}

const CylinderLabelPrint = ({ cylinder }: CylinderLabelPrintProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Printer className="h-4 w-4" />
          Imprimir Etiqueta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiqueta del Cilindro</DialogTitle>
        </DialogHeader>
        
        <div className="print:block">
          {/* Label with exact dimensions: 10cm x 5cm (378px x 189px at 96 DPI) */}
          <div 
            className="border-2 border-black bg-white text-black print:border-black"
            style={{ 
              width: '10cm', 
              height: '5cm',
              fontSize: '12px',
              lineHeight: '1.2',
              padding: '4mm'
            }}
          >
            {/* Content arranged in compact layout */}
            <div className="h-full flex flex-col justify-center">
              {/* Serial Number - Main focus */}
              <div className="text-center mb-1">
                <div className="text-lg font-bold font-mono tracking-wider">
                  {cylinder.serial_number}
                </div>
              </div>
              
              {/* CO2 Label */}
              <div className="text-center mb-1">
                <div className="text-xl font-bold">
                  CO2
                </div>
              </div>
              
              {/* Capacity */}
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {cylinder.capacity}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4 print:hidden">
          <Button variant="outline" onClick={() => window.close()}>
            Cancelar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        
        {/* Print-specific styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: 10cm 5cm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
          `
        }} />
      </DialogContent>
    </Dialog>
  );
};

export default CylinderLabelPrint;