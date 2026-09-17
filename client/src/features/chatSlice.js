import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchMessages = createAsyncThunk("chat/list", async (roomId) => {
  const { data } = await api.get(`/rooms/${roomId}/messages`);
  return data.data;
});

const chatSlice = createSlice({
  name: "chat",
  initialState: { messages: [], typing: [], assistantTyping: false },
  reducers: {
    messageReceived(state, action) {
      if (!state.messages.some((message) => message.id === action.payload.id)) state.messages.push(action.payload);
    },
    typingUpdated(state, action) {
      state.typing = action.payload.active
        ? [...state.typing.filter((item) => item.userId !== action.payload.userId), action.payload]
        : state.typing.filter((item) => item.userId !== action.payload.userId);
    },
    assistantTypingUpdated: (state, action) => void (state.assistantTyping = action.payload.active),
    clearChat: (state) => void (state.messages = []),
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      const realtimeMessages = state.messages.filter((message) => !action.payload.some((saved) => saved.id === message.id));
      state.messages = [...action.payload, ...realtimeMessages];
    });
  },
});

export const { messageReceived, typingUpdated, assistantTypingUpdated, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
