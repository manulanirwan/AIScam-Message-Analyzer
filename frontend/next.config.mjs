/** @type {import('next').NextConfig} */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? "/AIScam-Message-Analyzer" : "";
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
