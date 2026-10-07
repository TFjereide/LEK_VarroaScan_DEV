
'use client';
import { CommonHeader } from "@/components/header";
import { useState } from "react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

import{ LoginUserForm } from "@/components/login/loginUserForm";
import{ RegisterUserForm } from "@/components/login/registerUserForm";
import{ ForgotPasswordForm } from "@/components/login/forgotPasswordForm";
import{ RecoverPasswordForm } from "@/components/login/recoverPasswordForm";


type PageMode =
    | "login"
    | "register"
    | "forgot"
    | "recovery";


export default function LogInPage() {
    const isOnline = useOnlineStatus();
    const [friendlyMsg, setFriendlyMsg] = useState<string | null>(null);

    const [pageMode, setPageMode] = useState<PageMode>(() => {
        if (typeof window === "undefined") return "login";
        const hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "login";
        const params = new URLSearchParams(hash);
        setFriendlyMsg(null);
        return params.get("type") === "recovery" ? "recovery" : "login";
    });

    return (
        <div className="min-h-dvh px-4 pb-10 pt-8">
            <CommonHeader url={"placeholder"} label={"placeholder"} isOnline={isOnline} />
            <main className="mx-auto mt-6 w-full max-w-6xl space-y-4">

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="text-2xl font-semibold text-zinc-50">
                                {"Logg inn"}
                            </div>
                            <div className="mt-2 text-sm text-zinc-400">
                                {"Logg inn for å åpne kø, arbeidsflate og kontrollflyt."}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
                            <button
                                type="button"
                                onClick={() => { setPageMode("login"); }}
                                className={[
                                    "h-10 rounded-xl px-4 text-sm font-semibold transition",
                                    pageMode === "login"
                                        ? "bg-amber-400 text-zinc-950"
                                        : "text-zinc-300 hover:text-zinc-100",
                                ].join(" ")}
                            >
                                Logg inn
                            </button>
                            {
                                <button
                                    type="button"
                                    onClick={() => { setPageMode("register"); }}
                                    className={[
                                        "h-10 rounded-xl px-4 text-sm font-semibold transition",
                                        pageMode === "register"
                                            ? "bg-amber-400 text-zinc-950"
                                            : "text-zinc-300 hover:text-zinc-100",
                                    ].join(" ")}
                                >
                                    Registrer deg
                                </button>
                            }
                            <button
                                type="button"
                                onClick={() => { setPageMode("forgot"); }}
                                className={[
                                    "h-10 rounded-xl px-4 text-sm font-semibold transition",
                                    pageMode === "forgot"
                                        ? "bg-amber-400 text-zinc-950"
                                        : "text-zinc-300 hover:text-zinc-100",
                                ].join(" ")}
                            >
                                Glemt passord?
                            </button>
                        </div>
                    </div>

                    <div className={[
                        "mt-5 rounded-2xl border",
                        "border-indigo-900/60 bg-indigo-950/30",
                        "px-4 py-4 text-sm",
                        "text-indigo-200"
                    ].join(" ")}>
                        {(
                            <>
                                <div className="font-semibold text-base">
                                    🧑‍🎓 Studenter?
                                </div>
                                <div className="mt-2 text-zinc-100">
                                    Ikke bruk denne innloggingslenken for studenter. Gi dem den direkte lenken til <code className="text-zinc-50">/admin</code> i LEK-VarroaScan, der kan de <b>registrere seg med skole-e-post + eget passord</b> selv.
                                </div>
                            </>
                        )}
                    </div>
                    
                    {pageMode === "login" ? <LoginUserForm setMsg={setFriendlyMsg}/> : null}
                    {pageMode === "register" ?<RegisterUserForm setMsg={setFriendlyMsg}/>: null}
                    {pageMode === "forgot" ? <ForgotPasswordForm setMsg={setFriendlyMsg}/>: null}
                    {pageMode === "recovery" ? <RecoverPasswordForm setMsg={setFriendlyMsg}/> : null}

                </div>
                {friendlyMsg ? (
                    <div className="mt-5 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                        {friendlyMsg}
                    </div>
                ) : null}

            </main>
        </div>
    )
}