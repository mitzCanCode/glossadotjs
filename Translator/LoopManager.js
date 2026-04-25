class LoopManager {
    validateEnoughForAndWhileClosures(code) {
        const lines = code.split('\n');

        let openLoops = 0;
        let closeLoops = 0;

        for (let rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // opening loops
            const isWhile = line.startsWith('οσο ');
            const isFor = line.startsWith('για ');

            if (isWhile || isFor) {
                openLoops++;
            }

            // closing loops
            if (line === 'τελοσ_επαναληψησ') {
                closeLoops++;
            }
        }

        if (openLoops !== closeLoops) {
            throw new TranslationError({
                devMessage: `Loop mismatch: ${openLoops} opening loops but ${closeLoops} closing loops`,
                userMessage:
                    `Δεν ταιριάζει ο αριθμός των βρόχων: άνοιξαν ${openLoops} αλλά έκλεισαν ${closeLoops}. Έλεγξε τα 'τέλος_επανάληψης'.`,
            });
        }

        return true;
    }

    validateWhileLoops(code) {
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();

            if (!line) continue;

            const normalized = line.replace(/\s+/g, ' ');

            const isWhile = normalized.startsWith('οσο ');

            if (isWhile) {
                // must contain "επαναλαβε"
                if (!normalized.includes(' επαναλαβε')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'οσο' loop must contain 'επαναλαβε'`,
                        userMessage:
                            "Ο βρόχος 'όσο ... επανάλαβε' πρέπει να περιέχει τη λέξη 'επανάλαβε'.",
                        line: i + 1,
                    });
                }
            }
        }

        return true;
    }

    validateForLoops(code) {
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();

            if (!line) continue;

            const normalized = line.replace(/\s+/g, ' ');

            const isFor = normalized.startsWith('για ');

            if (isFor) {
                // must contain "απο" and "μεχρι"
                if (!normalized.includes(' απο ')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'για' loop missing 'απο'`,
                        userMessage:
                            "Ο βρόχος 'για' πρέπει να περιέχει τη λέξη 'από' με αρχική τιμή.",
                        line: i + 1,
                    });
                }

                if (!normalized.includes(' μεχρι ')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'για' loop missing 'μεχρι'`,
                        userMessage:
                            "Ο βρόχος 'για' πρέπει να περιέχει τη λέξη 'μέχρι' με τελική τιμή.",
                        line: i + 1,
                    });
                }

                // basic structure: για <var> απο ... μεχρι ...
                const parts = normalized.split(' ');

                if (parts.length < 5) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: incomplete 'για' loop syntax`,
                        userMessage:
                            "Η σύνταξη του βρόχου 'για' είναι ελλιπής. Χρησιμοποίησε: 'για <μεταβλητή> από <αρχή> μέχρι <τέλος>'.",
                        line: i + 1,
                    });
                }

                const variable = parts[1];

                // simple variable check (no spaces, not keyword)
                if (!variable || ['απο', 'μεχρι', 'με_βημα'].includes(variable)) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: invalid loop variable in 'για'`,
                        userMessage:
                            "Λείπει το όνομα της μεταβλητής μετρητή στον βρόχο 'για'.",
                        line: i + 1,
                    });
                }

                // optional: validate "με_βημα" placement if exists
                if (normalized.includes('με_βημα') || normalized.includes('με βημα')) {
                    const hasStepValue =
                        normalized.match(/με(_|\s)βημα\s+\S+/);

                    if (!hasStepValue) {
                        throw new TranslationError({
                            devMessage: `Line ${i + 1}: 'με_βημα' must be followed by a value`,
                            userMessage:
                                "Μετά το 'με_βήμα' πρέπει να ακολουθεί τιμή για το βήμα.",
                            line: i + 1,
                        });
                    }
                }
            }
        }

        return true;
    }

    validateDoWhileLoops(code) {
        const lines = code.split('\n');
        const stack = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();

            if (!line) continue;

            const normalized = line.replace(/\s+/g, ' ');

            const isStart = normalized === 'αρχη_επαναληψησ';
            const isUntil = normalized.startsWith('μεχρισ_οτου ');

            if (isStart) {
                stack.push({ line: i + 1 });
            }

            else if (isUntil) {
                if (stack.length === 0) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'μεχρις_οτου' without matching 'αρχη_επαναληψης'`,
                        userMessage:
                            "Βρέθηκε 'μέχρις_ότου' χωρίς να έχει ανοίξει 'αρχή_επανάληψης'.",
                        line: i + 1,
                    });
                }

                // validate condition exists
                const condition = normalized.replace('μεχρισ_οτου', '').trim();

                if (!condition) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'μεχρις_οτου' must have a condition`,
                        userMessage:
                            "Μετά το 'μέχρις_ότου' πρέπει να υπάρχει συνθήκη τερματισμού.",
                        line: i + 1,
                    });
                }

                stack.pop();
            }
        }

        if (stack.length > 0) {
            const unclosed = stack[stack.length - 1];
            throw new TranslationError({
                devMessage: `Line ${unclosed.line}: 'αρχη_επαναληψης' without matching 'μεχρις_οτου'`,
                userMessage:
                    "Η εντολή 'αρχή_επανάληψης' δεν έκλεισε ποτέ με 'μέχρις_ότου'.",
                line: unclosed.line,
            });
        }

        return true;
    }

    validateLoops(code) {
        // Re-throw as-is so we keep the original TranslationError (and its
        // user-facing message + line). Wrapping it in a generic Error would
        // erase that information.
        this.validateEnoughForAndWhileClosures(code);
        this.validateWhileLoops(code);
        this.validateForLoops(code);
        this.validateDoWhileLoops(code);
        return true;
    }

    manageLoopClosure(code) {
        const lines = code.split('\n');
        const result = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed === 'τελοσ_επαναληψησ') {
                return '}';
            }
            return line;
        });
        
        return result.join('\n');
    }

    manageWhileLoops(code) {
        const lines = code.split('\n');
        const result = lines.map(rawLine => {
            const line = rawLine.trim();
            if (!line) return rawLine;

            const normalized = line.replace(/\s+/g, ' ');
            const isWhile = normalized.startsWith('οσο ');

            if (isWhile) {
                // extract condition between "οσο" and "επαναλαβε"
                const condition = normalized
                    .replace('οσο', '')
                    .replace('επαναλαβε', '')
                    .trim();
                return `while (${condition}) {`;
            }
            return rawLine;
        });
        return result.join('\n');
    }

    manageForLoops(code) {
        const lines = code.split('\n');

        const result = lines.map(rawLine => {
            const line = rawLine.trim();
            if (!line) return rawLine;

            const normalized = line.replace(/\s+/g, ' ');

            const isFor = normalized.startsWith('για ');

            if (isFor) {
                // remove "για"
                let rest = normalized.replace('για ', '');

                // split around keywords
                const [varPart, afterVar] = rest.split(' απο ');
                if (!afterVar) return rawLine;

                const [startPart, afterStart] = afterVar.split(' μεχρι ');
                if (!afterStart) return rawLine;

                let endPart = afterStart;
                let step = '1';

                // check for step
                if (afterStart.includes('με_βημα') || afterStart.includes('με βημα')) {
                    const stepSplit = afterStart.split(/με_βημα|με βημα/);
                    endPart = stepSplit[0].trim();
                    step = stepSplit[1].trim();
                }

                const variable = varPart.trim();
                const start = startPart.trim();
                const end = endPart.trim();

                // decide condition based on step sign
                const stepNumber = Number(step);
                const comparison = stepNumber >= 0 ? '<=' : '>=';

                return `for (let ${variable} = ${start}; ${variable} ${comparison} ${end}; ${variable} += ${step}) {`;
            }

            return rawLine;
        });

        return result.join('\n');
    }

    manageDoWhile(code) {
        const lines = code.split('\n');
        const result = [];

        for (let rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
                result.push(rawLine);
                continue;
            }

            const normalized = line.replace(/\s+/g, ' ');

            // αρχη_επαναληψης → do {
            if (normalized === 'αρχη_επαναληψησ') {
                result.push('do {');
            }

            // μεχρις_οτου condition → } while (!(condition));
            else if (normalized.startsWith('μεχρισ_οτου ')) {
                const condition = normalized
                    .replace('μεχρισ_οτου', '')
                    .trim();

                result.push(`} while (!(${condition}));`);
            }

            // normal lines
            else {
                result.push(rawLine);
            }
        }

        return result.join('\n');
    }

    manageLoops(code) {
        let local_code = this.manageLoopClosure(code);
        local_code = this.manageWhileLoops(local_code);
        local_code = this.manageForLoops(local_code);
        local_code = this.manageDoWhile(local_code);
        return local_code;
    }
}

module.exports = LoopManager;