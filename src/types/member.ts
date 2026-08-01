export interface Member {
  uuid: string;
  roleIDs: number[];
  action:
    | "TYPING"
    | "RECORDING_VOICE"
    | "RECORDING_VIDEO"
    | "UPLOADING_FILE"
    | null;
  joinedAt: Date;
}
