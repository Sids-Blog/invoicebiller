/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow html2pdf.js and exceljs to work in Next.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle canvas on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
