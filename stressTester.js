

const simple_code = `Διάβασε x
Γράψε "Έδωσες την τιμή:", x
y <- x * 2
Γράψε "Το διπλάσιο είναι:", y`

const loop_code = `Διάβασε n
i <- 1
Όσο i <= n επανάλαβε
    Γράψε i, ". Γεια σου!"
    i <- i + 1
Τέλος_επανάληψης
Γράψε "Τέλος προγράμματος"`

const condition_code = `Διάβασε num
Αν num MOD 3 = 0 Και num MOD 5 = 0 τότε
    Γράψε num, ": Διαιρείται από 3 και 5"
Άλλιώς_αν num MOD 3 = 0 τότε  
    Γράψε num, ": Διαιρείται από 3"
αλλιώς_αν num MOD 5 = 0 τότε
    Γράψε num, ": Διαιρείται από 5"
αλλιώς
    Γράψε num, ": Δεν διαιρείται από 3 ή 5"
Τέλος_αν
Γράψε "Τέλος προγράμματος"`

const complex_code = `count <- 1
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
Τέλος_επανάληψης`

const test_nested_all = `
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
`;

const test_do_while_nested = `
αρχη_επαναληψης
    οσο x < 10 επαναλαβε
        x <- x + 1
    τελοσ_επαναληψησ
μεχρις_οτου x > 20
`;

const test_for_negative = `
για i απο 10 μεχρι 1 με_βημα -2
    γραψε i
τελοσ_επαναληψησ
`;

const test_for_default = `
για i απο 1 μεχρι 5
    γραψε i
τελοσ_επαναληψησ
`;

const test_if_nested = `
αν x > 0 τοτε
    αν x > 10 τοτε
        γραψε "big"
    αλλιως
        γραψε "small"
    τελοσ_αν
αλλιως
    γραψε "negative"
τελοσ_αν
`;

const test_if_missing_end = `
αν x > 5 τοτε
    γραψε x
`;

const test_else_without_if = `
αλλιως
    γραψε x
`;

const test_if_missing_tote = `
αν x > 5
    γραψε x
τελοσ_αν
`;

const test_while_missing_repeat = `
οσο x < 10
    γραψε x
τελοσ_επαναληψησ
`;

const test_do_while_no_condition = `
αρχη_επαναληψης
    γραψε x
μεχρις_οτου
`;

const test_do_while_no_start = `
γραψε x
μεχρις_οτου x > 5
`;

const test_for_missing_apo = `
για i μεχρι 10
    γραψε i
τελοσ_επαναληψησ
`;

const test_for_no_var = `
για απο 1 μεχρι 10
    γραψε i
τελοσ_επαναληψησ
`;

const test_loop_mismatch = `
οσο x < 10 επαναλαβε
    γραψε x
`;


const test_spacing = `
   για    i   απο   1   μεχρι   3
        αν   i=1    τοτε
            γραψε i
        τελοσ_αν
   τελοσ_επαναληψησ
`;

const test_multiple_else = `
αν x > 0 τοτε
    γραψε x
αλλιως
    γραψε 1
αλλιως
    γραψε 2
τελοσ_αν
`;

const test_deep_nesting = `
αν a τοτε
    για i απο 1 μεχρι 3
        οσο i < 2 επαναλαβε
            αρχη_επαναληψης
                γραψε i
            μεχρις_οτου i > 5
        τελοσ_επαναληψησ
    τελοσ_επαναληψησ
τελοσ_αν
`;

code_collection = {"Simple" : simple_code, "Loop" : loop_code, "Condition" : condition_code, "Complex" : complex_code};



for (const [key, code] of Object.entries(code_collection)) {
    // Initialize new CodeManager for each code snippet to ensure a fresh string store
    const manager = new CodeManager();

    // Logging the code type with padding for better visibility
    console.log('========= ' + key + ' Code =========');

    // ========= STRING EXTRACTION =========
    const processed = manager.extractStrings(code);
    console.log("Processed Code:");
    console.log(processed);

    // ========= LOWERCASE CONVERSION =========
    const lowercased = manager.lowerCode(processed);
    console.log("\nLowercased Code:");
    console.log(lowercased);

    // ========= TONOS REMOVAL =========
    const tonosRemoved = manager.sanitizeGreek(lowercased);
    console.log("\nTonos Removed Code:");
    console.log(tonosRemoved);

    // ========= IF STATEMENT VALIDATION =========
    console.log("\nIF Statement Validation:");
    try {
        manager.conditionManager.validateIfStatements(tonosRemoved);
        console.log("IF statements are properly nested and matched.");
    } catch (error) {
        console.error("Validation Error:", error.message);
        continue; // Skip further processing for this code snippet if validation fails
    }

    // ========= IF STATEMENT MANAGEMENT =========
    const managedIfs = manager.conditionManager.manageIfStatements(tonosRemoved);
    console.log("\nManaged IF Statements Code:");
    console.log(managedIfs);
    

    // ========= LOOP VALIDATION =========
    console.log("\nLoop Validation:");
    try {
        manager.loopManager.validateLoops(managedIfs);
        console.log("Loops are properly opened and closed.");
    } catch (error) {
        console.error("Validation Error:", error.message);
        continue; // Skip further processing for this code snippet if validation fails
    }

    // ========= LOOP MANAGEMENT =========
    console.log("\nLoop Validation:");
    const managedLoops = manageLoops(managedIfs)
    console.log("\nManaged Loops Code:");
    console.log(managedIfs);

    // ========= STRING STORE =========

    // console.log("\nString Store:");
    // console.log(manager.stringStore);

    // ========= STRING RESTORATION =========
    // const restored = manager.restoreStrings(processed);
    // console.log("\nRestored Code:");
    // console.log(restored);

    // Separator for better readability between different code snippets
    console.log("\n\n\n")
}




