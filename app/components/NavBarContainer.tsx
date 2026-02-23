"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { useFridge } from "@/app/components/FridgeProvider";

export default function NavBarContainer() {
    const { isNavBarVisible } = useFridge();
    const pathname = usePathname();
    // NavBarを表示させないパスのリスト
    const hideNavBarPaths = ["/", "/login", "/register", "/tokusho", "/privacy", "/terms"];
    const shouldHideNavBar = hideNavBarPaths.includes(pathname) || !isNavBarVisible;

    if (shouldHideNavBar) return null;

    return <NavBar />;
}
