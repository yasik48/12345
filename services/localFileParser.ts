
import { PersonIncome } from '../types';

const NAME_KEYS = ['name', 'имя', 'фио', 'full name', 'fullname', 'сотрудник'];
const INCOME_KEYS = ['income', 'доход', 'salary', 'зарплата', 'годовой доход', 'сумма годового дохода', 'общая сумма дохода'];
const DOB_KEYS = ['dob', 'date of birth', 'дата рождения', 'birthdate'];

// Helper to find a value in an object by checking a list of possible keys (case-insensitive)
const findValueByKey = (obj: any, keys: string[]): string | number | undefined => {
  const lowerCaseKeyMap = Object.keys(obj).reduce((acc, key) => {
    acc[key.toLowerCase()] = key;
    return acc;
  }, {} as Record<string, string>);

  for (const key of keys) {
    const foundKey = lowerCaseKeyMap[key.toLowerCase()];
    if (foundKey) {
      return obj[foundKey];
    }
  }
  return undefined;
};

// 1. Tries to parse the file content as a JSON array of objects
function parseAsJson(content: string): PersonIncome[] | null {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) return null;

    const people: PersonIncome[] = [];
    for (const item of data) {
      if (typeof item !== 'object' || item === null) continue;

      const name = findValueByKey(item, NAME_KEYS);
      const income = findValueByKey(item, INCOME_KEYS);
      const dobRaw = findValueByKey(item, DOB_KEYS);
      const dob = (typeof dobRaw === 'string' && dobRaw.toLowerCase() !== 'null') ? dobRaw : undefined;
      
      if (typeof name === 'string' && (typeof income === 'number' || typeof income === 'string')) {
        const incomeNum = parseFloat(String(income).replace(/[\s,]/g, ''));
        if (!isNaN(incomeNum)) {
          people.push({ 
            name, 
            income: incomeNum,
            dob: dob,
          });
        }
      }
    }
    return people.length > 0 ? people : null;
  } catch (e) {
    return null;
  }
}

// 2. Tries to parse the file content as CSV with a header
function parseAsCsv(content: string): PersonIncome[] | null {
  const lines = content.trim().split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return null; // Must have a header and at least one data row

  const delimiter = [',', ';', '\t'].find(d => lines[0].includes(d));
  if (!delimiter) return null;

  const header = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
  const nameIndex = header.findIndex(h => NAME_KEYS.includes(h));
  const incomeIndex = header.findIndex(h => INCOME_KEYS.includes(h));
  const dobIndex = header.findIndex(h => DOB_KEYS.includes(h));

  if (nameIndex === -1 || incomeIndex === -1) return null;

  const people: PersonIncome[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
    if (values.length > Math.max(nameIndex, incomeIndex)) {
      const name = values[nameIndex];
      const incomeStr = values[incomeIndex];
      const income = parseFloat(incomeStr.replace(/[\s,]/g, ''));
      const dobRaw = dobIndex !== -1 ? values[dobIndex] : undefined;
      const dob = (dobRaw && dobRaw.toLowerCase() !== 'null') ? dobRaw : undefined;

      if (name && !isNaN(income)) {
        people.push({ name, income, dob });
      }
    }
  }
  return people.length > 0 ? people : null;
}

