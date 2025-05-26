/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@padel-parrot/config', '@padel-parrot/shared'],
  images: {
    domains: [],
  },
}

module.exports = nextConfig 