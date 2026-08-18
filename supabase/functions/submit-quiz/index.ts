import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QUIZ_VERSION = "odyssey-v1";
const ANSWER_KEY = [1, 0, 1, 1];
const appOrigin = Deno.env.get("APP_ORIGIN");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function corsHeaders(origin: string | null) {
  if (!appOrigin || origin !== appOrigin) {
    return null;
  }
  return {
    "Access-Control-Allow-Origin": appOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

Deno.serve(async request => {
  const headers = corsHeaders(request.headers.get("Origin"));
  if (!headers) {
    return new Response("Origin not allowed", { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, headers);
  }
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Missing required Supabase environment variables.");
    return json({ error: "Quiz service is not configured." }, 500, headers);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return json({ error: "Sign-in is required." }, 401, headers);
    }
    const studentClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await studentClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Your sign-in session is not valid." }, 401, headers);
    }

    const payload = await request.json();
    const answers = payload?.answers;
    const writtenResponse = typeof payload?.writtenResponse === "string"
      ? payload.writtenResponse.trim()
      : "";
    const hasValidAnswers =
      Array.isArray(answers) &&
      answers.length === ANSWER_KEY.length &&
      answers.every((answer: unknown) => Number.isInteger(answer) && answer >= 0 && answer <= 2);

    if (!hasValidAnswers || writtenResponse.length < 10 || writtenResponse.length > 2000) {
      return json({ error: "Please complete every question and use 10–2000 characters for the written response." }, 400, headers);
    }

    const score = answers.reduce(
      (total: number, answer: number, index: number) => total + Number(answer === ANSWER_KEY[index]),
      0
    );
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: attempt, error: insertError } = await adminClient
      .from("quiz_attempts")
      .insert({
        student_id: userData.user.id,
        quiz_version: QUIZ_VERSION,
        answers,
        written_response: writtenResponse,
        score,
        total_questions: ANSWER_KEY.length
      })
      .select("score,total_questions,submitted_at")
      .single();

    if (insertError?.code === "23505") {
      return json({ error: "You have already submitted this quiz." }, 409, headers);
    }
    if (insertError) {
      console.error("Unable to save quiz attempt.", insertError);
      return json({ error: "Your response could not be saved." }, 500, headers);
    }
    return json(attempt, 201, headers);
  } catch (error) {
    console.error("Unexpected quiz submission failure.", error);
    return json({ error: "Your response could not be submitted." }, 500, headers);
  }
});
