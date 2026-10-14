"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Address {
  id: string;
  recipientName: string;
  phoneNumber: string;
  fullAddress: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    recipientName: '',
    phoneNumber: '',
    fullAddress: '',
    city: '',
    postalCode: '',
    isDefault: false
  });

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsAdding(false);
        setFormData({ recipientName: '', phoneNumber: '', fullAddress: '', city: '', postalCode: '', isDefault: false });
        fetchAddresses();
      } else {
        alert("Gagal menyimpan alamat");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus alamat ini?")) return;
    try {
      const res = await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-black mb-6">Address book</h1>
      <p className="text-sm text-gray-600 mb-8 pb-4 border-b border-gray-200">Up to 10 addresses can be stored.</p>

      {isAdding ? (
        <form onSubmit={handleSaveAddress} className="max-w-md bg-gray-50 p-6 rounded-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Register new address</h2>
          <div className="space-y-4">
            <input required placeholder="Recipient Name" value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} className="w-full border p-2 text-sm" />
            <input required placeholder="Phone Number" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border p-2 text-sm" />
            <textarea required placeholder="Full Address" value={formData.fullAddress} onChange={e => setFormData({...formData, fullAddress: e.target.value})} className="w-full border p-2 text-sm" rows={3}></textarea>
            <div className="flex gap-4">
              <input required placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full border p-2 text-sm" />
              <input required placeholder="Postal Code" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} className="w-full border p-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} />
              Set as default shipping address
            </label>
          </div>
          <div className="flex gap-4 mt-6">
            <button type="submit" className="bg-black text-white px-6 py-2 text-sm font-bold w-full hover:bg-gray-800 transition">SAVE</button>
            <button type="button" onClick={() => setIsAdding(false)} className="border border-black px-6 py-2 text-sm font-bold w-full hover:bg-gray-100 transition">CANCEL</button>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Membership address</h2>
            {isLoading ? (
              <p className="text-sm">Loading...</p>
            ) : addresses.length === 0 ? (
              <div className="text-sm text-gray-700">
                <p className="mb-2">There is no registered shipping address.</p>
                <p className="mb-4">Name, address and phone number registration are required for online orders.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map(addr => (
                  <div key={addr.id} className="border border-gray-200 p-4 rounded-sm flex justify-between items-start">
                    <div className="text-sm">
                      {addr.isDefault && <span className="bg-gray-200 px-2 py-1 text-xs font-bold mr-2">DEFAULT</span>}
                      <p className="font-bold mt-2">{addr.recipientName}</p>
                      <p>{addr.phoneNumber}</p>
                      <p>{addr.fullAddress}</p>
                      <p>{addr.city}, {addr.postalCode}</p>
                    </div>
                    <button onClick={() => handleDelete(addr.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-8">
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-black text-white px-8 py-3 text-sm font-bold hover:bg-gray-800 transition-colors rounded-full"
            >
              REGISTER A NEW ADDRESS
            </button>
          </div>
        </>
      )}
    </div>
  );
}
