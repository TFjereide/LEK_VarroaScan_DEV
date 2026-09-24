'use client';
import { SubmitEvent } from "react";
import { registerUser } from '@/lib/auth/actions';


interface ForgotPasswordFormProps {
    setMsg: (msg: String) => void,
}

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {

    const onForgot = (event: SubmitEvent<HTMLFormElement>) => { }

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
        </form>
    )
}