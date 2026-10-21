"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent as ReactWheelEvent } from "react";
import {
    // createSignedIssionHistory,
    type VarroaSubmissionImageReview,
} from "@/lib/varroaWorkflow";


export function createDraftFromImageReview(
    review: VarroaSubmissionImageReview,
    imageNotes: unknown,
): ImageReviewDraft {
    const annotations = extractAnnotationsFromImageNotes(imageNotes, review.image_index);
    const explicitMiteCount = review.mite_count != null ? String(review.mite_count) : "";
    // If annotations exist (new flow) → use their count as authoritative count.
    // Otherwise: fall back to whatever explicit count was stored in the row.
    const miteCountInput =
        annotations.length > 0 ? String(annotations.length) : explicitMiteCount;
    return {
        id: review.id,
        imageIndex: review.image_index,
        miteCountInput,
        imageQuality: review.image_quality ?? "",
        comment: review.comment ?? "",
        trainingReady: Boolean(review.training_ready),
        approved: Boolean(review.approved),
        annotations,
    };
}


function cryptoRandomId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}



/**
 * Bounding box for a detected varroa mite.
 * Coordinates are NORMALIZED to the source image (0..1 range), so the dataset
 * is independent of image resolution and ready for Roboflow / YOLO export.
 *
 *  x = left edge   (0 = leftmost pixel in source image, 1 = rightmost)
 *  y = top edge    (0 = top,            1 = bottom)
 *  w = width of the box, expressed as fraction of source image width
 *  h = height of the box, expressed as fraction of source image height
 *
 * Roboflow Pascal VOC / YOLO conversion is straightforward from this shape.
 */
export type VarroaBoundingBox = {
    id: string;
    class_name: "varroa_mite";
    x: number; // 0..1, left
    y: number; // 0..1, top
    w: number; // 0..1, width
    h: number; // 0..1, height
};

export type ImageReviewDraft = {
    id?: string;
    imageIndex: number;
    miteCountInput: string;
    imageQuality: string;
    comment: string;
    trainingReady: boolean;
    approved: boolean;
    /**
     * Per-image Roboflow-ready varroa annotations.
     * When boxes are drawn: miteCountInput is kept in sync = boxes.length automatically.
     */
    annotations: VarroaBoundingBox[];
};

export function createEmptyImageDraft(imageIndex: number): ImageReviewDraft {
    return {
        imageIndex,
        miteCountInput: "",
        imageQuality: "",
        comment: "",
        trainingReady: false,
        approved: false,
        annotations: [],
    };
}

/**
 * Load annotations from legacy `image_notes` JSON if available.
 * The review payload stores per-image entries with an `annotations` key.
 */
export function extractAnnotationsFromImageNotes(
    imageNotes: unknown,
    imageIndex: number,
): VarroaBoundingBox[] {
    if (!imageNotes || typeof imageNotes !== "object") return [];
    if (!Array.isArray(imageNotes)) return [];
    const entry = (imageNotes as unknown[]).find(
        (e) =>
            !!e &&
            typeof e === "object" &&
            "image_index" in (e as Record<string, unknown>) &&
            (e as { image_index: number }).image_index === imageIndex,
    );
    if (!entry || typeof entry !== "object") return [];
    const rec = entry as Record<string, unknown>;
    const raw = rec.annotations;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((b) => {
            if (!b || typeof b !== "object") return null;
            const obj = b as Record<string, unknown>;
            const id = typeof obj.id === "string" ? obj.id : cryptoRandomId();
            const cn = typeof obj.class_name === "string" ? obj.class_name : "varroa_mite";
            const x = typeof obj.x === "number" ? obj.x : NaN;
            const y = typeof obj.y === "number" ? obj.y : NaN;
            const w = typeof obj.w === "number" ? obj.w : NaN;
            const h = typeof obj.h === "number" ? obj.h : NaN;
            if (![x, y, w, h].every(Number.isFinite)) return null;
            if (w <= 0 || h <= 0) return null;
            return {
                id,
                class_name: cn === "varroa_mite" ? cn : "varroa_mite",
                x: Math.max(0, Math.min(1, x)),
                y: Math.max(0, Math.min(1, y)),
                w: Math.max(0.0005, Math.min(1, w)),
                h: Math.max(0.0005, Math.min(1, h)),
            } satisfies VarroaBoundingBox;
        })
        .filter((b): b is VarroaBoundingBox => !!b);
}



