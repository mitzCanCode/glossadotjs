class ConditionManager {
    validateIfStatements(code) {
        const lines = code.split('\n');
        const stack = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();

            if (!line) continue;

            const isIf = line.startsWith('αν ');
            const isElseIf = line.startsWith('αλλιωσ_αν ');
            const isElse = line === 'αλλιωσ';
            const isEndIf = line === 'τελοσ_αν';

            // must end with "τοτε"
            if (isIf || isElseIf) {
                if (!line.endsWith(' τοτε')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: '${line}' must end with 'τοτε'`,
                        userMessage:
                            "Η εντολή 'αν' (ή 'αλλιώς_αν') πρέπει να τελειώνει με τη λέξη 'τότε'.",
                        line: i + 1,
                    });
                }
            }

            if (isIf) {
                stack.push({ line: i + 1, hasElse: false });
            }

            else if (isElseIf || isElse) {
                if (stack.length === 0) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: '${line}' without matching 'αν'`,
                        userMessage:
                            "Βρέθηκε 'αλλιώς' (ή 'αλλιώς_αν') χωρίς να υπάρχει αντίστοιχο 'αν' πιο πάνω.",
                        line: i + 1,
                    });
                }

                const current = stack[stack.length - 1];

                if (isElse) {
                    if (current.hasElse) {
                        throw new TranslationError({
                            devMessage: `Line ${i + 1}: multiple 'αλλιως' in same 'αν' block`,
                            userMessage:
                                "Δεν επιτρέπονται περισσότερα από ένα 'αλλιώς' μέσα στο ίδιο μπλοκ 'αν'.",
                            line: i + 1,
                        });
                    }
                    current.hasElse = true;
                }
            }

            else if (isEndIf) {
                if (stack.length === 0) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'τελος_αν' without matching 'αν'`,
                        userMessage:
                            "Βρέθηκε 'τέλος_αν' χωρίς να έχει ανοίξει εντολή 'αν'.",
                        line: i + 1,
                    });
                }
                stack.pop();
            }
        }

        if (stack.length > 0) {
            const unclosed = stack[stack.length - 1];
            throw new TranslationError({
                devMessage: `Line ${unclosed.line}: 'αν' without matching 'τελος_αν'`,
                userMessage: "Η εντολή 'αν' δεν έκλεισε ποτέ με 'τέλος_αν'.",
                line: unclosed.line,
            });
        }

        return true;
    }

    manageIfStatements(code) {
        const lines = code.split('\n');
        let result = [];

        for (let rawLine of lines) {
            let line = rawLine.trim();
            if (!line) continue;

            // αν ... τοτε  → if (...)
            if (line.startsWith('αν ')) {
                let condition = line
                    .replace('αν', '')
                    .replace('τοτε', '')
                    .trim();

                result.push(`if (${condition}) {`);
            }

            // αλλιως_αν ... τοτε → } else if (...)
            else if (line.startsWith('αλλιωσ_αν ')) {
                let condition = line
                    .replace('αλλιωσ_αν', '')
                    .replace('τοτε', '')
                    .trim();

                result.push(`} else if (${condition}) {`);
            }

            // αλλιως → } else {
            else if (line === 'αλλιωσ') {
                result.push(`} else {`);
            }

            // τελος_αν → }
            else if (line === 'τελοσ_αν') {
                result.push(`}`);
            }

            // normal line (inside blocks)
            else {
                result.push(line);
            }
        }

        return result.join('\n');
    }
}

module.exports = ConditionManager;