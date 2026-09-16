"use client";

type SubmissionButtonSectionProps = {
    isSubmitting: boolean;
    onSubmit: () => Promise<void>;
    bottomOverlayPx : number;
}

export function SubmissionButtonSection({isSubmitting, onSubmit, bottomOverlayPx} : SubmissionButtonSectionProps){

    return (
        <div
        className="fixed inset-x-0 z-40 border-t border-zinc-800 bg-zinc-950"
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + ${bottomOverlayPx}px)`,
        }}
        >
        <div className="mx-auto w-full max-w-xl px-4 py-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="h-12 w-full rounded-2xl bg-amber-400 text-zinc-950 font-semibold active:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Sender…" : "Send inn"}
          </button>
          <div className="mt-2 text-center text-[11px] text-zinc-500">
            Metadata: tidspunkt, route, device, appversjon.
          </div>
        </div>
      </div>
    )
}