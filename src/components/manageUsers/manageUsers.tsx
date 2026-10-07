import { useState, useCallback, useContext } from "react";
import { User } from "@/lib/auth/user";
import { formatDateTime, getRoleLabel } from "@/lib/varroaWorkflow";
import { getClient } from "@/lib/auth/client";
import { useAuth } from "@/app/auth-provider";
import { AppRole } from "@/lib/auth/roles";




export function ManageUserSection() {

    const supabase = getClient();

    const {user, authedActions, isAdmin} = useAuth();


    const [actionMsg, setActionMsg] = useState<string|null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [usersLoading, setUsersLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        if (!supabase || !authedActions?.canManageSystem) return;
        setUsersError(null);
        setUsersLoading(true);
        try {
            const res = await supabase.rpc("varroa_list_users");
            if (res.error) throw res.error;
            setUsers((res.data ?? []) as unknown as User[]);
        } catch (e) {
            const msg =
                typeof e === "object" && e && "message" in e
                    ? String((e as { message?: unknown }).message)
                    : "Ukjent feil";
            setUsersError(msg);
        } finally {
            setUsersLoading(false);
        }
    }, [authedActions?.canManageSystem, supabase]);

    const setUserRole = async (
        targetUserId: string,
        opts: {
            role?: AppRole | null;
            banned?: boolean;
            expiresAt?: string | null;
        },
        ) => {
        if (!supabase) return;
        try {
            const res = await supabase.rpc("varroa_upsert_user_role", {
            p_target_user_id: targetUserId,
            p_new_role: opts.role ?? null,
            p_new_expires_at: opts.expiresAt ?? null,
            p_set_banned: opts.banned === undefined ? null : opts.banned,
            p_unused_dummy: null,
            });

            if (res.error) throw res.error;
            
            setActionMsg(
            opts.banned
                ? "Bruker sperret."
                : opts.role === null
                ? "Rollen fjernet."
                : `Rollen er oppdatert til ${getRoleLabel(
                    (opts.role as "STUDENT" | "FAGANSVARLIG") ?? null,
                )}.`,
            );
            await loadUsers();
            // await reload();

        } catch (e) {
            const msg =
            typeof e === "object" && e && "message" in e
                ? String((e as { message?: unknown }).message)
                : "Ukjent feil";
            setUsersError(msg);
        }
        };


    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-xl font-semibold text-zinc-50">
                        Brukere og tilganger
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                        Godkjenn ventende brukere, endre roller eller sperr.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={loadUsers}
                    disabled={usersLoading}
                    className="h-10 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-zinc-100 active:opacity-90 disabled:opacity-60"
                >
                    {usersLoading ? "Laster…" : "↻ Oppdater"}
                </button>
            </div>

            {usersError ? (
                <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {usersError}
                </div>
            ) : null}

            <div className="mt-5 space-y-3">
                {(() => {
                    const pendingUsers = users.filter(
                        (u) => u.role == null && !u.banned_at,
                    );
                    if (pendingUsers.length > 0) {
                        return (
                            <div className="rounded-2xl border border-amber-900/50 bg-amber-950/30 p-4">
                                <div className="text-sm font-semibold text-amber-100">
                                    ⏳ Ventende på godkjenning ({pendingUsers.length})
                                </div>
                                <div className="mt-1 text-xs text-amber-300">
                                    Disse har registrert seg, men mangler rolle enda. Gi dem STUDENT for å gi tilgang.
                                </div>
                                <div className="mt-4 space-y-3">
                                    {pendingUsers.map((u) => (
                                        <div
                                            key={u.user_id}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-900/40 bg-zinc-950 px-4 py-3"
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-zinc-50">
                                                    {u.email ?? "(mangler e-post)"}
                                                </div>
                                                <div className="mt-0.5 text-xs text-zinc-400">
                                                    Opprettet {formatDateTime(u.created_at)}
                                                    {u.last_sign_in_at
                                                        ? ` • Sist pålogget ${formatDateTime(u.last_sign_in_at)}`
                                                        : ""}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setUserRole(u.user_id, {
                                                            role: "STUDENT",
                                                            expiresAt: "2026-12-31T23:59:59+01:00",
                                                        })
                                                    }
                                                    className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-emerald-400"
                                                >
                                                    ✅ Gi STUDENT-tilgang
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUserRole(u.user_id, { banned: true })}
                                                    className="h-10 rounded-xl border border-red-900/50 bg-red-950/40 px-4 text-xs font-semibold text-red-200 active:opacity-90 disabled:opacity-60 hover:bg-red-900/40"
                                                >
                                                    🛑 Sperr bruker
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Alle brukere ({users.length})
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {users.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-zinc-400">
                                {usersLoading
                                    ? "Laster brukere…"
                                    : "Ingen brukere enda."}
                            </div>
                        ) : null}
                        {users.map((u) => {
                            const isBanned = Boolean(u.banned_at);
                            const isPending = u.role == null && !isBanned;
                            return (
                                <div
                                    key={u.user_id}
                                    className={[
                                        "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                                        isBanned ? "bg-red-950/20" : "",
                                    ].join(" ")}
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-zinc-50">
                                            {u.email ?? "(mangler e-post)"}
                                        </div>
                                        <div className="mt-0.5 text-xs text-zinc-400">
                                            {isPending ? (
                                                <span className="text-amber-300 font-semibold">⏳ Ventende</span>
                                            ) : isBanned ? (
                                                <span className="text-red-300 font-semibold">🛑 Sperret {u.banned_at ? `(${formatDateTime(u.banned_at)})` : ""}</span>
                                            ) : (
                                                <>
                                                    <span className="font-semibold text-emerald-300">
                                                        {getRoleLabel(
                                                            (u.role as "SUPERADMIN" | "FAGANSVARLIG" | "STUDENT") ??
                                                            null,
                                                        )}
                                                    </span>
                                                    {u.expires_at ? (
                                                        <span className="text-zinc-500">
                                                            {" "}• utløper {formatDateTime(u.expires_at)}
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                            {" "}• Opprettet {formatDateTime(u.created_at)}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {u.role !== "STUDENT" && !isBanned ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUserRole(u.user_id, {
                                                        role: "STUDENT",
                                                        expiresAt: "2026-12-31T23:59:59+01:00",
                                                    })
                                                }
                                                className="h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-[11px] font-semibold text-zinc-100 active:opacity-90 hover:bg-zinc-800"
                                            >
                                                Gi STUDENT
                                            </button>
                                        ) : null}
                                        {u.role !== "FAGANSVARLIG" && u.role !== "SUPERADMIN" && !isBanned ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUserRole(u.user_id, {
                                                        role: "FAGANSVARLIG"
                                                    })
                                                }
                                                className="h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-[11px] font-semibold text-zinc-100 active:opacity-90 hover:bg-zinc-800"
                                            >
                                                Gi FAGANSVARLIG
                                            </button>
                                        ) : null}
                                        {!isBanned ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUserRole(u.user_id, { banned: true })}
                                                className="h-9 rounded-xl border border-red-900/50 bg-red-950/40 px-3 text-[11px] font-semibold text-red-200 active:opacity-90 hover:bg-red-900/40"
                                            >
                                                🛑 Sperr
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUserRole(u.user_id, { banned: false })}
                                                className="h-9 rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 text-[11px] font-semibold text-emerald-200 active:opacity-90 hover:bg-emerald-900/40"
                                            >
                                                ✅ Fjern sperr
                                            </button>
                                        )}
                                        {u.role && !isBanned ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUserRole(u.user_id, {
                                                        role: null,
                                                        banned: false,
                                                    })
                                                }
                                                className="h-9 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-[11px] font-semibold text-zinc-300 active:opacity-90 hover:bg-zinc-800"
                                            >
                                                Fjern rolle
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    )

}