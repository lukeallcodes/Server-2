import { Router, Request, Response } from 'express';
import * as mongodb from 'mongodb';
import { collections } from '../database';
import { Client, ClientLocation, Zone, ZoneRecord } from '../interfaces/client';
import { Shifts, User } from '../interfaces/user';
import { Job, Step, Item } from '../interfaces/job';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
const clientRouter = Router();

// Function to initialize shifts for each day of the week
const initializeShifts = (): Shifts => {
  return {
    Monday: [{ startTime: '', endTime: '' }],
    Tuesday: [{ startTime: '', endTime: '' }],
    Wednesday: [{ startTime: '', endTime: '' }],
    Thursday: [{ startTime: '', endTime: '' }],
    Friday: [{ startTime: '', endTime: '' }],
    Saturday: [{ startTime: '', endTime: '' }],
    Sunday: [{ startTime: '', endTime: '' }],
  };
};

// Create a new client
clientRouter.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const { name, users, locations, jobs } = req.body;
    const newClient: Client = {
      _id: new mongodb.ObjectId(),
      name,
      users: users || [],
      locations: locations || [],
      jobs: jobs || [],
      items: [],
    };

    const result = await collections.clients?.insertOne(newClient);
    if (result?.acknowledged) {
      res.status(201).json({ message: 'Client created successfully', id: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to create client.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Read all clients
clientRouter.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const clients = await collections.clients?.find({}).toArray();
    res.status(200).json(clients);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Read a single client by ID
clientRouter.get('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = new mongodb.ObjectId(req.params.id);
    const client = await collections.clients?.findOne({ _id: id });

    if (client) {
      res.status(200).json(client);
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update a client by ID
clientRouter.put('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = new mongodb.ObjectId(req.params.id);
    const updatedClient: Partial<Client> = {
      name: req.body.name,
      users: req.body.users,
      locations: req.body.locations,
    };

    const result = await collections.clients?.updateOne({ _id: id }, { $set: updatedClient });
    
    if (result?.matchedCount) {
      res.status(200).json({ message: 'Client updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a client by ID
clientRouter.delete('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = new mongodb.ObjectId(req.params.id);
    const result = await collections.clients?.deleteOne({ _id: id });

    if (result?.deletedCount) {
      res.status(200).json({ message: 'Client deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Add a location to a client with QR code generation
clientRouter.post('/api/clients/:clientId/locations', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const { name, qrCodeEnabled } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Location name is required.' });
      return;
    }

    const locationId = new mongodb.ObjectId().toHexString();
    const qrCodeUrl = qrCodeEnabled ? await QRCode.toDataURL(locationId) : '';

    const location: ClientLocation = {
      _id: new mongodb.ObjectId(),
      name,
      qrCodeUrl,
      qrCodeEnabled,
      zones: [],
      records: [], // Initialize records as an empty array
    };

    const result = await collections.clients?.updateOne({ _id: clientId }, { $push: { locations: location } });

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Location added successfully.' });
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update a location of a client
clientRouter.put('/api/clients/:clientId/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const locationId = new mongodb.ObjectId(req.params.locationId);
    const { name, qrCodeEnabled } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Location name is required.' });
      return;
    }

    const qrCodeUrl = qrCodeEnabled ? await QRCode.toDataURL(locationId.toHexString()) : '';

    const result = await collections.clients?.updateOne(
      { _id: clientId, 'locations._id': locationId },
      { $set: { 'locations.$.name': name, 'locations.$.qrCodeEnabled': qrCodeEnabled, 'locations.$.qrCodeUrl': qrCodeUrl } }
    );

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Location updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Location not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a location from a client
clientRouter.delete('/api/clients/:clientId/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const locationId = new mongodb.ObjectId(req.params.locationId);

    const result = await collections.clients?.updateOne({ _id: clientId }, { $pull: { locations: { _id: locationId } } });

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Location deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Location not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Add a zone to a location with QR code generation
clientRouter.post('/api/clients/:clientId/locations/:locationId/zones', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const locationId = new mongodb.ObjectId(req.params.locationId);
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Zone name is required.' });
      return;
    }

    const zoneId = new mongodb.ObjectId().toHexString();
    const qrCodeUrl = await QRCode.toDataURL(zoneId);

    const zone: Zone = {
      _id: new mongodb.ObjectId(zoneId),
      name,
      qrCodeUrl,
      records: [], // Initialize records as an empty array
    };

    const result = await collections.clients?.updateOne(
      { _id: clientId, 'locations._id': locationId },
      { $push: { 'locations.$.zones': zone } }
    );

    if (result?.modifiedCount) {
      res.status(200).json(zone); // Return the newly created zone
    } else {
      res.status(404).json({ message: 'Client or Location not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update a zone of a location
clientRouter.put('/api/clients/:clientId/locations/:locationId/zones/:zoneId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const locationId = new mongodb.ObjectId(req.params.locationId);
    const zoneId = new mongodb.ObjectId(req.params.zoneId);
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Zone name is required.' });
      return;
    }

    const result = await collections.clients?.updateOne(
      { _id: clientId, 'locations._id': locationId },
      { $set: { 'locations.$[loc].zones.$[zone].name': name } },
      { arrayFilters: [{ 'loc._id': locationId }, { 'zone._id': zoneId }] }
    );

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Zone updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Location or Zone not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a zone from a location
clientRouter.delete('/api/clients/:clientId/locations/:locationId/zones/:zoneId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const locationId = new mongodb.ObjectId(req.params.locationId);
    const zoneId = new mongodb.ObjectId(req.params.zoneId);

    const result = await collections.clients?.updateOne(
      { _id: clientId, 'locations._id': locationId },
      { $pull: { 'locations.$.zones': { _id: zoneId } } }
    );

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Zone deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Location or Zone not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Add a record to a location
clientRouter.post('/api/clients/:clientId/locations/:locationId/records', async (req: Request, res: Response) => {
  try {
    const { clientId, locationId } = req.params;
    const { checkInTime, completed, jobs } = req.body;

    if (!checkInTime || !completed || !jobs) {
      return res.status(400).json({ message: 'checkInTime, completed, and jobs fields are required.' });
    }

    const newRecord: ZoneRecord = {
      _id: new mongodb.ObjectId(),
      checkInTime,
      checkOutTime: '',
      timeSpent: '',
      completed: completed.map((id: string) => new mongodb.ObjectId(id)),
      incomplete: [],
      jobs: jobs.map((job: any) => ({
        jobId: new mongodb.ObjectId(job.jobId),
        startTime: job.startTime,
        finishTime: job.finishTime,
        completedSteps: job.completedSteps.map((stepId: string) => new mongodb.ObjectId(stepId))
      }))
    };

    const result = await collections.clients?.updateOne(
      { _id: new mongodb.ObjectId(clientId), 'locations._id': new mongodb.ObjectId(locationId) },
      { $push: { 'locations.$.records': newRecord } }
    );

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Record added successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Location not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});



clientRouter.put('/api/clients/:clientId/locations/:locationId/records/:recordId', async (req: Request, res: Response) => {
  try {
    const { clientId, locationId, recordId } = req.params;
    const { checkInTime, checkOutTime, timeSpent, completed, incomplete, jobs } = req.body;

    const updatedRecord: Partial<ZoneRecord> = {
      checkInTime,
      checkOutTime,
      timeSpent,
      completed: completed ? completed.map((id: string) => new mongodb.ObjectId(id)) : undefined,
      incomplete: incomplete ? incomplete.map((id: string) => new mongodb.ObjectId(id)) : undefined,
      jobs: jobs ? jobs.map((job: any) => ({
        jobId: new mongodb.ObjectId(job.jobId),
        startTime: job.startTime,
        finishTime: job.finishTime,
        completedSteps: job.completedSteps.map((stepId: string) => new mongodb.ObjectId(stepId))
      })) : undefined
    };

    const result = await collections.clients?.updateOne(
      { _id: new mongodb.ObjectId(clientId), 'locations._id': new mongodb.ObjectId(locationId), 'locations.records._id': new mongodb.ObjectId(recordId) },
      { $set: { 'locations.$.records.$[record]': updatedRecord } },
      { arrayFilters: [{ 'record._id': new mongodb.ObjectId(recordId) }] }
    );

    if (result?.matchedCount) {
      res.status(200).json({ message: 'Record updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client, Location, or Record not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});



// Add a record to a zone
clientRouter.post('/api/clients/:clientId/locations/:locationId/zones/:zoneId/records', async (req: Request, res: Response) => {
  try {
    const { clientId, locationId, zoneId } = req.params;
    const { checkInTime, checkOutTime, timeSpent, completed, incomplete, jobs } = req.body;

    if (!checkInTime || !completed || !jobs) {
      return res.status(400).json({ message: 'checkInTime, completed, and jobs fields are required.' });
    }
    
    const newRecord: ZoneRecord = {
      _id: new mongodb.ObjectId(), // Ensure _id is generated
      checkInTime,
      checkOutTime: checkOutTime || '',
      timeSpent: timeSpent || '',
      completed: completed.map((id: string) => new mongodb.ObjectId(id)),
      incomplete: incomplete ? incomplete.map((id: string) => new mongodb.ObjectId(id)) : [],
      jobs: jobs.map((job: any) => ({
        jobId: new mongodb.ObjectId(job.jobId),
        startTime: job.startTime,
        finishTime: job.finishTime,
        completedSteps: job.completedSteps.map((stepId: string) => new mongodb.ObjectId(stepId))
      }))
    };

    const result = await collections.clients?.updateOne(
      {
        _id: new mongodb.ObjectId(clientId),
        'locations._id': new mongodb.ObjectId(locationId),
        'locations.zones._id': new mongodb.ObjectId(zoneId)
      },
      {
        $push: { 'locations.$[location].zones.$[zone].records': newRecord }
      },
      {
        arrayFilters: [
          { 'location._id': new mongodb.ObjectId(locationId) },
          { 'zone._id': new mongodb.ObjectId(zoneId) }
        ]
      }
    );

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Record added successfully.', record: newRecord });
    } else {
      res.status(404).json({ message: 'Client, Location, or Zone not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update a record of a zone
clientRouter.put('/api/clients/:clientId/locations/:locationId/zones/:zoneId/records/:recordId', async (req: Request, res: Response) => {
  try {
    const { clientId, locationId, zoneId, recordId } = req.params;
    const { checkInTime, checkOutTime, timeSpent, completed, incomplete, jobs } = req.body;
    
    const updatedRecord: Partial<ZoneRecord> = {
      _id: new mongodb.ObjectId(recordId),
      checkInTime,
      checkOutTime,
      timeSpent,
      completed: completed ? completed.map((id: string) => new mongodb.ObjectId(id)) : undefined,
      incomplete: incomplete ? incomplete.map((id: string) => new mongodb.ObjectId(id)) : undefined,
      jobs: jobs ? jobs.map((job: any) => ({
        jobId: new mongodb.ObjectId(job.jobId),
        startTime: job.startTime,
        finishTime: job.finishTime,
        completedSteps: job.completedSteps.map((stepId: string) => new mongodb.ObjectId(stepId))
      })) : undefined
    };

    const result = await collections.clients?.updateOne(
      {
        _id: new mongodb.ObjectId(clientId),
        'locations._id': new mongodb.ObjectId(locationId),
        'locations.zones._id': new mongodb.ObjectId(zoneId),
        'locations.zones.records._id': new mongodb.ObjectId(recordId)
      },
      {
        $set: {
          'locations.$[location].zones.$[zone].records.$[record]': updatedRecord
        }
      },
      {
        arrayFilters: [
          { 'location._id': new mongodb.ObjectId(locationId) },
          { 'zone._id': new mongodb.ObjectId(zoneId) },
          { 'record._id': new mongodb.ObjectId(recordId) }
        ]
      }
    );

    if (result?.matchedCount) {
      res.status(200).json({ message: 'Record updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client, Location, Zone, or Record not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// User CRUD operations

// Create a new user
clientRouter.post('/api/clients/:clientId/users', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const { firstname, lastname, email, password, role, shifts } = req.body;

    if (!firstname || !lastname || !email || !password || !role) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: User = {
      _id: new mongodb.ObjectId(),
      firstname,
      lastname,
      email,
      password: hashedPassword,
      role,
      shifts: shifts || initializeShifts(), // Initialize shifts if not provided
      clientid: clientId,
    };

    const result = await collections.clients?.updateOne({ _id: clientId }, { $push: { users: newUser } });

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'User added successfully.' });
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }

    const resulttwo = await collections.users?.insertOne(newUser);

  } catch (error: any) {
    console.error('Error adding user:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Update a user by ID in client collection
clientRouter.put('/api/clients/:clientId/users/:userId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const userId = new mongodb.ObjectId(req.params.userId);
    const { firstname, lastname, email, password, role, shifts } = req.body;

    // Check if the password is being updated
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Creating the updatedUser object excluding the _id field
    const updatedUser: Partial<User> = {
      firstname,
      lastname,
      email,
      role,
      shifts,
    };

    if (hashedPassword) {
      updatedUser.password = hashedPassword;
    }

    // Update user in clients collection
    const clientUpdateData: any = {
      'users.$.firstname': firstname,
      'users.$.lastname': lastname,
      'users.$.email': email,
      'users.$.role': role,
      'users.$.shifts': shifts,
    };

    if (hashedPassword) {
      clientUpdateData['users.$.password'] = hashedPassword;
    }

    const updateClientResult = await collections.clients?.updateOne(
      { _id: clientId, 'users._id': userId },
      { $set: clientUpdateData }
    );

    // Update user in users collection
    const userUpdateData: any = {
      firstname,
      lastname,
      email,
      role,
      shifts,
    };

    if (hashedPassword) {
      userUpdateData.password = hashedPassword;
    }

    const updateUserResult = await collections.users?.updateOne(
      { _id: userId },
      { $set: userUpdateData }
    );

    if (updateClientResult?.modifiedCount && updateUserResult?.modifiedCount) {
      res.status(200).json({ message: 'User updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client or User not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a user from a client
clientRouter.delete('/api/clients/:clientId/users/:userId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const userId = new mongodb.ObjectId(req.params.userId);

    const result = await collections.clients?.updateOne({ _id: clientId }, { $pull: { users: { _id: userId } } });
    const user = await collections.users?.findOne({ _id: userId});
    const resulttwo = await collections.users?.deleteOne({ _id: userId});

    if (result?.modifiedCount) {
      res.status(200).json({ message: 'User deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Client or User not found.' });
    }
  } catch (error: any) { 
    res.status(400).json({ message: error.message });
  }

});

// Add a job
clientRouter.post('/api/clients/:clientId/jobs', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const { title, location, zone, steps, educationlink, assigneduser } = req.body;

    if (!title || !location || !zone || !assigneduser) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    const assignedUserId = new mongodb.ObjectId(assigneduser);

    const newJob: Job = {
      _id: new mongodb.ObjectId(),
      title,
      steps: steps.map((step: Step) => ({
        ...step,
        _id: new mongodb.ObjectId(),
        itemstouse: step.itemstouse // send item IDs directly
      })),
      location,
      zone,
      educationlink,
      assigneduser: assignedUserId,
    };

    const jobResult = await collections.clients?.updateOne({ _id: clientId }, { $push: { jobs: newJob } });

    if (jobResult?.modifiedCount) {
      // Update the user object with the job ID
      const userResult = await collections.users?.updateOne(
        { _id: assignedUserId },
        { $push: { jobs: newJob._id } }
      );

      if (userResult?.modifiedCount) {
        res.status(200).json({ message: 'Job added and assigned to user successfully.', jobId: newJob._id });
      } else {
        res.status(404).json({ message: 'User not found.' });
      }
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    console.error('Error adding job:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Update a job
clientRouter.put('/api/clients/:clientId/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const jobId = new mongodb.ObjectId(req.params.jobId);
    const { title, location, zone, steps, educationlink, assigneduser } = req.body;

    if (!title || !location || !zone || !assigneduser) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    const updatedJob: Partial<Job> = {
      _id: jobId,
      title,
      steps: steps.map((step: Step) => ({
        ...step,
        _id: new mongodb.ObjectId(step._id),
        itemstouse: step.itemstouse // send item IDs directly
      })),
      location,
      zone,
      educationlink,
      assigneduser: new mongodb.ObjectId(assigneduser),
    };
    
    const result = await collections.clients?.updateOne({ _id: clientId, 'jobs._id': jobId }, { $set: { 'jobs.$': updatedJob } });

    if (result?.matchedCount) {
      res.status(200).json({ message: 'Job updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Job not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a job
clientRouter.delete('/api/clients/:clientId/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const jobId = new mongodb.ObjectId(req.params.jobId);

    // Find the job to get the assigned user ID
    const client = await collections.clients?.findOne(
      { _id: clientId, 'jobs._id': jobId },
      { projection: { 'jobs.$': 1 } }
    );

    if (!client || !client.jobs || client.jobs.length === 0) {
      res.status(404).json({ message: 'Client or Job not found.' });
      return;
    }

    const assignedUserId = client.jobs[0].assigneduser;

    // Remove the job from the client's job list
    const result = await collections.clients?.updateOne(
      { _id: clientId },
      { $pull: { jobs: { _id: jobId } } }
    );

    if (result?.modifiedCount) {
      // Remove the job ID from the user's jobs list
      res.status(200).json({ message: 'Job deleted successfully.' });

    } else {
      res.status(404).json({ message: 'Client or Job not found.' });
    }
  } catch (error: any) {
    console.error('Error deleting job:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Get all items for a specific client
clientRouter.get('/api/clients/:clientId/items', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const client = await collections.clients?.findOne({ _id: clientId });

    if (client && client.items) {
      res.status(200).json(client.items);
    } else {
      res.status(404).json({ message: 'Client or items not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new item
// Add a new item with Base64 image
clientRouter.post('/api/clients/:clientId/items', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const { name, sku, usecase, image, description } = req.body;

    const newItem: Item = {
      _id: new mongodb.ObjectId(),
      name,
      sku,
      usecase,
      image, // This is the Base64 image string
      description
    };

    const result = await collections.clients?.updateOne({ _id: clientId }, { $push: { items: newItem } });
    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Item added successfully.' });
    } else {
      res.status(404).json({ message: 'Client not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update item to handle Base64 image
clientRouter.put('/api/clients/:clientId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const itemId = new mongodb.ObjectId(req.params.itemId);
    const updatedItem = req.body;
    updatedItem._id = itemId;
    const result = await collections.clients?.updateOne({ _id: clientId, 'items._id': itemId }, { $set: { 'items.$': updatedItem } });
    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Item updated successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Item not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an item
clientRouter.delete('/api/clients/:clientId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const clientId = new mongodb.ObjectId(req.params.clientId);
    const itemId = new mongodb.ObjectId(req.params.itemId);
    const result = await collections.clients?.updateOne({ _id: clientId }, { $pull: { items: { _id: itemId } } });
    if (result?.modifiedCount) {
      res.status(200).json({ message: 'Item deleted successfully.' });
    } else {
      res.status(404).json({ message: 'Client or Item not found.' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default clientRouter;
