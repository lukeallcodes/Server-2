// job.ts
import * as mongodb from 'mongodb';
import { ClientLocation, Zone } from './client';

export interface Item {
  _id: mongodb.ObjectId;
  name: string;
  sku: string;
  usecase: string;
  image: string;
  description: string;
}

export interface Step {
  _id: mongodb.ObjectId;
  title: string;
  step: string;
  scopeofwork: string;
  image: string;
  video: string;
  itemstouse: String[];
  completed?: boolean; // New property to track completion status
}

export interface Job {
  _id: mongodb.ObjectId;
  title: string;
  steps: Step[];
  location: ClientLocation; // Use ClientLocation type
  zone: Zone; // Use Zone type
  educationlink: string;
  assigneduser: mongodb.ObjectId;
}
