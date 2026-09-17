import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchGenerations = createAsyncThunk("generations/list", async () => {
  const { data } = await api.get("/generations");
  return data.data;
});

export const createGeneration = createAsyncThunk("generations/create", async ({ files, settings, roomId }, { rejectWithValue }) => {
  try {
    const form = new FormData();
    files.forEach((file) => form.append("photos", file));
    Object.entries({ ...settings, roomId: roomId || "" }).forEach(([key, value]) => form.append(key, value ?? ""));
    const { data } = await api.post("/generations", form);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message);
  }
});

const generationSlice = createSlice({
  name: "generations",
  initialState: { items: [], active: null, loading: false, error: null },
  reducers: {
    progressUpdated(state, action) {
      state.active = action.payload;
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index >= 0) state.items[index] = { ...state.items[index], ...action.payload };
      else state.items.unshift(action.payload);
    },
    generationCompleted(state, action) {
      state.active = action.payload;
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index >= 0) state.items[index] = { ...state.items[index], ...action.payload };
      else state.items.unshift(action.payload);
    },
    generationFailed: (state, action) => void (state.active = action.payload),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGenerations.fulfilled, (state, action) => void (state.items = action.payload))
      .addCase(createGeneration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGeneration.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload.data;
        state.items.unshift(action.payload.data);
      })
      .addCase(createGeneration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { progressUpdated, generationCompleted, generationFailed } = generationSlice.actions;
export default generationSlice.reducer;
