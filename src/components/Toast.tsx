import { FileDown, Redo2, Undo2 } from 'lucide-preact';
import type { Toast as ToastData } from '../app/useToast.ts';

/** The toast; its Undo or Redo only shows while that step is still the next one to take back. */
export function Toast({ toast, canUndo, canRedo, onUndo, onRedo, onAction }: { toast: ToastData; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; onAction: () => void }) {
  return (
    <div class="toast" role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button class="toast-undo" onClick={onAction}>
          <FileDown size={15} /> {toast.action.label}
        </button>
      )}
      {canUndo && (
        <button class="toast-undo" onClick={onUndo}>
          <Undo2 size={15} /> Undo
        </button>
      )}
      {canRedo && (
        <button class="toast-undo" onClick={onRedo}>
          <Redo2 size={15} /> Redo
        </button>
      )}
    </div>
  );
}
