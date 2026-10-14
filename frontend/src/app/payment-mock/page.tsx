"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { CheckCircle2, XCircle, QrCode, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

function PaymentMockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const amount = searchParams.get("amount");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "FAILED">("IDLE");

  const handleSimulatePayment = async (payStatus: "settlement" | "expire") => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/transactions/webhook", {
        method: "POST",
        body: JSON.stringify({
          order_id: id,
          transaction_status: payStatus,
          fraud_status: "accept",
          is_mock: true
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal memproses simulasi pembayaran");
      }

      if (payStatus === "settlement") {
        setStatus("SUCCESS");
      } else {
        setStatus("FAILED");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-xl shadow-lg border border-gray-200 p-6 text-center">
        
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6 text-black">
          <ShieldCheck size={28} className="text-emerald-600" />
          <span className="text-xl font-black uppercase tracking-tighter">BELLSGALLERY Pay Simulator</span>
        </div>

        {status === "IDLE" && (
          <>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">ID Transaksi</p>
              <p className="font-mono text-sm font-bold text-gray-800 break-all">{id || "-"}</p>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Pembayaran</p>
                <p className="text-2xl font-black text-black">
                  Rp {amount ? Number(amount).toLocaleString("id-ID") : "0"}
                </p>
              </div>
            </div>

            {/* Simulated QRIS Code */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl mb-6 bg-emerald-50/50">
              <QrCode size={120} className="text-black mb-2" />
              <p className="text-xs text-gray-500 font-medium">Scan QRIS / Simulasi Pembayaran Sandbox</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSimulatePayment("settlement")}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                {loading ? "Memproses..." : "Bayar Sekarang (Simulasi QRIS Sukses)"}
              </button>

              <button
                onClick={() => handleSimulatePayment("expire")}
                disabled={loading}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Batalkan Pembayaran
              </button>
            </div>
          </>
        )}

        {status === "SUCCESS" && (
          <div className="py-8">
            <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-black text-black uppercase mb-2">Pembayaran Berhasil!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Status transaksi telah diubah menjadi <span className="font-bold text-emerald-600">PAID</span> di database PostgreSQL.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-black text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
            >
              Kembali ke Katalog Produk
            </button>
          </div>
        )}

        {status === "FAILED" && (
          <div className="py-8">
            <XCircle size={64} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-black uppercase mb-2">Pembayaran Dibatalkan</h2>
            <p className="text-sm text-gray-600 mb-6">
              Status transaksi diubah menjadi <span className="font-bold text-red-600">FAILED</span>.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-black text-white font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
            >
              Kembali ke Toko
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function PaymentMockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Payment Simulator...</div>}>
      <PaymentMockContent />
    </Suspense>
  );
}
