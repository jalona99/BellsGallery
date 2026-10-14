"use client";

import { useAuth } from "@/context/AuthContext";
import QRCode from "react-qr-code";

export default function MembershipBarcodePage() {
  const { user } = useAuth();
  
  if (!user) return null;

  const membershipId = user.id;

  return (
    <div className="w-full">
      <div className="border border-gray-200 rounded-sm p-8 flex flex-col items-center justify-center mb-10 bg-white">
        <p className="text-sm text-gray-500 font-medium mb-6">Membership barcode</p>
        <div className="bg-white p-4">
          <QRCode 
            value={membershipId} 
            size={180}
            level="M"
          />
        </div>
        <p className="text-xs text-gray-400 mt-4 font-mono tracking-widest">{membershipId.split("-")[0].toUpperCase()}</p>
        <p className="text-xs text-gray-500 mt-6 text-center max-w-xs">
          Please show your membership barcode at the cashier when you purchase items.
        </p>
      </div>
    </div>
  );
}
