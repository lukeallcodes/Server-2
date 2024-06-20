import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectToDatabase } from "./database";
import userRouter from "./routes/user.routes";
import clientRouter from "./routes/client.routes";

// Load environment variables from the .env file, where the ATLAS_URI is configured
dotenv.config();

const { ATLAS_URI } = process.env;

if (!ATLAS_URI) {
  console.error(
    "No ATLAS_URI environment variable has been defined in config.env"
  );
  process.exit(1);
}

connectToDatabase(ATLAS_URI)
  .then(() => {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json({ limit: '50mb' })); // Adjust the limit as needed
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(userRouter); // Note: removed '/api/users' here, already included in routes
    app.use(clientRouter);
    // start the Express server
    app.listen(5200, () => {
      console.log(`Server running at http://localhost:5200...`);
    });
  })
  .catch((error) => console.error(error));
