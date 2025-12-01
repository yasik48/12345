
export interface PersonIncome {
  name: string;
  income: number;
  dob?: string;
}

export interface AnalyzedPerson {
  name: string;
  org: string;
  inn: string;
  dob?: string;
  comment?: string;
  images?: string[];
  analysisStatus?: 'found' | 'not_found' | 'other' | 'error' | 'pending';
}

export interface PersonAnalysisRegion {
  personName: string;
  analysisSummary: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
