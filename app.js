const C = window.HAWKS_CONFIG || {};
let db = null;
let t = null;

const $ = id => document.getElementById(id);

async function boot() {
  if (!C.supabaseUrl || !C.supabasePublishableKey) {
    if ($("dbStatus")) {
      $("dbStatus").textContent = "Database configuration missing.";
    }
    return;
  }

  try {
    db = supabase.createClient(
      C.supabaseUrl,
      C.supabasePublishableKey
    );

    const r = await db
      .from("tournaments")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (r.error) throw r.error;

    t = r.data?.[0];

    if (!t) {
      throw new Error("Tournament unavailable");
    }

    const poster =
      t.poster_url || "assets/weekly-wars-s2.png";

    // Homepage
    if ($("heroPoster")) $("heroPoster").src = poster;
    if ($("tournamentPoster")) $("tournamentPoster").src = poster;

    if ($("heroName")) {
      $("heroName").textContent = t.name;
    }

    if ($("tournamentName")) {
      $("tournamentName").textContent = t.name;
    }

    if ($("formTitle")) {
      $("formTitle").textContent = t.name;
    }

    if ($("heroPrize")) {
      $("heroPrize").textContent =
        `₹${Number(t.prize_pool || 0).toLocaleString("en-IN")} PRIZE POOL`;
    }

    if ($("prizeFact")) {
      $("prizeFact").textContent =
        `₹${Number(t.prize_pool || 0).toLocaleString("en-IN")}`;
    }

    if ($("heroStatus")) {
      $("heroStatus").textContent =
        String(t.status || "UPCOMING").toUpperCase();
    }

    // Registration page
    if ($("tid")) {
      $("tid").value = t.id;
    }

    if ($("dbStatus")) {
      $("dbStatus").textContent =
        "✓ Database connected — registration ready.";
      $("dbStatus").className = "ok";
    }

  } catch (e) {
    console.error("HAWKS VERSE:", e);

    if ($("dbStatus")) {
      $("dbStatus").textContent =
        "Database connection failed. Please try again.";
      $("dbStatus").className = "error";
    }
  }
}


// ===============================
// REGISTRATION
// ===============================

const registrationForm = $("reg");

if (registrationForm) {
  registrationForm.onsubmit = async e => {
    e.preventDefault();

    if (!db || !t) {
      alert("Database is not connected yet.");
      return;
    }

    const p = {
      p_tournament_id: t.id,
      p_team_name: $("team").value.trim(),
      p_team_logo_url: "",
      p_igl_name: $("igl").value.trim(),
      p_igl_uid: $("uid1").value.trim(),
      p_igl_mobile: $("mobile").value.trim(),
      p_player2_name: $("p2").value.trim(),
      p_player2_uid: $("uid2").value.trim(),
      p_player3_name: $("p3").value.trim(),
      p_player3_uid: $("uid3").value.trim(),
      p_player4_name: $("p4").value.trim(),
      p_player4_uid: $("uid4").value.trim()
    };

    const r = await db.rpc(
      "create_registration",
      p
    );

    if (r.error) {
      alert(r.error.message);
      return;
    }

    const id = Array.isArray(r.data)
      ? r.data[0]?.registration_id
      : r.data?.registration_id ?? r.data;

    if (!id) {
      alert(
        "Registration created, but Registration ID could not be read."
      );
      return;
    }

    if ($("result")) {
      $("result").innerHTML =
        "<b>REGISTRATION SUCCESSFUL</b><br>" +
        "Registration ID: <strong>" +
        id +
        "</strong><br>" +
        "Save this ID for status checks.";
    }

    registrationForm.reset();
  };
}


// ===============================
// REGISTRATION STATUS CHECK
// ===============================

const checkForm = $("check");

if (checkForm) {
  checkForm.onsubmit = async e => {
    e.preventDefault();

    if (!db) {
      alert("Database is not connected yet.");
      return;
    }

    const registrationId =
      $("rid").value.trim();

    if (!registrationId) {
      return;
    }

    const r = await db.rpc(
      "check_registration",
      {
        p_registration_id: registrationId
      }
    );

    if (r.error) {
      if ($("checkResult")) {
        $("checkResult").textContent =
          "Registration not found.";
      }
      return;
    }

    const x = Array.isArray(r.data)
      ? r.data[0]
      : r.data;

    if ($("checkResult")) {
      $("checkResult").innerHTML = x
        ? "Team: <b>" + x.team_name + "</b><br>" +
          "Status: <b>" + x.status + "</b><br>" +
          "Registration ID: <b>" +
          x.registration_id +
          "</b>"
        : "Registration not found.";
    }
  };
}


// Start
boot();
