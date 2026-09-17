import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
import walletReducer from "../features/walletSlice";
import roomReducer from "../features/roomSlice";
import chatReducer from "../features/chatSlice";
import studioReducer from "../features/studioSlice";
import generationReducer from "../features/generationSlice";
import { socketMiddleware } from "./socketMiddleware";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wallet: walletReducer,
    rooms: roomReducer,
    chat: chatReducer,
    studio: studioReducer,
    generations: generationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActionPaths: ["meta.arg", "meta.ack"] } }).concat(socketMiddleware),
});
