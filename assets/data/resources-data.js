// To add or change a chapter, edit one line: "Chapter name|approx questions|file name".
// Leave the file name empty to show "Coming soon". PDFs live in the Notes folder.
const NOTES_FOLDER = "Notes/";
const DATA = {
  Physics: [
    "Modern Physics|3-4|", "Current Electricity|2-3|Current electricity.pdf", "KTG|1-2|ktg.pdf",
    "Optical Instruments|1-2|optical instruments.pdf", "Electrostatics|1-2|Electrostatics.pdf", "Gravitation|1-2|Gravity.pdf",
    "Alternating Currents|1-2|A.current.pdf", "Simple Harmonic Motion|1-2|S.H.M.pdf", "Wave Optics|1|wave optics.pdf",
    "Newton's Laws of Motion|2|NLM.pdf", "Kinematics|1-2|Kinematics.pdf", "Electromagnetic Waves|1|Electromagnetic waves.pdf",
    "Centre of Mass|0-1|COM.pdf", "Ray Optics|1-2|Ray optics.pdf", "Work, Power & Energy|1|W.P.E, Circular.pdf",
    "Electromagnetic Induction|1|EMI.pdf", "Units & Measurements|1|Units.pdf", "Calorimetry|0-1|calorimetry.pdf",
    "Friction|0-1|Friction.pdf", "Fluid Mechanics|1-2|Fluid mechanics.pdf", "Dual Nature|1|Dual nature.pdf",
    "Expansion of Liquids|0-1|exp.of liquids.pdf", "Expansion of Gases|0-1|exp. of gases.pdf", "Thermodynamics|0-1|thermody..pdf",
    "Heat Transfer|0-1|heat transfer.pdf", "Nuclear Physics|0-1|Nuclear physics.pdf", "Atomic Physics|0-1|Atomic physics.pdf",
    "Rotational Motion|0-1|Rotational motion.pdf", "Collisions|0-1|Collisions.pdf", "Magnetism & Matter|0-1|Magnetism and matter.pdf",
    "Properties of Solids|0-1|Properties of solids.pdf", "Vectors|0-1|Phy. vectors.pdf"
  ],
  Chemistry: [
    "Solutions|1-2|Solutions.pdf", "Metallurgy|1|Metallurgy.pdf", "Chemical Bonding|2-3|Chemical bonding.pdf",
    "Stoichiometry|2-3|Stiochiometry.pdf", "Electrochemistry|1-2|Electrochemistry (1).pdf", "Chemical Equilibrium|2-3|Equilibrium.pdf",
    "Quantitative Analysis|1|Quantitative analysis.pdf", "Environmental Chemistry|1|Environmental chemistry short notes.pdf",
    "Alkanes|1|Alkanes.pdf", "Alkynes|1|Alkyne.pdf", "Benzene|1|Benzene (1).pdf", "Nomenclature|1|Nomenclature.pdf",
    "Atomic Structure|1-2|Atomic structure.pdf", "Qualitative Inorganic Analysis|1|Qualitative inorganic analysis.pdf",
    "Aromaticity|1|Aromaticity.pdf", "Alkenes|1|ALKENE.pdf", "Chemistry in Everyday Life|1-2|Chemistry in every day life.pdf",
    "Organic Reagents|1|Organic reagents.pdf", "d & f Blocks|1-2|d&f block.pdf", "Electronic Effects|1|Electromeric effects.pdf",
    "Chemical Kinetics|1-2|che. kinetics.pdf", "Group 16|1|grp 16.pdf", "Group 17|1|grp 17.pdf", "Group 18|1|grp 18 (1).pdf",
    "Complex Compounds|1|Complex compounds.pdf", "Group 15|1|group15 p-1_merged.pdf", "States of Matter|1|states of matter.pdf"
  ],
  Mathematics: [
    "Vectors|2-3|vectors.pdf", "3D Geometry|3|3d geo.pdf", "Matrices & Determinants|3|mat.pdf", "Conic Sections|2-3|conics.pdf",
    "Differential Equations|3-4|d.eqn.pdf", "Circles|1-2|circles.pdf", "Binomial Theorem|1-2|binomial the..pdf",
    "Permutations & Combinations|1|P&C.pdf", "Probability|1-2|probability.pdf", "Trigonometry|2-3|trigonometry.pdf",
    "Quadratic & Theory of Equations|1|the.of eqns.pdf", "Complex Numbers|1|complex no.pdf", "Functions|2-3|fun..pdf",
    "Mathematical Reasoning|1|", "Statistics|1|stat..pdf", "Limits & Continuity|1-2|lts.pdf", "Differentiation|0-1|diff.pdf",
    "Sequence & Series|1|seq.&series.pdf", "Applications of Derivatives|1-2|A.O.D.pdf", "Sets & Relations|1|sets and relation.pdf",
    "Logarithm|0-1|log.pdf", "Straight Lines|1-2|st.lines.pdf", "Pair of Lines|0-1|pair of st.lines.pdf", "Parabola|0-1|Parabola.pdf",
    "Ellipse|0-1|ellipse.pdf", "Hyperbola|0-1|hyperbola.pdf", "Lines & Planes|0-1|lines and planes.pdf", "2D Geometry|0-1|2d geometry.pdf",
    "Definite Integrals|0-1|def9t int.pdf", "Indefinite Integrals|0-1|Indefinite integration.pdf"
  ]
};