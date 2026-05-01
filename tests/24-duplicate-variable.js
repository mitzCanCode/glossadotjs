module.exports = {
    name: 'DuplicateVariableNames',
    expectsFailure: true,
    code: `ΠΡΟΓΡΑΜΜΑ DuplicateVariableNames
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α, α
ΑΡΧΗ
α <- 1
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`,
};
