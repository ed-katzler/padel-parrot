/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@padel-parrot/config', '@padel-parrot/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rrplznheygdwxkpysevj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig 