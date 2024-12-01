import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
dotenv.config();

const app = express();
app.use(express.json()); // Middleware for JSON parsing

// MongoDB connection
app.use(
  cors({
    origin: [process.env.ORIGIN],
    credentials: true,
  })
);
mongoose
  .connect(process.env.MONGO_URI, {
 
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Chat Schema and Model
const ChatSchema = new mongoose.Schema(
  {
    userMessage: { type: String, required: true },
    botResponse: { type: String, required: true },
    email: { type: String, required: true }, // Email to identify user-specific chats
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", ChatSchema);

// Google Generative AI setup
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Endpoint to handle chatbot interactions
app.post("/ask", async (req, res) => {
  const { message: userMessage, email } = req.body;

  if (!userMessage || !email) {
    return res.status(400).json({ error: "Message and email are required." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(userMessage);
    const botResponse = result.response.text();

    // Save chat in the database with email
    const newChat = new Chat({ userMessage, botResponse, email });
    await newChat.save();

 
    // Respond with AI response
    res.status(200).json({ response: botResponse });
  } catch (error) {
    console.error("Error during AI generation:", error.message);
    res.status(500).json({ error: "Failed to generate a response.", details: error.message });
  }
});

// Endpoint to fetch chat history for a specific user
app.post("/chat-history", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const chats = await Chat.find({ email }).sort({ createdAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chat history:", error.message);
    res.status(500).json({ error: "Failed to fetch chat history.", details: error.message });
  }
});

// Server port setup
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
