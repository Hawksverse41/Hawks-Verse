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

// =========================================================
// PARTICIPANT EDIT REGISTRATION
// Verification: Registration ID + IGL Mobile
// =========================================================

const editVerifyForm = document.getElementById("editVerify");
const editForm = document.getElementById("editForm");

if (editVerifyForm) {
  editVerifyForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const rid = document.getElementById("editRid").value.trim();
    const mobile = document.getElementById("editMobile").value.trim();

    const message = document.getElementById("editMessage");

    if (!rid || !mobile) {
      message.textContent = "Please enter Registration ID and IGL Mobile Number.";
      return;
    }

    message.textContent = "Verifying registration...";

    const { data, error } = await db.rpc(
      "get_registration_for_edit",
      {
        p_registration_id: rid,
        p_igl_mobile: mobile
      }
    );

    if (error) {
      console.error(error);
      message.textContent = "Verification failed. Please try again.";
      return;
    }

    const r = Array.isArray(data) ? data[0] : data;

    if (!r) {
      message.textContent =
        "Registration ID or IGL Mobile Number is incorrect.";
      return;
    }

    // Store verification details
    document.getElementById("editOriginalRid").value = r.registration_id;
    document.getElementById("editOriginalMobile").value = mobile;

    // Load registration details
    document.getElementById("editTeam").value = r.team_name || "";
    document.getElementById("editIgl").value = r.igl_name || "";
    document.getElementById("editIglUid").value = r.igl_uid || "";
    document.getElementById("editNewMobile").value = r.igl_mobile || "";

    document.getElementById("editP2").value = r.player2_name || "";
    document.getElementById("editUid2").value = r.player2_uid || "";

    document.getElementById("editP3").value = r.player3_name || "";
    document.getElementById("editUid3").value = r.player3_uid || "";

    document.getElementById("editP4").value = r.player4_name || "";
    document.getElementById("editUid4").value = r.player4_uid || "";

    document.getElementById("editCurrentStatus").innerHTML =
      "Current Status: <b>" + (r.status || "") + "</b>";

    message.textContent =
      "✓ Verification successful. You can edit your details below.";

    editForm.style.display = "block";
  });
}


// =========================================================
// SAVE PARTICIPANT CHANGES
// =========================================================

if (editForm) {
  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const result = document.getElementById("editResult");

    const rid =
      document.getElementById("editOriginalRid").value.trim();

    const originalMobile =
      document.getElementById("editOriginalMobile").value.trim();

    const team =
      document.getElementById("editTeam").value.trim();

    const igl =
      document.getElementById("editIgl").value.trim();

    const iglUid =
      document.getElementById("editIglUid").value.trim();

    const newMobile =
      document.getElementById("editNewMobile").value.trim();

    const p2 =
      document.getElementById("editP2").value.trim();

    const uid2 =
      document.getElementById("editUid2").value.trim();

    const p3 =
      document.getElementById("editP3").value.trim();

    const uid3 =
      document.getElementById("editUid3").value.trim();

    const p4 =
      document.getElementById("editP4").value.trim();

    const uid4 =
      document.getElementById("editUid4").value.trim();

    if (
      !rid ||
      !originalMobile ||
      !team ||
      !igl ||
      !iglUid ||
      !newMobile ||
      !p2 ||
      !uid2 ||
      !p3 ||
      !uid3 ||
      !p4 ||
      !uid4
    ) {
      result.textContent = "Please fill all fields.";
      return;
    }

    result.textContent = "Saving changes...";

    const { data, error } = await db.rpc(
      "update_registration_by_verification",
      {
        p_registration_id: rid,
        p_igl_mobile: originalMobile,
        p_team_name: team,
        p_igl_name: igl,
        p_igl_uid: iglUid,
        p_new_igl_mobile: newMobile,
        p_player2_name: p2,
        p_player2_uid: uid2,
        p_player3_name: p3,
        p_player3_uid: uid3,
        p_player4_name: p4,
        p_player4_uid: uid4
      }
    );

    if (error) {
      console.error(error);

      result.textContent =
        error.message ||
        "Unable to save changes. Please check your details.";
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;

    result.innerHTML =
      "<b>✓ Registration updated successfully.</b><br>" +
      "Registration ID: <b>" +
      rid +
      "</b><br>" +
      "Status remains: <b>" +
      (updated && updated.status ? updated.status : "unchanged") +
      "<br><br>" +
      "Your changes have been saved. HAWKS VERSE will review the updated details.";

    document.getElementById("editCurrentStatus").innerHTML =
      "Current Status: <b>" +
      (updated && updated.status ? updated.status : "") +
      "</b>";
  });
}
// Start
boot();
