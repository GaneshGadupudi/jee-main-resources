// To add a chapter: add one line "Chapter name|questions|file.pdf" to the right subject.
// Leave the file name empty ("Name|1|") to show "Coming soon".
// To add a chapter: add one line "Chapter name|questions|file.pdf" to the right subject.
// Leave the file name empty ("Name|1|") to show "Coming soon".
const DATA = {
  chemistry: [
    "Solutions|1-2|Notes/Solutions.pdf", "Metallurgy|1|Notes/Metallurgy.pdf", "Chemical Bonding|2-3|Notes/Chemical bonding.pdf",
    "Stoichiometry|2-3|Notes/Stiochiometry.pdf", "Electrochemistry|1-2|Notes/Electrochemistry (1).pdf",
    "Chemical Equilibrium|2-3|Notes/Equilibrium.pdf", "Quantitative Analysis|1|Notes/Quantitative analysis.pdf",
    "Environmental Chemistry|1|Notes/Environmental chemistry short notes.pdf", "Alkanes|1|Notes/Alkanes.pdf",
    "Alkynes|1|Notes/Alkyne.pdf", "Benzene|1|Notes/Benzene (1).pdf", "Nomenclature|1|Notes/Nomenclature.pdf",
    "Atomic Structure|1-2|Notes/Atomic structure.pdf", "Qualitative Inorganic Analysis|1|Notes/Qualitative inorganic analysis.pdf",
    "Aromaticity|1|Notes/Aromaticity.pdf", "Alkenes|1|Notes/ALKENE.pdf", "Chemistry in Everyday Life|1-2|Notes/Chemistry in every day life.pdf",
    "Organic Reagents|1|Notes/Organic reagents.pdf", "d & f Blocks|1-2|Notes/d&f block.pdf", "Electronic Effects|1|Notes/Electromeric effects.pdf",
    "Chemical Kinetics|1-2|Notes/che. kinetics.pdf", "Group 16|1|Notes/grp 16.pdf", "Group 17|1|Notes/grp 17.pdf",
    "Group 18|1|Notes/grp 18 (1).pdf", "Complex Compounds|1|Notes/Complex compounds.pdf", "Group 15|1|Notes/group15 p-1_merged.pdf",
    "States of Matter|1|Notes/states of matter.pdf"
  ],
  physics: [
    "Modern Physics [Atoms, Nuclei & Semiconductors]|3-4|Notes/", "Current Electricity|2-3|Notes/Current electricity.pdf",
    "KTG|1-2|Notes/ktg.pdf", "Optical Instruments|1-2|Notes/optical instruments.pdf",
    "Electrostatics [Including Capacitors]|1-2|Notes/Electrostatics.pdf", "Gravitation|1-2|Notes/Gravity.pdf",
    "Alternating Currents|1-2|Notes/A.current.pdf", "Simple Harmonic Motion [SHM]|1-2|Notes/S.H.M.pdf",
    "Wave Optics|1|Notes/wave optics.pdf", "Newton's Laws of Motion [Includes Friction]|2|Notes/NLM.pdf",
    "Kinematics|1-2|Notes/Kinematics.pdf", "Electromagnetic Waves|1|Notes/Electromagnetic waves.pdf",
    "Centre of Mass|0-1|Notes/COM.pdf", "Ray Optics|1-2|Notes/Ray optics.pdf", "Work, Power & Energy|1|Notes/W.P.E, Circular.pdf",
    "Electromagnetic Induction|1|Notes/EMI.pdf", "Units & Measurements|1|Notes/Units.pdf", "Calorimetry|0-1|Notes/calorimetry.pdf",
    "Friction|0-1|Notes/Friction.pdf", "Fluid Mechanics|1-2|Notes/Fluid mechanics.pdf", "Dual Nature|1|Notes/Dual nature.pdf",
    "Expansion of Liquids|0-1|Notes/exp.of liquids.pdf", "Expansion of Gases|0-1|Notes/exp. of gases.pdf",
    "Thermodynamics|0-1|Notes/thermody..pdf", "Heat Transfer|0-1|Notes/heat transfer.pdf", "Nuclear Physics|0-1|Notes/Nuclear physics.pdf",
    "Atomic Physics|0-1|Notes/Atomic physics.pdf", "Rotational Motion|0-1|Notes/Rotational motion.pdf",
    "Collisions|0-1|Notes/Collisions.pdf", "Magnetism & Matter|0-1|Notes/Magnetism and matter.pdf",
    "Properties of Solids|0-1|Notes/Properties of solids.pdf", "Vectors|0-1|Notes/Phy. vectors.pdf"
  ],
  maths: [
    "Vectors|2-3|Notes/vectors.pdf", "3D Geometry|3|Notes/3d geo.pdf", "Matrices & Determinants|3|Notes/mat.pdf",
    "Conic Sections|2-3|Notes/conics.pdf", "Differential Equations|3-4|Notes/d.eqn.pdf", "Circles|1-2|Notes/circles.pdf",
    "Binomial Theorem|1-2|Notes/binomial the..pdf", "Permutations & Combinations|1|Notes/P&C.pdf", "Probability|1-2|Notes/probability.pdf",
    "Trigonometry|2-3|Notes/trigonometry.pdf", "Quadratic & Theory of Equations|1|Notes/the.of eqns.pdf", "Complex Numbers|1|Notes/",
    "Functions|2-3|Notes/fun..pdf", "Mathematical Reasoning|1|Notes/", "Statistics|1|Notes/stat..pdf", "Limits & Continuity|1-2|Notes/lts.pdf",
    "Differentiability|0-1|Notes/diff.pdf", "Sequence & Series|1|Notes/seq.&series.pdf", "Applications of Derivatives|1-2|Notes/",
    "Sets & Relations|1|Notes/sets and relation.pdf", "Logarithm|0-1|Notes/log.pdf", "Differentiation|0-1|Notes/diff.pdf",
    "Straight Lines|1-2|Notes/st.lines.pdf", "Pair of Lines|0-1|Notes/pair of st.lines.pdf", "Parabola|0-1|Notes/Parabola.pdf",
    "Ellipse|0-1|Notes/ellipse.pdf", "Hyperbola|0-1|Notes/hyperbola.pdf", "Lines & Planes|0-1|Notes/lines and planes.pdf",
    "2D Geometry|0-1|Notes/2d geometry.pdf", "Definite Integrals|0-1|Notes/def9t int.pdf",
    "Indefinite Integrals|0-1|Notes/Indefinite integration.pdf"
  ]
};

