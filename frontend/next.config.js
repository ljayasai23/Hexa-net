/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 http://192.168.43.108:5000 http://192.168.43.108:3000 https:;`,
          },
        ],
      },
    ];
  }
  
  // Production CSP
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:;`,
        },
      ],
    },
  ];
}
// ... (rest of file) ...
}
module.exports = nextConfig
