import { parseString } from 'xml2js';
import { parse as parseCSV } from 'csv-parse/sync';
import { z } from 'zod';

// Type definition for parsed athlete data
export interface ParsedAthlete {
  entryId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: 'M' | 'F';
  dateOfBirth?: Date;
  nationality?: string;
  club?: string;
  fieId?: string;
  hand?: 'L' | 'R';
  category?: string;
  weapons?: ('EPEE' | 'FOIL' | 'SABRE')[];
  ranking?: number;
  present?: boolean;
  relayTeamName?: string;
}

// Validation schema for athlete data
const athleteSchema = z.object({
  entryId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  gender: z.enum(['M', 'F', 'Male', 'Female']).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  club: z.string().optional(),
  fieId: z.string().optional(),
  hand: z.enum(['L', 'R', 'Left', 'Right']).optional(),
  category: z.string().optional(),
  weapon: z.enum(['EPEE', 'FOIL', 'SABRE', 'Epee', 'Foil', 'Sabre']).optional(),
  ranking: z.coerce.number().optional(),
  present: z.enum(['Yes', 'No', 'true', 'false', '1', '0']).optional(),
  relayTeamName: z.string().optional(),
});

// Common field name mappings for CSV files
const fieldMappings: Record<string, string> = {
  // Entry ID variations
  'entryid': 'entryId',
  'entry_id': 'entryId',
  'id': 'entryId',
  
  // Name variations
  'firstname': 'firstName',
  'first_name': 'firstName',
  'given_name': 'firstName',
  'givenname': 'firstName',
  'lastname': 'lastName',
  'last_name': 'lastName',
  'family_name': 'lastName',
  'familyname': 'lastName',
  'surname': 'lastName',
  'middlename': 'middleName',
  'middle_name': 'middleName',
  
  // Date variations
  'dateofbirth': 'dateOfBirth',
  'date_of_birth': 'dateOfBirth',
  'birthdate': 'dateOfBirth',
  'birth_date': 'dateOfBirth',
  'dob': 'dateOfBirth',
  
  // FIE ID variations
  'fieid': 'fieId',
  'fie_id': 'fieId',
  'fie': 'fieId',
  'license': 'fieId',
  'licensenumber': 'fieId',
  'license_number': 'fieId',
  
  // Other variations
  'country': 'nationality',
  'nation': 'nationality',
  'team': 'relayTeamName',
  'teamname': 'relayTeamName',
  'team_name': 'relayTeamName',
};

/**
 * Parse CSV file content into ParsedAthlete array
 */
