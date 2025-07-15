export interface ClubOrganization {
  organization: {
    id: string;
    name: string;
  };
  affiliationType: string;
  status: string;
}

export interface Club {
  id:string;
  name: string;
  shortName?: string;
  city?: string;
  country: string;
  imageUrl?: string;
  organizations: ClubOrganization[];
  _count: {
    athletes: number;
  };
  createdBy?: {
    id: string;
    name: string;
  };
} 