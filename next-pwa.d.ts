declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
  }

  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}
