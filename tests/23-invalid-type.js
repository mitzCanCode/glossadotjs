module.exports = {
    name: 'InvalidVariableType',
    expectsFailure: true,
    code: `ΠΡΟΓΡΑΜΜΑ InvalidVariableType
ΜΕΤΑΒΛΗΤΕΣ
  x: ακέραιος, y: άγνωστος
ΑΡΧΗ
x <- 1
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`,
};
