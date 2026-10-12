// Study content per chapter, keyed by `${subject}:${chapter}` (same ids as lib/plan.js).
// Chapters missing here still appear in the plan; the task screen shows a "coming soon" state for them.
// To add a chapter: add an entry with overview, concepts, formulas and questions (answer = index into options).
export const chapterContent = {
  "Physics:Current Electricity": {
    overview: "Current electricity studies charges in steady motion through conductors. The chapter builds from drift velocity and Ohm's law to resistor networks, cells with internal resistance, Kirchhoff's laws and measuring instruments. Circuit-solving questions are the most common JEE pattern here.",
    concepts: [
      "Current is the rate of flow of charge; in a conductor it comes from the slow drift of electrons under an electric field.",
      "Ohm's law holds when temperature is constant. Resistance depends on length, area and material, and rises with temperature for metals.",
      "Series resistors share the same current; parallel resistors share the same voltage.",
      "A real cell has internal resistance, so its terminal voltage drops when it supplies current.",
      "Kirchhoff's current law (junction rule) and voltage law (loop rule) solve any network.",
      "A balanced Wheatstone bridge draws no current through the galvanometer. A potentiometer compares emfs without drawing current from the cell.",
      "Maximum power is delivered to a load when the load resistance equals the source's internal resistance.",
    ],
    formulas: [
      ["Current and drift velocity", "I = dq/dt = n·A·e·v_d"],
      ["Ohm's law and resistance", "V = IR,  R = ρl/A"],
      ["Temperature dependence", "ρ(T) = ρ₀[1 + α(T − T₀)]"],
      ["Series / parallel", "R = R₁ + R₂ + …   |   1/R = 1/R₁ + 1/R₂ + …"],
      ["Power and heat", "P = VI = I²R = V²/R,  H = I²Rt"],
      ["Cell with internal resistance", "I = ε/(R + r),  V = ε − Ir"],
      ["Maximum power transfer", "R = r,  P_max = ε²/4r"],
      ["Kirchhoff's laws", "ΣI = 0 at a junction,  ΣV = 0 around a loop"],
      ["Balanced Wheatstone bridge", "P/Q = R/S"],
      ["Potentiometer", "ε₁/ε₂ = l₁/l₂,  r = R(l₁ − l₂)/l₂"],
    ],
    questions: [
      { text: "Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel. What is the equivalent resistance?", options: ["1 Ω", "2 Ω", "11 Ω", "0.5 Ω"], answer: 0, explanation: "1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 1, so R = 1 Ω." },
      { text: "A cell of emf 12 V and internal resistance 2 Ω is connected to a 4 Ω resistor. What is its terminal voltage?", options: ["12 V", "8 V", "6 V", "4 V"], answer: 1, explanation: "I = 12/(4 + 2) = 2 A. Terminal voltage V = ε − Ir = 12 − 2×2 = 8 V." },
      { text: "A wire of resistance R is stretched uniformly to double its length (volume constant). What is its new resistance?", options: ["R/2", "2R", "4R", "R/4"], answer: 2, explanation: "Length doubles so area halves. R = ρl/A becomes ρ(2l)/(A/2) = 4R." },
      { text: "The current through a conductor stays the same but its cross-section area is doubled. The drift velocity of electrons becomes:", options: ["Double", "Half", "Unchanged", "Four times"], answer: 1, explanation: "I = nAev_d. With I, n and e fixed, v_d ∝ 1/A, so doubling A halves v_d." },
      { text: "A heater is rated 1000 W at 220 V. What is the resistance of its element?", options: ["48.4 Ω", "22 Ω", "4.84 Ω", "220 Ω"], answer: 0, explanation: "P = V²/R, so R = 220²/1000 = 48400/1000 = 48.4 Ω." },
    ],
  },

  "Chemistry:Chemical Bonding": {
    overview: "Chemical bonding explains why atoms combine and what shape and properties the resulting molecules have. For JEE, focus on VSEPR shapes, hybridisation, molecular orbital theory (bond order and magnetic behaviour), polarity and hydrogen bonding.",
    concepts: [
      "Ionic bonds form by electron transfer and are stronger when ions have high charge and small size (high lattice energy).",
      "Covalent bonds share electrons. Polarity comes from electronegativity difference, and a molecule is non-polar if its bond dipoles cancel by symmetry.",
      "VSEPR: electron pairs repel, and lone pairs repel more than bond pairs. Count bond pairs and lone pairs to get the shape.",
      "Hybridisation mixes atomic orbitals: 2 regions → sp, 3 → sp², 4 → sp³, 5 → sp³d, 6 → sp³d².",
      "MOT: electrons fill bonding and antibonding orbitals. Higher bond order means a shorter, stronger bond. Unpaired electrons mean paramagnetic.",
      "Hydrogen bonding (H bonded to F, O or N) raises boiling points and explains the anomalous behaviour of HF, H₂O and NH₃.",
      "Fajans' rules: a small, highly charged cation and a large anion give more covalent character.",
    ],
    formulas: [
      ["Bond order (MOT)", "BO = (N_b − N_a)/2"],
      ["Formal charge", "FC = V − N − B/2  (V valence e⁻, N non-bonding e⁻, B bonding e⁻)"],
      ["Hybridisation number", "H = ½(V + M − C + A)  (M monovalent atoms, C cation charge, A anion charge)"],
      ["Dipole moment", "μ = q × d"],
      ["Bond order examples", "N₂ = 3,  O₂ = 2,  O₂⁻ = 1.5,  O₂⁺ = 2.5"],
      ["Common shapes", "BeCl₂ linear, BF₃ trigonal planar, CH₄ tetrahedral, SF₄ see-saw, SF₆ octahedral"],
    ],
    questions: [
      { text: "What is the hybridisation of the central atom in NH₃?", options: ["sp²", "sp³", "sp³d", "sp"], answer: 1, explanation: "N has 3 bond pairs and 1 lone pair: 4 electron regions, so sp³ (the shape is pyramidal)." },
      { text: "What is the bond order of O₂⁺?", options: ["1.5", "2", "2.5", "3"], answer: 2, explanation: "O₂ has 10 bonding and 6 antibonding electrons (BO = 2). Removing one antibonding electron gives (10 − 5)/2 = 2.5." },
      { text: "Which of these molecules has a zero dipole moment?", options: ["NH₃", "H₂O", "CO₂", "CHCl₃"], answer: 2, explanation: "CO₂ is linear, so its two C=O bond dipoles are equal and opposite and cancel." },
      { text: "What is the shape of SF₄?", options: ["Tetrahedral", "Square planar", "See-saw", "Square pyramidal"], answer: 2, explanation: "SF₄ has 4 bond pairs and 1 lone pair (sp³d). The lone pair sits in an equatorial position, giving a see-saw shape." },
      { text: "Which hydrogen halide has the highest boiling point?", options: ["HF", "HCl", "HBr", "HI"], answer: 0, explanation: "HF forms strong intermolecular hydrogen bonds, which outweigh the larger dispersion forces of HBr and HI." },
    ],
  },

  "Mathematics:Matrices & Determinants": {
    overview: "Matrices and determinants are among the highest-scoring chapters in JEE Main and the questions are mostly direct. Master determinant properties, adjoint and inverse, and consistency of linear systems, and most problems reduce to a few identities.",
    concepts: [
      "A determinant is defined only for square matrices. Swapping two rows changes its sign, and two equal rows make it zero.",
      "A matrix is invertible exactly when its determinant is non-zero (a non-singular matrix).",
      "Matrix multiplication is not commutative, and the order reverses inside transposes and inverses.",
      "The adjoint is the transpose of the cofactor matrix. A·adj(A) = |A|·I.",
      "For a system AX = B: if |A| ≠ 0 there is a unique solution (Cramer's rule). If |A| = 0 the system has either no solution or infinitely many.",
      "Symmetric: Aᵀ = A. Skew-symmetric: Aᵀ = −A. Any square matrix is the sum of a symmetric and a skew-symmetric matrix.",
    ],
    formulas: [
      ["2×2 determinant", "|a b; c d| = ad − bc"],
      ["Product and scalar", "|AB| = |A||B|,  |kA| = kⁿ|A|  (A is n×n)"],
      ["Adjoint identity", "A·adj(A) = adj(A)·A = |A|·I"],
      ["Inverse", "A⁻¹ = adj(A)/|A|"],
      ["Adjoint properties", "|adj A| = |A|ⁿ⁻¹,  adj(adj A) = |A|ⁿ⁻²·A"],
      ["Transpose / inverse of product", "(AB)ᵀ = BᵀAᵀ,  (AB)⁻¹ = B⁻¹A⁻¹"],
      ["Cramer's rule", "x = D_x/D,  y = D_y/D,  z = D_z/D  (D ≠ 0)"],
    ],
    questions: [
      { text: "What is the determinant of the matrix [[2, 3], [1, 4]]?", options: ["5", "11", "8", "−5"], answer: 0, explanation: "|A| = (2)(4) − (3)(1) = 8 − 3 = 5." },
      { text: "A is a 3×3 matrix with |A| = 4. What is |2A|?", options: ["8", "16", "32", "64"], answer: 2, explanation: "|kA| = kⁿ|A| with k = 2, n = 3: 2³ × 4 = 32." },
      { text: "A is a 3×3 matrix with |A| = 5. What is |adj A|?", options: ["5", "10", "25", "125"], answer: 2, explanation: "|adj A| = |A|ⁿ⁻¹ = 5² = 25 for n = 3." },
      { text: "For what value of k is the matrix [[k, 2], [3, 6]] singular?", options: ["0", "1", "2", "3"], answer: 1, explanation: "Singular means the determinant is zero: 6k − 6 = 0, so k = 1." },
      { text: "A is a square matrix with A² = I. Then |A| can be:", options: ["Only 1", "Only −1", "Either 1 or −1", "Any real number"], answer: 2, explanation: "|A|² = |A²| = |I| = 1, so |A| = ±1." },
    ],
  },
};
