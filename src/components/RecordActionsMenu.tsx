import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { RecordActionsDialog } from "./RecordActionsDialog";
import { RecordEditDialog } from "./RecordEditDialog";

interface RecordActionsMenuProps {
  recordId: string;
  tableName: string;
  recordData: any;
  editFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'textarea' | 'select';
    options?: string[];
    readonly?: boolean;
  }>;
  onSuccess?: () => void;
  showApproval?: boolean;
}

export const RecordActionsMenu = ({
  recordId,
  tableName,
  recordData,
  editFields,
  onSuccess,
  showApproval = false
}: RecordActionsMenuProps) => {
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: 'edit' | 'delete' | 'approve' | 'reject';
  }>({ isOpen: false, action: 'edit' });

  const [editDialog, setEditDialog] = useState(false);

  const handleOpenAction = (action: 'edit' | 'delete' | 'approve' | 'reject') => {
    if (action === 'edit' && editFields) {
      setEditDialog(true);
    } else {
      setActionDialog({ isOpen: true, action });
    }
  };

  const handleClose = () => {
    setActionDialog({ isOpen: false, action: 'edit' });
    setEditDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {editFields && (
            <>
              <DropdownMenuItem onClick={() => handleOpenAction('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {showApproval && (
            <>
              <DropdownMenuItem onClick={() => handleOpenAction('approve')}>
                <CheckCircle className="mr-2 h-4 w-4 text-success" />
                Aprobar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenAction('reject')}>
                <XCircle className="mr-2 h-4 w-4 text-warning" />
                Rechazar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem 
            onClick={() => handleOpenAction('delete')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editFields && (
        <RecordEditDialog
          isOpen={editDialog}
          onClose={handleClose}
          recordId={recordId}
          tableName={tableName}
          fields={editFields}
          currentData={recordData}
          onSuccess={onSuccess}
        />
      )}

      <RecordActionsDialog
        isOpen={actionDialog.isOpen}
        onClose={handleClose}
        recordId={recordId}
        tableName={tableName}
        action={actionDialog.action}
        recordData={recordData}
        onSuccess={onSuccess}
      />
    </>
  );
};