module.exports = {
    name: 'IfNested',
    expectsFailure: false,
    code: `
αν x > 0 τοτε
    αν x > 10 τοτε
        γραψε "big"
    αλλιως
        γραψε "small"
    τελοσ_αν
αλλιως
    γραψε "negative"
τελοσ_αν
`,
};
