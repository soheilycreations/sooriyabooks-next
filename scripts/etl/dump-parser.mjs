import { createReadStream } from "node:fs";
import readline from "node:readline";

/**
 * Streaming parser for the specific mysqldump format this project's
 * legacy WordPress backup uses: one row per physical line inside each
 * `INSERT INTO \`table\` VALUES (...)`, `(...),` ... `(...);` statement.
 * Confirmed against the real dump during the forensic audit (see
 * docs/migration-plan.md). Reads line-by-line so a 400MB+ dump never has
 * to be loaded into memory at once.
 *
 * Row tuple parsing handles mysqldump's standard escaping: backslash
 * escapes for `\'`, `\\`, `\n`, `\r`, `\0`, `\t`; unquoted NULL, numbers,
 * and bit-literals (b'0'/b'1' are not used by WP core dumps for row data,
 * only in serialized PHP blobs which are just a text field's contents).
 */

/** Parses one `(v1,v2,...)` tuple into an array of JS values (string | number | null). */
export function parseTuple(tupleText) {
  const values = [];
  let i = 0;
  const len = tupleText.length;

  while (i < len) {
    while (i < len && /\s/.test(tupleText[i])) i++;
    if (i >= len) break;

    if (tupleText[i] === ",") {
      i++;
      continue;
    }

    if (tupleText[i] === "'") {
      i++;
      let str = "";
      while (i < len && tupleText[i] !== "'") {
        if (tupleText[i] === "\\" && i + 1 < len) {
          const next = tupleText[i + 1];
          const map = { "'": "'", "\\": "\\", n: "\n", r: "\r", "0": "\0", t: "\t", Z: "\x1a" };
          str += map[next] !== undefined ? map[next] : next;
          i += 2;
        } else {
          str += tupleText[i];
          i++;
        }
      }
      i++; // closing quote
      values.push(str);
    } else {
      let raw = "";
      while (i < len && tupleText[i] !== "," ) {
        raw += tupleText[i];
        i++;
      }
      raw = raw.trim();
      if (raw === "NULL") values.push(null);
      else if (/^-?\d+(\.\d+)?$/.test(raw)) values.push(Number(raw));
      else values.push(raw); // fallback: unrecognized literal, keep as raw text
    }
  }

  return values;
}

/** Splits a full VALUES line like "(1,'a'),(2,'b')," into individual "(...)" tuple strings. */
function splitTuples(line) {
  const tuples = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      current += ch;
      if (ch === "\\") {
        current += line[++i] ?? "";
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
    } else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth--;
      current += ch;
      if (depth === 0) {
        tuples.push(current.slice(1, -1));
        current = "";
      }
    } else if (depth > 0) {
      current += ch;
    }
  }
  return tuples;
}

/**
 * Streams every row for the given table names out of a mysqldump file.
 * Calls `onRow(tableName, valuesArray)` for each row. Case-sensitive,
 * exact table name match against `INSERT INTO \`table\``.
 */
export async function streamDumpRows(filePath, tableNames, onRow) {
  const wanted = new Set(tableNames);
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });

  let currentTable = null;

  for await (const line of rl) {
    const insertMatch = line.match(/^INSERT INTO `([^`]+)`/);
    if (insertMatch) {
      currentTable = wanted.has(insertMatch[1]) ? insertMatch[1] : null;
      continue;
    }
    if (!currentTable) continue;
    if (line.trim().startsWith("(")) {
      for (const tuple of splitTuples(line)) {
        onRow(currentTable, parseTuple(tuple));
      }
    }
  }
}
