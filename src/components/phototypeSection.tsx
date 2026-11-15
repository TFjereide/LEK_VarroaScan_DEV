
"use client";

import { SubmissionType } from "@/lib/utils";


type PhototypeSectionProps = {
    submissionType: SubmissionType;
    onSubmissionTypeChange: (value: SubmissionType) => void;
}

export function PhototypeSection({ submissionType, onSubmissionTypeChange }: PhototypeSectionProps) {
    const typeLabel = submissionType === "BUNNBRETT_FOTO" ? "Bunnbrett foto" : "Kontrollfoto";

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
                    Type (avansert): {typeLabel}
                      </span>
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-300">
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
        </>
    )
}