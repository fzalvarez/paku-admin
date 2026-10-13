"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createOrderAdjustment, type PriceCheckOut } from "@/lib/services/petRecords";

const fmtMoney = (n: number) => `S/${n.toFixed(2)}`;

interface PriceCheckDialogProps {
  priceCheck: PriceCheckOut | null;
  onClose: () => void;
}

// Modal de confirmación de cobro adicional cuando POST /pets/{pet_id}/records
// (type=weight_record) devuelve un price_check con diferencia > 0 (si el precio baja no se
// devuelve nada y el modal no se abre). El monto ya quedó guardado en la orden (extra_charge):
// también se puede cobrar después desde el detalle de la orden.
export function PriceCheckDialog({ priceCheck, onClose }: PriceCheckDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; total_snapshot: number } | null>(null);

  const handleConfirm = async () => {
    if (!priceCheck) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrderAdjustment(priceCheck.order_id);
      setSuccess({ id: order.id, total_snapshot: order.total_snapshot });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={!!priceCheck && priceCheck.difference > 0} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diferencia de precio detectada</DialogTitle>
          <DialogDescription>
            El peso registrado sube el precio del servicio. Puedes cobrarlo ahora o después desde el detalle
            de la orden.
          </DialogDescription>
        </DialogHeader>

        {priceCheck && !success && (
          <div className="text-sm text-gray-800 space-y-1">
            <p>
              Precio declarado: <span className="font-medium">{fmtMoney(priceCheck.old_price)}</span>
            </p>
            <p>
              Precio real: <span className="font-medium">{fmtMoney(priceCheck.new_price)}</span>
            </p>
            <p>
              Diferencia a cobrar:{" "}
              <span className="font-semibold text-orange-700">{fmtMoney(priceCheck.difference)}</span>
            </p>
          </div>
        )}

        {success && (
          <p className="text-sm text-green-800 bg-green-100 border border-green-300 rounded px-3 py-2">
            Cobro adicional generado (orden {success.id.slice(0, 8)}… por {fmtMoney(success.total_snapshot)}).
            El cliente verá el saldo y no podrá pedir otro servicio hasta pagarlo.
          </p>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}

        <DialogFooter>
          {success ? (
            <Button onClick={handleClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Generando…" : "Generar cobro"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
