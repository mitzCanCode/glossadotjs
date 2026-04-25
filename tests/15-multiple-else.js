module.exports = {
    name: 'MultipleElse',
    expectsFailure: true,
    code: `
αν x > 0 τοτε
    γραψε x
αλλιως
    γραψε 1
αλλιως
    γραψε 2
τελοσ_αν
`,
};
