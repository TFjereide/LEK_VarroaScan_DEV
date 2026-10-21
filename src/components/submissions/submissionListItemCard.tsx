import { useAuth } from "@/app/auth-provider";
import { appendAdminContext } from "@/lib/adminNavigation";
import { formatDateTime, formatWorkerLabel, getStatusUi, getTypeLabel, VarroaSubmissionRecord } from "@/lib/varroaWorkflow";

interface SubmissionListItemcardParams{
    item: VarroaSubmissionRecord;
    returnTo: string;
    assignedTo: string;
    deletingID?: string|null;
    // returnTo :string;
    onDelete? : ((id: string, title: string) => Promise<void>)
}


export function SubmissionListItemcard({item, returnTo, assignedTo, deletingID, onDelete}:SubmissionListItemcardParams) {

    const {user, authedActions} = useAuth();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    const ui = getStatusUi(item.status);

    const rowCols = authedActions.canDeleteAnything
        ? "grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_0.8fr_0.9fr_1.1fr_110px_minmax(0,1fr)] lg:items-center"
        : "grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_0.8fr_0.9fr_1.1fr_110px] lg:items-center";
    const isDeleting = deletingID === item.id;

    // const returnTo = encodeURIComponent(`${basePath}/admin/innsendinger/?view=${view}`)

    return (
        <div
            key={item.id}
            className="px-5 py-4 hover:bg-zinc-950/60"
        >
            <div className={`grid ${rowCols}`}>
                <a
                    href={
                        `${basePath}/admin/innsendinger/innsending/?id=${encodeURIComponent(item.id)}&returnto=${encodeURIComponent(returnTo)}`
                    }
                    className="contents"
                >
                    <div>
                        <div className="text-sm font-semibold text-zinc-50">
                            {getTypeLabel(item.type)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                            Opprettet {formatDateTime(item.created_at)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm text-zinc-300">
                            {item.note || "Ingen kommentar fra innsendingen."}
                        </div>
                    </div>

                    <div className="lg:justify-self-start">
                        <div
                            className={[
                                "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                                ui.chipClass,
                            ].join(" ")}
                        >
                            {ui.label}
                        </div>
                    </div>

                    <div className="text-sm text-zinc-300">{assignedTo}</div>
                    {/* GAMMEL: item.manual_mite_count (kolonnen finnes ikke
                              lenger - midd telles nå per bilde). NY: viser "—" her
                              i listen; det faktiske antallet ser du på
                              arbeidsflate-siden når du åpner saken. */}
                    <div className="text-sm text-zinc-300">—</div>
                    <div className="text-sm text-zinc-300">
                        {formatDateTime(item.updated_at ?? item.created_at)}
                    </div>
                    <div className="text-sm font-semibold text-amber-300">Åpne →</div>
                </a>
                {authedActions.canDeleteAnything && onDelete && deletingID ? (
                    <div className="mt-3 flex justify-end sm:mt-0">
                        <button
                            type="button"
                            onClick={() => void onDelete(item.id, getTypeLabel(item.type))}
                            disabled={isDeleting || deletingID !== null}
                            className={[
                                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition",
                                isDeleting
                                    ? "border-red-900/70 bg-red-950/60 text-red-100"
                                    : "border-red-900/40 bg-red-950/20 text-red-200 hover:bg-red-950/40 disabled:opacity-60",
                            ].join(" ")}
                        >
                            {isDeleting ? "Sletter…" : "🗑️ Slett sak"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}