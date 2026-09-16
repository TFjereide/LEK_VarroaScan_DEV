
"use client";

import { SubmissionType } from "@/lib/utils";


type PhototypeSectionProps = {
    submissionType: SubmissionType;
    onSubmissionTypeChange: (value: SubmissionType) => void;
}

export function PhototypeSection({ submissionType, onSubmissionTypeChange }: PhototypeSectionProps) {
    const typeLabel = submissionType === "BUNNBRETT_FOTO" ? "Bunnbrett foto" : "Kontrollfoto";

    return (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <summary className="cursor-pointer list-none text-xs font-semibold text-zinc-300">
                Type (avansert): {typeLabel}
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => onSubmissionTypeChange("BUNNBRETT_FOTO")}
                    className={[
                        "h-11 rounded-2xl border text-sm font-semibold",
                        submissionType === "BUNNBRETT_FOTO"
                            ? "border-amber-300 bg-amber-400 text-zinc-950"
                            : "border-zinc-700 bg-zinc-950 text-zinc-100",
                    ].join(" ")}
                >
                    Bunnbrett foto
                </button>
                <button
                    type="button"
                    onClick={() => onSubmissionTypeChange("KONTROLLFOTO")}
                    className={[
                        "h-11 rounded-2xl border text-sm font-semibold",
                        submissionType === "KONTROLLFOTO"
                            ? "border-amber-300 bg-amber-400 text-zinc-950"
                            : "border-zinc-700 bg-zinc-950 text-zinc-100",
                    ].join(" ")}
                >
                    Kontrollfoto
                </button>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
                Bruk kontrollfoto hvis dere tester/kalibrerer eller vil skille testbilder fra ekte bunnbrett-bilder.
            </div>
        </details>
    )
}