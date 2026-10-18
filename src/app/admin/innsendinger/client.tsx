"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  appendAdminContext,
  getAdminContextSearch,
  getAdminReturnInfo,
} from "@/lib/adminNavigation";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import {
  getDisplayNameFromEmail,
  getRoleLabel,
  getSubmissionSelect,
  getWorkflowMigrationMessage,
  isAvailableControlSubmission,
  isMissingWorkflowSchemaError,
  type VarroaSubmissionRecord,
} from "@/lib/varroaWorkflow";

import { useAuth } from "@/app/auth-provider";
import { getClient } from "@/lib/auth/client";
import { SubmissionListItemcard } from "@/components/submissions/submissionListItemCard";
import { PostgrestResponse } from "@supabase/supabase-js";

type QueueView = "all" | "mine" | "kontroll" | "training" | "archive";

export function AdminQueueClient() {

  const isOnline = useOnlineStatus();
  const { user, authedActions } = useAuth();

  const searchParams = useSearchParams();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const supabase = getClient();
  const adminContextSearch = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getAdminContextSearch(window.location.search);
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

  // const [isAuthed, setIsAuthed] = useState(false);
  // const [access, setAccess] = useState<AuthorizedUserActions | null>(null);
  const [itemsUnfiltered, setItemsUnfiltered] = useState<VarroaSubmissionRecord[]>([]);
  const [availableNewCount, setAvailableNewCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string, title: string) => {
    console.log("handledelete: ", items.length)

    const typeOk = confirm(
      `Er du HELT sikker på at du vil slette denne saken?\n\n${title}\n\nSletting er permanent. Alle revurderinger, bilder, notater og historikk blir slettet fra databasen. Bilder i Storage må slettes manuelt om nødvendig.\n\nSkriv inn nøyaktig ordet Slett for å fortsette:`,
    );
    if (!typeOk) return;

    const promptAns = (
      window.prompt(
        'For å bekrefte, skriv nøyaktig ordet "Slett" (stor S):',
        "",
      ) ?? ""
    ).trim();
    if (promptAns !== "Slett") {
      alert("Sletting avbrutt – du skrev ikke riktig ord.");
      return;
    }

    // TODO:
    if (!supabase) return;
    setDeletingId(id);
    try {
      const res = await supabase.rpc("varroa_delete_submission_as_admin", {
        p_submission_id: id,
      });
      if (res.error) throw res.error;
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: unknown) {
      let msg = "Ukjent feil";
      if (typeof e === "object" && e) {
        const err = e as { message?: unknown; code?: unknown; details?: unknown };
        if (typeof err.message === "string") msg = err.message;
        else if (typeof err.code === "string") msg = `Feilkode ${err.code}`;
        else msg = String(e);
      } else if (typeof e === "string") {
        msg = e;
      }
      alert("Kunne ikke slette saken:\n\n" + msg);
    } finally {
      setDeletingId(null);
    }
  }, [supabase]);

  const view = (searchParams.get("view") as QueueView | null) ?? "all";

  const fetchItems = async () => {
    console.log("Fetching items");
    try {
      const [submissionsResRaw, availableResRaw] = await Promise.all([
        supabase
          .from("submissions")
          .select(getSubmissionSelect())
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase.rpc("varroa_available_new_count"),
      ]);

      console.log("submissionsResRaw:", submissionsResRaw);
      console.log("availableResRaw:", availableResRaw);

      const submissionsRes = submissionsResRaw as PostgrestResponse<VarroaSubmissionRecord>;
      const availableRes = availableResRaw as PostgrestResponse<number>;

      if (submissionsRes.error) {
        console.error("Failed to fetch submissions:", submissionsRes.error);
      } else {
        const fetchedItems = submissionsRes.data ?? [];
        setItemsUnfiltered(fetchedItems);
        console.log("Fetched items: ", itemsUnfiltered);
      }

      if (!availableRes.success) {
        console.error("Failed to fetch submissions count:", availableRes.error)
      } else {
        const availableCount = availableRes.data ?? 0;
        setAvailableNewCount(availableCount);
        console.log("Fetched items count: ", availableNewCount)
      }
    } catch (e) {

    }
  }

  // TODO:
  const reload = useCallback(async () => {
    
    console.log("reload")
    setLoadError(null);

    if (!supabase) {
      setLoadError("Mangler Supabase-konfig (NEXT_PUBLIC_SUPABASE_*).");
      return;
    }

    setIsLoading(true);
    try {
      fetchItems();
    } catch (e) {
      console.log("hnngh")

      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Ukjent feil";
      setLoadError(message);
      setItemsUnfiltered([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminLoginHref, supabase]);

  console.log("before useffect")
  useEffect(() => {
    console.log("useffect")
    void fetchItems()
  }, [])


  // TODO:
  const openNextSubmission = async () => {
    console.log("next submission: ", itemsUnfiltered.length)

    if (!supabase) return;
    setLoadError(null);
    setIsLoading(true);
    try {
      const userId = user?.user_id;
      if (userId) {
        // GAMMEL: .from("varroa_submissions"). NY: submissions - updated_at
        // er en ekte kolonne, så sorteringen trengte ingen endring.
        const underWorkRes = await supabase
          .from("submissions")
          .select("id")
          .eq("status", "UNDER_ARBEID")
          .or(`assigned_to.eq.${userId},processed_by.eq.${userId}`)
          .order("updated_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (underWorkRes.error) throw underWorkRes.error;
        const resumeId = String(underWorkRes.data?.id ?? "");
        if (resumeId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(resumeId)}`,
              adminContextSearch,
            ),
          );
          return;
        }
      }

      if (authedActions?.canControl) {
        // GAMMEL: .from("varroa_submissions"), og sorterte en bar
        // .select("id")-spørring på "created_at" - som bare er et alias fra
        // getSubmissionSelect() og ikke finnes utenfor den. NY: riktig
        // tabellnavn + sortering på den ekte kolonnen submission_date.
        const reviewRes = await supabase
          .from("submissions")
          .select("id")
          .eq("status", "KLAR_FOR_KONTROLL")
          .neq("processed_by", userId ?? "")
          .order("submission_date", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (reviewRes.error) throw reviewRes.error;
        const reviewId = String(reviewRes.data?.id ?? "");
        if (reviewId) {
          window.location.assign(
            appendAdminContext(
              `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(reviewId)}`,
              adminContextSearch,
            ),
          );
          return;
        }
      }

      const res = await supabase.rpc("varroa_claim_next_submission");
      if (res.error) {
        if (isMissingWorkflowSchemaError(res.error)) {
          setLoadError(getWorkflowMigrationMessage());
          return;
        }
        throw res.error;
      }
      const nextId = String(res.data ?? "");
      if (!nextId) {
        setLoadError("Ingen ledige nye saker akkurat nå.");
        await reload();
        return;
      }
      window.location.assign(
        appendAdminContext(
          `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(nextId)}`,
          adminContextSearch,
        ),
      );
    } catch (e) {
      const message =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Ukjent feil";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const userId = user?.user_id;

    if (view === "mine") {
      return itemsUnfiltered.filter(
        (item) => item.assigned_to === userId || item.processed_by === userId,
      );
    }
    if (authedActions.canControl && view === "kontroll") {
      return itemsUnfiltered.filter((item) => isAvailableControlSubmission(item, userId));
    }
    if (view === "training") {
      return itemsUnfiltered.filter(
        (item) => item.status === "GODKJENT" || item.status === "KLAR_FOR_TRENING",
      );
    }
    if (view === "archive") {
      return itemsUnfiltered.filter((item) => item.status === "ARKIVERT");
    }
    if (!authedActions.canSeeAll) {
      return itemsUnfiltered.filter(
        (item) => item.assigned_to === userId || item.processed_by === userId,
      );
    }
    return itemsUnfiltered;

  }, [user, authedActions, itemsUnfiltered, view]);

  const queueTitle = useMemo(() => {
    switch (view) {
      case "mine":
        return "Mine saker";
      case "kontroll":
        return "Venter på kontroll";
      case "training":
        return "Godkjent / trening";
      case "archive":
        return "Arkiv";
      default:
        return authedActions.canSeeAll ? "Arbeidskø" : "Min arbeidskø";
    }
  }, [authedActions, view]);

  const queueHelp =
    view === "kontroll"
      ? "Viser saker som venter pa andresjekk. Egen forstesjekk skjules her."
      : authedActions.canSeeAll
        ? "Full ko med filtrering for produksjonsflyten."
        : "Viser dine tildelte saker. Bruk Start arbeid for neste ledige sak.";

  const filterLinks: Array<{ view: QueueView; label: string }> = [
    { view: "all", label: authedActions.canSeeAll ? "Alle" : "Min kø" },
    { view: "mine", label: "Mine" },
    { view: "kontroll", label: "Venter pa kontroll" },
    { view: "training", label: "Trening" },
    { view: "archive", label: "Arkiv" },
  ];
  const ownerColumnLabel = view === "kontroll" ? "Forste sjekk" : "Tildelt";

  return (
    <div className="min-h-dvh px-4 pb-10 pt-8">
      <header className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-shrink-0">
            <div className="text-lg font-semibold">{queueTitle}</div>
            <div className="text-xs text-zinc-400">{queueHelp}</div>
          </div>
          <div className="hidden flex-1 text-center md:block">
            {user.role && user.email ? (
              <div className="text-sm font-medium text-amber-200/90">
                👋 Velkommen {getDisplayNameFromEmail(user.email)} ({getRoleLabel(user.role)}), ha
                en fin dag!
              </div>
            ) : null}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
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
              href={appendAdminContext(`${basePath}/admin/`, adminContextSearch)}
              className="text-sm font-semibold text-zinc-200 hover:text-zinc-50"
            >
              Dashboard
            </a>
            <button
              type="button"
              onClick={reload}
              disabled={isLoading || !isOnline}
              className="h-10 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60"
            >
              Oppdater
            </button>
          </div>
        </div>
        {user.role && user.email ? (
          <div className="mt-2 text-center md:hidden">
            <div className="text-xs font-medium text-amber-200/90">
              👋 Velkommen {getDisplayNameFromEmail(user.email)} ({getRoleLabel(user.role)})
            </div>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            Du er offline. Arbeidskøen krever nett.
          </div>
        ) : null}
      </header>

      <main className="mx-auto mt-6 w-full max-w-7xl space-y-4">
        {/* {!isAuthed ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-300">
            Logg inn via `Admin` for å åpne arbeidskøen.
          </div>
        ) : null} */}

        {loadError ? (
          <div className="rounded-3xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : null}

        {authedActions.canUseQueue ? (
          <>
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {filterLinks.map((link) => {
                    const active = link.view === view;
                    return (
                      <a
                        key={link.view}
                        href={appendAdminContext(
                          `${basePath}/admin/innsendinger/?view=${link.view}`,
                          adminContextSearch,
                        )}
                        className={[
                          "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                          active
                            ? "bg-amber-400 text-zinc-950"
                            : "border border-zinc-700 bg-zinc-950 text-zinc-100",
                        ].join(" ")}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-300">
                    Ledige nye saker:{" "}
                    <span className="font-semibold text-zinc-50">{availableNewCount}</span>
                  </div>
                  <button
                    type="button"
                    onClick={openNextSubmission}
                    disabled={isLoading}
                    className="h-11 rounded-2xl bg-amber-400 px-5 text-sm font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60"
                  >
                    Neste sak
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              <div className="hidden grid-cols-[1.1fr_1fr_0.8fr_0.9fr_1.1fr_110px_minmax(0,1fr)] gap-3 border-b border-zinc-800 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid">
                <div>Sak</div>
                <div>Status</div>
                <div>{ownerColumnLabel}</div>
                <div>Midd</div>
                <div>Sist oppdatert</div>
                <div>Åpne</div>
                {authedActions.canDeleteAnything ? <div className="text-right">Slett</div> : null}
              </div>

              { // Submissionlist
                filteredItems.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-zinc-400">
                    Ingen saker i denne visningen ennå.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {filteredItems.map((item) => (
                      <SubmissionListItemcard
                        key={item.id}
                        item={item}
                        view={view}
                        deletingID={deletingId}
                        onDelete={handleDelete} />
                    ))}
                  </div>)
              }
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}