import * as mongodb from "mongodb";
import { User } from "./user";
import { Item, Job } from "./job";

export interface Zone {
  _id: mongodb.ObjectId;
  name: string;
  qrCodeUrl: string;
  records: ZoneRecord[];
}

export interface ZoneRecord {
  _id: mongodb.ObjectId;
  checkInTime: string;
  checkOutTime: string;
  timeSpent: string;
  completed: mongodb.ObjectId[];
  incomplete: mongodb.ObjectId[];
  jobs: JobRecord[];
}

export interface JobRecord {
  jobId: mongodb.ObjectId;
  startTime: string;
  finishTime: string;
  completedSteps: mongodb.ObjectId[];
}

export interface ClientLocation {
  _id: mongodb.ObjectId;
  name: string;
  qrCodeUrl: string;
  qrCodeEnabled: boolean;
  zones: Zone[];
  records: ZoneRecord[];
}

export interface Client {
  _id: mongodb.ObjectId;
  name: string;
  users: User[];
  locations: ClientLocation[];
  jobs: Job[];
  items: Item[];
}