const $ = (s) => document.querySelector(s);
const tbody = $("#tbody"), search = $("#search");
let subject = "chemistry";

// Safe wrappers: localStorage can be blocked in private mode
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let revised = load("revised", {});

const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function render() {
  const q = search.value.trim().toLowerCase();
  let html = "", shown = 0;
  DATA[subject].forEach((line, i) => {
    const [name, w, file] = line.split("|");
    if (q && !name.toLowerCase().includes(q)) return;
    shown++;
    const id = subject + ":" + name;
    const link = file
      ? `<a href="./${encodeURIComponent(file)}" target="_blank" rel="noopener">Download</a>`
      : `<span class="soon">Coming soon</span>`;
    html += `<tr class="${revised[id] ? "done" : ""}">
      <td><input type="checkbox" data-id="${esc(id)}" ${revised[id] ? "checked" : ""} aria-label="Mark ${esc(name)} as revised"></td>
      <td>${i + 1}</td><td>${esc(name)}</td><td>${w} ${w === "1" ? "question" : "questions"}</td><td>${link}</td></tr>`;
  });
  tbody.innerHTML = html;
  $("#empty").hidden = shown > 0;
  updateProgress();
}

function updateProgress() {
  const list = DATA[subject];
  const done = list.filter((l) => revised[subject + ":" + l.split("|")[0]]).length;
  $("#barFill").style.width = (done / list.length) * 100 + "%";
  $("#progressText").textContent = `${done} of ${list.length} chapters revised`;
}

tbody.addEventListener("change", (e) => {
  if (e.target.type !== "checkbox") return;
  revised[e.target.dataset.id] = e.target.checked;
  save("revised", revised);
  e.target.closest("tr").classList.toggle("done", e.target.checked);
  updateProgress();
});

document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    subject = tab.dataset.subject;
    render();
  })
);
search.addEventListener("input", render);

// Dark mode (remembers choice, otherwise follows the device setting)
const themeBtn = $("#themeBtn");
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === "dark" ? "Light mode" : "Dark mode";
}
setTheme(load("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
themeBtn.addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(t); save("theme", t);
});

// Back to top
const toTop = $("#toTop");
addEventListener("scroll", () => { toTop.hidden = scrollY < 500; });
toTop.addEventListener("click", () => scrollTo({ top: 0 }));

// High-weightage list: chapters whose top weightage is 3 or more questions
const labels = { chemistry: "Chemistry", physics: "Physics", maths: "Mathematics" };
$("#top").innerHTML = Object.keys(DATA).map((s) => {
  const names = DATA[s].map((l) => l.split("|")).filter(([, w]) => +w.split("-").pop() >= 3).map(([n]) => esc(n));
  return `<h3>${labels[s]}</h3><p>${names.join(", ") || "None listed."}</p>`;
}).join("");

render();