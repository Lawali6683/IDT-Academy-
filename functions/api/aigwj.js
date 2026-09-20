export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}

export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key is missing in environment variables." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await context.request.json();
    const promptText = body.prompt || "";
    const base64Image = body.image || null;
    const mimeType = body.mimeType || "image/jpeg";

    const parts = [];

    if (promptText) {
      parts.push({ text: promptText });
    }

    if (base64Image) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Image
        }
      });
    }

    if (parts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Payload must contain prompt text or image data." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ]
      })
    });

    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          status: geminiResponse.status,
          statusText: geminiResponse.statusText,
          geminiErrorDetails: responseData
        }),
        { status: geminiResponse.status, headers: corsHeaders }
      );
    }

    const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Ba a samu amsa ba.";

    return new Response(
      JSON.stringify({ reply: replyText }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Execution Exception",
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
