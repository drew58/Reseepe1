// Lovable AI recipe search - generates recipe suggestions from a query or ingredients list
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, ingredients } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const userPrompt = ingredients?.length
      ? `Suggest 6 globally diverse recipes a home cook could make using mostly these ingredients: ${ingredients.join(", ")}. Include match_percent (0-100) reflecting how well each uses the given ingredients.`
      : `Suggest 6 globally diverse recipes related to: "${query}". Cover different cuisines and preparation styles. match_percent should be 100 for each.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a global recipe assistant. Always respond with valid JSON only." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recipes",
              description: "Return recipe suggestions",
              parameters: {
                type: "object",
                properties: {
                  recipes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        cuisine: { type: "string" },
                        creator: { type: "string", description: "Fictional chef name with a region" },
                        cook_time_minutes: { type: "number" },
                        cost_usd: { type: "number" },
                        ingredients: { type: "array", items: { type: "string" } },
                        difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                        match_percent: { type: "number" },
                        description: { type: "string" },
                      },
                      required: ["title", "creator", "cook_time_minutes", "cost_usd", "ingredients", "difficulty", "match_percent"],
                    },
                  },
                },
                required: ["recipes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recipes" } },
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { recipes: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
