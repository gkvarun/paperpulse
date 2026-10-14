const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
const id = () => crypto.randomUUID();
const hex = (bytes) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const bytes = (s) => new TextEncoder().encode(s);
const hash = async (s) => hex(await crypto.subtle.digest("SHA-256", bytes(s)));
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", bytes(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes(salt), iterations: 210000, hash: "SHA-256" }, key, 256));
}
const corsHeaders = (request, env) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Vary": "Origin" };
};
function response(request, env, data, status = 200) { return json(data, status, corsHeaders(request, env)); }
async function body(request) { try { return await request.json(); } catch { return {}; } }
async function currentUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return await env.DB.prepare("SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.deleted_at IS NULL").bind(await hash(token)).first();
}
function requireText(v, min, max) { return typeof v === "string" && v.trim().length >= min && v.trim().length <= max; }
export default {
 async fetch(request, env) {
  const cors = corsHeaders(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(request.url), path = url.pathname;
  try {
   if (path === "/api/health" && request.method === "GET") return response(request, env, { ok: true, service: "PaperPulse API" });
   if (path === "/api/auth/register" && request.method === "POST") {
    const b = await body(request), email = String(b.email || "").trim().toLowerCase(), display = String(b.display_name || "").trim(), password = b.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !requireText(display, 2, 60) || !requireText(password, 10, 128)) return response(request, env, { error: "invalid_input", message: "Enter a valid email, a 2–60 character display name and a password of at least 10 characters." }, 400);
    if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) return response(request, env, { error: "email_exists", message: "An account with that email already exists." }, 409);
    const userId = id(), salt = hex(crypto.getRandomValues(new Uint8Array(16))), digest = await passwordHash(password, salt), token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO users(id,email,display_name,password_salt,password_hash) VALUES(?,?,?,?,?)").bind(userId,email,display,salt,digest).run();
    await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+7 days'))").bind(id(),userId,await hash(token)).run();
    return response(request, env, { token, user: { id:userId,email,display_name:display,role:"student" } }, 201);
   }
   if (path === "/api/auth/login" && request.method === "POST") {
    const b = await body(request), email = String(b.email || "").trim().toLowerCase();
    const user = await env.DB.prepare("SELECT id,email,display_name,role,password_salt,password_hash FROM users WHERE email=? AND deleted_at IS NULL").bind(email).first();
    if (!user || !user.password_salt || !user.password_hash || await passwordHash(String(b.password || ""), user.password_salt) !== user.password_hash) return response(request, env, { error:"invalid_credentials", message:"Email or password is incorrect." }, 401);
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,datetime('now','+7 days'))").bind(id(),user.id,await hash(token)).run();
    return response(request, env, { token, user:{id:user.id,email:user.email,display_name:user.display_name,role:user.role} });
   }
   if (path.startsWith("/api/auth/")) {
    const user = await currentUser(request, env);
    if (path === "/api/auth/me" && request.method === "GET") return user ? response(request,env,{user}) : response(request,env,{error:"unauthorized"},401);
    if (path === "/api/auth/logout" && request.method === "POST") {
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hash(token)).run();
      return response(request,env,{ok:true});
    }
    return response(request,env,{error:"unauthorized"},401);
   }
   if (path === "/api/subjects" && request.method === "GET") {
    const {results=[]} = await env.DB.prepare("SELECT id,name,qualification,syllabus_code FROM subjects WHERE active=1 ORDER BY qualification,name").all();
    return response(request,env,{subjects:results});
   }
   if (path === "/api/topics" && request.method === "GET") {
    const sid = url.searchParams.get("subject_id");
    if (!sid) return response(request,env,{error:"subject_id_required"},400);
    const {results=[]} = await env.DB.prepare("SELECT id,subject_id,name,parent_topic_id,syllabus_version FROM topics WHERE subject_id=? ORDER BY sort_order,name").bind(sid).all();
    return response(request,env,{topics:results});
   }
   if (path === "/api/resources" && request.method === "GET") {
    const where = ["published=1","rights_status IN ('authorized_link','licensed_file','open_license')"], values = [];
    for (const [param,col] of [["qualification","qualification"],["resource_type","resource_type"],["exam_year","exam_year"],["subject_id","subject_id"]]) { const v=url.searchParams.get(param); if(v){where.push(col+"=?");values.push(v)} }
    const {results=[]} = await env.DB.prepare("SELECT id,subject_id,topic_id,qualification,syllabus_code,resource_type,exam_year,session,paper_code,variant,title,source_url,rights_status,license_note FROM resources WHERE "+where.join(" AND ")+" ORDER BY exam_year DESC,title LIMIT 200").bind(...values).all();
    return response(request,env,{resources:results});
   }
   const user = await currentUser(request, env);
   if (path === "/api/attempts" && request.method === "GET") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    const {results=[]}=await env.DB.prepare("SELECT id,resource_id,topic_id,score,max_score,duration_seconds,attempted_at,notes FROM attempts WHERE user_id=? ORDER BY attempted_at DESC LIMIT 200").bind(user.id).all();
    return response(request,env,{attempts:results});
   }
   if (path === "/api/attempts" && request.method === "POST") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    const b=await body(request); if(b.score!=null&&(!Number.isFinite(Number(b.score))||Number(b.score)<0))return response(request,env,{error:"invalid_score"},400);
    const attemptId=id(); await env.DB.prepare("INSERT INTO attempts(id,user_id,resource_id,topic_id,score,max_score,duration_seconds,notes) VALUES(?,?,?,?,?,?,?,?)").bind(attemptId,user.id,b.resource_id||null,b.topic_id||null,b.score??null,b.max_score??null,b.duration_seconds??null,requireText(b.notes||"",0,500)?(b.notes||null):null).run();
    return response(request,env,{id:attemptId,ok:true},201);
   }
   if (path === "/api/saved" && request.method === "GET") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    const {results=[]}=await env.DB.prepare("SELECT r.id,r.title,r.resource_type,r.exam_year,r.source_url FROM saved_resources s JOIN resources r ON r.id=s.resource_id WHERE s.user_id=? ORDER BY s.created_at DESC").bind(user.id).all();
    return response(request,env,{resources:results});
   }
   if (path === "/api/saved" && request.method === "POST") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    const b=await body(request);if(!requireText(b.resource_id,1,128))return response(request,env,{error:"resource_id_required"},400);
    const resource=await env.DB.prepare("SELECT id FROM resources WHERE id=? AND published=1 AND rights_status IN ('authorized_link','licensed_file','open_license')").bind(b.resource_id).first();
    if(!resource)return response(request,env,{error:"resource_unavailable"},404);
    await env.DB.prepare("INSERT OR IGNORE INTO saved_resources(user_id,resource_id) VALUES(?,?)").bind(user.id,b.resource_id).run();return response(request,env,{ok:true},201);
   }
   if (path.startsWith("/api/saved/") && request.method === "DELETE") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    await env.DB.prepare("DELETE FROM saved_resources WHERE user_id=? AND resource_id=?").bind(user.id,decodeURIComponent(path.split("/").pop())).run();return response(request,env,{ok:true});
   }
   if (path === "/api/discussions" && request.method === "GET") {
    const {results=[]}=await env.DB.prepare("SELECT d.id,d.title,d.body,d.created_at,d.subject_id,u.display_name,COUNT(r.id) AS reply_count FROM discussions d JOIN users u ON u.id=d.user_id LEFT JOIN replies r ON r.discussion_id=d.id AND r.status='published' WHERE d.status='published' GROUP BY d.id ORDER BY d.created_at DESC LIMIT 100").all();return response(request,env,{discussions:results});
   }
   if (path === "/api/discussions" && request.method === "POST") {
    if(!user)return response(request,env,{error:"unauthorized"},401);
    const b=await body(request);if(!requireText(b.title,5,160)||!requireText(b.body,10,5000))return response(request,env,{error:"invalid_input",message:"Title must be 5–160 characters and post 10–5000 characters."},400);
    const discussionId=id();await env.DB.prepare("INSERT INTO discussions(id,user_id,subject_id,title,body) VALUES(?,?,?,?,?)").bind(discussionId,user.id,b.subject_id||null,b.title.trim(),b.body.trim()).run();return response(request,env,{id:discussionId,ok:true},201);
   }
   if (path.startsWith("/api/discussions/") && path.endsWith("/replies")) {
    const discussionId=decodeURIComponent(path.split("/")[3]);
    if(request.method==="GET"){const {results=[]}=await env.DB.prepare("SELECT r.id,r.body,r.created_at,u.display_name FROM replies r JOIN users u ON u.id=r.user_id WHERE r.discussion_id=? AND r.status='published' ORDER BY r.created_at").bind(discussionId).all();return response(request,env,{replies:results})}
    if(request.method==="POST"){if(!user)return response(request,env,{error:"unauthorized"},401);const b=await body(request);if(!requireText(b.body,1,3000))return response(request,env,{error:"invalid_reply"},400);const rid=id();await env.DB.prepare("INSERT INTO replies(id,discussion_id,user_id,body) VALUES(?,?,?,?)").bind(rid,discussionId,user.id,b.body.trim()).run();return response(request,env,{id:rid,ok:true},201)}
   }
   if (path === "/api/admin/overview" && request.method === "GET") {
    if(!user||!["admin","moderator"].includes(user.role))return response(request,env,{error:"forbidden"},403);
    const [users,resources,unverified,reports]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) n FROM users WHERE deleted_at IS NULL").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM resources").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM resources WHERE rights_status='unverified'").first(),
      env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE status='open'").first()
    ]);
    return response(request,env,{users:users?.n||0,resources:resources?.n||0,unverified_resources:unverified?.n||0,open_reports:reports?.n||0});
   }
   return response(request,env,{error:"not_found",message:"API route not found."},404);
  } catch (err) {
   console.error("PaperPulse API error", err?.message || "unknown");
   return response(request,env,{error:"internal_error",message:"Something went wrong. Please try again."},500);
  }
 }
};
