'use client';
import { SubmitEvent, useState } from "react";
import { sendRecoveryEmail } from '@/lib/auth/actions.client';


interface ForgotPasswordFormProps {
    setMsg: (msg: string | null) => void,
}

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {

    const [msg, setMsg] = useState<string|null>(null);
    const onForgot = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const email = formdata.get("email");
        if (typeof (email) !== "string") {
            props.setMsg("Du må skrive inn en epost.")
            return;
        }
        sendRecoveryEmail(email)
            .then((authData)=>{
                setMsg(authData.error);
            });
    }
  
    return (
        <form onSubmit={onForgot} className="mt-6 grid grid-cols-1 gap-4">
            <label className="text-xs font-semibold text-zinc-300">
                E-post
            </label>
            <input
                name="email"
                autoComplete="email"
                type="email"
                placeholder="mail@domain.com"
                className="mt-1 h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />

            <button
                type="submit"
                className="h-14 rounded-2xl bg-amber-400 text-base font-semibold text-zinc-950 active:opacity-90 disabled:opacity-60 hover:bg-amber-300"
            >
                {"📧 Send lenke for nytt passord"}
            </button>
            {msg?<p className="mt-5 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">Error: {msg}</p>:null}
        </form>
    )
}