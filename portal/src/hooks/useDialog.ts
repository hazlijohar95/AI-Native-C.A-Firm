import { useState, useCallback } from "react";

/**
 * Hook for managing dialog state with optional associated data.
 * Eliminates repetitive dialog state management patterns.
 *
 * @example
 * ```tsx
 * // Simple dialog (no data)
 * const createDialog = useDialog();
 * <Button onClick={() => createDialog.open()}>Create New</Button>
 * <Dialog open={createDialog.isOpen} onOpenChange={(open) => !open && createDialog.close()}>
 *   ...
 * </Dialog>
 *
 * // Dialog with data (e.g., edit dialog)
 * const editDialog = useDialog<User>();
 * <Button onClick={() => editDialog.open(user)}>Edit</Button>
 * <Dialog open={editDialog.isOpen}>
 *   <EditForm user={editDialog.data!} onClose={editDialog.close} />
 * </Dialog>
 * ```
 */
export function useDialog<T = void>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((value?: T) => {
    if (value !== undefined) {
      setData(value as T);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow for exit animations
    setTimeout(() => setData(null), 150);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    /** For use with Dialog's onOpenChange prop */
    setIsOpen: (open: boolean) => {
      if (!open) close();
      else setIsOpen(true);
    },
  };
}
