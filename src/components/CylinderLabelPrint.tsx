import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import Barcode from "react-barcode";
import logoTransvictoria from "@/assets/logo-transvictoria.png";

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

  // Generate a unique barcode value from serial number
  const barcodeValue = cylinder.serial_number;

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
          <div
            className="border-2 border-black bg-white text-black print:border-black mx-auto shadow-industrial overflow-hidden"
            style={{
              width: "10cm",
              height: "5cm",
              fontSize: "12px",
              lineHeight: "1.2",
              padding: "3mm 4mm",
            }}
          >
            <div className="h-full flex flex-row items-center gap-2">
              {/* Left: Logo */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "2.2cm" }}>
                <img
                  src={logoTransvictoria}
                  alt="Inversiones TransVictoria"
                  style={{ width: "2cm", height: "auto" }}
                />
              </div>

              {/* Center: Info */}
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                <div className="text-xs font-semibold tracking-wide" style={{ fontSize: "9px" }}>
                  INVERSIONES TRANSVICTORIA
                </div>
                <div className="text-xl font-black tracking-wider">
                  CO2
                </div>
                <div className="text-lg font-bold font-mono tracking-wider">
                  {cylinder.serial_number}
                </div>
                <div className="text-base font-semibold">
                  {cylinder.capacity}
                </div>
              </div>

              {/* Right: Barcode */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "3cm" }}>
                <Barcode
                  value={barcodeValue}
                  width={1}
                  height={50}
                  fontSize={8}
                  margin={0}
                  displayValue={false}
                  format="CODE128"
                />
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
