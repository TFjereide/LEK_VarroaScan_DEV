// "use client";
import { getAppVersion } from "@/lib/appVersion";
import { useAuth } from "@/app/auth-provider";
import { logOut } from "@/lib/auth/actions";
import { PropsWithChildren } from "react";
import { useRouter } from "next/navigation";

type CommonHeaderProps = {
  url: string | null;
  label: string;
  isOnline: boolean;
};

export function CommonHeader({url, label, isOnline, children} : PropsWithChildren<CommonHeaderProps>){

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const appVersion = getAppVersion()
    const router = useRouter()

    const onBack = () => {
        if (url) {
          router.push(url);
          return;
        }
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
    };

    const onLogOut = () =>{
      logOut();
    }
    
    const {user, isAdmin} = useAuth();

    return (
    <header className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between">
          {url ? (
            <a
              href={url}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
            >
              ← {label}
            </a>
          ) : 
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
            >
              ← Tilbake
            </button>
          }
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <span className="text-sm font-semibold">VS</span>
            </div>
            <div>
              <div className="text-lg font-semibold leading-6">
                LEK-VarroaScan
              </div>
              <div className="text-xs text-zinc-400">v{appVersion}</div>
            </div>
          </div>
          
          {children}

          {user.role === "NONE" ?
          <a
            href={`${basePath}/login`}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 active:opacity-90"
          >
            logg inn
          </a>
          :<button
            onClick={()=>onLogOut()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 active:opacity-90"
          >
            logg ut
          </button>}
          {isAdmin ?
          <a
            href={`${basePath}/admin/`}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 active:opacity-90"
          >
            🎓 Admin
          </a>
          :null}
        </div>

        {!isOnline ? (
          <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            Du er offline. Opplasting krever nett.
          </div>
        ) : null}

    </header>
    )
}