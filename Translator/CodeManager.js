const TranslationError = require('./TranslationError');
const ConditionManager = require('./ConditionManager');
const LoopManager = require('./LoopManager');

class Variable{
    constructor(name, type = null, isArray = false, isConstant = false, value = null, arraySize = null) {
        this.name = name;
        this.type = type;
        this.isArray = isArray;
        this.isConstant = isConstant;
        this.value = value;
        this.arraySize = arraySize;
    }
}

const validators = {
    int: (v) => Number.isInteger(v),

    float: (v) =>
        typeof v === 'number' &&
        Number.isFinite(v) &&
        !Number.isInteger(v),

    string: (v) => typeof v === 'string',

    boolean: (v) => typeof v === 'boolean',
};

function safeAssignment(type, value) {
    const validate = validators[type];

    if (!validate) {
        throw new TranslationError({
            devMessage: `Unknown type for validation: ${type}`,
            userMessage: `Εσωτερικό σφάλμα: άγνωστος τύπος δεδομένων '${type}' για έλεγχο.`,
        });
    }

    if (!validate(value)) {
        throw new TranslationError({
            devMessage: `Type mismatch: expected ${type} but got ${typeof value}`,
            userMessage: `Λάθος τύπος δεδομένων. Αναμενόταν ${type}.`,
        });
    }

    return value;
}

function createFixArray(size, data_type) {
    const target = new Array(size);
    return new Proxy(target, {
        get(obj, prop) {
            if (prop === 'length') return size;
            
            const index = Number(prop);
            
            if (!Number.isNaN(index)) {
                if (index < 0 || index >= size) {
                    throw new TranslationError({
                        devMessage: `Attempted to access index ${index} which is out of bounds for array of size ${size}`,
                        userMessage: `Προσπάθεια πρόσβασης σε μη έγκυρο δείκτη πίνακα: ${index}. Ο πίνακας έχει μέγεθος ${size}.`,
                    });
                }
            }
            return obj[prop];
        },

        set(obj, prop, value) {
            const index = Number(prop);
            if (!Number.isNaN(index)) {
                if (index < 0 || index >= size) {
                    throw new TranslationError({
                        devMessage: `Attempted to set index ${index} which is out of bounds for array of size ${size}`,
                        userMessage: `Προσπάθεια ορισμού τιμής σε μη έγκυρο δείκτη πίνακα: ${index}. Ο πίνακας έχει μέγεθος ${size}.`,
                    });
                }
            }

            obj[prop] = value;
            return true;
        }
    });
}

class CodeManager {
    constructor() {
        this.conditionManager = new ConditionManager();
        this.loopManager = new LoopManager();
        this.stringStore = {};
        this.declarationsString = "";
        this.programName = "";
        this.variables = [];
        this.constants = [];
        this.reservedNames = ['α_μ', 'α_τ', 'ε', 'εφ', 'ημ', 'λογ', 'συν', 'τ_ρ'];
    }

    isReservedName(name) {
        return this.reservedNames.includes(name.toLowerCase());
    }

    codeCleanUpInit(code) {
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            throw new TranslationError({
                devMessage: 'Program contains no code',
                userMessage: 'Το πρόγραμμα είναι κενό.',
            });
        }

        // normalize once
        const normalized = lines.map(l => this.sanitizeGreek(this.lowerCode(l)));

        // ===== PROGRAM START =====
        const first = normalized[0];

        if (!first.startsWith('προγραμμα ')) {
            throw new TranslationError({
                devMessage: 'Missing program start keyword',
                userMessage: 'Λείπει η λέξη ΠΡΟΓΡΑΜΜΑ στην αρχή.',
            });
        }

        const parts = first.split(' ');
        if (parts.length !== 2) {
            throw new TranslationError({
                devMessage: 'Invalid program start syntax',
                userMessage: 'Λάθος μορφή επικεφαλίδας προγράμματος.',
            });
        }

        this.programName = lines[0].split(' ')[1].trim();

        // ===== PROGRAM END =====
        const last = normalized[normalized.length - 1];

        if (last !== 'τελοσ_προγραμματοσ') {
            throw new TranslationError({
                devMessage: 'Missing program close keyword',
                userMessage: 'Λείπει το ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ.',
            });
        }

