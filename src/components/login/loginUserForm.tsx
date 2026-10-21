'use client';
import { SubmitEvent } from "react";
import { loginWithPassword } from '@/lib/auth/actions.client';
import { useRouter } from "next/navigation";


interface LoginUserFormProps {
    setMsg: (msg: string|null) => void,
}

export function LoginUserForm(props: LoginUserFormProps) {
    const router = useRouter();
    // VERY simple client-side validation
    const onLogin = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formdata = new FormData(event.currentTarget);
        const email = formdata.get("email");
        const password = formdata.get("password");

        if (typeof (email) !== "string" || typeof (password) !== "string") {
            props.setMsg("Du må skrive inn en epost-addresse og passord.")
            return;
        }
        loginWithPassword(email, password).then((data)=>{
            if (data.error !== "ok"){
                props.setMsg("Error: " + data.error);
            }else{
                router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/admin`)
                console.log("What?")
            }
        });

    }

    const onLogInLink = () => { }


    return (
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

    )
}