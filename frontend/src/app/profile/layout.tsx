"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center animate-pulse">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const isMenuPath = (path: string) => pathname === path;

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <div className="flex flex-col md:flex-row gap-10">
          
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0 flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Membership</h2>
              <ul className="flex flex-col gap-3 text-sm">
                <li>
                  <Link href="/profile" className={`hover:underline ${isMenuPath('/profile') ? 'font-bold' : 'text-gray-600'}`}>
                    Membership barcode
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className={`hover:underline ${isMenuPath('/orders') ? 'font-bold' : 'text-gray-600'}`}>
                    Purchase history
                  </Link>
                </li>
                <li>
                  <Link href="/profile/wishlist" className={`hover:underline ${isMenuPath('/profile/wishlist') ? 'font-bold' : 'text-gray-600'}`}>
                    Wish list
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Profile settings</h2>
              <ul className="flex flex-col gap-3 text-sm">
                <li>
                  <Link href="/profile/settings" className={`hover:underline ${isMenuPath('/profile/settings') ? 'font-bold' : 'text-gray-600'}`}>
                    Profile & Password
                  </Link>
                </li>
                <li>
                  <Link href="/profile/address" className={`hover:underline ${isMenuPath('/profile/address') ? 'font-bold' : 'text-gray-600'}`}>
                    Address book
                  </Link>
                </li>
                {user.role === 'ADMIN' && (
                  <li>
                    <Link href="/admin" className="text-red-600 font-bold hover:underline flex items-center gap-1.5 pt-1">
                      <span>🛡️ Admin Dashboard</span>
                    </Link>
                  </li>
                )}
                <li>
                  <button onClick={logout} className="text-red-500 hover:underline text-left">
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <section className="flex-1">
            {children}
          </section>
        </div>
    </div>
  );
}
