export const pyqSubjects = [
  {
    id: "mathematics",
    name: "Mathematics",
    chapters: [
      {
        id: "calculus",
        name: "Calculus",
        topics: [
          { id: "limits", name: "Limits", questions: [{ id: "math-limits-1", year: 2024, exam: "JEE Main", text: "If lim(x→0) sin(3x)/x = k, what is the value of k?", options: ["1", "2", "3", "0"], answer: 2, explanation: "Using lim(x→0) sin(ax)/x = a, the value is 3." }] },
          { id: "differentiation", name: "Differentiation", questions: [{ id: "math-diff-1", year: 2023, exam: "JEE Main", text: "The derivative of x² sin x with respect to x is:", options: ["2x sin x + x² cos x", "x² cos x", "2x cos x", "2x sin x"], answer: 0, explanation: "Apply the product rule: (x²)' sin x + x²(sin x)'." }] },
        ],
      },
      {
        id: "coordinate-geometry",
        name: "Coordinate geometry",
        topics: [{ id: "straight-lines", name: "Straight lines", questions: [{ id: "math-line-1", year: 2022, exam: "JEE Advanced", text: "The slope of a line making an angle of 45° with the positive x-axis is:", options: ["0", "1", "-1", "Undefined"], answer: 1, explanation: "Slope m = tan 45° = 1." }] }],
      },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    chapters: [
      { id: "mechanics", name: "Mechanics", topics: [{ id: "kinematics", name: "Kinematics", questions: [{ id: "physics-kinematics-1", year: 2024, exam: "JEE Main", text: "A body starts from rest with constant acceleration 2 m/s². Its speed after 5 seconds is:", options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"], answer: 1, explanation: "v = u + at = 0 + 2 × 5 = 10 m/s." }] }] },
      { id: "electromagnetism", name: "Electromagnetism", topics: [{ id: "current-electricity", name: "Current electricity", questions: [{ id: "physics-current-1", year: 2023, exam: "JEE Main", text: "The resistance of a conductor is 6 Ω and current through it is 2 A. The potential difference is:", options: ["3 V", "8 V", "12 V", "18 V"], answer: 2, explanation: "Ohm's law gives V = IR = 2 × 6 = 12 V." }] }] },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    chapters: [
      { id: "physical-chemistry", name: "Physical chemistry", topics: [{ id: "atomic-structure", name: "Atomic structure", questions: [{ id: "chem-atomic-1", year: 2022, exam: "JEE Main", text: "The maximum number of electrons in the third shell is:", options: ["8", "18", "32", "50"], answer: 1, explanation: "The maximum number is 2n². For n = 3, it is 18." }] }] },
      { id: "organic-chemistry", name: "Organic chemistry", topics: [{ id: "basic-principles", name: "Basic principles", questions: [{ id: "chem-organic-1", year: 2024, exam: "JEE Main", text: "The functional group present in an alcohol is:", options: ["-CHO", "-COOH", "-OH", "-NH₂"], answer: 2, explanation: "Alcohols contain the hydroxyl (-OH) functional group." }] }] },
    ],
  },
];

export const allPyqQuestions = pyqSubjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics.flatMap((topic) => topic.questions.map((question) => ({ ...question, subject: subject.name, chapter: chapter.name, topic: topic.name })))));
