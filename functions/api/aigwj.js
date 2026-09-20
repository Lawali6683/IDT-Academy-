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

    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-flash-latest"
    ];

    let lastErrorData = null;
    let apiResponse = null;

    for (const modelName of modelsToTry) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      apiResponse = await fetch(geminiEndpoint, {
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

      if (apiResponse.ok) {
        lastErrorData = null;
        break;
      }

      lastErrorData = await apiResponse.json();
    }

    if (!apiResponse || !apiResponse.ok) {
      return new Response(
        JSON.stringify({
          status: apiResponse ? apiResponse.status : 500,
          statusText: apiResponse ? apiResponse.statusText : "Server Error",
          error: lastErrorData
        }),
        { status: apiResponse ? apiResponse.status : 500, headers: corsHeaders }
      );
    }

    const responseData = await apiResponse.json();
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