        // ===== FIND SECTIONS =====
        const startIndex = normalized.findIndex(l => l === 'αρχη');
        if (startIndex === -1) {
            throw new TranslationError({
                devMessage: 'Missing ΑΡΧΗ',
                userMessage: 'Λείπει η λέξη ΑΡΧΗ.',
            });
        }

        const constantsIndex = normalized.findIndex(l => l.startsWith('σταθερεσ'));
        const variablesIndex = normalized.findIndex(l => l.startsWith('μεταβλητεσ'));

        // ===== EXTRACT SECTIONS =====
        let constants = [];
        let variables = [];

        const TYPE_MAP = {
            'ακεραιεσ': 'int',
            'πραγματικεσ': 'float',
            'χαρακτηρεσ': 'string',
            'λογικεσ': 'boolean',
        };

        // ---- CONSTANTS ----
        if (constantsIndex !== -1) {
            let end = startIndex;
            if (variablesIndex !== -1 && variablesIndex > constantsIndex) {
                end = variablesIndex;
            }

            const constantLines = normalized.slice(constantsIndex + 1, end);
            const parsedConstants = [];

            for (let line of constantLines) {
                if (!this.areBalanced(line)) {
                    throw new TranslationError({
                        devMessage: `Unbalanced brackets in constant declaration: ${line}`,
                        userMessage: 'Υπάρχουν μη κλειστές παρενθέσεις ή αγκύλες σε δήλωση σταθεράς.',
                    });
                }

                if (!line.includes('=')) {
                    throw new TranslationError({
                        devMessage: `Invalid constant declaration: ${line}`,
                        userMessage: 'Λάθος δήλωση σταθεράς.',
                    });
                }

                const [namePart, ...valueParts] = line.split('=');
                const name = namePart.trim();
                const value = valueParts.join('=').trim();

                if (!name || name.includes(' ') || name.includes('[') || name.includes(']')) {
                    throw new TranslationError({
                        devMessage: `Invalid constant name: ${name}`,
                        userMessage: `Μη έγκυρο όνομα σταθεράς: ${name}`,
                    });
                }

                if (this.isReservedName(name)) {
                    throw new TranslationError({
                        devMessage: `Reserved name cannot be used as constant: ${name}`,
                        userMessage: `Το όνομα '${name}' είναι δεσμευμένο και δεν μπορεί να χρησιμοποιηθεί ως όνομα σταθεράς.`,
                    });
                }

                if (!value) {
                    throw new TranslationError({
                        devMessage: `Missing value for constant: ${name}`,
                        userMessage: `Λείπει τιμή για τη σταθερά: ${name}`,
                    });
                }

                let constantType = null;
                let constantValue = value;
                if (/^".*"$/.test(value) || /^'.*'$/.test(value)) {
                    constantType = 'string';
                    constantValue = this.extractStrings(value, true);
                } else if (/^-?\d+(\.\d+)?$/.test(value)) {
                    constantType = 'number';
                } else if (['αληθησ', 'ψευδησ'].includes(value)) {
                    constantType = 'boolean';
                    constantValue = value.startsWith('αληθ') ? 'true' : 'false';
                }

                parsedConstants.push(new Variable(name, constantType, false, true, constantValue));
            }

            constants = parsedConstants;

            const constantNames = new Set();
            for (const c of constants) {
                if (constantNames.has(c.name)) {
                    throw new TranslationError({
                        devMessage: `Duplicate constant declaration: ${c.name}`,
                        userMessage: `Η σταθερά '${c.name}' έχει ήδη δηλωθεί.`,
                    });
                }
                constantNames.add(c.name);
            }

            this.constants = constants;
        }

