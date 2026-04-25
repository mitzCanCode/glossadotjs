module.exports = {
    name: 'DoWhileNested',
    expectsFailure: false,
    code: `
αρχη_επαναληψης
    οσο x < 10 επαναλαβε
        x <- x + 1
    τελοσ_επαναληψησ
μεχρις_οτου x > 20
`,
};
