// __tests__/JoinForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JoinForm from "../app/household/join/JoinForm";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}));

// Mock Sonner toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
    toast: {
        error: (...args: any[]) => mockToastError(...args),
        success: (...args: any[]) => mockToastSuccess(...args),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("JoinForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders correctly", () => {
        render(<JoinForm token="test-token" />);
        expect(screen.getByText("招待リンクから家族グループに参加しますか？")).toBeInTheDocument();
    });

    it("handles successful join", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<JoinForm token="test-token" />);

        const button = screen.getByRole("button", { name: "参加する" });
        fireEvent.click(button);

        expect(button).toHaveTextContent("参加中...");
        expect(global.fetch).toHaveBeenCalledWith("/api/household/join", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ token: "test-token" }),
        }));

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("家族グループに参加しました！");
            expect(mockPush).toHaveBeenCalledWith("/settings/family");
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("handles failed join with custom error", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "無効または期限切れの招待リンクです。" }),
        });

        render(<JoinForm token="bad-token" />);

        const button = screen.getByRole("button", { name: "参加する" });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("無効または期限切れの招待リンクです。");
            expect(mockPush).not.toHaveBeenCalled();
        });
    });
});
