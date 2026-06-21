// ─── CONSTANTS & CONFIGURATION ──────────────────────────
const UNICODE_MAP = {
    '∫': '\\int ', '∮': '\\oint ', '∑': '\\sum ', '∏': '\\prod ',
    '∞': '\\infty ', 'π': '\\pi ', 'θ': '\\theta ', 'α': '\\alpha ',
    'β': '\\beta ', 'γ': '\\gamma ', 'Δ': '\\Delta ', 'δ': '\\delta ',
    'λ': '\\lambda ', 'μ': '\\mu ', 'σ': '\\sigma ', 'ω': '\\omega ',
    '²': '^2', '³': '^3', '¹': '^1',
    '√': '\\sqrt{}', '∛': '\\sqrt[3]{}',
    '≈': '\\approx ', '≠': '\\neq ', '≤': '\\leq ', '≥': '\\geq ',
    '±': '\\pm ', '×': '\\times ', '÷': '\\div ', '∂': '\\partial ',
    '∇': '\\nabla ', '∈': '\\in ', '∩': '\\cap ', '∪': '\\cup ',
    '⊂': '\\subset ', '⊃': '\\supset ', '∀': '\\forall ', '∃': '\\exists ',
    '→': '\\to ', '⇒': '\\Rightarrow ', '⟹': '\\implies ',
    '↔': '\\leftrightarrow ', '⇔': '\\Leftrightarrow ',
    '∧': '\\land ', '∨': '\\lor ', '¬': '\\neg ', '∠': '\\angle ',
};

const MATH_PATTERN = /[=+\-*/^∫∑∏∞πθαβγλμσω√≈≠≤≥±×÷∂∇∈∩∪⊂⊃∀∃→⇒⟹↔⇔∧∨¬∠\d]|\\[a-zA-Z]+|sin|cos|tan|log|ln|lim|frac|int|sum|prod|sqrt|boxed|displaystyle|tfrac|cdot/g;

const TYPO_MAP = {
    'intergrate': 'integrate', 'intergral': 'integral', 'intregrate': 'integrate',
    'diferentiate': 'differentiate', 'differntiate': 'differentiate', 'diffrentiate': 'differentiate',
    'derivative': 'differentiate', 'simplfy': 'simplify', 'simplifty': 'simplify',
    'simplfiy': 'simplify', 'simplife': 'simplify', 'evaluate': 'evaluate',
    'calcuate': 'calculate', 'calcualte': 'calculate', 'eqution': 'equation',
    'equasion': 'equation', 'solv': 'solve', 'fator': 'factor',
    'factrise': 'factorise', 'expantion': 'expansion', 'expnad': 'expand',
    'polynomail': 'polynomial', 'polynomal': 'polynomial',
    'triginometry': 'trigonometry', 'triginometric': 'trigonometric',
    'trignometry': 'trigonometry', 'trignometric': 'trigonometric',
    'logrithm': 'logarithm', 'logrithmic': 'logarithmic', 'logerithm': 'logarithm',
    'coeficient': 'coefficient', 'coeffcient': 'coefficient', 'coeffecient': 'coefficient',
    'simultanous': 'simultaneous', 'simultenous': 'simultaneous',
    'quadratc': 'quadratic', 'quadratics': 'quadratic',
    'inequality': 'inequality', 'inequalitiy': 'inequality', 'inequation': 'inequality',
    'fracton': 'fraction', 'fractoin': 'fraction',
    'denominater': 'denominator', 'numerater': 'numerator',
    'substract': 'subtract', 'subraction': 'subtraction',
    'multiplay': 'multiply', 'multiplicatin': 'multiplication', 'divison': 'division',
    'exponental': 'exponential', 'exponantial': 'exponential',
    'logarithim': 'logarithm', 'logarith': 'logarithm',
    'natural log': 'natural logarithm', 'combin': 'combine',
    'simplification': 'simplify', 'approxmation': 'approximation', 'approxmate': 'approximate',
};

const ALL_OPERATIONS = ['SIMPLIFY', 'EVALUATE', 'SOLVE', 'INTEGRATE', 'DIFFERENTIATE', 'FACTOR', 'EXPAND'];
