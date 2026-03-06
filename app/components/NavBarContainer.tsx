"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { useFridge } from "@/app/components/FridgeProvider";

export default function NavBarContainer() {
    const { isNavBarVisible } = useFridge();
    const pathname = usePathname();
    // NavBarを表示させないパスのリスト
    const hideNavBarPaths = ["/", "/login", "/register", "/tokusho", "/privacy", "/terms"];
    // 認証関連パスも非表示にする
    const shouldHideNavBar = hideNavBarPaths.includes(pathname) || 
                             pathname.startsWith("/auth/") || 
                             !isNavBarVisible;

    if (shouldHideNavBar) return null;

    return <NavBar />;
}
