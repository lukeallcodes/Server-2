import * as mongodb from "mongodb";
import { Client } from "./interfaces/client";
import { User } from "./interfaces/user";

export const collections: {
    users?: mongodb.Collection<User>;
    clients?: mongodb.Collection<Client>;
} = {};

export async function connectToDatabase(uri: string) {
    const client = new mongodb.MongoClient(uri);
    await client.connect();

    const db = client.db("Newest");
    await applySchemaValidation(db);

    collections.users = db.collection<User>("Users");
    collections.clients = db.collection<Client>("clients");
}
// Update our existing collection with JSON schema validation so we know our documents will always match the shape of our User model, even if added elsewhere.
// For more information about schema validation, see this blog series: https://www.mongodb.com/blog/post/json-schema-validation--locking-down-your-model-the-smart-way
async function applySchemaValidation(db: mongodb.Db) {
    const jsonSchema = {
        $jsonSchema: {
            bsonType: "object",
            required: ["firstname", "lastname", "email", "password", "role", "shifts"],
            additionalProperties: false,
            properties: {
                _id: {},
                firstname: {
                    bsonType: "string",
                    description: "'firstname' is required and is a string",
                },
                lastname: {
                    bsonType: "string",
                    description: "'lastname' is required and is a string",
                },
                email: {
                    bsonType: "string",
                    description: "'email' is required and is a string",
                },
                password: {
                    bsonType: "string",
                    description: "'password' is required and is a string",
                },
                role: {
                    bsonType: "string",
                    description: "'role' is required and is one of 'employee', 'manager', or 'admin'",
                    enum: ["employee", "manager", "admin"],
                },
                shifts: {
                    bsonType: "object",
                    description: "'shifts' is required and is an object",
                    properties: {
                        Monday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Tuesday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Wednesday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Thursday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Friday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Saturday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                        Sunday: {
                            bsonType: "array",
                            items: {
                                bsonType: "object",
                                properties: {
                                    startTime: {
                                        bsonType: "string",
                                        description: "'startTime' is required and is a string",
                                    },
                                    endTime: {
                                        bsonType: "string",
                                        description: "'endTime' is required and is a string",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    // Try applying the modification to the collection, if the collection doesn't exist, create it
    await db.command({
        collMod: "users",
        validator: jsonSchema
    }).catch(async (error: mongodb.MongoServerError) => {
        if (error.codeName === "NamespaceNotFound") {
            await db.createCollection("users", {validator: jsonSchema});
        }
    });
}
