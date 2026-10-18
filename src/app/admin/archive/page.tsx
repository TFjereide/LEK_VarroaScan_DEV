"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  appendAdminContext,
  getAdminReturnInfo,
} from "@/lib/adminNavigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { type AuthorizedUserActions } from "@/lib/auth/roles.types";
import { getAuthorizedUserActions } from "@/lib/auth/roles.server";
import {
  formatWorkerLabel,
  getDisplayNameFromEmail,
  getRoleLabel,
  getStatusUi,
  getTypeLabel,
  type VarroaSubmissionRecord,
} from "@/lib/varroaWorkflow";
import { useAuth } from "@/app/auth-provider";
import { fetchSubmissions } from "@/lib/varroaScanDb";
import { getClient } from "@/lib/auth/supabase.client";
import { SubmissionListItemcard } from "@/components/submissions/submissionListItemCard";

export default function AdminArchivePage() {
  const isOnline = useOnlineStatus();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const supabase = getClient();

  const adminContextSearch = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.search;
  }, []);
  
  const returnInfo = useMemo(() => {
    if (typeof window === "undefined") {
      return { href: null as string | null, label: null as string | null };
    }
    const raw = getAdminReturnInfo(window.location.search);
    if (raw.href) return raw;
    return { href: null as string | null, label: null as string | null };
  }, []);

  const adminLoginHref = useMemo(() => {
    if (typeof window === "undefined") return `${basePath}/admin/`;
    const params = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname.startsWith(basePath)
      ? window.location.pathname.slice(basePath.length) || "/"
      : window.location.pathname;
    params.set("next", `${currentPath}${window.location.search}`);
    return `${basePath}/admin/?${params.toString()}`;
  }, [basePath]);

  const {user, authedActions} = useAuth();
  const [items, setItems] = useState<VarroaSubmissionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {

      if (!authedActions.role || !authedActions.canControl) {
        setItems([]);
        setLoadError("Kun fagansvarlig eller superadmin kan se arkivet.");
        return;
      }

      const fetchedSubmissions = await fetchSubmissions(supabase);


      setItems(fetchedSubmissions);
    } catch (e) {
      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Ukjent feil";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [adminLoginHref, supabase]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(t);
  }, [reload]);

  return (
    <div className="min-h-dvh px-4 pb-10 pt-8">
      <header className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-shrink-0">
            <div className="text-lg font-semibold">Admin</div>
            <div className="text-xs text-zinc-400">Arkiv</div>
          </div>
          <div className="hidden flex-1 text-center md:block">
            {user.role && user.email ? (
              <div className="text-sm font-medium text-amber-200/90">
                👋 Velkommen {getDisplayNameFromEmail(user.email)} ({getRoleLabel(user.role)}), ha
                en fin dag!
              </div>
            ) : null}
          </div>
          <div className="flex flex-shrink-0 items-center gap-4">
            {returnInfo.href ? (
              <a
                href={returnInfo.href}
                className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
              >
                {returnInfo.label}
              </a>
            ) : (
              <a
                href={`${basePath}/`}
                className="text-sm font-semibold text-zinc-300 hover:text-zinc-50"
              >
                ← Til forsiden
              </a>
            )}
            <a
              href={appendAdminContext(`${basePath}/admin/innsendinger/`, adminContextSearch)}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
            >
              Innsendinger
            </a>
          </div>
        </div>
        {user?.role && user.email ? (
          <div className="mt-2 text-center md:hidden">
            <div className="text-xs font-medium text-amber-200/90">
              👋 Velkommen {getDisplayNameFromEmail(user.email)} ({getRoleLabel(user.role)})
            </div>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            Du er offline. Admin krever nett.
          </div>
        ) : null}
      </header>

      <main className="mx-auto mt-6 w-full max-w-3xl space-y-4">
        {/* {!isAuthed && loadError === "Logg inn for å se arkivet." ? (
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="text-base font-semibold">Innlogging kreves</div>
            <div className="mt-1 text-sm text-zinc-400">
              Logg inn via admin for å åpne arkivet.
            </div>
            <a
              href={`${basePath}/admin/`}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-amber-400 px-4 font-semibold text-zinc-950 active:opacity-90"
            >
              Gå til admin
            </a>
          </div>
        ) : null} */}

        {
        !authedActions?.canControl &&
        loadError === "Kun fagansvarlig eller superadmin kan se arkivet." ? (
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="text-base font-semibold">Ingen tilgang</div>
            <div className="mt-1 text-sm text-zinc-400">
              Arkivet er kun for kontroll og treningsklar klargjøring.
            </div>
          </div>
        ) : null}

        {authedActions?.canControl ? (
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Godkjent / arkiv</div>
                <div className="text-sm text-zinc-400">
                  Saker som er godkjent, klare for trening eller arkivert.
                </div>
              </div>
              <button
                type="button"
                onClick={reload}
                className="h-10 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60"
                disabled={isLoading}
              >
                Oppdater
              </button>
            </div>

            {loadError ? (
              <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {loadError}
              </div>
            ) : null}

            <div className="mt-4 divide-y divide-zinc-800">
              {items.length === 0 ? (
                <div className="py-6 text-sm text-zinc-400">
                  Ingen innsendelser i arkivet.
                </div>
              ) : null}

              {items.map((item) => (
                <SubmissionListItemcard
                  key={item.id}
                  item={item}
                  returnTo={`${basePath}/admin/archive/`}
                  assignedTo={formatWorkerLabel(user.user_id, item.assigned_to)} />
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
