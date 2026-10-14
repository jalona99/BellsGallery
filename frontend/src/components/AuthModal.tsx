"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { X, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AuthView = "login" | "register" | "forgot_password" | "verify_otp";

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login } = useAuth();
  
  const [view, setView] = useState<AuthView>("login");
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Inisialisasi Google Identity Services jika Client ID tersedia
  const initGoogleAuth = () => {
    if (typeof window !== "undefined" && (window as any).google && googleClientId && googleBtnRef.current) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              await handleGoogleSuccess(response.credential);
            }
          },
        });

        googleBtnRef.current.innerHTML = "";
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: view === "register" ? "signup_with" : "signin_with",
          locale: "id",
        });
      } catch (err) {
        console.error("GSI Init error:", err);
      }
    }
  };

  useEffect(() => {
    if (isAuthModalOpen && (view === "login" || view === "register")) {
      // Tunggu hingga elemen DOM tombol tersedia
      const timer = setTimeout(() => {
        initGoogleAuth();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthModalOpen, view, googleClientId]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setError("");
    setSuccessMsg("");
    setView("login");
    closeAuthModal();
  };

  const handleGoogleSuccess = async (credential: string) => {
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Gagal masuk dengan akun Google.");

      login(data.user);
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleClick = () => {
    if (!googleClientId) {
      setError("Google Client ID belum diatur di .env.local. Tambahkan NEXT_PUBLIC_GOOGLE_CLIENT_ID untuk mengaktifkan login Google otomatis.");
      return;
    }
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.prompt();
    }
  };

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const endpoint = view === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = view === "login" ? { email, password } : { name, email, password };
      
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || data.error || "Terjadi kesalahan");

      if (view === "login") {
        login(data.user);
        handleClose();
      } else {
        setSuccessMsg("Registrasi berhasil! Silakan masuk.");
        setView("login");
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiFetch("/api/users/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Terjadi kesalahan");
      
      setSuccessMsg(`Kode OTP telah dikirim ke email ${cleanEmail}. Silakan periksa Kotak Masuk (Inbox) atau folder Spam/Promosi.`);
      setOtp(""); // Kolom dikosongkan agar pengguna wajib melihat dan memasukkan kode dari email
      setView("verify_otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();
      const res = await apiFetch("/api/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Terjadi kesalahan");

      alert("Kata sandi berhasil diubah! Silakan masuk.");
      setView("login");
      setPassword("");
      setOtp("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={handleClose} />
      
      <div className="relative w-full max-w-md bg-white shadow-2xl p-6 md:p-8 transform transition-transform animate-in fade-in zoom-in-95 duration-200">
        <button onClick={handleClose} className="absolute right-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} />
        </button>
        
        {view !== "login" && view !== "register" && (
          <button 
            onClick={() => setView("login")} 
            className="absolute left-4 top-4 p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-center mt-2">
          {view === "login" && "Masuk ke Akun"}
          {view === "register" && "Buat Akun Baru"}
          {view === "forgot_password" && "Lupa Sandi"}
          {view === "verify_otp" && "Verifikasi OTP"}
        </h2>

        {error && <div className="bg-red-50 text-red-600 p-3 mb-4 text-sm border border-red-100 rounded-sm">{error}</div>}
        {successMsg && <div className="bg-green-50 text-green-700 p-3 mb-4 text-sm border border-green-100 rounded-sm">{successMsg}</div>}

        {/* Login / Register Form */}
        {(view === "login" || view === "register") && (
          <form onSubmit={handleLoginRegister} className="flex flex-col gap-4">
            {view === "register" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Nama Lengkap</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-black" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-black" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Password</label>
                {view === "login" && (
                  <button type="button" onClick={() => setView("forgot_password")} className="text-xs font-bold text-gray-500 hover:text-black hover:underline">
                    Lupa sandi?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={view === "register" ? 8 : 1}
                placeholder={view === "register" ? "Min. 8 karakter (huruf & angka)" : "Masukkan kata sandi"}
                className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-black" 
              />
              {view === "register" && (
                <p className="text-[11px] text-gray-500 mt-1">Minimal 8 karakter kombinasi huruf dan angka.</p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 mt-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
              {isLoading ? "Memproses..." : (view === "login" ? "Masuk" : "Daftar")}
            </button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-semibold tracking-wider">Atau</span>
              </div>
            </div>

            {/* Google Authentication Button */}
            <div className="w-full flex justify-center">
              {googleClientId ? (
                <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]"></div>
              ) : (
                <button
                  type="button"
                  onClick={handleCustomGoogleClick}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 px-4 hover:bg-gray-50 transition text-sm font-semibold text-gray-700 rounded-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{view === "register" ? "Daftar dengan Google" : "Masuk dengan Google"}</span>
                </button>
              )}
            </div>

            <div className="mt-2 text-center">
              <p className="text-sm text-gray-500">
                {view === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
                <button type="button" onClick={() => { setView(view === "login" ? "register" : "login"); setError(""); }} className="text-black font-bold hover:underline">
                  {view === "login" ? "Daftar di sini" : "Masuk di sini"}
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Script Google Identity Services */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="afterInteractive" 
          onLoad={initGoogleAuth} 
        />

        {/* Forgot Password Form */}
        {view === "forgot_password" && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 mb-2 text-center">Masukkan email Anda untuk menerima kode verifikasi sandi.</p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-black" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 mt-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
              {isLoading ? "Mengirim..." : "Kirim Kode OTP"}
            </button>
          </form>
        )}

        {/* Verify OTP Form */}
        {view === "verify_otp" && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 mb-2 text-center">Masukkan 6 digit kode OTP yang dikirim ke <span className="font-bold">{email}</span> beserta kata sandi baru Anda.</p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Kode Verifikasi (OTP)</label>
              <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="Contoh: 123456" className="w-full border border-gray-300 p-3 text-sm tracking-widest text-center font-mono focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Password Baru</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-black" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 mt-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
              {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
