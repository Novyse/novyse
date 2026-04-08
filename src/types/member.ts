export interface Member {
  uuid: string;
  role: string;
  action:
    | "WRITING"
    | "RECORDING_VOICE"
    | "RECORDING_VIDEO"
    | "UPLOADING_FILE"
    | null;
  joinedAt: Date;
}
