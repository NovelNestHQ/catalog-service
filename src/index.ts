import express from "express";
import cors from "cors";
import session from "express-session";
import flash from "connect-flash";
import { MongoClient } from "mongodb";
import amqp from "amqplib";
import dotenv from "dotenv";
import { connectDB, processBookEvent } from "./db";
import { BookData, BookEvent } from "./types";
import verifyToken from "./middleware";

dotenv.config();
const app = express();

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: "*", // Allow all origins
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
};

app.use(cors(corsOptions));
app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data
// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Connect flash
app.use(flash());
// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not set!");
}
const client = new MongoClient(MONGODB_URI);
const db = client.db();
const booksCollection = db.collection("books");

// Health check route
app.get("/", (req, res) => {
  res.send("NovelNest Catalog Service is running!");
});

app.get("/api/books", async (req, res) => {
  const { user_id } = req.query;
  // If a user_id is specified, require token authentication using the middleware
  if (user_id) {
    return verifyToken(req, res, async () => {
      // Check if the user in the token matches the user_id query
      if (!req.user || req.user.userId !== user_id) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Access to this user's books is not allowed",
        });
      }

      try {
        // Fetch books for the specific user
        const books: BookData[] = await booksCollection
          .find({ user_id: user_id })
          .project({
            book_id: 1,
            title: 1,
            author: 1,
            genre: 1,
          })
          .toArray();
        console.log("✅ Successfully fetched books for user");
        return res.status(200).json({
          success: true,
          data: books.map((book) => ({
            _id: book.book_id,
            title: book.title,
            author: book.author?.name,
            genre: book.genre?.name,
          })),
        });
      } catch (error) {
        console.error(`❌ Fetch User Books Error: ${error}`);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch books. Please try again later.",
        });
      }
    });
  }

  // Public access to fetch all books if no user_id is provided
  try {
    const books = await booksCollection
      .find({})
      .project({
        book_id: 1,
        title: 1,
        author: 1,
        genre: 1,
      })
      .toArray();
    console.log("✅ Successfully fetched all books");
    res.status(200).json({
      success: true,
      data: books.map((book) => ({
        _id: book.book_id,
        title: book.title,
        author: book.author?.name,
        genre: book.genre?.name,
      })),
    });
  } catch (error) {
    console.error(`❌ Fetch All Books Error: ${error}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch books. Please try again later.",
    });
  }
});

// Route: GET /api/books/search (Public - Search and filter books)
app.get("/api/books/search", async (req, res) => {
  const { title, author, genre, page = 1, limit = 4 } = req.query;

  const query: any = {}; // Initialize an empty query object

  if (title) {
    query.title = { $regex: `^${title}`, $options: "i" }; // Case-insensitive partial match
  }
  if (author) {
    query["author.name"] = { $regex: `^${author}`, $options: "i" }; // Case-insensitive partial match
  }
  if (genre) {
    const genres = Array.isArray(genre) ? genre : [genre];
    query["genre.name"] = { $in: genres.map((g) => new RegExp(`^${g}`, "i")) }; // Case-insensitive match for multiple genres
  }

  try {
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const totalResults = await booksCollection.countDocuments(query);
    const totalPages = Math.ceil(totalResults / limitNum);

    const books = await booksCollection
      .find(query)
      .project({
        book_id: 1,
        title: 1,
        author: 1,
        genre: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .toArray();
    console.log("✅ Successfully fetched books with search criteria");
    res.status(200).json({
      success: true,
      data: {
        books: books.map((book) => ({
          _id: book.book_id,
          title: book.title,
          author: book.author?.name,
          genre: book.genre?.name,
        })),
        pageInfo: {
          totalResults,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error(`❌ Search Error: ${error}`);
    res.status(500).json({
      success: false,
      message: "Failed to search books. Please try again later.",
    });
  }
});

// Function to consume messages
const QUEUE_NAME = process.env.QUEUE_NAME || "messages";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
async function consumeMessages() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(
      `✅ Catalog-Service Consumer is listening on queue: ${QUEUE_NAME}`
    );

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const event: BookEvent = JSON.parse(msg.content.toString());
          console.log(`📥 Received event:`, event);
          await processBookEvent(booksCollection, event);
          channel.ack(msg);
        } catch (error) {
          console.error("❌ Message Processing Error:", error);
          channel.nack(msg, false, true); // Requeue the message
        }
      }
    });
  } catch (error) {
    console.error("❌ RabbitMQ Connection Error:", error);
    setTimeout(consumeMessages, 5000); // Retry after 5s
  }
}
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🚀 API running at http://localhost:${PORT}/messages`);
  await connectDB();
});

// Start consuming messages
consumeMessages();
