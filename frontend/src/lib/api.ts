/**
 * Utilitas untuk melakukan pemanggilan API dengan menyertakan credentials (cookies).
 * Mendukung penanganan error global seperti HTTP 401 (Unauthorized).
 * 
 * Di browser (klien / handphone): Menggunakan URL relatif ('') sehingga request
 * otomatis melewati Next.js rewrite proxy. Ini menjamin kompatibilitas 100%
 * saat diakses lewat smartphone, IP lokal (LAN), maupun HTTPS Cloudflare Tunnel
 * tanpa kendala Mixed Content, CORS, ataupun kegagalan resolusi localhost.
 */

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  // Memastikan bahwa cookie HTTPOnly selalu dikirimkan
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    // Tangani sesi kedaluwarsa secara terpusat
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  return response;
}
