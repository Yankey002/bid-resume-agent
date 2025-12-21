export interface Candidate {
  id: string; // UUID
  unique_id: string; // 6-digit unique ID
  name: string;
  created_at: string;
  updated_at: string;
  resumes_count?: number;
}

export interface RawResume {
  id: string; // UUID
  original_filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  storage_path: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  candidate_name?: string | null;
  candidate_id?: string | null; // UUID linking to Candidate table
}

export interface CandidateSearchParams {
  name?: string;
  limit?: number;
}
