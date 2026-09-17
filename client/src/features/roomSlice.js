import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

const reject = (error, rejectWithValue) => rejectWithValue(error.response?.data?.message || error.message);

export const fetchRooms = createAsyncThunk("rooms/list", async (_, { rejectWithValue }) => {
  try {
    return (await api.get("/rooms")).data.data;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});
export const createRoom = createAsyncThunk("rooms/create", async (payload, { rejectWithValue }) => {
  try {
    return (await api.post("/rooms", payload)).data.data;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});
export const joinRoom = createAsyncThunk("rooms/join", async (code, { rejectWithValue }) => {
  try {
    return (await api.post("/rooms/join", { code })).data.data;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});
export const fetchRoom = createAsyncThunk("rooms/detail", async (roomId, { rejectWithValue }) => {
  try {
    return (await api.get(`/rooms/${roomId}`)).data.data;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});

const roomSlice = createSlice({
  name: "rooms",
  initialState: { items: [], current: null, cameraStates: {}, loading: false, error: null },
  reducers: {
    participantOnline(state, action) {
      if (!state.current) return;
      const member = state.current.memberships?.find((item) => item.userId === action.payload.id);
      if (member) member.online = true;
    },
    assetAdded(state, action) {
      if (state.current && !state.current.assets?.some((asset) => asset.id === action.payload.id)) {
        state.current.assets = [...(state.current.assets || []), action.payload];
      }
    },
    assetRemoved(state, action) {
      if (state.current) state.current.assets = (state.current.assets || []).filter((asset) => asset.id !== action.payload.id);
    },
    cameraStateChanged(state, action) {
      const { roomId, userId, active } = action.payload;
      const key = `${roomId}:${userId}`;
      if (active) state.cameraStates[key] = action.payload;
      else delete state.cameraStates[key];
    },
    roomExpired(state, action) {
      if (state.current?.id === Number(action.payload.roomId)) state.current.status = "closed";
      const room = state.items.find((item) => item.id === Number(action.payload.roomId));
      if (room) room.status = "closed";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRoom.pending, (state) => {
        state.current = null;
      })
      .addCase(fetchRoom.rejected, (state) => {
        state.current = null;
      })
      .addMatcher(
        (action) => [fetchRooms.pending.type, createRoom.pending.type, joinRoom.pending.type, fetchRoom.pending.type].includes(action.type),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => [createRoom.fulfilled.type, joinRoom.fulfilled.type, fetchRoom.fulfilled.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.current = action.payload;
          if (!state.items.some((room) => room.id === action.payload.id)) state.items.unshift(action.payload);
        },
      )
      .addMatcher(
        (action) => [fetchRooms.rejected.type, createRoom.rejected.type, joinRoom.rejected.type, fetchRoom.rejected.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export const { participantOnline, assetAdded, assetRemoved, cameraStateChanged, roomExpired } = roomSlice.actions;
export default roomSlice.reducer;
