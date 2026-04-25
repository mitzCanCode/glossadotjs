module.exports = {
    name: 'DeepNesting',
    expectsFailure: false,
    code: `
αν a τοτε
    για i απο 1 μεχρι 3
        οσο i < 2 επαναλαβε
            αρχη_επαναληψης
                γραψε i
            μεχρις_οτου i > 5
        τελοσ_επαναληψησ
    τελοσ_επαναληψησ
τελοσ_αν
`,
};
