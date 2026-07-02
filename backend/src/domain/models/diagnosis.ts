export interface Diagnosis {
  description: string;
  rootCause?: string;
  observations?: string;
  startedAt?: Date;
  finishedAt?: Date;
}
