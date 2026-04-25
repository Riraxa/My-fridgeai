import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeFoodImageAgent } from "@/lib/agents/image-analyzer";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image data is required and must be a base64 string" },
        { status: 400 }
      );
    }

    const result = await analyzeFoodImageAgent(image);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("[analyze-image API] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
