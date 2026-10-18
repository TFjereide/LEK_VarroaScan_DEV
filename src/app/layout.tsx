import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";
import { AuthProvider } from "./auth-provider";
import { getCurrentUser, isAdmin } from "@/lib/auth/actions.server";
// import { getAuthorizedUserActions } from "@/lib/auth/roles.server";
import { getRoleAuthorizedActions, nilAuthorizedUserActions } from "@/lib/auth/roles.client";
import { NullUser } from "@/lib/auth/user";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const basePath = (() => {
  const envBase = process.env.NEXT_PUBLIC_BASE_PATH;
  if (envBase && envBase !== "/" && envBase !== "") return envBase;
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (process.env.GITHUB_PAGES === "true" && repo) return `/${repo}`;
  return "";
})();
const manifestPath = basePath
  ? `${basePath.replace(/\/$/, "")}/manifest.webmanifest`
  : "/manifest.webmanifest";

export const metadata: Metadata = {
  title: "LEK-VarroaScan™️",
  description: "Datainnsamling av bunnbrett-bilder for varroa",
  manifest: manifestPath,
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF;
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const isStaging =
    appEnv === "staging" || vercelBranch === "staging";
  const shortSha = vercelSha ? vercelSha.slice(0, 7) : null;

  // User auth is used all over the app, so here it is drilled into the 
  // authprovider to make it available everywhere.
  const { user } = await getCurrentUser();
  const _isAdmin  = user?.role == "FAGANSVARLIG" || user?.role == "STUDENT" || user?.role == "SUPERADMIN";
  const _authedActions  = user && user.role ? getRoleAuthorizedActions(user, user.role) : nilAuthorizedUserActions();

  return (
    <html
      lang="no"
      data-build={shortSha ?? undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">

        {isStaging ? (
          <div className="sticky top-0 z-50 border-b border-red-900 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
            STAGING (ikke ekte app){shortSha ? ` • ${shortSha}` : ""}
          </div>
        ) : null}

        <AuthProvider user={user ? user : NullUser} authedActions={_authedActions} isAdmin={_isAdmin}>
          {children}
        </AuthProvider>

        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
