"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
    /** Debounce delay in ms before triggering save (default: 1500) */
    debounceMs?: number;
    /** Duration to show "saved" state in ms before reverting (default: 1000) */
    savedDisplayMs?: number;
    /** The save function. Receives value and AbortSignal. */
    onSave: (value: string, signal: AbortSignal) => Promise<void>;
}

/**
 * Production-grade auto-save hook with:
 * - AbortController to cancel in-flight requests on new input
 * - Monotonic requestId (useRef) to discard stale responses
 * - Unmount cleanup (abort + clear timers)
 * - Dirty detection via currentValue !== lastSavedValue comparison
 */
export function useAutoSave(
    currentValue: string,
    initialServerValue: string,
    options: UseAutoSaveOptions,
) {
    const {
        debounceMs = 1500,
        savedDisplayMs = 1000,
        onSave,
    } = options;

    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Refs for concurrency control
    const requestIdRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedValueRef = useRef(initialServerValue);
    const onSaveRef = useRef(onSave);
    const mountedRef = useRef(true);

    // Keep onSave ref fresh without re-triggering effects
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    // Sync initialServerValue when it changes (e.g., after initial fetch)
    useEffect(() => {
        lastSavedValueRef.current = initialServerValue;
    }, [initialServerValue]);

    // Dirty detection: compare current value with last saved value
    const isDirty = currentValue !== lastSavedValueRef.current;

    // Update save state to dirty when value changes
    useEffect(() => {
        if (isDirty && saveState !== "saving") {
            setSaveState("dirty");
            setErrorMessage(null);

            // Clear any "saved" display timer
            if (savedTimerRef.current) {
                clearTimeout(savedTimerRef.current);
                savedTimerRef.current = null;
            }
        } else if (!isDirty && saveState === "dirty") {
            // User reverted to saved value
            setSaveState("idle");
        }
    }, [isDirty, saveState]);

    // Core save logic
    const executeSave = useCallback(
        async (value: string) => {
            // Abort previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Increment and capture request ID
            requestIdRef.current += 1;
            const thisRequestId = requestIdRef.current;

            if (!mountedRef.current) return;
            setSaveState("saving");
            setErrorMessage(null);

            try {
                await onSaveRef.current(value, controller.signal);

                // Stale response guard
                if (thisRequestId !== requestIdRef.current) return;
                if (!mountedRef.current) return;

                lastSavedValueRef.current = value;
                setSaveState("saved");

                // Revert to idle after display duration
                savedTimerRef.current = setTimeout(() => {
                    if (!mountedRef.current) return;
                    setSaveState((prev) => (prev === "saved" ? "idle" : prev));
                }, savedDisplayMs);
            } catch (err: any) {
                // Ignore aborted requests
                if (err?.name === "AbortError") return;
                if (thisRequestId !== requestIdRef.current) return;
                if (!mountedRef.current) return;

                setSaveState("error");
                setErrorMessage(err?.message || "保存に失敗しました");
            }
        },
        [savedDisplayMs],
    );

    // Debounced trigger: re-fires when currentValue changes and is dirty
    useEffect(() => {
        if (!isDirty) return;

        // Clear previous debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            executeSave(currentValue);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [currentValue, isDirty, debounceMs, executeSave]);

    // Unmount cleanup
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (savedTimerRef.current) {
                clearTimeout(savedTimerRef.current);
            }
        };
    }, []);

    // Manual retry (for error state)
    const retry = useCallback(() => {
        executeSave(currentValue);
    }, [currentValue, executeSave]);

    return { saveState, errorMessage, retry };
}
