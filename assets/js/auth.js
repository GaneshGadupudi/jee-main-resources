// Supabase authentication for all pages. Load after the Supabase CDN script, layout.js and script.js.
// Body attributes control behaviour:
//   data-guest-only  : login/signup pages (logged-in users are sent onward)
//   data-protected   : resources page (needs login and a chosen exam)
//   data-needs-login : onboarding page (needs login only)
(function () {
  var SUPABASE_URL = "https://bhrwxpiozrsobvbvpefz.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_x-KKTk9DTPWNfUEIr_tJpw_MEktf6Oa"; // public key only. Never put a secret key here.

  var $ = function (id) { return document.getElementById(id); };
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.sb = sb;
  var body = document.body;

  function say(text, type) {
    var m = $("msg");
    if (m) { m.textContent = text; m.className = "msg " + (type || ""); }
  }

  function nameOf(u) {
    var m = u.user_metadata || {};
    return m.name || m.full_name || (u.email || "").split("@")[0];
  }

  // Reads exams from the profiles table (falls back to old user metadata). Creates the profile row if missing.
  async function getExams(user) {
    var r = await sb.from("profiles").select("exams").eq("id", user.id).maybeSingle();
    if (r.error) console.warn("profiles read failed:", r.error.message);
    if (!r.error && !r.data) {
      var ins = await sb.from("profiles").insert({ id: user.id, name: nameOf(user), email: user.email });
      if (ins.error) console.warn("profiles insert failed:", ins.error.message);
    }
    var ex = r.data && r.data.exams;
    if (!ex || !ex.length) ex = (user.user_metadata || {}).exams;
    return Array.isArray(ex) ? ex : [];
  }

  async function route(user) {
    var ex = await getExams(user);
    location.replace(ex.length ? "index.html" : "onboarding.html");
  }

  function navState(on, user) {
    document.querySelectorAll(".guest-only").forEach(function (el) { el.hidden = on; });
    document.querySelectorAll(".member-only").forEach(function (el) { el.hidden = !on; });
    if ($("welcome")) {
      $("welcome").hidden = !user;
      if (user) $("welcome").textContent = "Welcome, " + nameOf(user);
    }
    if ($("loginLink")) $("loginLink").hidden = on;
    if ($("signupLink")) $("signupLink").hidden = on;
    if ($("logoutBtn")) $("logoutBtn").hidden = !on;
  }

  async function applyState(session) {
    var on = !!session;
    navState(on, session && session.user);
    if (body.hasAttribute("data-guest-only") && on) return route(session.user);
    if (body.hasAttribute("data-needs-login")) {
      if (!on) return location.replace("login.html");
      if ($("hi")) $("hi").textContent = "Hi, " + nameOf(session.user) + "!";
      var cur = await getExams(session.user);
      document.querySelectorAll('input[name="exam"]').forEach(function (b) { b.checked = cur.indexOf(b.value) !== -1; });
      if ($("examGo")) $("examGo").disabled = cur.length === 0;
    }
    if (body.hasAttribute("data-protected")) {
      if (!on) { $("gate").hidden = false; $("app").hidden = true; return; }
      var ex = await getExams(session.user);
      if (!ex.length) return location.replace("onboarding.html");
      $("gate").hidden = true;
      $("app").hidden = false;
    }
  }

  sb.auth.getSession().then(function (r) { applyState(r.data.session); });
  sb.auth.onAuthStateChange(function (event, s) {
    if (event === "SIGNED_OUT") navState(false);
  });

  if ($("logoutBtn")) {
    $("logoutBtn").addEventListener("click", function () {
      sb.auth.signOut().then(function () { location.href = "index.html"; });
    });
  }

  if ($("googleBtn")) {
    $("googleBtn").addEventListener("click", function () {
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/login.html" } })
        .then(function (r) { if (r.error) say(r.error.message, "err"); });
    });
  }

  // Forgot password: sends a reset link to the email typed in the form.
  if ($("forgot")) {
    $("forgot").addEventListener("click", async function () {
      var email = $("email").value.trim();
      if (!email) return say("Type your email above, then click Forgot password.", "err");
      say("Sending reset link...");
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/reset-password.html" });
      if (r.error) return say(r.error.message, "err");
      say("If that email has an account, a reset link is on its way. Check your inbox.", "ok");
    });
  }

  // Login, signup and reset-password form
  var form = $("authForm");
  if (form) {
    var mode = form.dataset.mode;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var pass = $("password").value;
      var email = $("email") ? $("email").value.trim() : "";
      var name = $("name") ? $("name").value.trim() : "";
      if (mode === "signup" && !name) return say("Enter your name.", "err");
      if (mode !== "reset" && !email) return say("Enter your email.", "err");
      if (!pass) return say("Enter your password.", "err");
      if (mode !== "login" && pass.length < 6) return say("Password must be at least 6 characters.", "err");

      $("go").disabled = true;
      var r;
      if (mode === "signup") {
        say("Creating your account...");
        r = await sb.auth.signUp({ email: email, password: pass, options: { data: { name: name }, emailRedirectTo: location.origin + "/login.html" } });
      } else if (mode === "reset") {
        say("Saving your new password...");
        r = await sb.auth.updateUser({ password: pass });
      } else {
        say("Logging in...");
        r = await sb.auth.signInWithPassword({ email: email, password: pass });
      }
      $("go").disabled = false;
      if (r.error) {
        var bad = mode === "login" && /invalid login credentials/i.test(r.error.message);
        return say(bad ? "Incorrect email or password." : r.error.message, "err");
      }

      var user = (r.data.session && r.data.session.user) || r.data.user;
      if (mode === "signup" && !r.data.session) return say("Account created. Check your email to confirm it, then log in.", "ok");
      if (mode === "reset") say("Password updated.", "ok");
      route(user);
    });
  }

  // Exam selection (onboarding page)
  var examForm = $("examForm");
  if (examForm) {
    var boxes = Array.prototype.slice.call(examForm.querySelectorAll('input[name="exam"]'));
    var picked = function () { return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); };
    boxes.forEach(function (b) {
      b.addEventListener("change", function () { $("examGo").disabled = picked().length === 0; });
    });
    examForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var exams = picked();
      var s = (await sb.auth.getSession()).data.session;
      if (!exams.length || !s) return;
      var u = s.user;
      $("examGo").disabled = true;
      say("Saving...");
      var r = await sb.from("profiles").upsert({ id: u.id, name: nameOf(u), email: u.email, exams: exams });
      if (r.error) {
        $("examGo").disabled = false;
        return say("Could not save: " + r.error.message, "err");
      }
      await sb.auth.updateUser({ data: { exams: exams } }); // backup copy
      location.href = "index.html";
    });
  }
})();