import * as http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as querystring from "node:querystring";

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "../db/users.json");

type TUser = {
  id: string;
  name: string;
  age: number;
};

// Asynchronously load users data
const loadUsers = async (): Promise<TUser[] | null> => {
  try {
    const data = await readFile(DB_PATH, "utf-8");
    return JSON.parse(data) as TUser[];
  } catch (err) {
    console.error(`Failed to load users from file: ${(err as Error).message}`);
    return null;
  }
};

// Helper function to send responses
const sendResponse = (
  res: http.ServerResponse,
  statusCode: number,
  data: any,
  contentType = "application/json",
) => {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(contentType === "application/json" ? JSON.stringify(data) : data);
};

// Helper function for internal server error
const internalServerError = (res: http.ServerResponse, message: string) => {
  console.error(message);
  sendResponse(res, 500, { message: "Internal Server Error" });
};

// Helper function to filter users based on query parameters
const filterUsers = (
  users: TUser[],
  searchParams: URLSearchParams,
): TUser[] => {
  let filteredUsers = users;

  if (searchParams.get("name")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.name === searchParams.get("name"),
    );
  }
  if (searchParams.get("minAge")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.age >= Number(searchParams.get("minAge")),
    );
  }
  if (searchParams.get("maxAge")) {
    filteredUsers = filteredUsers.filter(
      (user) => user.age <= Number(searchParams.get("maxAge")),
    );
  }

  return filteredUsers;
};

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;
  const { pathname, searchParams } = new URL(
    url as string,
    `http://${headers.host}`,
  );

  console.log(`${method} ${pathname} - ${new Date().toISOString()}`);

  // Serve the home page
  if (method === "GET" && pathname === "/") {
    try {
      const homePage = await readFile(
        path.join(__dirname, "home.html"),
        "utf-8",
      );
      sendResponse(res, 200, homePage, "text/html");
    } catch (err) {
      internalServerError(
        res,
        `Error reading home.html: ${(err as Error).message}`,
      );
    }
  }
  // Handle filtering or serving the form for `/users`
  else if (method === "GET" && pathname === "/users") {
    let users = await loadUsers();

    if (!users) return internalServerError(res, "Failed to load users.");

    // If there are query parameters, filter users
    if (Array.from(searchParams.entries()).length) {
      users = filterUsers(users, searchParams);
      sendResponse(res, 200, users);
    } else {
      // Otherwise, serve the form
      try {
        const form = await readFile(path.join(__dirname, "form.html"), "utf-8");
        sendResponse(res, 200, form, "text/html");
      } catch (err) {
        internalServerError(
          res,
          `Error reading form.html: ${(err as Error).message}`,
        );
      }
    }
  }
  // Get a specific user by ID
  else if (method === "GET" && pathname.startsWith("/users/")) {
    const userId = pathname.split("/")[2];
    const users = await loadUsers();
    if (!users) return internalServerError(res, "Failed to load users.");
    const user = users.find((user) => user.id === userId);

    if (user) {
      sendResponse(res, 200, user);
    } else {
      sendResponse(res, 404, { message: "User not found" });
    }
  }
  // Handle creating a new user via POST
  else if (method === "POST" && pathname === "/users") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const contentType = req.headers["content-type"];

        let parsedData: any;
        if (contentType === "application/json") {
          parsedData = JSON.parse(body);
        } else if (contentType === "application/x-www-form-urlencoded") {
          parsedData = querystring.parse(body);
        } else {
          sendResponse(res, 400, { message: "Unsupported Content-Type" });
          return;
        }

        // Validate the user data
        const { name, age } = parsedData;
        if (
          typeof name !== "string" ||
          !Number.isInteger(Number(age)) ||
          Object.keys(parsedData).length !== 2
        ) {
          sendResponse(res, 400, { message: "Invalid user data" });
          return;
        }

        const parsedAge = Number(age);

        const users = await loadUsers();
        if (!users) return internalServerError(res, "Failed to load users.");

        // Generate a new ID
        const newId = String(Number(users[users.length - 1]?.id || 0) + 1);

        const newUser: TUser = {
          id: newId,
          name: name.trim(),
          age: parsedAge,
        };

        // Check if the user already exists
        if (
          users.some(
            (user) => user.name === newUser.name && user.age === newUser.age,
          )
        ) {
          sendResponse(res, 400, { message: "User already exists" });
          return;
        }

        // Add new user to the list and save
        users.push(newUser);
        await writeFile(DB_PATH, JSON.stringify(users, null, 2));

        console.log(`User created: ${JSON.stringify(newUser)}`);

        // Respond with the new user data
        sendResponse(res, 201, newUser);
      } catch (err) {
        internalServerError(
          res,
          `Error processing user creation: ${(err as Error).message}`,
        );
      }
    });
  } else {
    sendResponse(res, 404, { message: "Route not found" });
  }
});

// Ensure the server only starts if the users data can be loaded
loadUsers().then((users) => {
  if (users) {
    server.listen(3000, "127.0.0.1", () => {
      console.log("Server is running at http://127.0.0.1:3000");
    });
  } else {
    console.error("Failed to load users. Server startup aborted.");
  }
});
