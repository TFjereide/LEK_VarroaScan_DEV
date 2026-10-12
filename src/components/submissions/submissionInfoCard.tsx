import { useAuth } from "@/app/auth-provider"
import {
    formatDateTime, 
    formatWorkerLabel, 
    getStatusUi,
    getTypeLabel, 
    VarroaSubmissionRecord
} from "@/lib/varroaWorkflow";


interface SubmissionInfoCardProps {
    submission: VarroaSubmissionRecord;
    approvedBy: string;
}


export function SubmissionInfoCard({ submission, approvedBy }: SubmissionInfoCardProps) {

    // console.log("PROPS: ", props)
    const { authedActions } = useAuth();

    const currentStatusUi = getStatusUi(submission?.status ?? "NY");

    // return (<div>test</div>)

    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-xl font-semibold text-zinc-50">
                        {
                            getTypeLabel(submission.type)
                        }
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                        Innsendt {formatDateTime(submission.created_at)} • ID {submission.id}
                    </div>
                </div>
                <div
                    className={[
                        "rounded-full border px-4 py-1.5 text-[11px] font-semibold",
                        // currentStatusUi.chipClass,
                    ].join(" ")}
                >
                {currentStatusUi.label}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
                <div>
                    <div className="text-zinc-500">Tildelt</div>
                    <div className="mt-1">{formatWorkerLabel(authedActions.userId, submission.assigned_to)}</div>
                </div>
                <div>
                    <div className="text-zinc-500">Forste sjekk</div>
                    <div className="mt-1">{formatWorkerLabel(authedActions.userId, submission.processed_by)}</div>
                </div>
                <div>
                    <div className="text-zinc-500">Godkjent av</div>
                    {/* GAMMEL: submission.approved_by (kolonnen finnes ikke lenger).
                                NY: findApprovedBy(history) leter i historikken etter
                                siste gang saken ble GODKJENT/KLAR_FOR_TRENING. */}
                    <div className="mt-1">{formatWorkerLabel(authedActions.userId, approvedBy)}</div>
                </div>
                <div>
                    <div className="text-zinc-500">Oppdatert</div>
                    <div className="mt-1">{formatDateTime(submission.updated_at ?? submission.created_at)}</div>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-200">
                {submission.note || "Ingen kommentar fra innsendingen."}
            </div>
        </section>
    );
}