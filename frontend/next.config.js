/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    // In production (Vercel), this should be set to https://hexa-net.onrender.com/api
    // In local development, it will default to http://localhost:5000/api
    // But we allow it to be empty so dynamic detection can work for WiFi access
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

async headers() {
  // For development, allow connections to localhost and your VM IP
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Explicitly allow localhost and your VM IP address (192.168.43.108)
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow connections to localhost and your specific VM IP
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 http://192.168.43.26:5000 http://192.168.43.26:3000 https:;`,
          },
        ],
      },
    ];
  }
  
  // Production CSP - Allow connections to Render backend
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          // Allow connections to Render backend (https://hexa-net.onrender.com)
          value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://hexa-net.onrender.com https:;`,
        },
      ],
    },
  ];
}
// ... (rest of file) ...
}
module.exports = nextConfig
