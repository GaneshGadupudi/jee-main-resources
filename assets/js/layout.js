// Injects the shared nav and footer. Load this BEFORE script.js.
(function () {
  var page = location.pathname.split("/").pop() || "index.html";
  var items = [["index.html", "Home"], ["dashboard.html", "My dashboard", "member-only"], ["about.html", "About"], ["features.html", "Features"], ["resources.html", "Resources"], ["faq.html", "FAQ"]];
  var links = items.map(function (i) {
    return '<li' + (i[2] ? ' class="' + i[2] + '" hidden' : "") + '><a href="' + i[0] + '"' + (i[0] === page ? ' aria-current="page"' : "") + ">" + i[1] + "</a></li>";
  }).join("");

  var nav = '<nav class="nav" aria-label="Main"><div class="wrap">' +
    '<a class="brand" href="index.html">JEE Preparation Platform</a>' +
    '<ul class="links" id="links">' + links + "</ul>" +
    '<div class="nav-actions"><span class="welcome" id="welcome" hidden></span><button class="icon-btn" id="themeBtn" type="button"></button>' +
    '<a class="btn ghost" id="loginLink" href="login.html">Log in</a>' +
    '<a class="btn" id="signupLink" href="signup.html">Sign up</a>' +
    '<button class="btn ghost" id="logoutBtn" type="button" hidden>Log out</button>' +
    '<button class="menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false">&#9776;</button>' +
    "</div></div></nav>";

  var foot = '<footer class="footer"><div class="wrap cols"><div><b>JEE Preparation Platform</b><br>An independent student-focused project. Not affiliated with NTA or any IIT.</div>' +
    '<div><a href="about.html">About</a><a href="features.html">Features</a><a href="resources.html">Resources</a><a href="faq.html">FAQ</a><br>&copy; <span id="year"></span> JEE Preparation Platform</div></div></footer>';

  document.body.insertAdjacentHTML("afterbegin", nav);
  document.body.insertAdjacentHTML("beforeend", foot);
})();