        // ---- VARIABLES ----
        if (variablesIndex !== -1) {
            let end = startIndex;
            const variableLines = normalized.slice(variablesIndex + 1, end);

            // Also check the variables line itself for variables after the keyword
            const varLine = normalized[variablesIndex];
            const varPart = varLine.replace('μεταβλητεσ', '').trim();
            if (varPart) {
                variableLines.unshift(varPart);
            }

            const parsedVariables = [];
            const groupTypePattern = /^(ακεραιεσ|πραγματικεσ|χαρακτηρεσ|λογικεσ)\s*:\s*(.+)$/;
            const arrayPattern = /^([^\[\]]+)\[(\d+)\]$/;

            for (let line of variableLines) {
                if (!line) continue;
                if (!this.areBalanced(line)) {
                    throw new TranslationError({
                        devMessage: `Unbalanced brackets in variable declaration: ${line}`,
                        userMessage: 'Υπάρχουν μη κλειστές παρενθέσεις ή αγκύλες σε δήλωση μεταβλητής.',
                    });
                }

                const groupMatch = line.match(groupTypePattern);
                if (groupMatch) {
                    const typeKey = groupMatch[1];
                    const tsType = TYPE_MAP[typeKey];
                    const names = groupMatch[2].split(',').map(v => v.trim()).filter(v => v.length > 0);

                    if (names.length === 0) {
                        throw new TranslationError({
                            devMessage: `Invalid variable group declaration: ${line}`,
                            userMessage: 'Λάθος δήλωση μεταβλητών.',
                        });
                    }

                    for (let name of names) {
                        if (!name || name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }

                        if (this.isReservedName(name)) {
                            throw new TranslationError({
                                devMessage: `Reserved name cannot be used as variable: ${name}`,
                                userMessage: `Το όνομα '${name}' είναι δεσμευμένο και δεν μπορεί να χρησιμοποιηθεί ως όνομα μεταβλητής.`,
                            });
                        }

                        // Check for arrays with empty brackets
                        if (name.includes('[') && !name.match(/^[^\[\]]+\[\d+\]$/)) {
                            throw new TranslationError({
                                devMessage: `Invalid array declaration: ${name}. Arrays must specify a size like x[10]`,
                                userMessage: `Μη έγκυρη δήλωση πίνακα: ${name}. Οι πίνακες πρέπει να έχουν ένα μέγεθος, π.χ. x[10]`,
                            });
                        }

                        const arrayMatch = name.match(arrayPattern);
                        if (arrayMatch) {
                            const baseName = arrayMatch[1].trim();
                            const size = Number(arrayMatch[2]);
                            if (!baseName) {
                                throw new TranslationError({
                                    devMessage: `Invalid array declaration: ${name}`,
                                    userMessage: `Μη έγκυρη δήλωση πίνακα: ${name}`,
                                });
                            }
                            parsedVariables.push(new Variable(baseName, tsType, true, false, null, size));
                        } else {
                            parsedVariables.push(new Variable(name, tsType));
                        }
                    }
                    continue;
                }

                const entries = line.split(',').map(v => v.trim()).filter(v => v.length > 0);
                for (const entry of entries) {
                    if (entry.includes(':')) {
                        const parts = entry.split(':').map(v => v.trim());
                        if (parts.length !== 2 || !parts[0] || !parts[1]) {
                            throw new TranslationError({
                                devMessage: `Invalid variable declaration: ${entry}`,
                                userMessage: 'Λάθος δήλωση μεταβλητής.',
                            });
                        }

                        let name = parts[0];
                        const typeKey = parts[1];
                        const tsType = TYPE_MAP[typeKey];

                        if (!tsType) {
                            throw new TranslationError({
                                devMessage: `Invalid variable type: ${typeKey}`,
                                userMessage: `Μη έγκυρος τύπος δεδομένων: ${parts[1]}`,
                            });
                        }

                        if (this.isReservedName(name.match(/[^\[\]]+/)[0])) {
                            throw new TranslationError({
                                devMessage: `Reserved name cannot be used as variable: ${name}`,
                                userMessage: `Το όνομα είναι δεσμευμένο και δεν μπορεί να χρησιμοποιηθεί ως όνομα μεταβλητής.`,
                            });
                        }

                        // Check for arrays with empty brackets
                        if (name.includes('[') && !name.match(/^[^\[\]]+\[\d+\]$/)) {
                            throw new TranslationError({
                                devMessage: `Invalid array declaration: ${name}. Arrays must specify a size like x[10]`,
                                userMessage: `Μη έγκυρη δήλωση πίνακα: ${name}. Οι πίνακες πρέπει να έχουν ένα μέγεθος, π.χ. x[10]`,
                            });
                        }

                        let isArray = false;
                        let arraySize = null;
                        const arrayMatch = name.match(arrayPattern);
                        if (arrayMatch) {
                            name = arrayMatch[1].trim();
                            arraySize = Number(arrayMatch[2]);
                            isArray = true;
                        }

                        if (name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }

                        parsedVariables.push(new Variable(name, tsType, isArray, false, null, arraySize));
                    } else {
                        // Check for arrays with empty brackets
                        if (entry.includes('[') && !entry.match(/^[^\[\]]+\[\d+\]$/)) {
                            throw new TranslationError({
                                devMessage: `Invalid array declaration: ${entry}. Arrays must specify a size like x[10]`,
                                userMessage: `Μη έγκυρη δήλωση πίνακα: ${entry}. Οι πίνακες πρέπει να έχουν ένα μέγεθος, π.χ. x[10]`,
                            });
                        }

                        const arrayMatch = entry.match(arrayPattern);
                        if (arrayMatch) {
                            const name = arrayMatch[1].trim();
                            const size = Number(arrayMatch[2]);
                            if (!name) {
                                throw new TranslationError({
                                    devMessage: `Invalid array declaration: ${entry}`,
                                    userMessage: `Μη έγκυρη δήλωση πίνακα: ${entry}`,
                                });
                            }

                            if (this.isReservedName(name)) {
                                throw new TranslationError({
                                    devMessage: `Reserved name cannot be used as variable: ${name}`,
                                    userMessage: `Το όνομα '${name}' είναι δεσμευμένο και δεν μπορεί να χρησιμοποιηθεί ως όνομα μεταβλητής.`,
                                });
                            }

                            parsedVariables.push(new Variable(name, null, true, false, null, size));
                            continue;
                        }

                        const name = entry;
                        if (name.includes(' ')) {
                            throw new TranslationError({
                                devMessage: `Invalid variable name: ${name}`,
                                userMessage: `Μη έγκυρο όνομα μεταβλητής: ${name}`,
                            });
                        }

                        if (this.isReservedName(name)) {
                            throw new TranslationError({
                                devMessage: `Reserved name cannot be used as variable: ${name}`,
                                userMessage: `Το όνομα '${name}' είναι δεσμευμένο και δεν μπορεί να χρησιμοποιηθεί ως όνομα μεταβλητής.`,
                            });
                        }

                        parsedVariables.push(new Variable(name, null));
                    }
                }
            }

            variables = parsedVariables;

            const variableNames = new Set();
            for (const v of variables) {
                if (variableNames.has(v.name)) {
                    throw new TranslationError({
                        devMessage: `Duplicate variable declaration: ${v.name}`,
                        userMessage: `Η μεταβλητή '${v.name}' έχει ήδη δηλωθεί.`,
                    });
                }
                variableNames.add(v.name);

                if (this.constants.some((c) => c.name === v.name)) {
                    throw new TranslationError({
                        devMessage: `Variable conflicts with constant name: ${v.name}`,
                        userMessage: `Το όνομα '${v.name}' χρησιμοποιείται ήδη για σταθερά και δεν μπορεί να χρησιμοποιηθεί ξανά ως μεταβλητή.`,
                    });
                }
            }

            this.variables = variables;
        }

