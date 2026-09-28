
'use client';
import { CommonHeader } from "@/components/header";
import { useState } from "react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

import{ RecoverPasswordForm } from "@/components/login/recoverPasswordForm";


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


export default function RecoveryPage() {
    const isOnline = useOnlineStatus();
    const [friendlyMsg, setFriendlyMsg] = useState<String | null>(null);

    return (
        <div className="min-h-dvh px-4 pb-10 pt-8">
            <CommonHeader url={"placeholder"} label={"placeholder"} isOnline={isOnline} />
            <main className="mx-auto mt-6 w-full max-w-6xl space-y-4">

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                    <div className={[
                        "mt-5 rounded-2xl border",
                        "border-indigo-900/60 bg-indigo-950/30",
                        "px-4 py-4 text-sm",
                        "text-indigo-200"
                    ].join(" ")}>
                        {(
                            <>
                                <div className="font-semibold text-base">
                                    Registrer nytt passord
                                </div>
                                <div className="mt-2 text-zinc-100">
                                    boop
                                </div>
                            </>
                        )}
                    </div>
                    
                    <RecoverPasswordForm setMsg={setFriendlyMsg}/>

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