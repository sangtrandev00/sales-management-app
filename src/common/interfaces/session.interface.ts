export interface Session {
  id: string;
  userId: number;
  email: string;
  createdAt: Date;
  lastActivity: Date;
  data?: Record<string, any>; // For storing additional session data
}
