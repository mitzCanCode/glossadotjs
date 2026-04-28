module.exports = {
    name: 'TypedVariables',
    expectsFailure: false,
    code: `ΠΡΟΓΡΑΜΜΑ TypedVariables
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α
  ΠΡΑΓΜΑΤΙΚΕΣ: β
  ΧΑΡΑΚΤΗΡΕΣ: γ
  ΛΟΓΙΚΕΣ: δ
ΑΡΧΗ
α <- 1
β <- 3.14
γ <- "hello"
δ <- α = 1
ΓΡΑΨΕ α, β, γ, δ
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`,
};
