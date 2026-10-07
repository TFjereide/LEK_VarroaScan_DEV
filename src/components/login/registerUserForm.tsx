'use client';
import { SubmitEvent } from "react";
import { registerUser } from '@/lib/auth/actions';


interface RegisterUserFormProps {
    setMsg: (msg: string | null) => void,
}

export function RegisterUserForm(props: RegisterUserFormProps) {

    const passwordMinLength = 6;


    const onRegister = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const email = formdata.get("email");
        const password = formdata.get("password");
        const passwordConfirm = formdata.get("confirm-password");

        if (typeof (email) !== "string" || typeof (password) !== "string" || typeof (passwordConfirm) !== "string") {
            props.setMsg("Du må skrive inn alle feltene.")
            return;
        }
        if (email.length === 0 || password.length === 0 || passwordConfirm.length === 0) {
            props.setMsg("Du må skrive inn alle feltene.")
            return;
        }
        if (password !== passwordConfirm) {
            props.setMsg("passordene må være like.")
            return;
        }

        await registerUser(email, password)

    }

    return (
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
    )
}