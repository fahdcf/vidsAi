import { api } from "../api";
import type { MotionReferenceSelection } from "./ReferencePicker";
import type { ReferenceAnalysis } from "../../../../shared/motion/reference";

export type SavedMotionReference = {
    bindingId: string;
    assetId: string;
    name: string;
    available: boolean;
    url: string;
    metadata: {
        kind: "video" | "image";
        width: number;
        height: number;
        interval: { start: number; end: number } | null;
        sha256: string;
    };
    analysis: ReferenceAnalysis | null;
};

const base = (projectId: number) => `/projects/${projectId}/motion-reference`;

export async function uploadMotionReference(projectId: number, source: MotionReferenceSelection, signal: AbortSignal, relinkBindingId?: string) {
    const form = new FormData();
    form.append("file", source.file);
    const { asset_id: assetId } = await api<{ asset_id: string }>(`/projects/${projectId}/assets`, form, "POST", signal);
    return bindUploadedMotionReference(projectId, assetId, source, signal, relinkBindingId);
}

export async function bindUploadedMotionReference(
    projectId: number, assetId: string, metadata: Pick<MotionReferenceSelection, "width" | "height" | "interval">, signal: AbortSignal,
    relinkBindingId?: string,
) {
    const { reference } = await api<{ reference: SavedMotionReference }>(base(projectId), {
        assetId, width: metadata.width, height: metadata.height, interval: metadata.interval, relinkBindingId,
    }, "PUT", signal);
    return reference;
}

export async function loadMotionReference(projectId: number, signal: AbortSignal) {
    const { reference } = await api<{ reference: SavedMotionReference | null }>(base(projectId), undefined, "GET", signal);
    return reference;
}

export async function storeMotionReferenceAnalysis(projectId: number, bindingId: string, analysis: ReferenceAnalysis, signal: AbortSignal) {
    const { reference } = await api<{ reference: SavedMotionReference }>(
        base(projectId) + "/analysis", { bindingId, analysis }, "POST", signal,
    );
    return reference;
}
