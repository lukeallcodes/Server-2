import { Router, Request, Response } from 'express';
import * as mongodb from 'mongodb';
import { collections } from '../database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../interfaces/user';

const userRouter = Router();
const saltRounds = 10;
const jwtSecret = 'your_jwt_secret'; // Replace with your actual secret key

// Create a new user and assign to client
userRouter.post('/api/users', async (req: Request, res: Response) => {
    try {
        const { firstname, lastname, email, password, role, shifts, clientid } = req.body;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser: User = {
            _id: new mongodb.ObjectId(),
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role,
            shifts,
            clientid,
        };

        const result = await collections.users?.insertOne(newUser);
        if (result?.acknowledged) {
            res.status(201).json(newUser); // Return the created user
            console.log("Added");
        } else {
            res.status(500).json({ message: 'Failed to create user.' });
            console.log("Failed");
        }
    } catch (error: any) {
        console.log("error");
        res.status(400).json({ message: error.message });
    }
});


// Read all users
userRouter.get('/api/users', async (req: Request, res: Response) => {
    try {
        const users = await collections.users?.find({}).toArray();
        res.status(200).json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Read a single user by ID
userRouter.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
        const id = new mongodb.ObjectId(req.params.id);
        const user = await collections.users?.findOne({ _id: id });

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Update a user by ID
// Update a user by ID in user collection
userRouter.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const id = new mongodb.ObjectId(req.params.id);
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
        { _id: id },
        { $set: userUpdateData }
      );
  
      if (updateUserResult?.matchedCount) {
        res.status(200).json({ message: 'User updated successfully.' });
      } else {
        res.status(404).json({ message: 'User not found.' });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  

// Delete a user by ID
// Delete a user by ID and unassign from client
userRouter.delete('/api/users/:id', async (req: Request, res: Response) => {
    try {
        const id = new mongodb.ObjectId(req.params.id);
        const user = await collections.users?.findOne({ _id: id });

        if (user) {
            const result = await collections.users?.deleteOne({ _id: id });

            if (result?.deletedCount) {
                const client = await collections.clients?.updateOne(
                    { _id: new mongodb.ObjectId(user.clientid) },
                    { $pull: { users: { _id: id } } }
                );
                res.status(200).json({ message: 'User deleted and unassigned from client successfully.' });
            } else {
                res.status(404).json({ message: 'User not found.' });
            }
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// server.js (or wherever your backend routes are defined)
userRouter.post('/api/users/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await collections.users?.findOne({ email });
        
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { _id: user._id, role: user.role },
                jwtSecret,
                { expiresIn: '1h' }
            );
            res.status(200).json({ token, role: user.role, userId: user._id, });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});


export default userRouter;
