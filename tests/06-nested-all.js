module.exports = {
    name: 'NestedAll',
    expectsFailure: false,
    code: `
για i απο 1 μεχρι 3
    οσο i < 5 επαναλαβε
        αν i mod 2 = 0 τοτε
            γραψε i
        αλλιως_αν i mod 3 = 0 τοτε
            γραψε "three"
        αλλιως
            γραψε "other"
        τελοσ_αν
        i <- i + 1
    τελοσ_επαναληψησ
τελοσ_επαναληψησ
`,
};
