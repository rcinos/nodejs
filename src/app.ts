import * as http from "node:http";
import { router } from "./routes/userRoutes";
import { logger } from "./utils/logger";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  logger.info(`${req.method} ${req.url}`);
  router(req, res);
});

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
