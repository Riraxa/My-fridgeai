"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/app/components/NavBar";

export default function NavBarContainer() {
    const pathname = usePathname();
    // NavBarを表示させないパスのリスト
    const hideNavBarPaths = ["/", "/login", "/register", "/tokusho", "/privacy", "/terms"];
    const shouldHideNavBar = hideNavBarPaths.includes(pathname);

    if (shouldHideNavBar) return null;

    return <NavBar />;
}
