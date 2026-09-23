
'use client';
import { CommonHeader } from "@/components/header";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmitEvent } from "react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { loginWithPassword } from '@/lib/auth/actions';


type VarroaUserRecord = {
    user_id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    role: string | null;
    role_created_at: string | null;
    expires_at: string | null;
    banned_at: string | null;
};

type PageMode =
    | "login"
    | "register"
    | "forgot"
    | "recovery";


export default function LogInPage() {
    const isOnline = useOnlineStatus();

    const passwordMinLength = 6;


    const [friendlyMsg, setFriendlyMsg] = useState<String | null>(null);

    const [pageMode, setPageMode] = useState<PageMode>(() => {
        if (typeof window === "undefined") return "login";
        const hash = window.location.hash.replace(/^#/, "");
        if (!hash) return "login";
        const params = new URLSearchParams(hash);
        setFriendlyMsg(null);
        return params.get("type") === "recovery" ? "recovery" : "login";
    });

    const onLogin = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const email = formdata.get("email");
        const password = formdata.get("password");

        if (typeof (email) !== "string" || typeof (password) !== "string") {
            setFriendlyMsg("Du må skrive inn en epost-addresse og passord.")
            return;
        }
        loginWithPassword(email, password);
    }

    const onLogInLink = () => { }
    const onRecovery = (event: SubmitEvent<HTMLFormElement>) => { }
    const onForgot = (event: SubmitEvent<HTMLFormElement>) => { }
    const onRegister = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const email = formdata.get("email");
        const password = formdata.get("password");
        const passwordConfirm = formdata.get("confirm-password");

        if (typeof (email) !== "string" || typeof (password) !== "string" ||  typeof (passwordConfirm) !== "string")  {
            setFriendlyMsg("Du må skrive inn alle feltene.")
            return;
        }
        if( password != passwordConfirm){
            setFriendlyMsg("passordene må være like.")
            return;
        }
        
     }


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

                    {pageMode === "login" ?
                        <form onSubmit={onLogin} className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    E-post
                                </label>
                                <input
                                    name="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    type="email"
                                    required
                                    placeholder="fornavn.etternavn@stud.hiof.no"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    Passord
                                </label>
                                <input
                                    name="password"
                                    autoComplete="current-password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button
                                    type="submit"
                                    className="h-14 rounded-2xl bg-amber-400 text-base font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-amber-300"
                                >
                                    {"🔐 Logg inn med passord"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onLogInLink}
                                    className="h-12 rounded-2xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60 hover:bg-zinc-900"
                                >
                                    📧 Send meg en innloggingslenke på e-post (alternativ)
                                </button>
                            </div>
                        </form>
                        : null
                    }
                    {pageMode === "register" ?
                        <form onSubmit={onRegister} className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    E-post
                                </label>
                                <input
                                    name="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    type="email"
                                    required
                                    placeholder="mail@domain.com"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    Passord
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    minLength={passwordMinLength}
                                    required
                                    placeholder="Minst 6 tegn"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    Gjenta Passord
                                </label>
                                <input
                                    name="confirm-password"
                                    type="password"
                                    required
                                    placeholder="gjenta passord"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button
                                    type="submit"
                                    className="h-14 rounded-2xl bg-amber-400 text-base font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-amber-300"
                                >
                                    {"Registrer"}
                                </button>
                            </div>
                        </form>
                        : null}
                    {pageMode === "forgot" ?
                        <form onSubmit={onForgot} className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    E-post
                                </label>
                                <input
                                    name="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    type="email"
                                    placeholder="fornavn.etternavn@stud.hiof.no"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    Passord
                                </label>
                                <input
                                    name="password"
                                    autoComplete="current-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button
                                    type="submit"
                                    className="h-14 rounded-2xl bg-amber-400 text-base font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-amber-300"
                                >
                                    {"🔐 Logg inn med passord"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onLogInLink}
                                    className="h-12 rounded-2xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60 hover:bg-zinc-900"
                                >
                                    📧 Send meg en innloggingslenke på e-post (alternativ)
                                </button>
                            </div>
                        </form>
                        : null}
                    {pageMode === "recovery" ?
                        <form onSubmit={onRecovery} className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    E-post
                                </label>
                                <input
                                    name="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    type="email"
                                    placeholder="fornavn.etternavn@stud.hiof.no"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">
                                    Passord
                                </label>
                                <input
                                    name="password"
                                    autoComplete="current-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button
                                    type="submit"
                                    className="h-14 rounded-2xl bg-amber-400 text-base font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-amber-300"
                                >
                                    {"🔐 Logg inn med passord"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onLogInLink}
                                    className="h-12 rounded-2xl border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-50 active:opacity-90 disabled:opacity-60 hover:bg-zinc-900"
                                >
                                    📧 Send meg en innloggingslenke på e-post (alternativ)
                                </button>
                            </div>
                        </form>
                        : null}
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