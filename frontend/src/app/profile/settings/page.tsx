"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await apiFetch("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        alert("Profile updated successfully. Please login again to reflect changes if necessary.");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    try {
      const res = await apiFetch("/api/users/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        alert("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to change password");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-black mb-6">Profile Settings</h1>
      
      <div className="grid md:grid-cols-2 gap-10 border-t border-gray-200 pt-8">
        {/* Profile Info Form */}
        <div>
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Cannot be changed)</label>
              <input type="email" disabled value={user?.email || ""} className="w-full border border-gray-200 bg-gray-50 p-2 text-sm text-gray-500 rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 p-2 text-sm rounded-sm" />
            </div>
            <button disabled={isUpdatingProfile} type="submit" className="bg-black text-white px-6 py-2 text-sm font-bold w-full hover:bg-gray-800 transition rounded-sm">
              {isUpdatingProfile ? "UPDATING..." : "UPDATE PROFILE"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div>
          <h2 className="text-xl font-bold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 p-2 text-sm rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-gray-300 p-2 text-sm rounded-sm" />
            </div>
            <button disabled={isUpdatingPassword} type="submit" className="border border-black text-black px-6 py-2 text-sm font-bold w-full hover:bg-gray-50 transition rounded-sm">
              {isUpdatingPassword ? "CHANGING..." : "CHANGE PASSWORD"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
