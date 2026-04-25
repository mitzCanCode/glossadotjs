module.exports = {
    name: 'Complex',
    expectsFailure: false,
    code: `count <- 1
Όσο count <= num επανάλαβε
    Αν count MOD 3 = 0 Και count MOD 5 = 0 τότε
        Γράψε count, ": Διαιρείται από 3 και 5"
    αλλιώς_αν count MOD 3 = 0 τότε
        Γράψε count, ": Διαιρείται από 3"
    αλλιώς_αν count MOD 5 = 0 τότε
        Γράψε count, ": Διαιρείται από 5"
    αλλιώς
        Γράψε count, ": Δεν διαιρείται από 3 ή 5"
    Τέλος_αν
    count <- count + 1
Τέλος_επανάληψης`,
};
