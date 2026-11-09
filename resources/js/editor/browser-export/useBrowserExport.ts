import { useEffect, useRef, useState } from "react";
import type { Document } from "@vidsai/contracts";
import type { BrowserExportJob } from "./job-store";
import type { BrowserExportProgress } from "./jobs";
import type { BrowserExportQuality } from "./profile";

export function useBrowserExport(accountId: string, projectId: string) {
    const [job, setJob] = useState<BrowserExportJob>();
    const [status, setStatus] = useState<BrowserExportProgress>();
    const [outputUrl, setOutputUrl] = useState("");
    const [error, setError] = useState("");
    const [active, setActive] = useState(false);
    const controller = useRef<AbortController | undefined>(undefined);
    const output = useRef("");
    const mounted = useRef(false);
    const scope = { accountId, projectId };

    function showFile(file?: File) {
        if (output.current) URL.revokeObjectURL(output.current);
        output.current = file ? URL.createObjectURL(file) : "";
        setOutputUrl(output.current);
    }

    useEffect(() => {
        let disposed = false;
        mounted.current = true;
        async function restore() {
            try {
                const jobs = await import("./jobs");
                const saved = await jobs.loadBrowserExport(scope);
                if (disposed || controller.current || !saved) return;
                setJob(saved);
                if (saved.output) {
                    const file = await jobs.getBrowserExportFile(scope, saved.output.id);
                    if (!disposed && !controller.current) showFile(file);
                }
            } catch (e) {
                if (!disposed && !controller.current) setError((e as Error).message);
            }
        }
        void restore();
        return () => {
            disposed = true;
            mounted.current = false;
            controller.current?.abort();
            if (output.current) URL.revokeObjectURL(output.current);
            output.current = "";
        };
    }, [accountId, projectId]);

    async function start(getSnapshot: () => Promise<Document>, retry: boolean, quality: BrowserExportQuality = "standard") {
        if (controller.current) return;
        const abort = new AbortController();
        controller.current = abort;
        setActive(true);
        setError("");
        setStatus(undefined);
        try {
            const snapshot = retry ? job?.snapshot : await getSnapshot();
            if (!snapshot) throw new Error("No saved export is available to retry.");
            const jobs = await import("./jobs");
            const result = await jobs.runBrowserExport(scope, snapshot, {}, abort.signal, (update) => {
                if (mounted.current) setStatus(update);
            }, retry ? job?.quality ?? "standard" : quality);
            if (mounted.current) {
                setJob(result.job);
                showFile(result.file);
            }
        } catch (e) {
            if (!abort.signal.aborted && mounted.current) setError((e as Error).message);
            try {
                const jobs = await import("./jobs");
                const saved = await jobs.loadBrowserExport(scope);
                if (mounted.current) setJob(saved);
            } catch {}
        } finally {
            controller.current = undefined;
            if (mounted.current) {
                setActive(false);
                setStatus(undefined);
            }
        }
    }

    return { job, status, outputUrl, error, active, start, cancel: () => controller.current?.abort() };
}
