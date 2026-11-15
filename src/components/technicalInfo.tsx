"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { getAppVersion } from "@/lib/appVersion";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

import { isStandaloneApp } from "@/lib/utils";


type TechnicalInfoProps = {
    isFromBiensVokter: boolean;
    sourceParam: string | null;
    lastTech: string | null;
}

export function TechnicalInfoPanel(
    { isFromBiensVokter, sourceParam, lastTech }: TechnicalInfoProps
) {

    const [showTech, setShowTech] = useState(false);

    const isOnline = useOnlineStatus();
    const pathname = usePathname();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const appVersion = getAppVersion();

    {/* <button
        type="button"
        onClick={() => setShowTech((v) => !v)}
        className="text-left text-xs text-zinc-400 hover:text-zinc-200"
    >
        {showTech ? "Skjul teknisk info" : "Vis teknisk info"}
    </button> */}
    return (
        <>
            <style>{`
            details[open] .tech-chevron {
                transform: rotate(90deg);
            }
        `}</style>

            <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800">
                    <span className="tech-chevron inline-block text-zinc-500 transition-transform duration-200">
                        ▶
                    </span>
                    <span>Teknisk info</span>
                    <span className="ml-auto text-xs font-normal text-zinc-500">
                        Detaljer
                    </span>
                </summary>

                <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-300">
                    <div>route: {pathname}</div>
                    <div>appVersion: {appVersion}</div>
                    <div>online: {String(isOnline)}</div>
                    <div>displayModeStandalone: {String(isStandaloneApp())}</div>
                    <div>fromBiensVokter: {String(isFromBiensVokter)}</div>
                    <div>source: {sourceParam ?? "—"}</div>
                    <div>
                        supabaseUrl:{" "}
                        {supabaseUrl
                            ? (() => {
                                try {
                                    const u = new URL(supabaseUrl);
                                    return u.origin;
                                } catch {
                                    return supabaseUrl;
                                }
                            })()
                            : "Mangler"}
                    </div>
                    {lastTech ? <div>feil: {lastTech}</div> : null}
                </div>
            </details>
        </>
    )
}