        // ===== BUILD DECLARATIONS STRING =====
        let decl = [];

        // constants → const
        for (let c of constants) {
            if (c.value !== null && c.value !== undefined) {
                const typeAnnotation = c.type ? `: ${c.type}` : '';
                const value = c.type === 'string' ? JSON.stringify(c.value) : c.value;
                decl.push(`const ${c.name}${typeAnnotation} = ${value}`);
            } else {
                const typeAnnotation = c.type ? `: ${c.type}` : '';
                decl.push(`const ${c.name}${typeAnnotation}`);
            }
        }

        // variables → let
        if (variables.length > 0) {
            const arrayDecls = [];
            const regularVars = [];
            
            for (let v of variables) {
                if (v.isArray) {
                    arrayDecls.push(`let ${v.name} = createFixArray(${v.arraySize}, '${v.type}')`);
                } else {
                    if (v.type) {
                        const tsType = (v.type === 'int' || v.type === 'float') ? 'number' : v.type;
                        regularVars.push(`${v.name}: ${tsType}`);
                    } else {
                        regularVars.push(v.name);
                    }
                }
            }
            
            if (regularVars.length > 0) {
                decl.push(`let ${regularVars.join(', ')}`);
            }
            
            decl.push(...arrayDecls);
        }

        this.declarationsString = decl.join('\n');

        // ===== EXTRACT MAIN CODE =====
        const body = lines.slice(startIndex + 1, lines.length - 1);

