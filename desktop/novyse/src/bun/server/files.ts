import { join } from "path";
import { writeFile, stat } from "fs/promises";

export async function handleFileGet(
  key: string,
  filesDir: string,
  corsHeaders: HeadersInit,
): Promise<Response> {
  const filePath = join(filesDir, key);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    let mimeType = "application/octet-stream";
    try {
      const mimeFile = Bun.file(filePath + ".mime");
      if (await mimeFile.exists()) {
        mimeType = (await mimeFile.text()).trim();
      }
    } catch {}

    return new Response(file, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  }

  return new Response("File Not Found", { status: 404, headers: corsHeaders });
}

export async function handleFilePost(
  key: string,
  filesDir: string,
  req: Request,
  corsHeaders: HeadersInit,
): Promise<Response> {
  const filePath = join(filesDir, key);
  try {
    const mimeType =
      req.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await req.arrayBuffer();

    await writeFile(filePath, Buffer.from(arrayBuffer));
    await writeFile(filePath + ".mime", mimeType);

    const fileStats = await stat(filePath);
    return new Response(
      JSON.stringify({ success: true, size: fileStats.size }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

export async function handleFileDownload(
  filesDir: string,
  req: Request,
  corsHeaders: HeadersInit,
): Promise<Response> {
  try {
    const { url, key } = await req.json();
    if (!url || !key) {
      throw new Error("Missing url or key");
    }
    const destination = join(filesDir, key);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await Bun.write(destination, response);

    const mimeType =
      response.headers.get("content-type") || "application/octet-stream";
    await writeFile(destination + ".mime", mimeType);

    const fileStats = await stat(destination);
    return new Response(
      JSON.stringify({ success: true, size: fileStats.size }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

export async function handleFileCopy(
  filesDir: string,
  req: Request,
  corsHeaders: HeadersInit,
): Promise<Response> {
  try {
    const { sourcePath, key } = await req.json();
    if (!sourcePath || !key) {
      throw new Error("Missing sourcePath or key");
    }
    const destination = join(filesDir, key);

    const sourceFile = Bun.file(sourcePath);
    await Bun.write(destination, sourceFile);

    const mimeType = sourceFile.type || "application/octet-stream";
    await writeFile(destination + ".mime", mimeType);

    const fileStats = await stat(destination);
    return new Response(
      JSON.stringify({ success: true, size: fileStats.size }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}