// 3. Falls back to parsing plain text
function parseAsPlainText(content: string): PersonIncome[] {
    // Corrected the record delimiter to only split on lines that consist of dashes,
    // preventing it from splitting records on lines containing "--".
    const recordDelimiter = /^\s*-{3,}\s*$/m;
    const records = content.split(recordDelimiter).map(r => r.trim()).filter(Boolean);
    
    // Heuristic: If records exist and the first one contains a colon, assume key-value format.
    const isKeyValueFormat = records.length > 0 && records[0].includes(':');
    
    if (isKeyValueFormat) {
        const people: PersonIncome[] = [];
        
        for (const record of records) {
            const lines = record.split('\n').map(line => line.trim()).filter(Boolean);
            const recordData: { [key: string]: string } = {};

            // First, populate a map with all key-value pairs from the record
            for (const line of lines) {
                const separatorIndex = line.indexOf(':');
                if (separatorIndex === -1) continue;

                // Normalize the key by lowercasing, stripping numbering, and replacing underscores with spaces
                const key = line.substring(0, separatorIndex).trim().replace(/^\d+\.\s*/, '').toLowerCase().replace(/_/g, ' ');
                const value = line.substring(separatorIndex + 1).trim();
                recordData[key] = value;
            }

            // Then, extract the data using the key arrays
            const name = NAME_KEYS.map(k => recordData[k]).find(v => v !== undefined);
            const incomeStr = INCOME_KEYS.map(k => recordData[k]).find(v => v !== undefined);
            const dobRaw = DOB_KEYS.map(k => recordData[k]).find(v => v !== undefined);
            const dob = (dobRaw && dobRaw.toLowerCase() !== 'null') ? dobRaw : undefined;

            if (name && incomeStr) {
                const cleanedIncomeStr = incomeStr.replace(/\s/g, '').replace(',', '.');
                const income = parseFloat(cleanedIncomeStr);
                if (!isNaN(income)) {
                    people.push({ name, income, dob });
                }
            }
        }
        return people; // Return only results from this parser, do not fall back.
    }

    // Fallback for simple "Name Income" lines without keys.
    const lines = content.split('\n').map(l => l.trim()).filter(line => line !== '' && !line.includes(':'));
    const peopleFromLines: PersonIncome[] = [];
    const dateRegex = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/;
    const nameIncomeRegex = /^(.*[a-zA-Zа-яА-ЯёЁ].*?)\s+([\d,.\s]+)$/;

    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const nameIncomeMatch = currentLine.match(nameIncomeRegex);

        if (nameIncomeMatch) {
            let name = nameIncomeMatch[1].trim();
            const incomeStr = nameIncomeMatch[2];
            const cleanedIncomeStr = incomeStr.replace(/[\s,]/g, '').replace(',', '.');
            const income = parseFloat(cleanedIncomeStr);

            if (isNaN(income) || !name) {
                continue;
            }

            let dob: string | undefined = undefined;
            let dobRaw: string | undefined = undefined;

            if (i > 0) {
                const lineAbove = lines[i - 1];
                const dateMatch = lineAbove.match(dateRegex);
                if (dateMatch && !lineAbove.match(nameIncomeRegex)) {
                    dobRaw = dateMatch[0];
                }
            }
            if (!dobRaw && i < lines.length - 1) {
                const lineBelow = lines[i + 1];
                const dateMatch = lineBelow.match(dateRegex);
                if (dateMatch && !lineBelow.match(nameIncomeRegex)) {
                    dobRaw = dateMatch[0];
                }
            }
            if (!dobRaw) {
                const dateMatch = name.match(dateRegex);
                if (dateMatch) {
                    dobRaw = dateMatch[0];
                    name = name.replace(dateRegex, '').trim();
                }
            }

            dob = (dobRaw && dobRaw.toLowerCase() !== 'null') ? dobRaw : undefined;
            
            peopleFromLines.push({ name, income, dob });
        }
    }
    return peopleFromLines;
}


/**
 * Parses a string content of a file to extract names and incomes.
 * It intelligently tries to parse as JSON, then CSV, then falls back to plain text.
 * @param fileContent The string content of the file.
 * @returns A promise that resolves to an array of PersonIncome objects.
 */
export async function parseIncomeFile(fileContent: string): Promise<PersonIncome[]> {
  return new Promise((resolve, reject) => {
    try {
      let people: PersonIncome[] | null;
      
      // Attempt parsing in order of structure: JSON -> CSV -> Plain Text
      people = parseAsJson(fileContent);
      if (people) {
        return resolve(people);
      }
      
      people = parseAsCsv(fileContent);
      if (people) {
        return resolve(people);
      }

      people = parseAsPlainText(fileContent);
      resolve(people);

    } catch (error) {
        console.error("Error parsing file:", error);
        reject(new Error("Failed to parse the file. Please check that it is a valid JSON, CSV, or plain text file."));
    }
  });
}