/**
 * Zoomable / pannable / annotatable image view with Roboflow-ready varroa bboxes.
 *
 * Interactions:
 *  - Default mode = MARK midd (click + drag on image creates a numbered bbox).
 *  - PAN mode: drag to pan, scroll/double-click/pinch to zoom.
 *  - Any mode: hold SHIFT + drag → force pan (useful while MARK mode to scroll around).
 *  - Two fingers (touch): pinch-zoom + pan (never draws a bbox).
 *  - Numbers on bboxes = counting order. Antall midd auto = boxes.length.
 *  - X on each bbox deletes it. "Angre siste" and "Slett alle" available.
 *
 * Coordinates: bboxes are normalized 0..1 to source image, ready for Roboflow later.
 */
export function ZoomableAnnotatedImage({
    src,
    alt,
    boxes,
    onBoxesChange,
    disabled,
}: {
    src: string;
    alt: string;
    boxes: VarroaBoundingBox[];
    onBoxesChange: (next: VarroaBoundingBox[]) => void;
    disabled?: boolean;
}) {
    const MIN_SCALE = 1;
    const MAX_SCALE = 10;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [scale, setScale] = useState(1);
    const [tx, setTx] = useState(0);
    const [ty, setTy] = useState(0);
    const [mode, setMode] = useState<"MARK" | "PAN">("MARK");
    const [drawing, setDrawing] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);

    const viewRef = useRef({ scale: 1, tx: 0, ty: 0 });
    useEffect(() => {
        viewRef.current = { scale, tx, ty };
    }, [scale, tx, ty]);

    // Reset when switching images
    useEffect(() => {
        setScale(1);
        setTx(0);
        setTy(0);
        setDrawing(null);
    }, [src]);

    const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchState = useRef<{
        startDist: number;
        startScale: number;
        startMidX: number;
        startMidY: number;
        startTx: number;
        startTy: number;
    } | null>(null);
    const dragState = useRef<{
        startX: number;
        startY: number;
        startTx: number;
        startTy: number;
        moved: boolean;
    } | null>(null);
    const drawKeysPressed = useRef({ shift: false });
    const clickCandidate = useRef<
        | { type: "box"; id: string; t: number; x: number; y: number; moved: boolean }
        | { type: "draw"; t: number; x: number; y: number; moved: boolean }
        | null
    >(null);
    const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);

    // Track SHIFT held on window for "force pan during MARK mode".
    useEffect(() => {
        const onKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Shift") drawKeysPressed.current.shift = true;
        };
        const onKeyUp = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Shift") drawKeysPressed.current.shift = false;
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const getImageDisplayRect = () => {
        const img = imgRef.current;
        const box = containerRef.current;
        if (!img || !box) return null;
        const cRect = box.getBoundingClientRect();
        const iWidth = img.clientWidth;
        const iHeight = img.clientHeight;
        const left = (cRect.width - iWidth) / 2;
        const top = (cRect.height - iHeight) / 2;
        return {
            containerClientLeft: cRect.left,
            containerClientTop: cRect.top,
            containerWidth: cRect.width,
            containerHeight: cRect.height,
            imgLeft: left,
            imgTop: top,
            imgWidth: iWidth,
            imgHeight: iHeight,
        };
    };

    const clientToNormalized = (
        clientX: number,
        clientY: number,
    ): { x: number; y: number } | null => {
        const r = getImageDisplayRect();
        const v = viewRef.current;
        if (!r) return null;
        const localX = clientX - r.containerClientLeft;
        const localY = clientY - r.containerClientTop;
        const cx = r.containerWidth / 2;
        const cy = r.containerHeight / 2;
        const untransformedX = (localX - cx - v.tx) / Math.max(0.001, v.scale) + cx;
        const untransformedY = (localY - cy - v.ty) / Math.max(0.001, v.scale) + cy;
        const imgRelX = untransformedX - r.imgLeft;
        const imgRelY = untransformedY - r.imgTop;
        if (imgRelX < 0 || imgRelY < 0 || imgRelX > r.imgWidth || imgRelY > r.imgHeight) {
            return null;
        }
        return {
            x: imgRelX / Math.max(1, r.imgWidth),
            y: imgRelY / Math.max(1, r.imgHeight),
        };
    };

    const boxHitTest = (clientX: number, clientY: number): { hit: boolean; id: string | null } => {
        const norm = clientToNormalized(clientX, clientY);
        if (!norm) return { hit: false, id: null };
        for (let i = boxes.length - 1; i >= 0; i -= 1) {
            const b = boxes[i];
            if (norm.x >= b.x && norm.x <= b.x + b.w && norm.y >= b.y && norm.y <= b.y + b.h) {
                return { hit: true, id: b.id };
            }
        }
        return { hit: false, id: null };
    };

    const clampTxTy = (
        nextScale: number,
        nextTx: number,
        nextTy: number,
    ): [number, number] => {
        const img = imgRef.current;
        const box = containerRef.current;
        if (!img || !box || nextScale <= 1) return [0, 0];
        const rect = box.getBoundingClientRect();
        const imgW = img.clientWidth || rect.width;
        const imgH = img.clientHeight || rect.height;
        const maxTx = Math.max(0, (imgW * nextScale - rect.width) / 2);
        const maxTy = Math.max(0, (imgH * nextScale - rect.height) / 2);
        return [
            Math.max(-maxTx, Math.min(maxTx, nextTx)),
            Math.max(-maxTy, Math.min(maxTy, nextTy)),
        ];
    };

    const applyZoomAt = (
        clientX: number,
        clientY: number,
        newScale: number,
    ) => {
        const box = containerRef.current;
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        if (!box) {
            setScale(nextScale);
            const [txN, tyN] = clampTxTy(nextScale, 0, 0);
            setTx(txN);
            setTy(tyN);
            viewRef.current = { scale: nextScale, tx: txN, ty: tyN };
            return;
        }
        const rect = box.getBoundingClientRect();
        const px = clientX - rect.left - rect.width / 2;
        const py = clientY - rect.top - rect.height / 2;
        const cur = viewRef.current;
        const k = nextScale / Math.max(0.0001, cur.scale);
        const nextTxRaw = px - (px - cur.tx) * k;
        const nextTyRaw = py - (py - cur.ty) * k;
        const [txN, tyN] = clampTxTy(nextScale, nextTxRaw, nextTyRaw);
        viewRef.current = { scale: nextScale, tx: txN, ty: tyN };
        setScale(nextScale);
        setTx(txN);
        setTy(tyN);
    };

    const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
        if (viewRef.current.scale === 1 && e.deltaY > 0) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        applyZoomAt(e.clientX, e.clientY, viewRef.current.scale * factor);
    };

    const startPanFromPointer = (clientX: number, clientY: number) => {
        const cur = viewRef.current;
        dragState.current = {
            startX: clientX,
            startY: clientY,
            startTx: cur.tx,
            startTy: cur.ty,
            moved: false,
        };
    };

    const movePan = (clientX: number, clientY: number) => {
        const st = dragState.current;
        if (!st) return;
        const cur = viewRef.current;
        const dx = clientX - st.startX;
        const dy = clientY - st.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.moved = true;
        if (cur.scale <= 1) return;
        const [txN, tyN] = clampTxTy(cur.scale, st.startTx + dx, st.startTy + dy);
        viewRef.current = { ...cur, tx: txN, ty: tyN };
        setTx(txN);
        setTy(tyN);
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 2) {
            const arr = Array.from(pointers.current.values());
            const [p1, p2] = arr;
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const cur = viewRef.current;
            pinchState.current = {
                startDist: dist,
                startScale: cur.scale,
                startMidX: midX,
                startMidY: midY,
                startTx: cur.tx,
                startTy: cur.ty,
            };
            dragState.current = null;
            clickCandidate.current = null;
            setDrawing(null);
            return;
        }

        if (pointers.current.size !== 1) return;

        const shiftHeld =
            drawKeysPressed.current.shift ||
            (typeof e.shiftKey === "boolean" ? e.shiftKey : false);
        const wantPan = mode === "PAN" || shiftHeld || disabled;

        if (wantPan) {
            startPanFromPointer(e.clientX, e.clientY);
            pinchState.current = null;
            clickCandidate.current = null;
            setDrawing(null);
            return;
        }

        const norm = clientToNormalized(e.clientX, e.clientY);
        if (!norm) {
            startPanFromPointer(e.clientX, e.clientY);
            clickCandidate.current = null;
            setDrawing(null);
            return;
        }

        const hit = boxHitTest(e.clientX, e.clientY);
        if (hit.hit && hit.id) {
            clickCandidate.current = {
                type: "box",
                id: hit.id,
                t: performance.now(),
                x: e.clientX,
                y: e.clientY,
                moved: false,
            };
            dragState.current = null;
            pinchState.current = null;
            setDrawing(null);
            return;
        }

        clickCandidate.current = {
            type: "draw",
            t: performance.now(),
            x: e.clientX,
            y: e.clientY,
            moved: false,
        };
        dragState.current = null;
        pinchState.current = null;
        setDrawing({
            startX: norm.x,
            startY: norm.y,
            endX: norm.x,
            endY: norm.y,
        });
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinchState.current && pointers.current.size === 2) {
            const arr = Array.from(pointers.current.values());
            const [p1, p2] = arr;
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const ps = pinchState.current;
            const k = dist / Math.max(0.0001, ps.startDist);
            const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, ps.startScale * k));

            const box = containerRef.current?.getBoundingClientRect();
            if (box) {
                const cx = ps.startMidX - box.left - box.width / 2;
                const cy = ps.startMidY - box.top - box.height / 2;
                const kRatio = nextScale / Math.max(0.0001, ps.startScale);
                const nTx = cx - (cx - ps.startTx) * kRatio + (midX - ps.startMidX);
                const nTy = cy - (cy - ps.startTy) * kRatio + (midY - ps.startMidY);
                const [txN, tyN] = clampTxTy(nextScale, nTx, nTy);
                viewRef.current = { scale: nextScale, tx: txN, ty: tyN };
                setScale(nextScale);
                setTx(txN);
                setTy(tyN);
            } else {
                viewRef.current.scale = nextScale;
                setScale(nextScale);
            }
            if (clickCandidate.current) clickCandidate.current.moved = true;
            return;
        }

        if (clickCandidate.current && !clickCandidate.current.moved) {
            const dx = e.clientX - clickCandidate.current.x;
            const dy = e.clientY - clickCandidate.current.y;
            if (Math.hypot(dx, dy) > 4) {
                clickCandidate.current.moved = true;
                if (clickCandidate.current.type === "box") {
                    startPanFromPointer(e.clientX, e.clientY);
                }
            }
        }

        if (drawing && pointers.current.size === 1 && pinchState.current == null) {
            const n = clientToNormalized(e.clientX, e.clientY);
            if (n) {
                setDrawing({
                    startX: drawing.startX,
                    startY: drawing.startY,
                    endX: Math.max(0, Math.min(1, n.x)),
                    endY: Math.max(0, Math.min(1, n.y)),
                });
            }
            return;
        }

        if (pointers.current.size === 1 && dragState.current && pinchState.current == null) {
            movePan(e.clientX, e.clientY);
        }
    };

    const finalizePointerEnd = (
        e: PointerEvent<HTMLDivElement>,
        commitDraw: boolean,
    ) => {
        const target = e.currentTarget;
        try { target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        pointers.current.delete(e.pointerId);

        if (pointers.current.size < 2) pinchState.current = null;

        if (commitDraw && clickCandidate.current && !clickCandidate.current.moved) {
            const cand = clickCandidate.current;
            clickCandidate.current = null;
            if (cand.type === "box") {
                onBoxesChange(boxes.filter((b) => b.id !== cand.id));
                setDrawing(null);
                dragState.current = null;
                return;
            }
        }
        clickCandidate.current = null;

        if (commitDraw && drawing && pointers.current.size === 0) {
            const b = drawing;
            setDrawing(null);
            const x = Math.min(b.startX, b.endX);
            const y = Math.min(b.startY, b.endY);
            const w = Math.max(b.endX, b.startX) - x;
            const h = Math.max(b.endY, b.startY) - y;
            if (w > 0.001 && h > 0.001) {
                const id = cryptoRandomId();
                const next: VarroaBoundingBox = {
                    id,
                    class_name: "varroa_mite",
                    x: Math.max(0, Math.min(1, x)),
                    y: Math.max(0, Math.min(1, y)),
                    w: Math.max(0.0005, Math.min(1, w)),
                    h: Math.max(0.0005, Math.min(1, h)),
                };
                onBoxesChange([...boxes, next]);
            }
            dragState.current = null;
            return;
        }

        if (!commitDraw) {
            setDrawing(null);
        }

        if (pointers.current.size === 0) dragState.current = null;
    };

    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        finalizePointerEnd(e, true);
    };

    const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
        finalizePointerEnd(e, false);
    };

    const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (drawing) return;
        if (viewRef.current.scale > 1.05) {
            setScale(1);
            setTx(0);
            setTy(0);
            viewRef.current = { scale: 1, tx: 0, ty: 0 };
        } else {
            applyZoomAt(e.clientX, e.clientY, 3);
        }
    };

    const zoomBy = (factor: number) => {
        const box = containerRef.current?.getBoundingClientRect();
        const cx = box ? box.left + box.width / 2 : 0;
        const cy = box ? box.top + box.height / 2 : 0;
        applyZoomAt(cx, cy, viewRef.current.scale * factor);
    };

    const deleteBox = (id: string) => {
        onBoxesChange(boxes.filter((b) => b.id !== id));
    };

    const undoLast = () => {
        onBoxesChange(boxes.slice(0, -1));
    };

    const clearAll = () => {
        onBoxesChange([]);
    };

    const normalizedToCssPx = (b: VarroaBoundingBox) => {
        const r = getImageDisplayRect();
        if (!r) return null;
        const left = r.imgLeft + b.x * r.imgWidth;
        const top = r.imgTop + b.y * r.imgHeight;
        const width = b.w * r.imgWidth;
        const height = b.h * r.imgHeight;
        return { left, top, width, height };
    };

    const normalizedRectToCssPx = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ) => {
        const r = getImageDisplayRect();
        if (!r) return null;
        const left = r.imgLeft + Math.min(x1, x2) * r.imgWidth;
        const top = r.imgTop + Math.min(y1, y2) * r.imgHeight;
        const width = Math.max(Math.abs(x2 - x1) * r.imgWidth, 1);
        const height = Math.max(Math.abs(y2 - y1) * r.imgHeight, 1);
        return { left, top, width, height };
    };

    return (
        <div className="relative select-none">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={[
                            "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                            boxes.length === 0
                                ? "border border-zinc-700 bg-zinc-950 text-zinc-300"
                                : "border border-amber-400/40 bg-amber-500/10 text-amber-300",
                        ].join(" ")}
                    >
                        🐝 Antall midd markert: <span className="font-bold text-amber-200">{boxes.length}</span>
                    </span>
                    <div className="inline-flex overflow-hidden rounded-xl border border-zinc-700 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setMode("MARK")}
                            disabled={disabled}
                            className={[
                                "h-9 px-3 transition",
                                mode === "MARK"
                                    ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                                    : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
                                disabled ? "opacity-60" : "",
                            ].join(" ")}
                        >
                            ✏️ Markér midd
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("PAN")}
                            className={[
                                "h-9 px-3 transition",
                                mode === "PAN"
                                    ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                                    : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
                            ].join(" ")}
                        >
                            ✋ Pan/zoom
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={undoLast}
                        disabled={disabled || boxes.length === 0}
                        className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 active:opacity-90 disabled:opacity-50"
                    >
                        ↶ Angre siste
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={disabled || boxes.length === 0}
                        className="h-9 rounded-xl border border-red-900/50 bg-red-950/30 px-3 text-xs font-semibold text-red-300 hover:bg-red-950/50 active:opacity-90 disabled:opacity-50"
                    >
                        🗑️ Slett alle
                    </button>
                </div>
            </div>

            <div
                ref={containerRef}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onDoubleClick={onDoubleClick}
                className={[
                    "relative overflow-hidden rounded-3xl bg-zinc-950",
                    mode === "MARK" && !disabled ? "cursor-crosshair" : "",
                    mode === "PAN" ? "cursor-grab active:cursor-grabbing" : "",
                ].join(" ")}
                style={{ touchAction: "none" }}
            >
                <div
                    className="relative flex h-[55vh] w-full items-center justify-center xl:h-[70vh]"
                    style={{
                        transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                        transformOrigin: "center center",
                        transition: "transform 80ms ease-out",
                    }}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt}
                        draggable={false}
                        className="h-auto max-h-full w-auto max-w-full object-contain select-none"
                    />

                    {boxes.map((b) => {
                        const px = normalizedToCssPx(b);
                        if (!px) return null;
                        const hovered = hoveredBoxId === b.id;
                        return (
                            <div
                                key={b.id}
                                className="pointer-events-auto absolute"
                                style={{
                                    left: px.left,
                                    top: px.top,
                                    width: px.width,
                                    height: px.height,
                                }}
                                onPointerEnter={() => setHoveredBoxId(b.id)}
                                onPointerLeave={() =>
                                    setHoveredBoxId((prev) => (prev === b.id ? null : prev))
                                }
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!disabled) onBoxesChange(boxes.filter((x) => x.id !== b.id));
                                }}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <div
                                    className={[
                                        "absolute inset-0 transition",
                                        hovered && !disabled
                                            ? "border-[3px] border-red-500 bg-red-500/15"
                                            : "border-[2.5px] border-amber-400 bg-amber-400/10",
                                    ].join(" ")}
                                    style={
                                        hovered && !disabled
                                            ? {
                                                boxShadow:
                                                    "0 0 0 1px rgba(0,0,0,0.6) inset, 0 0 18px 1px rgba(239,68,68,0.55)",
                                                cursor: "pointer",
                                            }
                                            : {
                                                boxShadow: "0 0 0 1px rgba(0,0,0,0.6) inset",
                                                cursor: disabled ? "default" : "pointer",
                                            }
                                    }
                                />
                            </div>
                        );
                    })}

                    {drawing ? (() => {
                        const px = normalizedRectToCssPx(
                            drawing.startX,
                            drawing.startY,
                            drawing.endX,
                            drawing.endY,
                        );
                        if (!px) return null;
                        return (
                            <div
                                className="pointer-events-none absolute"
                                style={{
                                    left: px.left,
                                    top: px.top,
                                    width: px.width,
                                    height: px.height,
                                }}
                            >
                                <div className="absolute inset-0 border-2 border-dashed border-amber-300 bg-amber-300/20" />
                            </div>
                        );
                    })() : null}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-zinc-300">
                <span className="mr-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                    Zoom: {Math.round(scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() => zoomBy(2 / 1.5)}
                    className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 hover:bg-zinc-900 active:opacity-90"
                >
                    ➕ Zoom inn
                </button>
                <button
                    type="button"
                    onClick={() => zoomBy(1.5 / 2)}
                    className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 hover:bg-zinc-900 active:opacity-90"
                >
                    ➖ Zoom ut
                </button>
                <button
                    type="button"
                    onClick={() => zoomBy(3 / Math.max(0.001, scale))}
                    className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 hover:bg-zinc-900 active:opacity-90"
                >
                    🔍 300%
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setScale(1);
                        setTx(0);
                        setTy(0);
                        viewRef.current = { scale: 1, tx: 0, ty: 0 };
                    }}
                    className="h-9 rounded-xl border border-zinc-700 bg-zinc-950 px-3 hover:bg-zinc-900 active:opacity-90"
                >
                    ↺ Tilpass
                </button>
            </div>

            <div className="mt-2 text-center text-[11px] text-zinc-500">
                ✏️ Markér-modus: trykk og dra rundt EN midd for å lage en firkant. Klikk på en
                firkant for å fjerne den. Hold SHIFT for å panorere mens du merker. Mobil: knip to
                fingre for å zoome, dra med én finger for å tegne.
            </div>
        </div>
    );
}