        return body.join('\n');
    }

    addDeclarationString(code) {
        return this.declarationsString + "\n" + code;
    }

    extractStrings(code, extractSingleString = false) {
        let result = "";
        let i = 0;
        let inString = false;
        let current = "";
        let delimiter = null;
        
        while (i < code.length) {
            const char = code[i];

            if (!inString) {
                if (char === '"' || char === "'") {
                    inString = true;
                    delimiter = char;
                    current = "";
                } else {
                    if (extractSingleString && !/\s/.test(char)) {
                        throw new TranslationError({
                            devMessage: `Expected single string literal but found extra text: ${code}`,
                            userMessage: 'Μη έγκυρη δήλωση συμβολοσειράς σταθεράς.',
                        });
                    }
                    result += char;
                }
            } else {
                if (char === '\\') {
                    // handle escaped characters like \" or \\'
                    if (i + 1 < code.length) {
                        current += char + code[i + 1];
                        i++;
                    } else {
                        current += char;
                    }
                } else if (char === delimiter) {
                    if (extractSingleString) {
                        const rest = code.slice(i + 1);
                        if (rest.trim().length > 0) {
                            throw new TranslationError({
                                devMessage: `Expected only a single string literal but found extra text: ${rest}`,
                                userMessage: 'Μη έγκυρη δήλωση συμβολοσειράς σταθεράς.',
                            });
                        }
                        return current;
                    }

                    const uuid = crypto.randomUUID();
                    const placeholder = `{${uuid}}`;
                    
                    this.stringStore[uuid] = current;
                    result += placeholder;

                    inString = false;
                    delimiter = null;
                } else {
                    current += char;
                }
            }
            i++;
        }

        if (inString) {
            throw new TranslationError({
                devMessage: 'Unclosed string detected',
                userMessage:
                    'Υπάρχει συμβολοσειρά που άνοιξε με " αλλά δεν έκλεισε ποτέ.',
            });
        }

        return result;
    }

    manageVariableDeclarations(code) {
        if (!this.declarationsString) {
            return code;
        }
        return this.addDeclarationString(code);
    }

    translateCode(originalCode) {
        // Reset per-translation state so the manager can be reused safely.
        this.stringStore = {};
        this.declarationsString = "";
        this.programName = "";

        let code = this.codeCleanUpInit(originalCode);
        code = this.extractStrings(code);
        if (!this.areBalanced(code)) {
            throw new TranslationError({
                devMessage: 'Unbalanced brackets or parentheses in program code',
                userMessage: 'Υπάρχουν μη κλειστές παρενθέσεις ή αγκύλες στον κώδικα.',
            });
        }
        code = this.lowerCode(code);
        code = this.sanitizeGreek(code);
        code = this.manageAssignments(code);
        code = this.manageOperands(code);

        this.conditionManager.validateIfStatements(code);
        code = this.conditionManager.manageIfStatements(code);

        this.loopManager.validateLoops(code);
        code = this.loopManager.manageLoops(code);

        code = this.restoreStrings(code);
        code = this.functionTranslator(code);
        code = this.managePrint(code);
        code = this.manageInputStatements(code);
        code = this.manageVariableDeclarations(code);

        return code;
    }

    restoreStrings(code) {
        return code.replace(/\{([0-9a-fA-F-]+)\}/g, (_, uuid) => {
            if (!(uuid in this.stringStore)) {
                throw new TranslationError({
                    devMessage: `Missing UUID: ${uuid}`,
                    userMessage:
                        'Εσωτερικό σφάλμα: χάθηκε αναφορά σε συμβολοσειρά κατά τη μετάφραση.',
                });
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

    areBalanced(text, checkStrings = false) {
        const stack = [];
        const pairs = { ')': '(', ']': '[' };

        let inSingle = false;
        let inDouble = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Check for string pairs if enabled
            if (checkStrings) {
            if (char === "'" && !inDouble) {
                inSingle = !inSingle;
                continue;
            }
            if (char === '"' && !inSingle) {
                inDouble = !inDouble;
                continue;
            }
            if (inSingle || inDouble) continue;
            }

            // Bracket logic
            if (char === '(' || char === '[') {
            stack.push(char);
            } else if (char === ')' || char === ']') {
            if (!stack.length || stack[stack.length - 1] !== pairs[char]) {
                return false;
            }
            stack.pop();
            }
        }

        return stack.length === 0 && (!checkStrings || (!inSingle && !inDouble));
    }

    manageAssignments(code) {
        const lines = code.split('\n');
        const result = [];
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine.includes('<-')) {
                result.push(rawLine);
                continue;
            }

            const matches = rawLine.match(/<-/g) || [];
            if (matches.length !== 1) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: expected exactly one '<-' operator in assignment`,
                    userMessage: 'Μη έγκυρη ανάθεση. Η γραμμή πρέπει να περιέχει μόνο έναν τελεστή "<-".',
                    line: i + 1,
                });
            }

            const lineMatch = rawLine.match(/^(\s*)(.*)$/);
            const indent = lineMatch ? lineMatch[1] : '';
            const code = lineMatch ? lineMatch[2] : rawLine;
            const [rawLeft, rawRight] = code.split(/<-/);
            const left = rawLeft.trim();
            const expression = rawRight === undefined ? '' : rawRight.trim();

            if (!left || !expression) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: invalid assignment structure`,
                    userMessage: 'Μη έγκυρη ανάθεση. Ελέγξτε τη μορφή της γραμμής.',
                    line: i + 1,
                });
            }

            const targetMatch = left.match(/^([\p{L}_][\p{L}\d_]*)(\s*\[\s*[^\]]+\s*\])?$/u);
            if (!targetMatch) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: invalid assignment target '${left}'`,
                    userMessage: 'Μη έγκυρος στόχος ανάθεσης. Χρησιμοποιήστε μόνο μία μεταβλητή ή δείκτη πίνακα στη αριστερή πλευρά.',
                    line: i + 1,
                });
            }

            const variableName = targetMatch[1];
            const variable = this.variables.find((v) => v.name === variableName);
            if (!variable) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: assignment target '${variableName}' is not declared`,
                    userMessage: `Η μεταβλητή '${variableName}' δεν έχει δηλωθεί.`,
                    line: i + 1,
                });
            }

            if (targetMatch[2] && !variable.isArray) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: assignment target '${left}' is not an array`,
                    userMessage: `Η μεταβλητή '${variableName}' δεν είναι πίνακας, αλλά χρησιμοποιήθηκε δείκτης.`,
                    line: i + 1,
                });
            }

            if (!variable.type) {
                throw new TranslationError({
                    devMessage: `Line ${i + 1}: variable '${variableName}' has no declared type`,
                    userMessage: `Η μεταβλητή '${variableName}' δεν έχει δηλωμένο τύπο για έλεγχο ανάθεσης.`,
                    line: i + 1,
                });
            }

            result.push(`${indent}${left} __ASSIGN__ safeAssignment('${variable.type}', ${expression})`);
        }
        return result.join('\n');
    }

    manageOperands(code) {
        let result = code;

        // comparison "=" → "==" (do this first before assignment replacement)
        result = result.replace(/(?<![<>=!])=(?!=)/g, '==');

        // not equal
        result = result.replace(/<>/g, '!=');

        // logical operators
        result = result.replace(/\bκαι\b/g, '&&');
        result = result.replace(/\bή\b/g, '||');
        result = result.replace(/\bοχι\b/g, '!');
        result = result.replace(/\bαληθεσ\b/g, 'true');
        result = result.replace(/\bψευδεσ\b/g, 'false');
        result = result.replace(/\bψευδησ\b/g, 'false');

        // mod
        result = result.replace(/\bmod\b/g, '%');

        // restore protected assignment markers
        result = result.replace(/__ASSIGN__/g, '=');

        return result;
    }


    functionTranslator(code) {
        const replacements = [
            { regex: /α_μ\s*\(([^)]+)\)/g, repl: 'Math.floor($1)' },
            { regex: /α_τ\s*\(([^)]+)\)/g, repl: 'Math.abs($1)' },
            { regex: /ε\s*\(([^)]+)\)/g, repl: 'Math.exp($1)' },
            { regex: /λογ\s*\(([^)]+)\)/g, repl: 'Math.log($1)' },
            { regex: /τ_ρ\s*\(([^)]+)\)/g, repl: 'Math.sqrt($1)' },

            // trig in degrees → convert to radians
            { regex: /ημ\s*\(([^)]+)\)/g, repl: 'Math.sin(($1) * Math.PI / 180)' },
            { regex: /συν\s*\(([^)]+)\)/g, repl: 'Math.cos(($1) * Math.PI / 180)' },
            { regex: /εφ\s*\(([^)]+)\)/g, repl: 'Math.tan(($1) * Math.PI / 180)' },
        ];

        let result = code;
        for (const { regex, repl } of replacements) {
            result = result.replace(regex, repl);
        }
        return result;
    }

    managePrint(code) {
        const lines = code.split('\n');
        const result = lines.map(rawLine => {
            const trimmed = rawLine.trim();

            if (!trimmed) return rawLine;

            const normalized = trimmed.replace(/\s+/g, ' ');
            if (normalized.startsWith('γραψε ')) {
                const content = normalized.replace('γραψε', '').trim();
                return `print(${content})`;
            }
            return rawLine;
        });
        return result.join('\n');
    }

    manageInputStatements(code) {
        const lines = code.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];

            const match = rawLine.match(/^(\s*)(.*)$/);
            const indent = match[1];
            const trimmed = match[2].trim();

            if (!trimmed) {
                result.push(rawLine);
                continue;
            }

            const normalized = trimmed.replace(/\s+/g, ' ');

            if (normalized.startsWith('διαβασε')) {
                const varsPart = normalized.replace('διαβασε', '').trim();

                // no variables at all
                if (!varsPart) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: 'διαβασε' requires at least one variable`,
                        userMessage: `Η εντολή ΔΙΑΒΑΣΕ χρειάζεται τουλάχιστον μία μεταβλητή (π.χ. διαβασε α, β)`,
                    });
                }

                const variables = varsPart.split(',').map(v => v.trim());

                // invalid separation (empty entries)
                if (variables.some(v => v === '')) {
                    throw new TranslationError({
                        devMessage: `Line ${i + 1}: invalid variable list in 'διαβασε' (empty entry detected)`,
                        userMessage: `Λάθος στη λίστα μεταβλητών. Ελέγξτε τα κόμματα (π.χ. διαβασε α, β, γ)`,
                    });
                }

                // invalid variable names (contains spaces)
                for (const v of variables) {
                    if (v.includes(' ')) {
                        throw new TranslationError({
                            devMessage: `Line ${i + 1}: invalid variable '${v}' (contains spaces)`,
                            userMessage: `Μη έγκυρο όνομα μεταβλητής: '${v}'`,
                        });
                    }
                }

                

                // generate input lines
                for (let v of variables) {
                    const variable = this.variables.find(obj => obj.name === v) || (() => { throw new TranslationError({
                        devMessage: `Line ${i + 1}: variable '${v}' is not declared`,
                        userMessage: `Η μεταβλητή '${v}' δεν έχει δηλωθεί.`,
                    }); })();
                    result.push(`${indent}${v} = safeAssignment('${variable.type}', await input())`);
                }
            } else {
                result.push(rawLine);
            }
        }

        return result.join('\n');
    }
}

