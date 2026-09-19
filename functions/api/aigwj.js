export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  try {
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key ba a saita shi a Cloudflare Environment Variables ba (GEMINI_API_KEY)." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const requestData = await context.request.json();
    const { prompt, image, mimeType } = requestData;

    const parts = [];

    if (prompt) {
      parts.push({ text: prompt });
    }

    if (image && mimeType) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: image
        }
      });
    }

    if (parts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dole ne ka tura rubutu ko hoto." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiEndpoint, {
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

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          error: responseData
        }),
        { status: apiResponse.status, headers: corsHeaders }
      );
    }

    const outputText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Babu sakon amsa da ya dawo.";

    return new Response(
      JSON.stringify({ text: outputText, fullResponse: responseData }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Server Error occurred",
        message: err.message,
        stack: err.stack
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
