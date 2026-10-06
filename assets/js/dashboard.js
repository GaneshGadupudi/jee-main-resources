(function () {
  "use strict";

  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var navigation = Array.prototype.slice.call(document.querySelectorAll(".side-link[data-view]"));
  var storageNotice = document.getElementById("storageNotice");
  var user;
  var profile = {};
  var state;
  var questionIndex = 0;
  var selectedOption = null;
  var storageAvailable = true;

  var tasks = [
    { id: "physics", subject: "Physics", title: "Revise Current Electricity", detail: "Concept revision", minutes: 40 },
    { id: "chemistry", subject: "Chemistry", title: "Review Chemical Bonding", detail: "Concept revision", minutes: 40 },
    { id: "mathematics", subject: "Mathematics", title: "Practise Integration", detail: "Problem solving", minutes: 45 },
    { id: "revision", subject: "Revision", title: "Review a question you got wrong", detail: "Mistake-book revision", minutes: 20 },
    { id: "focus", subject: "Study routine", title: "Plan one focused study block", detail: "Your daily commitment", minutes: 15 }
  ];

  var questions = [
    { subject: "Physics", chapter: "Kinematics", text: "A particle's velocity is v(t) = 3t² + 2 m/s. What is its acceleration at t = 2 s?", options: ["6 m/s²", "12 m/s²", "14 m/s²", "18 m/s²"], answer: 1, explanation: "Acceleration is dv/dt = 6t. At t = 2 s, a = 12 m/s²." },
    { subject: "Physics", chapter: "Current Electricity", text: "Two resistors of 2 Ω and 4 Ω are connected in series. What is their equivalent resistance?", options: ["2/3 Ω", "2 Ω", "6 Ω", "8 Ω"], answer: 2, explanation: "Resistances in series add: R = 2 + 4 = 6 Ω." },
    { subject: "Physics", chapter: "Work, Power & Energy", text: "A 2 kg object starts from rest and accelerates uniformly at 3 m/s². How far does it travel in 4 s?", options: ["12 m", "18 m", "24 m", "36 m"], answer: 2, explanation: "From rest, s = ½at² = ½ × 3 × 4² = 24 m." },
    { subject: "Physics", chapter: "Electrostatics", text: "Two positive point charges are brought closer together. What happens to the magnitude of the electrostatic force between them?", options: ["It decreases", "It increases", "It stays constant", "It becomes zero"], answer: 1, explanation: "By Coulomb's law, force varies as 1/r². Decreasing the separation increases the force." },
    { subject: "Physics", chapter: "Units & Measurements", text: "What is the SI unit of work?", options: ["Watt", "Newton", "Joule", "Pascal"], answer: 2, explanation: "The SI unit of work is the joule (J), equal to one newton metre." },
    { subject: "Chemistry", chapter: "Atomic Structure", text: "How many electrons does a neutral sodium atom (atomic number 11) have in its outermost shell?", options: ["1", "2", "3", "8"], answer: 0, explanation: "Sodium has the electronic configuration 2, 8, 1, so its outermost shell contains one electron." },
    { subject: "Chemistry", chapter: "Solutions", text: "At 25 °C, what is the pH of a neutral aqueous solution?", options: ["0", "5", "7", "14"], answer: 2, explanation: "At 25 °C, a neutral aqueous solution has pH 7." },
    { subject: "Chemistry", chapter: "Stoichiometry", text: "How many moles of water are present in 18 g of H₂O? (Molar mass = 18 g mol⁻¹)", options: ["0.5 mol", "1 mol", "2 mol", "18 mol"], answer: 1, explanation: "Number of moles = mass / molar mass = 18 / 18 = 1 mol." },
    { subject: "Chemistry", chapter: "Redox Reactions", text: "In a redox reaction, oxidation corresponds to which change?", options: ["Gain of electrons", "Loss of electrons", "Gain of neutrons", "Loss of protons"], answer: 1, explanation: "Oxidation is loss of electrons; reduction is gain of electrons." },
    { subject: "Chemistry", chapter: "Chemical Bonding", text: "Which type of bond is formed between sodium and chlorine in sodium chloride?", options: ["Ionic", "Metallic", "Hydrogen", "Coordinate covalent"], answer: 0, explanation: "Sodium transfers an electron to chlorine, forming oppositely charged ions held by an ionic bond." },
    { subject: "Mathematics", chapter: "Differentiation", text: "What is the derivative of x³ with respect to x?", options: ["x²", "2x", "3x²", "3x"], answer: 2, explanation: "Using the power rule, d(xⁿ)/dx = nxⁿ⁻¹, so d(x³)/dx = 3x²." },
    { subject: "Mathematics", chapter: "Indefinite Integrals", text: "Evaluate ∫2x dx.", options: ["2 + C", "x² + C", "2x² + C", "x + C"], answer: 1, explanation: "An antiderivative of 2x is x². Include the constant of integration C." },
    { subject: "Mathematics", chapter: "Quadratic Equations", text: "What are the roots of x² − 5x + 6 = 0?", options: ["−2 and −3", "1 and 6", "2 and 3", "−1 and −6"], answer: 2, explanation: "Factorise: x² − 5x + 6 = (x − 2)(x − 3), so the roots are 2 and 3." },
    { subject: "Mathematics", chapter: "Trigonometry", text: "What is the exact value of sin 30°?", options: ["0", "1/2", "√3/2", "1"], answer: 1, explanation: "From the standard special-angle values, sin 30° = 1/2." },
    { subject: "Mathematics", chapter: "Matrices & Determinants", text: "What is the determinant of the matrix [[2, 0], [0, 3]]?", options: ["0", "5", "6", "12"], answer: 2, explanation: "For a 2 × 2 matrix [[a, b], [c, d]], the determinant is ad − bc. Here it is 2 × 3 − 0 = 6." }
  ];

  var mistakeReasons = ["Conceptual mistake", "Calculation mistake", "Silly mistake", "Question understanding mistake", "Time management issue", "Incorrect guess"];

  function localDateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function showStorageNotice(message) {
    storageNotice.textContent = message;
    storageNotice.hidden = false;
  }

  function defaultState() {
    return { date: localDateKey(new Date()), tasks: {}, answers: {}, mistakeBook: [], history: {}, streak: 0, tasksCompletedTotal: 0, completedTaskIds: [], lastActivityDate: "" };
  }

  function saveState() {
    if (!storageAvailable || !user) return false;
    try {
      localStorage.setItem("jee-dashboard:" + user.id, JSON.stringify(state));
      return true;
    } catch (error) {
      storageAvailable = false;
      showStorageNotice("Your browser could not save study activity. Your changes will be available only until you close this page.");
      return false;
    }
  }

  function loadState() {
    var key = "jee-dashboard:" + user.id;
    try {
      var saved = localStorage.getItem(key);
      if (!saved) return defaultState();
      var parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || !parsed.tasks || !parsed.answers || !Array.isArray(parsed.mistakeBook)) {
        storageAvailable = false;
        showStorageNotice("Saved study activity could not be read. It has not been overwritten; new activity will stay on this page only.");
        return defaultState();
      }
      return parsed;
    } catch (error) {
      storageAvailable = false;
      showStorageNotice("Saved study activity could not be read or accessed. It has not been overwritten; new activity will stay on this page only.");
      return defaultState();
    }
  }

  function recordActivity() {
    var today = localDateKey(new Date());
    if (state.lastActivityDate !== today) {
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      state.streak = state.lastActivityDate === localDateKey(yesterday) ? state.streak + 1 : 1;
      state.lastActivityDate = today;
    }
  }

  function getDayHistory() {
    var today = localDateKey(new Date());
    if (!state.history[today]) state.history[today] = { attempted: 0, correct: 0 };
    return state.history[today];
  }

  function examName() {
    return profile.targetExam || (user.user_metadata && user.user_metadata.exams && user.user_metadata.exams[0]) || "JEE Main";
  }

  function renderExamPreferences() {
    var metadata = user.user_metadata || {};
    var exams = Array.isArray(metadata.exams) ? metadata.exams : [];
    ["mockExamPreferences", "challengeExamPreferences"].forEach(function (id) {
      var container = document.getElementById(id);
      container.innerHTML = exams.length
        ? exams.map(function (exam) { return '<span class="exam-preference-chip">' + escapeHtml(exam) + '</span>'; }).join("")
        : '<span class="exam-preferences-empty">No exam preferences have been selected yet.</span>';
    });
  }

  function taskStatus(status) {
    return status === "completed" ? "Completed" : status === "in-progress" ? "In progress" : "Not started";
  }

  function taskStatusValue(id) {
    var status = state.tasks[id];
    return status === "completed" || status === "in-progress" ? status : "not-started";
  }

  function dailyTasks() {
    var selected = Array.isArray(profile.weakSubjects) ? profile.weakSubjects : [];
    return tasks.map(function (task) {
      var item = Object.assign({}, task);
      if (selected.indexOf(task.subject) !== -1) {
        item.title = "Build confidence with " + task.subject + " practice";
        item.detail = "Weak-subject focus";
      }
      if (task.id === "focus" && profile.prepGoal) {
        item.title = "Work on your goal: " + profile.prepGoal;
        item.detail = "Your preparation goal";
      }
      return item;
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function taskMarkup(task) {
    var status = taskStatusValue(task.id);
    return '<div class="task-item">' +
      '<button type="button" class="task-toggle" role="checkbox" aria-checked="' + (status === "completed") + '" data-task-id="' + task.id + '" data-status="' + status + '" aria-label="' + taskStatus(status) + ': ' + escapeHtml(task.title) + '">' + (status === "completed" ? "✓" : status === "in-progress" ? "·" : "") + '</button>' +
      '<div class="task-copy"><span class="task-title">' + escapeHtml(task.title) + '</span><span class="task-meta">' + escapeHtml(task.subject) + '<span>·</span>' + task.minutes + ' min</span></div>' +
      '<span class="task-status" data-status="' + status + '">' + taskStatus(status) + '</span></div>';
  }

  function renderTasks() {
    var todayTasks = dailyTasks();
    document.getElementById("overviewTasks").innerHTML = todayTasks.slice(0, 4).map(taskMarkup).join("");
    document.getElementById("fullTasks").innerHTML = todayTasks.map(taskMarkup).join("");
    document.getElementById("planTaskCount").textContent = todayTasks.length + " tasks";
    var complete = todayTasks.filter(function (task) { return taskStatusValue(task.id) === "completed"; }).length;
    var percent = Math.round(complete / todayTasks.length * 100);
    document.getElementById("planStat").textContent = percent + "%";
    document.getElementById("planStatHint").textContent = complete + " of " + todayTasks.length + " tasks";
    document.getElementById("planProgressBar").style.width = percent + "%";
    document.getElementById("fullPlanProgressBar").style.width = percent + "%";
    document.getElementById("planProgressLabel").textContent = complete + " of " + todayTasks.length + " complete";
    document.getElementById("fullPlanProgressLabel").textContent = complete + " of " + todayTasks.length + " complete";
    document.getElementById("progressTasks").textContent = complete;
  }

  function updateExamCountdown() {
    document.getElementById("countdownExam").textContent = examName();
    document.getElementById("planIntro").textContent = profile.dailyHours
      ? "A clear, manageable next step, planned around your " + profile.dailyHours + " available study hours."
      : "A clear, manageable next step for each part of your preparation.";
    if (!profile.examDate) {
      document.getElementById("daysLeft").textContent = "—";
      document.getElementById("countdownCaption").textContent = "Add your target date to see your countdown and personalise your plan.";
      return;
    }
    var parts = profile.examDate.split("-").map(Number);
    var examUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    var now = new Date();
    var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.ceil((examUtc - todayUtc) / 86400000);
    document.getElementById("daysLeft").textContent = Math.max(0, days);
    document.getElementById("countdownCaption").textContent = days > 0
      ? "Your " + examName() + " target date is " + new Date(examUtc).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) + "."
      : days === 0 ? "Your target exam date is today. Take a breath and trust your preparation."
        : "Your selected target date has passed. Update your date to set a new countdown.";
  }

  function renderHeader() {
    var metadata = user.user_metadata || {};
    var name = metadata.name || metadata.full_name || (user.email || "Student").split("@")[0] || "Student";
    var firstName = name.trim().split(/\s+/)[0] || "Student";
    document.getElementById("studentName").textContent = firstName;
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = user.email || "Signed in with your account";
    var initial = firstName.charAt(0).toUpperCase();
    document.getElementById("avatarInitial").textContent = initial;
    document.getElementById("profileInitial").textContent = initial;
    var hour = new Date().getHours();
    document.getElementById("greeting").textContent = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
    document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    document.getElementById("planDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    updateExamCountdown();
  }

  function loadProfile() {
    var metadata = user.user_metadata || {};
    profile = metadata.student_profile && typeof metadata.student_profile === "object" ? metadata.student_profile : {};
    var selectedExams = Array.isArray(metadata.exams) ? metadata.exams : [];
    document.querySelectorAll('input[name="exams"]').forEach(function (input) {
      input.checked = selectedExams.indexOf(input.value) !== -1;
    });
    document.getElementById("targetExam").value = profile.targetExam || examName();
    document.getElementById("examDate").value = profile.examDate || "";
    document.getElementById("prepStage").value = profile.prepStage || "";
    document.getElementById("dailyHours").value = profile.dailyHours || "";
    document.getElementById("prepGoal").value = profile.prepGoal || "";
    ["strongSubjects", "weakSubjects"].forEach(function (field) {
      var selected = Array.isArray(profile[field]) ? profile[field] : [];
      document.querySelectorAll('input[name="' + field + '"]').forEach(function (input) {
        input.checked = selected.indexOf(input.value) !== -1;
      });
    });
  }

  function updateMetrics() {
    var history = state.history || {};
    var totals = Object.keys(history).reduce(function (sum, key) {
      var day = history[key];
      sum.attempted += Number(day.attempted) || 0;
      sum.correct += Number(day.correct) || 0;
      return sum;
    }, { attempted: 0, correct: 0 });
    var today = getDayHistory();
    document.getElementById("questionStat").textContent = today.attempted;
    document.getElementById("accuracyStatHint").textContent = today.attempted
      ? Math.round(today.correct / today.attempted * 100) + "% accuracy today"
      : "Start your daily practice";
    document.getElementById("streakStat").textContent = state.streak;
    document.getElementById("mistakeStat").textContent = state.mistakeBook.filter(function (mistake) { return !mistake.revised; }).length;
    document.getElementById("progressQuestions").textContent = totals.attempted;
    document.getElementById("progressAccuracy").textContent = totals.attempted ? Math.round(totals.correct / totals.attempted * 100) + "%" : "—";
    document.getElementById("mistakePageCount").textContent = state.mistakeBook.length;

    var title = document.getElementById("insightTitle");
    var text = document.getElementById("insightText");
    var insights = document.getElementById("subjectInsights");
    if (!totals.attempted) {
      title.textContent = "Your first insight starts with your first answer.";
      text.textContent = "Complete some daily practice to reveal your accuracy, subject breakdown and topics to revisit. We only show insights based on your real answers.";
      insights.innerHTML = "";
      return;
    }
    title.textContent = "A snapshot from your practice";
    text.textContent = totals.attempted + " questions answered · " + totals.correct + " correct · " + Math.round(totals.correct / totals.attempted * 100) + "% overall accuracy. The subject breakdown below uses today's answers.";
    insights.innerHTML = ["Physics", "Chemistry", "Mathematics"].map(function (subject) {
      var subset = questions.map(function (question, index) {
        var answer = state.answers[index];
        return question.subject === subject && answer ? answer : null;
      }).filter(Boolean);
      var correct = subset.filter(function (answer) { return answer.correct; }).length;
      var accuracy = subset.length ? Math.round(correct / subset.length * 100) + "% accuracy" : "Not practised yet";
      return '<div class="subject-insight"><strong>' + subject + '</strong>' + subset.length + ' answered · ' + accuracy + '</div>';
    }).join("");
  }

  function renderMistakes() {
    var list = document.getElementById("mistakeList");
    var empty = document.getElementById("mistakeEmpty");
    var mistakes = state.mistakeBook.slice().reverse();
    empty.hidden = mistakes.length > 0;
    list.innerHTML = mistakes.map(function (mistake) {
      return '<article class="mistake-card' + (mistake.revised ? ' is-revised' : '') + '">' +
        '<div class="mistake-card-top"><span class="mistake-tag">' + escapeHtml(mistake.reason) + (mistake.revised ? " · REVISITED" : "") + '</span><span class="mistake-chapter">' + escapeHtml(mistake.subject) + ' · ' + escapeHtml(mistake.chapter) + '</span></div>' +
        '<p class="mistake-question">' + escapeHtml(mistake.text) + '</p>' +
        '<p class="mistake-answer">Correct answer: ' + escapeHtml(mistake.answer) + '</p>' +
        '<p class="mistake-explanation">' + escapeHtml(mistake.explanation) + '</p>' +
        '<div class="mistake-actions"><button type="button" data-revise-id="' + escapeHtml(mistake.questionId) + '">' + (mistake.revised ? "Mark to revisit again" : "Mark as revisited") + '</button><button type="button" data-remove-id="' + escapeHtml(mistake.questionId) + '">Remove from book</button></div>' +
        '</article>';
    }).join("");
  }

  function updateAchievements() {
    var completedTasks = Number(state.tasksCompletedTotal) || 0;
    var allAnswers = Object.keys(state.history).reduce(function (count, key) {
      return count + (Number(state.history[key].attempted) || 0);
    }, 0);
    var todayAttempted = getDayHistory().attempted;
    var badges = [
      { title: "First step", detail: "Answer your first practice question", earned: allAnswers > 0, icon: "✳" },
      { title: "Daily finisher", detail: "Complete all 15 daily questions", earned: todayAttempted >= questions.length, icon: "✓" },
      { title: "Plan in motion", detail: "Complete five study tasks", earned: completedTasks >= 5, icon: "▤" },
      { title: "Three-day rhythm", detail: "Build a three-day study streak", earned: state.streak >= 3, icon: "♨" }
    ];
    document.getElementById("achievementList").innerHTML = badges.map(function (badge) {
      return '<div class="achievement-card' + (badge.earned ? ' earned' : '') + '"><span class="achievement-icon">' + badge.icon + '</span><div><strong>' + badge.title + '</strong><span>' + badge.detail + '</span></div><b>' + (badge.earned ? "EARNED" : "LOCKED") + '</b></div>';
    }).join("");
  }

  function renderOptions(question, saved) {
    var options = document.getElementById("answerOptions");
    options.innerHTML = question.options.map(function (option, index) {
      var className = "answer-option";
      if (saved && index === question.answer) className += " correct";
      else if (saved && index === saved.selected) className += " incorrect";
      else if (!saved && index === selectedOption) className += " selected";
      return '<button type="button" class="' + className + '" data-option="' + index + '"' + (saved ? " disabled" : "") + '><span class="option-letter">' + String.fromCharCode(65 + index) + '</span><span>' + option + '</span></button>';
    }).join("");
  }

  function renderQuestion() {
    var question = questions[questionIndex];
    var saved = state.answers[questionIndex];
    selectedOption = saved ? saved.selected : null;
    document.getElementById("questionSubject").textContent = question.subject.toUpperCase();
    document.getElementById("questionCounter").textContent = "Question " + (questionIndex + 1) + " of " + questions.length;
    document.getElementById("questionProgress").style.width = ((questionIndex + (saved ? 1 : 0)) / questions.length * 100) + "%";
    document.querySelectorAll("[data-subject-switch]").forEach(function (button) {
      var active = button.dataset.subjectSwitch === question.subject;
      button.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("questionChapter").textContent = question.chapter;
    document.getElementById("questionText").textContent = question.text;
    renderOptions(question, saved);
    var feedback = document.getElementById("answerFeedback");
    feedback.hidden = !saved;
    feedback.className = "answer-feedback" + (saved && saved.correct ? " is-correct" : "");
    if (saved) {
      if (saved.correct) {
        feedback.innerHTML = "<strong>That's right.</strong>" + question.explanation;
      } else {
        var reason = state.mistakeBook.find(function (mistake) { return mistake.questionId === String(questionIndex); });
        feedback.innerHTML = "<strong>Good one to revisit.</strong>" + question.explanation +
          '<label class="reason-label" for="mistakeReason">Tag this mistake</label><select id="mistakeReason" class="mistake-reason-select">' +
          mistakeReasons.map(function (option) { return '<option' + (reason && reason.reason === option ? " selected" : "") + '>' + option + '</option>'; }).join("") +
          '</select><span class="feedback-saved">Saved in your mistake book.</span>';
      }
    }
    document.getElementById("previousQuestion").disabled = questionIndex === 0;
    var next = document.getElementById("nextQuestion");
    next.disabled = !saved && selectedOption === null;
    next.textContent = !saved ? "Check answer" : questionIndex === questions.length - 1 ? "Finish practice" : "Next question →";
    if (state.answers[questions.length - 1] && state.practiceComplete && questionIndex === questions.length - 1) {
      next.disabled = true;
      feedback.hidden = false;
      feedback.className = "answer-feedback is-correct";
      feedback.innerHTML = "<strong>Daily practice complete.</strong>You answered " + getDayHistory().attempted + " questions today. Take a look at your progress or come back tomorrow for a fresh set.";
    }
    var answered = Object.keys(state.answers).length;
    document.getElementById("answeredLabel").textContent = answered + " answered";
    document.getElementById("sessionAnswered").textContent = answered;
    document.getElementById("physicsAnswered").textContent = subjectAnswered("Physics") + " / 5";
    document.getElementById("chemistryAnswered").textContent = subjectAnswered("Chemistry") + " / 5";
    document.getElementById("mathsAnswered").textContent = subjectAnswered("Mathematics") + " / 5";
  }

  function subjectAnswered(subject) {
    return questions.reduce(function (count, question, index) {
      return count + (question.subject === subject && state.answers[index] ? 1 : 0);
    }, 0);
  }

  function showView(view) {
    var target = panels.find(function (panel) { return panel.dataset.panel === view; }) ? view : "overview";
    panels.forEach(function (panel) { panel.hidden = panel.dataset.panel !== target; });
    navigation.forEach(function (button) {
      var active = button.dataset.view === target;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    var activeButton = navigation.find(function (button) { return button.dataset.view === target; });
    document.getElementById("currentViewLabel").textContent = activeButton
      ? Array.prototype.filter.call(activeButton.childNodes, function (node) { return node.nodeType === 3; }).map(function (node) { return node.textContent; }).join("").trim()
      : "Overview";
    if (location.hash !== "#view=" + target) history.replaceState(null, "", "#view=" + target);
    if (target === "practice") renderQuestion();
    if (target === "mistakes") renderMistakes();
    if (target === "progress") {
      updateMetrics();
      updateAchievements();
    }
    if (target === "profile") document.getElementById("profileMessage").textContent = "";
  }

  function cycleTask(id) {
    var status = taskStatusValue(id);
    var nextStatus = status === "completed" ? "not-started" : "completed";
    state.tasks[id] = nextStatus;
    if (nextStatus === "completed" && state.completedTaskIds.indexOf(id) === -1) {
      state.completedTaskIds.push(id);
      state.tasksCompletedTotal = (Number(state.tasksCompletedTotal) || 0) + 1;
    }
    if (state.tasks[id] !== "not-started") recordActivity();
    saveState();
    renderTasks();
    renderHeader();
    updateMetrics();
    updateAchievements();
  }

  function chooseOption(index) {
    if (state.answers[questionIndex]) return;
    selectedOption = index;
    renderOptions(questions[questionIndex], null);
    document.getElementById("nextQuestion").disabled = false;
  }

  function switchPracticeSubject(subject) {
    var subjectQuestions = questions.map(function (question, index) {
      return question.subject === subject ? index : -1;
    }).filter(function (index) { return index !== -1; });
    if (!subjectQuestions.length) return;
    questionIndex = subjectQuestions.find(function (index) { return !state.answers[index]; });
    if (questionIndex === undefined) questionIndex = subjectQuestions[0];
    showView("practice");
  }

  function checkAnswer() {
    var saved = state.answers[questionIndex];
    if (!saved) {
      if (selectedOption === null) return;
      var question = questions[questionIndex];
      var correct = selectedOption === question.answer;
      saved = { selected: selectedOption, correct: correct };
      state.answers[questionIndex] = saved;
      var history = getDayHistory();
      history.attempted++;
      if (correct) history.correct++;
      recordActivity();
      if (!correct && !state.mistakeBook.some(function (mistake) { return mistake.questionId === String(questionIndex); })) {
        state.mistakeBook.push({
          questionId: String(questionIndex),
          subject: question.subject,
          chapter: question.chapter,
          text: question.text,
          answer: question.options[question.answer],
          explanation: question.explanation,
          reason: mistakeReasons[0],
          revised: false
        });
      }
      saveState();
      updateMetrics();
      renderTasks();
      renderHeader();
      renderMistakes();
      updateAchievements();
      renderQuestion();
      return;
    }
    if (questionIndex < questions.length - 1) {
      questionIndex++;
      renderQuestion();
      return;
    }
    state.practiceComplete = true;
    saveState();
    renderQuestion();
  }

  function updateMistakeReason(reason) {
    var mistake = state.mistakeBook.find(function (item) { return item.questionId === String(questionIndex); });
    if (!mistake || mistakeReasons.indexOf(reason) === -1) return;
    mistake.reason = reason;
    saveState();
    renderMistakes();
    renderQuestion();
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var viewButton = event.target.closest("[data-open-view], [data-view]");
      if (viewButton) {
        var view = viewButton.dataset.openView || viewButton.dataset.view;
        if (view) showView(view);
      }
      if (event.target.closest("[data-open-profile]")) showView("profile");

      var subjectButton = event.target.closest("[data-subject-switch]");
      if (subjectButton) switchPracticeSubject(subjectButton.dataset.subjectSwitch);

      var taskButton = event.target.closest("[data-task-id]");
      if (taskButton) cycleTask(taskButton.dataset.taskId);

      var optionButton = event.target.closest("[data-option]");
      if (optionButton) chooseOption(Number(optionButton.dataset.option));

      if (event.target.closest("#previousQuestion")) {
        if (questionIndex > 0) { questionIndex--; renderQuestion(); }
      }
      if (event.target.closest("#nextQuestion")) checkAnswer();

      if (event.target.closest("#restartPractice")) {
        questionIndex = 0;
        showView("practice");
      }

      var reviseButton = event.target.closest("[data-revise-id]");
      if (reviseButton) {
        var toRevise = state.mistakeBook.find(function (item) { return item.questionId === reviseButton.dataset.reviseId; });
        if (toRevise) {
          toRevise.revised = !toRevise.revised;
          saveState();
          renderMistakes();
          updateMetrics();
        }
      }

      var removeButton = event.target.closest("[data-remove-id]");
      if (removeButton) {
        state.mistakeBook = state.mistakeBook.filter(function (item) { return item.questionId !== removeButton.dataset.removeId; });
        saveState();
        renderMistakes();
        updateMetrics();
      }
    });

    document.addEventListener("change", function (event) {
      if (event.target.id === "mistakeReason") updateMistakeReason(event.target.value);
    });

    window.addEventListener("hashchange", function () {
      var match = location.hash.match(/^#view=([a-z-]+)$/);
      if (match) showView(match[1]);
    });

    document.getElementById("profileForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var message = document.getElementById("profileMessage");
      var saveButton = document.getElementById("saveProfile");
      var examDate = form.elements.examDate.value;
      if (examDate && examDate < localDateKey(new Date())) {
        message.textContent = "Choose today or a future date for your target exam.";
        message.className = "msg err";
        return;
      }
      if (!examDate || !form.elements.prepStage.value || !form.elements.dailyHours.value) {
        message.textContent = "Complete your target exam date, preparation stage and available study hours.";
        message.className = "msg err";
        return;
      }
      var updatedProfile = {
        targetExam: form.elements.targetExam.value,
        examDate: examDate,
        prepStage: form.elements.prepStage.value,
        dailyHours: form.elements.dailyHours.value,
        strongSubjects: Array.prototype.map.call(form.querySelectorAll('input[name="strongSubjects"]:checked'), function (input) { return input.value; }),
        weakSubjects: Array.prototype.map.call(form.querySelectorAll('input[name="weakSubjects"]:checked'), function (input) { return input.value; }),
        prepGoal: form.elements.prepGoal.value.trim()
      };
      var userMetadata = user.user_metadata || {};
      var exams = Array.prototype.map.call(form.querySelectorAll('input[name="exams"]:checked'), function (input) { return input.value; });
      if (!exams.length) {
        message.textContent = "Select at least one exam preference.";
        message.className = "msg err";
        return;
      }
      if (exams.indexOf(updatedProfile.targetExam) === -1) {
        message.textContent = "Select your target examination in your exam preferences.";
        message.className = "msg err";
        return;
      }
      saveButton.disabled = true;
      message.textContent = "Saving your preferences...";
      message.className = "msg";
      var profileResult = await window.sb.from("profiles").upsert({
        id: user.id,
        name: userMetadata.name || userMetadata.full_name || (user.email || "").split("@")[0],
        email: user.email,
        exams: exams
      });
      if (profileResult.error) {
        saveButton.disabled = false;
        message.textContent = "Could not save your exam selection: " + profileResult.error.message;
        message.className = "msg err";
        return;
      }
      var result = await window.sb.auth.updateUser({ data: { student_profile: updatedProfile, exams: exams } });
      saveButton.disabled = false;
      if (result.error) {
        message.textContent = "Your exam selection was saved, but your study profile could not be updated: " + result.error.message;
        message.className = "msg err";
        return;
      }
      user = result.data.user || user;
      profile = updatedProfile;
      renderExamPreferences();
      message.textContent = "Your preferences have been saved to your account.";
      message.className = "msg ok";
      renderHeader();
      renderTasks();
    });
  }

  async function init() {
    var result = await window.sb.auth.getUser();
    if (result.error) {
      showStorageNotice("We could not load your student profile: " + result.error.message);
      return;
    }
    if (!result.data.user) return;
    storageNotice.hidden = true;
    user = result.data.user;
    state = loadState();
    if (state.date !== localDateKey(new Date())) {
      state.date = localDateKey(new Date());
      state.tasks = {};
      state.answers = {};
      state.completedTaskIds = [];
      state.practiceComplete = false;
    }
    if (!state.history) state.history = {};
    if (!state.tasks) state.tasks = {};
    if (!state.answers) state.answers = {};
    if (!Array.isArray(state.mistakeBook)) state.mistakeBook = [];
    if (!Array.isArray(state.completedTaskIds)) state.completedTaskIds = [];
    if (typeof state.streak !== "number") state.streak = 0;
    if (!state.lastActivityDate) state.lastActivityDate = "";
    loadProfile();
    var metadata = user.user_metadata || {};
    var selectedExams = Array.isArray(metadata.exams) ? metadata.exams : [];
    var profileIsComplete = selectedExams.length > 0 && profile.targetExam && profile.examDate && profile.prepStage && profile.dailyHours;
    bindEvents();
    renderExamPreferences();
    renderHeader();
    renderTasks();
    renderMistakes();
    updateMetrics();
    updateAchievements();
    if (typeof state.tasksCompletedTotal !== "number") state.tasksCompletedTotal = 0;
    var initialView = location.hash.match(/^#view=([a-z-]+)$/);
    showView(profileIsComplete ? (initialView ? initialView[1] : "overview") : "profile");
    saveState();
  }

  if (window.sb) init();
  else showStorageNotice("The sign-in service did not load. Refresh this page to try again.");
})();