export async function parseCSVFile(csvContent: string): Promise<ParsedAthlete[]> {
  try {
    // Parse CSV with headers
    const records = parseCSV(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    });

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('No data found in CSV file');
    }

    const athletes: ParsedAthlete[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = normalizeFieldNames(records[i] as Record<string, unknown>);
        const athlete = parseAthleteRecord(record, `Row ${i + 2}`); // +2 for header and 0-based index
        
        if (athlete) {
          athletes.push(athlete);
        }
      } catch (error) {
        console.warn(`Skipping row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (athletes.length === 0) {
      throw new Error('No valid athletes found in CSV file');
    }

    return athletes;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse XML file content into ParsedAthlete array
 */
export async function parseXMLFile(xmlContent: string): Promise<ParsedAthlete[]> {
  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result: Record<string, unknown>) => {
      if (err) {
        reject(new Error(`XML parsing failed: ${err.message}`));
        return;
      }

      try {
        const athletes: ParsedAthlete[] = [];
        
        // Try common XML structures
        let athleteNodes: unknown[] | null = null;
        
        // Check different possible root structures
        if (isObjectWithProperty(result.Athletes, 'Athlete')) {
          athleteNodes = result.Athletes.Athlete as unknown[];
        } else if (isObjectWithProperty(result.Fencers, 'Fencer')) {
          athleteNodes = result.Fencers.Fencer as unknown[];
        } else if (isObjectWithProperty(result.Roster, 'Athlete')) {
          athleteNodes = result.Roster.Athlete as unknown[];
        } else if (isObjectWithProperty(result.EntryList, 'Entry')) {
          athleteNodes = result.EntryList.Entry as unknown[];
        } else {
          // Try to find any array that looks like athletes
          const keys = Object.keys(result);
          for (const key of keys) {
            if (result[key] && Array.isArray(result[key])) {
              athleteNodes = result[key] as unknown[];
              break;
            }
            if (result[key] && typeof result[key] === 'object') {
              const subKeys = Object.keys(result[key] as Record<string, unknown>);
              for (const subKey of subKeys) {
                if (Array.isArray((result[key] as Record<string, unknown>)[subKey])) {
                  athleteNodes = (result[key] as Record<string, unknown>)[subKey] as unknown[];
                  break;
                }
              }
              if (athleteNodes) break;
            }
          }
        }

        if (!athleteNodes || !Array.isArray(athleteNodes)) {
          reject(new Error('No athlete data found in XML file. Expected structure: <Athletes><Athlete>...</Athlete></Athletes>'));
          return;
        }

        for (let i = 0; i < athleteNodes.length; i++) {
          try {
            const node = athleteNodes[i];
            // Flatten XML node structure (handle both attributes and elements)
            const record = flattenXMLNode(node as Record<string, unknown>);
            const athlete = parseAthleteRecord(record, `XML node ${i + 1}`);
            
            if (athlete) {
              athletes.push(athlete);
            }
          } catch (error) {
            console.warn(`Skipping XML node ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (athletes.length === 0) {
          reject(new Error('No valid athletes found in XML file'));
          return;
        }

        resolve(athletes);
      } catch (error) {
        reject(new Error(`XML processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });
}

/**
 * Check if an object has a specific property
 */
function isObjectWithProperty(obj: unknown, prop: string): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * Normalize field names using common mappings
 */
function normalizeFieldNames(record: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(record)) {
    const lowerKey = key.toLowerCase().replace(/\s+/g, '');
    const mappedKey = fieldMappings[lowerKey] || key;
    normalized[mappedKey] = value;
  }
  
  return normalized;
}

/**
 * Flatten XML node structure to simple key-value pairs
 */
function flattenXMLNode(node: Record<string, unknown>): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  
  // Handle XML attributes
  if (node.$ && typeof node.$ === 'object') {
    Object.assign(flattened, node.$);
  }
  
  // Handle XML elements
  for (const [key, value] of Object.entries(node)) {
    if (key === '$') continue; // Skip attributes as already handled
    
    if (Array.isArray(value) && value.length === 1) {
      // Single element array - extract the value
      flattened[key] = typeof value[0] === 'object' && value[0] && '_' in value[0] ? value[0]._ : value[0];
    } else if (Array.isArray(value)) {
      // Multiple elements - join as string
      flattened[key] = value.join(', ');
    } else if (typeof value === 'object' && value && '_' in value) {
      // Text content with attributes
      flattened[key] = (value as Record<string, unknown>)._;
    } else {
      flattened[key] = value;
    }
  }
  
  return normalizeFieldNames(flattened);
}

/**
 * Parse and validate athlete record
 */
function parseAthleteRecord(record: Record<string, unknown>, context: string): ParsedAthlete | null {
  try {
    // Validate required fields
    if (!record.firstName && !record.FirstName) {
      throw new Error('Missing first name');
    }
    if (!record.lastName && !record.LastName) {
      throw new Error('Missing last name');
    }

    // Normalize the record
    const normalized = {
      entryId: getString(record, ['entryId', 'EntryId', 'ID', 'Id']),
      firstName: getString(record, ['firstName', 'FirstName']) || '',
      lastName: getString(record, ['lastName', 'LastName']) || '',
      middleName: getString(record, ['middleName', 'MiddleName']),
      gender: getString(record, ['gender', 'Gender', 'Sex']),
      dateOfBirth: getString(record, ['dateOfBirth', 'DateOfBirth', 'BirthDate']),
      nationality: getString(record, ['nationality', 'Nationality', 'Country']),
      club: getString(record, ['club', 'Club', 'Team']),
      fieId: getString(record, ['fieId', 'FieId', 'FIE_ID', 'License']),
      hand: getString(record, ['hand', 'Hand']),
      category: getString(record, ['category', 'Category', 'AgeGroup']),
      weapon: getString(record, ['weapon', 'Weapon']),
      ranking: getNumber(record, ['ranking', 'Ranking', 'Rank', 'Seed']),
      present: getString(record, ['present', 'Present', 'Attendance']),
      relayTeamName: getString(record, ['relayTeamName', 'RelayTeamName', 'TeamName']),
    };

    // Validate with schema
    const validatedData = athleteSchema.parse(normalized);

    // Convert to ParsedAthlete format
    const athlete: ParsedAthlete = {
      entryId: validatedData.entryId,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      middleName: validatedData.middleName,
      gender: normalizeGender(validatedData.gender),
      dateOfBirth: parseDate(validatedData.dateOfBirth),
      nationality: validatedData.nationality,
      club: validatedData.club,
      fieId: validatedData.fieId,
      hand: normalizeHand(validatedData.hand),
      category: validatedData.category,
      weapons: validatedData.weapon ? (() => {
        const weapon = normalizeWeapon(validatedData.weapon);
        return weapon ? [weapon] : undefined;
      })() : undefined,
      ranking: validatedData.ranking,
      present: parsePresent(validatedData.present),
      relayTeamName: validatedData.relayTeamName,
    };

    return athlete;
  } catch (error) {
    throw new Error(`${context}: ${error instanceof Error ? error.message : 'Invalid data'}`);
  }
}

// Helper functions for data extraction and normalization
function getString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (record[key] && typeof record[key] === 'string' && record[key].toString().trim()) {
      return record[key].toString().trim();
    }
  }
  return undefined;
}

function getNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      const num = Number(record[key]);
      if (!isNaN(num)) {
        return num;
      }
    }
  }
  return undefined;
}

function normalizeGender(gender?: string): 'M' | 'F' | undefined {
  if (!gender) return undefined;
  const normalized = gender.toLowerCase();
  if (normalized === 'm' || normalized === 'male') return 'M';
  if (normalized === 'f' || normalized === 'female') return 'F';
  return undefined;
}

function normalizeHand(hand?: string): 'L' | 'R' | undefined {
  if (!hand) return undefined;
  const normalized = hand.toLowerCase();
  if (normalized === 'l' || normalized === 'left') return 'L';
  if (normalized === 'r' || normalized === 'right') return 'R';
  return undefined;
}

function normalizeWeapon(weapon?: string): 'EPEE' | 'FOIL' | 'SABRE' | undefined {
  if (!weapon) return undefined;
  const normalized = weapon.toUpperCase();
  if (['EPEE', 'ÉPÉE', 'EPÉE'].includes(normalized)) return 'EPEE';
  if (['FOIL', 'FLEURET'].includes(normalized)) return 'FOIL';
  if (['SABRE', 'SABER', 'SABRE'].includes(normalized)) return 'SABRE';
  return undefined;
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        continue;
      }
    }
  }
  
  return undefined;
}

function parsePresent(present?: string): boolean | undefined {
  if (!present) return undefined;
  const normalized = present.toLowerCase();
  if (['yes', 'true', '1', 'y', 'oui', 'sí'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n', 'non', 'no'].includes(normalized)) return false;
  return undefined;
} 