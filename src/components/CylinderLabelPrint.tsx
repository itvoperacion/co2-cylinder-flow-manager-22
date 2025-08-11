import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer, QrCode } from "lucide-react";

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

  const generateQRData = () => {
    return JSON.stringify({
      id: cylinder.id,
      serial: cylinder.serial_number,
      capacity: cylinder.capacity,
      type: cylinder.valve_type
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Printer className="h-4 w-4" />
          Imprimir Etiqueta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta del Cilindro</DialogTitle>
        </DialogHeader>
        
        <div className="print:block">
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white text-black">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-300 pb-2 mb-3">
              <h2 className="text-lg font-bold">CILINDRO CO2</h2>
              {cylinder.customer_owned && (
                <div className="text-sm text-red-600 font-semibold">PROPIEDAD DEL CLIENTE</div>
              )}
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Serie:</strong>
                <div className="text-lg font-mono">{cylinder.serial_number}</div>
              </div>
              <div>
                <strong>Capacidad:</strong>
                <div className="text-lg">{cylinder.capacity}</div>
              </div>
              <div>
                <strong>Válvula:</strong>
                <div className="capitalize">{cylinder.valve_type}</div>
              </div>
              <div>
                <strong>Estado:</strong>
                <div className="capitalize">{cylinder.current_status}</div>
              </div>
              <div>
                <strong>Fabricación:</strong>
                <div>{new Date(cylinder.manufacturing_date).toLocaleDateString()}</div>
              </div>
              <div>
                <strong>Prueba Hidrostática:</strong>
                <div>
                  {cylinder.next_test_due 
                    ? new Date(cylinder.next_test_due).toLocaleDateString()
                    : 'N/D'
                  }
                </div>
              </div>
            </div>

            {/* Customer Info */}
            {cylinder.customer_owned && cylinder.customer_info && (
              <div className="mt-3 pt-2 border-t border-gray-300">
                <strong className="text-sm">Cliente:</strong>
                <div className="text-sm">{cylinder.customer_info}</div>
              </div>
            )}

            {/* QR Code Placeholder */}
            <div className="mt-3 pt-2 border-t border-gray-300 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="h-4 w-4" />
                <span className="text-xs">Código QR</span>
              </div>
              <div className="border border-gray-400 w-16 h-16 mx-auto flex items-center justify-center text-xs bg-gray-100">
                QR
              </div>
              <div className="text-xs mt-1 break-all">{cylinder.id.slice(0, 8)}...</div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 mt-3 pt-2 border-t border-gray-300">
              <div>Fecha de impresión: {new Date().toLocaleDateString()}</div>
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
      </DialogContent>
    </Dialog>
  );
};

export default CylinderLabelPrint;