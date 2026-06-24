const TASK_LINE_PATTERNS = [
  /^(\d+)[.)]\s+(.+)$/,
  /^\((\d+)\)\s+(.+)$/,
  /^[א-ת][.)]\s+(.+)$/,
  /^\([א-ת]\)\s+(.+)$/,
  /^[-•*–▪]\s+(.+)$/,
  /^(?:שלב|משימה|מטלה|חלק|סעיף|נושא|פרק)\s*(?:\d+|[א-ת])?[.:)\-–]\s*(.+)$/i,
];

const SECTION_HEADERS =
  /^(?:דרישות|משימות|שלבי|חלקי|מטלות|הוראות|נדרש לבצע|מטלת|הנחיות|על הסטודנט|עליכם ל|יש להגיש|מטרות|יעדי)/i;

const PART_HEADER =
  /^חלק\s+(ראשון|שני|שלישי|רביעי|חמישי|\d+|[א-ת]['׳]?)(?:\s*[-–:]\s*|\s+)(.*)$/i;

const NOISE_LINE =
  /^(?:עמוד(?:ים)?|נקוד(?:ות)? זכות|מספר קורס|שם הקורס|תאריך|דף|page|שם|ת\.ז|מוסד|\d{1,2}\/\d{1,2}\/\d{2,4})$/i;

const INTRO_SKIP =
  /^(?:מרצה|משימה סופית|משימה זו|בהצלחה|מבוא ל|נושא:|לכבוד)/i;

const PROSE_START =
  /^(?:וה|ול|וגם|או|של|עם|על|את|זה|זו|כי|אם|כאשר|בנוסף|לכן|כמו כן|על מנת|שימו לב|שוב מאוד)/i;

const ACTION_VERB =
  /(?:לכתוב|להגיש|לנתח|לקרוא|לאסוף|להכין|לבצע|לערוך|לסכם|לפתח|לבחון|להשוות|לתאר|להסביר|למצוא|לבנות|לעבור|לסקור|יש ל|עליך|עליכם|נדרש)/i;

const IMPERATIVE_START =
  /^(?:יש ל|יש לה|צרפו|ספרו|בחרו|הוסיפו|כתבו|מצאו|מלאו|הדביקו|קראו|התקינו|לאחר|תעדו|מהם|האם|כמה|מה דעתכם|מה השוני|כמנתחי)/i;

const QUESTION_START =
  /^(?:מהם|האם|מה דעתכם|מה השוני|כמנתחי|מהו|מה הם)/i;

export const PARSE_STRATEGIES = {
  parts: 'parts',
  grouped: 'grouped',
};

export const PARSE_STRATEGY_LABELS = {
  parts: 'לפי חלקים (ראשון / שני / שלישי)',
  grouped: 'לפי קבוצות לוגיות (מפורט יותר)',
};

const PART_DURATIONS_MINUTES = {
  ראשון: 120,
  שני: 240,
  שלישי: 120,
  default: 90,
};

const GROUP_BREAK_PATTERNS = [
  /^יש להתקין\s+5/i,
  /^בחרו\s+2\s+תוספ/i,
  /^האם בעמוד/i,
  /^מלאו את שם/i,
  /^לאחר ההתקנה/i,
  /^כתבו את הקישור/i,
  /^יש להתקין תבנית/i,
  /^תעדו את סביבת/i,
  /^מהם התובנות/i,
  /^מהם המגבלות/i,
];

const MAX_TITLE_LEN = 85;
const MAX_SECTION_TITLE_LEN = 240;
const MAX_DESC_LEN = 500;

function cleanLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function isNoiseLine(line) {
  if (!line || line.length < 3) return true;
  if (NOISE_LINE.test(line)) return true;
  if (/^https?:\/\//i.test(line)) return true;
  return false;
}

function shortenTitle(raw, maxLen = MAX_TITLE_LEN) {
  const text = cleanLine(raw);
  if (!text) return '';

  const numbered = text.match(/^(?:\d+[.)]|[א-ת][.)]|\([א-ת]\))\s*(.+)$/);
  const body = numbered ? numbered[1] : text;

  const firstSentence = body.match(/^(.{8,120}?)(?:[.!?]|$)/)?.[1] || body;
  const title = cleanLine(firstSentence);

  if (title.length <= maxLen) return title;
  const cut = title.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function summarizeDescription(text, maxLen = MAX_DESC_LEN) {
  const clean = cleanLine(text);
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).trim()}…`;
}

function isLikelyTaskTitle(text) {
  const line = cleanLine(text);
  if (line.length < 6 || line.length > MAX_TITLE_LEN + 40) return false;
  if (isNoiseLine(line)) return false;
  if (line.length > 100 && PROSE_START.test(line) && !ACTION_VERB.test(line)) return false;
  return true;
}

function extractTaskFromLine(line) {
  for (const pattern of TASK_LINE_PATTERNS) {
    const m = line.match(pattern);
    if (!m) continue;
    const raw = cleanLine(m[m.length - 1]);
    const title = shortenTitle(raw);
    if (isLikelyTaskTitle(title)) {
      const rest =
        raw.length > title.length + 10 ? summarizeDescription(raw.slice(title.length)) : '';
      return { title, description: rest };
    }
  }
  return null;
}

export function normalizeDocumentText(text) {
  if (!text?.trim()) return '';

  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  normalized = normalized
    .replace(/(?:^|\n)\s*(\d+)[.)]\s+(?=\S)/gm, '\n$1. ')
    .replace(/(?:^|\n)\s*([א-ת])[.)]\s+(?=\S)/gm, '\n$1. ')
    .replace(/(?:^|\n)\s*[-•*–▪]\s+/gm, '\n- ');

  normalized = normalized.replace(
    /(חלק\s+(?:ראשון|שני|שלישי|רביעי|חמישי|\d+|[א-ת]['׳]?))/gi,
    '\n$1'
  );

  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}

function partDurationMinutes(partName) {
  const key = String(partName || '').toLowerCase();
  if (/ראשון|^1$|^א/.test(key)) return PART_DURATIONS_MINUTES.ראשון;
  if (/שני|^2$|^ב/.test(key)) return PART_DURATIONS_MINUTES.שני;
  if (/שלישי|^3$|^ג/.test(key)) return PART_DURATIONS_MINUTES.שלישי;
  return PART_DURATIONS_MINUTES.default;
}

function estimateDurationFromLines(lines) {
  const chars = lines.join(' ').length;
  return Math.max(60, Math.min(240, Math.round(chars / 5)));
}

function taskFromLineGroup(group, section, durationMinutes) {
  const imperatives = group.filter((l) => IMPERATIVE_START.test(l) || ACTION_VERB.test(l));
  const titleSource =
    imperatives.length >= 2
      ? imperatives
      : imperatives.length === 1 && group.length > 1
        ? group
        : imperatives.length
          ? imperatives
          : group.filter(Boolean);
  const title = shortenTitle(titleSource.join(' '), MAX_SECTION_TITLE_LEN);
  const usedInTitle = new Set(titleSource);
  const rest = group.filter((l) => !usedInTitle.has(l) && !/^בכדי|^שימו לב/i.test(l));

  return {
    title,
    description: summarizeDescription(
      rest.length ? rest.join(' · ') : '',
      800
    ),
    section,
    durationMinutes: durationMinutes ?? estimateDurationFromLines(group),
  };
}

function groupLinesByBreakpoints(lines, breakpoints = GROUP_BREAK_PATTERNS) {
  const filtered = lines.filter(
    (l) => l && !isNoiseLine(l) && !/^בכדי להגיש|^יש לענות על/i.test(l)
  );
  const groups = [];
  let current = [];

  for (const line of filtered) {
    const startsNew = breakpoints.some((p) => p.test(line)) && current.length > 0;
    if (startsNew) {
      groups.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) groups.push(current);
  return groups;
}

function extractPartSubtitle(headerLine, partName) {
  const match = headerLine.match(PART_HEADER);
  if (!match) return '';

  let subtitle = cleanLine(match[2] || '');
  subtitle = subtitle.replace(/^\([^)]*\)\s*/, '').trim();

  if (subtitle.length < 12) {
    const dashSplit = headerLine.match(/חלק\s+\S+\s*[-–]\s*(.+)$/i);
    if (dashSplit) subtitle = cleanLine(dashSplit[1]);
  }

  if (subtitle.length < 12) {
    const parenOnly = headerLine.match(/\(([^)]{12,})\)/);
    if (parenOnly) subtitle = cleanLine(parenOnly[1]);
  }

  return subtitle.replace(/\([^)]{80,}\)/g, '').trim();
}

function firstMeaningfulBodyLine(lines) {
  for (const raw of lines) {
    const line = raw.startsWith('- ') ? raw.slice(2).trim() : raw;
    if (line.length >= 10 && !/^בכדי|^שימו לב/i.test(line)) return line;
  }
  return '';
}

function splitIntoMajorParts(text) {
  const normalized = normalizeDocumentText(text);
  const lines = normalized.split('\n').map(cleanLine);

  const parts = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = current.bodyLines.filter((l) => l && !isNoiseLine(l));
    if (body.length || current.headerLine) {
      parts.push({
        partName: current.partName,
        headerLine: current.headerLine,
        bodyLines: body,
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (!line) continue;

    const partMatch = line.match(PART_HEADER);
    if (partMatch) {
      flush();
      current = {
        partName: partMatch[1],
        headerLine: line,
        bodyLines: [],
      };
      const remainder = cleanLine(partMatch[2] || '');
      if (remainder && !PROSE_START.test(remainder)) {
        current.bodyLines.push(remainder);
      }
      continue;
    }

    if (INTRO_SKIP.test(line) && !current) continue;

    if (current) {
      current.bodyLines.push(line);
    }
  }

  flush();
  return parts;
}

function collectImperativeCluster(lines, startPattern) {
  const startIdx = lines.findIndex((l) => startPattern.test(l));
  if (startIdx < 0) return [];

  const cluster = [lines[startIdx]];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (IMPERATIVE_START.test(line) && line.length < 180) {
      cluster.push(line);
    } else if (/^בכדי|^יש לענות|^הנחיות/i.test(line)) {
      continue;
    } else if (line.length > 200) {
      break;
    } else if (!IMPERATIVE_START.test(line) && line.length > 60) {
      break;
    }
  }
  return cluster;
}

function buildPartOneTask(part) {
  const lines = part.bodyLines;
  const cluster = collectImperativeCluster(lines, /יש להתקין\s+5/i);

  if (cluster.length) {
    const title = cluster.join(', ').replace(/\s+,/g, ',');
    const used = new Set(cluster);
    const rest = lines.filter((l) => !used.has(l) && !/^בכדי|^שימו לב/i.test(l));
    return {
      title: shortenTitle(title, MAX_SECTION_TITLE_LEN),
      description: summarizeDescription(rest.join(' · ')),
      section: `חלק ${part.partName}`,
      durationMinutes: partDurationMinutes(part.partName),
    };
  }

  const imperatives = lines.filter((l) => IMPERATIVE_START.test(l));
  if (imperatives.length) {
    const title = imperatives.slice(0, 3).join(', ');
    return {
      title: shortenTitle(title, MAX_SECTION_TITLE_LEN),
      description: summarizeDescription(lines.join(' · ')),
      section: `חלק ${part.partName}`,
      durationMinutes: partDurationMinutes(part.partName),
    };
  }

  const subtitle = extractPartSubtitle(part.headerLine, part.partName);
  return {
    title: shortenTitle(subtitle || part.headerLine, MAX_SECTION_TITLE_LEN),
    description: summarizeDescription(lines.join(' · ')),
    section: `חלק ${part.partName}`,
    durationMinutes: partDurationMinutes(part.partName),
  };
}

function buildPartTwoTask(part) {
  let subtitle = extractPartSubtitle(part.headerLine, part.partName);
  if (subtitle.length < 12) {
    subtitle = firstMeaningfulBodyLine(part.bodyLines) || linesFindTheme(part.bodyLines);
  }
  const title =
    subtitle || `עבודה אישית — חלק ${part.partName}`;

  const bodyLines = part.bodyLines.filter((l) => {
    const bare = l.startsWith('- ') ? l.slice(2).trim() : l;
    return bare !== subtitle;
  });
  const actionLines = bodyLines.filter((l) => IMPERATIVE_START.test(l));

  return {
    title: shortenTitle(title, MAX_SECTION_TITLE_LEN),
    description: summarizeDescription(
      actionLines.length ? actionLines.join(' · ') : bodyLines.join(' · '),
      800
    ),
    section: `חלק ${part.partName}`,
    durationMinutes: partDurationMinutes(part.partName),
  };
}

function linesFindTheme(lines) {
  const theme = lines.find((l) =>
    /תוספ(?:ים|ות)|ייחודי|אישי|עבודה על/i.test(l)
  );
  return theme ? shortenTitle(theme, MAX_SECTION_TITLE_LEN) : '';
}

function extractReflectionQuestions(lines) {
  return lines.filter((l) => {
    if (l.length < 15) return false;
    if (l.endsWith('?')) return true;
    return QUESTION_START.test(l) && l.length < 220;
  });
}

function buildPartThreeTasks(part) {
  const questions = extractReflectionQuestions(part.bodyLines);
  const subtitle = extractPartSubtitle(part.headerLine, part.partName);

  return [
    {
      title: shortenTitle(
        questions[0] ||
          (subtitle.length >= 12 ? subtitle : null) ||
          'תובנות והמלצות להמשך',
        MAX_SECTION_TITLE_LEN
      ),
      description: summarizeDescription(
        (questions.length ? questions : part.bodyLines).join(' · '),
        800
      ),
      section: `חלק ${part.partName}`,
      durationMinutes: partDurationMinutes(part.partName),
    },
  ];
}

function buildGroupedTasksFromPart(part) {
  const section = `חלק ${part.partName}`;
  const name = part.partName.toLowerCase();

  if (/ראשון|^1$|^א/.test(name)) {
    return [buildPartOneTask(part)];
  }

  if (/שני|^2$|^ב/.test(name)) {
    let subtitle = extractPartSubtitle(part.headerLine, part.partName);
    if (subtitle.length < 12) {
      subtitle = firstMeaningfulBodyLine(part.bodyLines) || linesFindTheme(part.bodyLines);
    }
    const bodyLines = part.bodyLines.filter((l) => {
      const bare = l.startsWith('- ') ? l.slice(2).trim() : l;
      return bare !== subtitle;
    });
    const partTwoBreaks = [
      /^בחרו\s+2\s+תוספ/i,
      /^האם בעמוד/i,
      /^מלאו את שם/i,
      /^לאחר ההתקנה/i,
      /^כתבו את הקישור/i,
      /^יש להתקין תבנית/i,
      /^תעדו את סביבת/i,
    ];
    const groups = groupLinesByBreakpoints(bodyLines, partTwoBreaks);
    return groups.map((group) => taskFromLineGroup(group, section));
  }

  if (/שלישי|^3$|^ג/.test(name)) {
    const groups = groupLinesByBreakpoints(part.bodyLines, [/^מהם המגבלות/i]);
    if (groups.length <= 1) {
      return buildPartThreeTasks(part);
    }
    return groups.map((group) =>
      taskFromLineGroup(
        group,
        section,
        Math.round(partDurationMinutes(part.partName) / groups.length)
      )
    );
  }

  return groupLinesByBreakpoints(part.bodyLines).map((group) =>
    taskFromLineGroup(group, section)
  );
}

function buildTaskFromPart(part) {
  const name = part.partName.toLowerCase();

  if (/ראשון|^1$|^א/.test(name)) {
    return [buildPartOneTask(part)];
  }
  if (/שני|^2$|^ב/.test(name)) {
    return [buildPartTwoTask(part)];
  }
  if (/שלישי|^3$|^ג/.test(name)) {
    return buildPartThreeTasks(part);
  }

  const subtitle = extractPartSubtitle(part.headerLine, part.partName);
  return [
    {
      title: shortenTitle(subtitle || part.headerLine, MAX_SECTION_TITLE_LEN),
      description: summarizeDescription(part.bodyLines.join(' · ')),
      section: `חלק ${part.partName}`,
      durationMinutes: partDurationMinutes(part.partName),
    },
  ];
}

function parseFromMajorParts(text) {
  const parts = splitIntoMajorParts(text);
  if (parts.length < 1) return [];

  const tasks = parts.flatMap(buildTaskFromPart);
  return dedupeItems(tasks.filter((t) => t.title?.trim()));
}

function parseFromGroupedLogic(text) {
  const parts = splitIntoMajorParts(text);
  if (parts.length < 1) return [];

  const tasks = parts.flatMap(buildGroupedTasksFromPart);
  return dedupeItems(tasks.filter((t) => t.title?.trim()));
}

function parseBlocksFromLines(lines) {
  const blocks = [];
  let current = null;
  let inTaskSection = false;

  const flush = () => {
    if (!current) return;
    blocks.push({
      title: current.title,
      description: summarizeDescription(current.description),
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || isNoiseLine(line)) continue;

    if (SECTION_HEADERS.test(line)) {
      inTaskSection = true;
      flush();
      continue;
    }

    const hit = extractTaskFromLine(line);
    if (hit) {
      flush();
      current = { title: hit.title, description: hit.description || '' };
      continue;
    }

    if (current) {
      if (line.length < 280 && !extractTaskFromLine(line)) {
        current.description = current.description
          ? `${current.description} ${line}`
          : line;
      }
      continue;
    }

    if (inTaskSection && line.length >= 8 && line.length <= 100 && ACTION_VERB.test(line)) {
      current = { title: shortenTitle(line), description: '' };
    }
  }

  flush();
  return blocks;
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseTasksFromDocument(text, strategy = PARSE_STRATEGIES.parts) {
  if (!text?.trim()) return [];

  if (strategy === PARSE_STRATEGIES.grouped) {
    const grouped = parseFromGroupedLogic(text);
    if (grouped.length >= 1) return grouped;
  }

  const fromParts = parseFromMajorParts(text);
  if (fromParts.length >= 1) return fromParts;

  const normalized = normalizeDocumentText(text);
  const lines = normalized.split('\n').map(cleanLine).filter(Boolean);

  const fromLines = parseBlocksFromLines(lines);
  if (fromLines.length >= 1) return dedupeItems(fromLines);

  const paragraphs = normalized.split(/\n\n+/);
  const fromParagraphs = [];

  for (const paragraph of paragraphs) {
    const paraLines = paragraph.split('\n').map(cleanLine).filter(Boolean);
    const hits = parseBlocksFromLines(paraLines);
    if (hits.length) {
      fromParagraphs.push(...hits);
      continue;
    }

    const onlyLine = paraLines[0];
    if (
      paraLines.length === 1 &&
      onlyLine.length >= 12 &&
      onlyLine.length <= 120 &&
      ACTION_VERB.test(onlyLine)
    ) {
      fromParagraphs.push({
        title: shortenTitle(onlyLine),
        description: '',
      });
    }
  }

  return dedupeItems(fromParagraphs);
}

export function inferTaskTitle(text, fallback = 'משימה חדשה') {
  if (!text?.trim()) return fallback;
  const lines = normalizeDocumentText(text).split('\n').map(cleanLine).filter(Boolean);
  const titleLine = lines.find(
    (l) =>
      l.length >= 5 &&
      l.length < 120 &&
      /(?:עבודה|מטלה|פרויקט|סמינר|מבחן|תרגיל|דוח|מאמר|הגשה|assignment|משימה סופית)/i.test(
        l
      )
  );
  return titleLine ? shortenTitle(titleLine) : shortenTitle(lines[0] || fallback) || fallback;
}

export function previewParsedTasks(text, strategy = PARSE_STRATEGIES.parts) {
  const items = parseTasksFromDocument(text, strategy);
  return {
    items,
    count: items.length,
    ok: items.length > 0,
  };
}
