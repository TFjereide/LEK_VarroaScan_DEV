"use client";

import * as utils from "@/lib/utils";
import { CommonHeader } from "@/components/header";


type AfterSubmissionSectionProps = {
    returnUrl : string | null;
    returnLabel : string;
    isOnline : boolean;
    lastSubmission : utils.Submission | null;
    onClick : () => void;

}

export function AfterSubmissionSection({returnUrl, returnLabel, isOnline, lastSubmission, onClick} : AfterSubmissionSectionProps){
    const sentTypeLabel = lastSubmission?.type === "KONTROLLFOTO" ? "Kontrollfoto" : "Bunnbrett foto";

    return (
      <div className="flex flex-col min-h-dvh px-4 pb-10 pt-8">
        
        <CommonHeader url={returnUrl} label={returnLabel} isOnline={isOnline}></CommonHeader>

        <main className="mx-auto mt-10 w-full max-w-xl">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-2xl font-semibold">Takk!</div>
            <div className="mt-2 text-zinc-300">
              Innsendingen er mottatt. Vil du sende inn flere?
            </div>

            {lastSubmission ? (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
                <div>Type: {sentTypeLabel}</div>
                <div>Antall bilder: {lastSubmission.imagesCount}</div>
                <div className="mt-2 text-zinc-300">
                  Kommentar: {lastSubmission.note ? lastSubmission.note : "Ingen"}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-3">
         
              {returnUrl ? (
                <a
                  href={returnUrl}
                  className="h-12 rounded-2xl bg-amber-400 px-4 flex items-center justify-center text-zinc-950 font-semibold active:opacity-90"
                >
                  ← {returnLabel} / send
                </a>
              ) : null}
        
            </div>
          </div>
        </main>
      </div>
    );
  }
