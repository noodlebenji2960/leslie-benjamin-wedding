// @/types/types.ts
export interface Guest {
  firstName: string;
  lastName: string;
  dietary: string;
  note?: string;
}

export interface RSVPFormData {
  email: string;
  attending: string;
  guests: Guest[];
  nonAttendingName?: string;
  notes?: string;
  website?: string;
  captchaAnswer?: string;
}
