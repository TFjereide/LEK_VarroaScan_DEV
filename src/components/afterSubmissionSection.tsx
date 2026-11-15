"use client";

import * as utils from "@/lib/utils";
import { CommonHeader } from "@/components/header";


type AfterSubmissionSectionProps = {
    returnUrl : string | null;
    returnLabel : string;
    isOnline : boolean;
    submissionInfo : utils.SubmissionInfo | null;
    onClick : () => void;

}

export function AfterSubmissionSection({returnUrl, returnLabel, isOnline, submissionInfo, onClick} : AfterSubmissionSectionProps){
    const sentTypeLabel = submissionInfo?.type === "KONTROLLFOTO" ? "Kontrollfoto" : "Bunnbrett foto";

    return (
      <div className="flex flex-col min-h-dvh px-4 pb-10 pt-8">
        <CommonHeader
          url={returnUrl}
          label={returnLabel}
          isOnline={isOnline}
        />

        <main className="mx-auto mt-10 w-full max-w-xl">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">

            <div className="text-2xl font-semibold">Takk!</div>
            <div className="mt-2 text-zinc-300">
              Innsendingen er mottatt. Vil du sende inn flere?
            </div>

            {submissionInfo ? (
              <>
                {/* Main result */}
                <div className="mt-6 rounded-2xl border border-amber-700 bg-amber-950/40 p-5">
                  <div className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                    Antall midd funnet
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold tracking-tight text-amber-400 tabular-nums">
                      {submissionInfo.miteCount}
                    </span>
                    <span className="text-lg font-medium text-amber-200">
                      midd
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-zinc-400">
                    Resultatet av bildeanalysen
                  </div>
                </div>

                {/* Secondary information */}
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4 py-1">
                    <span className="text-zinc-400">Type</span>
                    <span className="text-zinc-200">{sentTypeLabel}</span>
                  </div>

                  <div className="flex justify-between gap-4 py-1">
                    <span className="text-zinc-400">Antall bilder</span>
                    <span className="text-zinc-200">
                      {submissionInfo.imagesCount}
                    </span>
                  </div>

                  <div className="mt-2 border-t border-zinc-800 pt-3">
                    <div className="text-zinc-400">Kommentar</div>
                    <div className="mt-1 text-zinc-200">
                      {submissionInfo.note || "Ingen"}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-6">
              <button
                className="h-12 w-full rounded-2xl bg-amber-400 px-4 flex items-center justify-center text-zinc-950 font-semibold active:opacity-90"
                onClick={onClick}
              >
                ← {returnLabel} / send
              </button>
            </div>

          </div>
        </main>
      </div>
    );
  }
