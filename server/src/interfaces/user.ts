import * as mongodb from "mongodb";
import { Job } from "./job";
export interface Shift {
    startTime: string; // Example: "09:00"
    endTime: string; // Example: "17:00"
}

export interface Shifts {
    [key: string]: Shift[]; // Allow indexing by string keys
}


export interface User {
    firstname: string;
    lastname: string;
    email: string;
    password: string; // This will store the hashed password
    role: "employee" | "manager" | "admin";
    shifts: Shifts;
    clientid: mongodb.ObjectId;
    jobs?: mongodb.ObjectId[];
    _id?: mongodb.ObjectId;
}
