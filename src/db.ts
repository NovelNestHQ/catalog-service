import { Collection, Document, MongoClient } from "mongodb";
import dotenv from "dotenv";
import { BookEvent } from "./types";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not set!");
}

const client = new MongoClient(MONGODB_URI);

export const connectDB = async () => {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
};

export const processBookEvent = async (
  booksCollection: Collection<Document>,
  event: BookEvent
) => {
  try {
    if (event.eventType === "BOOK_CREATED") {
      await booksCollection.insertOne(event.data);
      console.log("✅ Inserted into MongoDB:", event.data);
    } else if (event.eventType === "BOOK_UPDATED") {
      const { book_id, ...updateData } = event.data;
      await booksCollection.updateOne({ book_id }, { $set: updateData });
      console.log("🔄 Updated MongoDB entry:", updateData);
    } else if (event.eventType === "BOOK_DELETED") {
      await booksCollection.deleteOne({ book_id: event.data.book_id });
      console.log("🗑️ Deleted from MongoDB:", event.data.book_id);
    } else {
      console.warn("⚠️ Unknown event type:", event.eventType);
    }
  } catch (error) {
    console.error("❌ Error processing book event:", error);
  }
};
