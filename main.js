

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
                    throw new Error(
                        `Line ${i + 1}: '${line}' must end with 'τοτε'`
                    );
                }
            }

            if (isIf) {
                stack.push({ line: i + 1, hasElse: false });
            }

            else if (isElseIf || isElse) {
                if (stack.length === 0) {
                    throw new Error(`Line ${i + 1}: '${line}' without matching 'αν'`);
                }

                const current = stack[stack.length - 1];

                if (isElse) {
                    if (current.hasElse) {
                        throw new Error(`Line ${i + 1}: multiple 'αλλιως' in same 'αν' block`);
                    }
                    current.hasElse = true;
                }
            }

            else if (isEndIf) {
                if (stack.length === 0) {
                    throw new Error(`Line ${i + 1}: 'τελος_αν' without matching 'αν'`);
                }
                stack.pop();
            }
        }

        if (stack.length > 0) {
            const unclosed = stack[stack.length - 1];
            throw new Error(`Line ${unclosed.line}: 'αν' without matching 'τελος_αν'`);
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
            throw new Error(
                `Loop mismatch: ${openLoops} opening loops but ${closeLoops} closing loops`
            );
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
                    throw new Error(
                        `Line ${i + 1}: 'οσο' loop must contain 'επαναλαβε'`
                    );
                }

                // must be structured like: οσο ... επαναλαβε
                const hasValidStructure =
                    normalized.startsWith('οσο ') &&
                    normalized.includes(' επαναλαβε');

                if (!hasValidStructure) {
                    throw new Error(
                        `Line ${i + 1}: invalid 'οσο' loop structure`
                    );
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
                    throw new Error(
                        `Line ${i + 1}: 'για' loop missing 'απο'`
                    );
                }

                if (!normalized.includes(' μεχρι ')) {
                    throw new Error(
                        `Line ${i + 1}: 'για' loop missing 'μεχρι'`
                    );
                }

                // basic structure: για <var> απο ... μεχρι ...
                const parts = normalized.split(' ');

                if (parts.length < 5) {
                    throw new Error(
                        `Line ${i + 1}: incomplete 'για' loop syntax`
                    );
                }

                const variable = parts[1];

                // simple variable check (no spaces, not keyword)
                if (!variable || ['απο', 'μεχρι', 'με_βημα'].includes(variable)) {
                    throw new Error(
                        `Line ${i + 1}: invalid loop variable in 'για'`
                    );
                }

                // optional: validate "με_βημα" placement if exists
                if (normalized.includes('με_βημα') || normalized.includes('με βημα')) {
                    const hasStepValue =
                        normalized.match(/με(_|\s)βημα\s+.+/);

                    if (!hasStepValue) {
                        throw new Error(
                            `Line ${i + 1}: 'με_βημα' must be followed by a value`
                        );
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
                    throw new Error(
                        `Line ${i + 1}: 'μεχρις_οτου' without matching 'αρχη_επαναληψης'`
                    );
                }

                // validate condition exists
                const condition = normalized.replace('μεχρισ_οτου', '').trim();

                if (!condition) {
                    throw new Error(
                        `Line ${i + 1}: 'μεχρις_οτου' must have a condition`
                    );
                }

                stack.pop();
            }
        }

        if (stack.length > 0) {
            const unclosed = stack[stack.length - 1];
            throw new Error(
                `Line ${unclosed.line}: 'αρχη_επαναληψης' without matching 'μεχρις_οτου'`
            );
        }

        return true;
    }

    validateLoops(code) {
        try {
            this.validateEnoughForAndWhileClosures(code)
            this.validateWhileLoops(code);
            this.validateForLoops(code);
            this.validateDoWhileLoops(code);
        } catch (error) {
            throw new Error(`Loop validation error: ${error.message}`);
        }
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
        local_code = this.manageLoopClosure(code)
        local_code = this.manageWhileLoops(local_code)
        local_code = this.manageForLoops(local_code)
        local_code = this.manageDoWhile(local_code)
        return local_code
    }
}


class CodeManager {
    constructor() {
        this.conditionManager = new ConditionManager();
        this.loopManager = new LoopManager();
        this.stringStore = {};
    }

    extractStrings(code) {
        let result = "";
        let i = 0;
        let inString = false;
        let current = "";
        
        while (i < code.length) {
            const char = code[i];

            if (!inString) {
                if (char === '"') {
                    inString = true;
                    current = "";
                } else {
                    result += char;
                }
            } else {
                if (char === '\\') {
                    // handle escaped characters like \"
                    current += char + code[i + 1];
                    i++;
                } else if (char === '"') {
                    // string ends
                    const uuid = crypto.randomUUID();
                    const placeholder = `{${uuid}}`;
                    
                    this.stringStore[uuid] = current;
                    result += placeholder;

                    inString = false;
                } else {
                    current += char;
                }
            }
            i++;
        }

        if (inString) {
            throw new Error("Unclosed string detected");
        }

        return result;
    }


    restoreStrings(code) {
        return code.replace(/\{([0-9a-fA-F-]+)\}/g, (_, uuid) => {
            if (!(uuid in this.stringStore)) {
                throw new Error(`Missing UUID: ${uuid}`);
            }
            return `"${this.stringStore[uuid]}"`;
        });
    }

    lowerCode(code) {
        return code.toLowerCase();
    }

    sanitizeGreek(text) {
        return text
            // Normalize to decomposed form (separates accents from letters)
            .normalize("NFD")
            
            // Remove all diacritic marks
            .replace(/[\u0300-\u036f]/g, "")
            
            // Normalize final sigma to standard sigma (optional but common)
            .replace(/ς/g, "σ")
            
            // Normalize spacing
            .replace(/[^\S\n]+/g, " ")
            .trim();
    }


    manageOperands(code){

    }
}
