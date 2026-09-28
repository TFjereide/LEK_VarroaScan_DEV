'use client';
import { SubmitEvent, useEffect, useState } from "react";
import { getClient } from "@/lib/auth/client";
import { updatePassword } from "@/lib/auth/actions";


interface RecoverPasswordFormProps {
    setMsg: (msg: String) => void,
}

export function RecoverPasswordForm(props: RecoverPasswordFormProps) {

    const [canPasswordRecovery, setCanPasswordRecovery] = useState<boolean>(false);
    useEffect( () => {
        const supabase = getClient();
        const {data:{subscription}} = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setCanPasswordRecovery(true);
            }
        });


        return () => subscription.unsubscribe();

     }, []);

    const onRecovery = async (event: SubmitEvent<HTMLFormElement>) =>{
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const password = formdata.get("password");
        const passwordConfirm = formdata.get("confirm-password");

        if (typeof (password) !== "string" || typeof (passwordConfirm) !== "string") {
            props.setMsg("Du må skrive inn i begge felter.")
            return;
        }

        if (password !==passwordConfirm) {
            props.setMsg("Passordene må være like.")
            return;
        }

        const {error} = await updatePassword(password);

    }

    return canPasswordRecovery ?(
        <form onSubmit={onRecovery} className="mt-6 grid grid-cols-1 gap-4">
            <div>
                <div className="rounded-2xl border border-amber-900/60 bg-amber-950/30 px-4 py-4 text-sm text-amber-100">
                    <div className="font-semibold text-base">
                        🔑 Sett nytt passord
                    </div>
                    <div className="mt-2">
                        Nettleseren din husket at du kom hit fra en lenke i
                        e-posten. Skriv inn et nytt passord du kan huske, så
                        lagrer vi det på brukeren din umiddelbart.
                    </div>
                </div>
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
                    autoComplete="current-password"
                    type="password"
                    placeholder="••••••••"
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
                    {"💾 Lagre nytt passord og logg inn"}
                </button>
            </div>
        </form>
    ) : <div>Laster....</div>;
}