import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Not authenticated");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
