const C = window.HAWKS_CONFIG || {};
let db = null, t = null;
const $ = id => document.getElementById(id);

async function boot() {
  if (!C.supabaseUrl || !C.supabasePublishableKey) return;

  try {
    db = supabase.createClient(
      C.supabaseUrl,
      C.supabasePublishableKey
    );

    let r = await db
      .from("tournaments")
      .select("*")
.eq("is_published", true)
.order("created_at", { ascending: false });

    if (r.error) throw r.error;
    if (!r.data) throw Error("Tournament unavailable");

    t = r.data;
    $("tid").value = t.id;
    $("dbStatus").textContent =
      "✓ Database connected — registration ready.";
    $("dbStatus").className = "ok";
  } catch (e) {
    console.error(e);
  }
}

$("reg").onsubmit = async e => {
  e.preventDefault();

  if (!db || !t)
    return alert("Database is not connected yet.");

  let p = {
    p_tournament_id: t.id,
    p_team_name: $("team").value.trim(),
    p_team_logo_url: "",
    p_igl_name: $("igl").value.trim(),
    p_igl_uid: $("uid").value.trim(),
    p_igl_mobile: $("mobile").value.trim(),
    p_player2_name: $("p2").value.trim(),
    p_player2_uid: $("u2").value.trim(),
    p_player3_name: $("p3").value.trim(),
    p_player3_uid: $("u3").value.trim(),
    p_player4_name: $("p4").value.trim(),
    p_player4_uid: $("u4").value.trim()
  };

  let r = await db.rpc("create_registration", p);

  if (r.error)
    return alert(r.error.message);

  let id = Array.isArray(r.data)
    ? r.data[0]?.registration_id
    : r.data?.registration_id ?? r.data;

  if (!id)
    return alert(
      "Registration created, but Registration ID could not be read. Check database."
    );

  $("success").innerHTML =
    "<b>REGISTRATION SUCCESSFUL</b><br>" +
    "Registration ID: <strong>" + id + "</strong><br>" +
    "Save this ID for status checks.";

  $("reg").reset();
};

$("check").onsubmit = async e => {
  e.preventDefault();

  if (!db)
    return alert("Database is not connected yet.");

  let r = await db.rpc("check_registration", {
    p_registration_id: $("rid").value.trim()
  });

  if (r.error)
    return $("result").textContent = "Registration not found.";

  let x = Array.isArray(r.data) ? r.data[0] : r.data;

  $("result").innerHTML = x
    ? "Team: <b>" + x.team_name + "</b><br>" +
      "Status: <b>" + x.status + "</b><br>" +
      "Registration ID: <b>" + x.registration_id + "</b>"
    : "Registration not found.";
};

boot();