module.exports = {
    LoopManager,
    ConditionManager,
    CodeManager,
    TranslationError,
    createFixArray
};


const manager = new CodeManager();
let code = `ΠΡΟΓΡΑΜΜΑ Simple
ΣΤΑΘΕΡΕΣ
    λεξη = "Γεια"
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: x[10], y
  ΧΑΡΑΚΤΗΡΕΣ: ονοματα
ΑΡΧΗ
Διάβασε x
Γράψε "Έδωσες την τιμή:", x
y <- x * 2
Γράψε "Το διπλάσιο είναι:", y
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`;

try {
    const translated = manager.translateCode(code);
    console.log(translated);
    if (manager.variables.length > 0) {
        console.log("\nVariables:");
        console.log("Name | Type | IsArray | ArraySize");
        for (const v of manager.variables) {
            console.log(v.name, "|", v.type, "|", v.isArray, "|", v.arraySize);
        }
    } else {
        console.log("\nNo variables declared.");
    }

    if (manager.constants.length > 0) {
        console.log("\nConstants:");
        console.log("Name | Type | Value");
        for (const c of manager.constants) {
            console.log(c.name, "|", c.type, "|", c.value);
        }
    } else {
        console.log("\nNo constants declared.");
    }

} catch (e) {
    if (e instanceof TranslationError) {
        console.error('Translation error:', e.devMessage);
        console.error('User message:', e.formatForUser());
    } else {
        console.error('Unexpected error:', e);
    }
}