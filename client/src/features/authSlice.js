import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";

const storedToken = localStorage.getItem("access_token");

const request = async (path, payload, rejectWithValue) => {
  try {
    const { data } = await api.post(path, payload);
    localStorage.setItem("access_token", data.access_token);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message);
  }
};

export const login = createAsyncThunk("auth/login", ({ email, password }, { rejectWithValue }) =>
  request("/auth/login", { email, password }, rejectWithValue),
);
export const register = createAsyncThunk("auth/register", (payload, { rejectWithValue }) =>
  request("/auth/register", payload, rejectWithValue),
);
export const googleLogin = createAsyncThunk("auth/google", (credential, { rejectWithValue }) =>
  request("/auth/google", { credential }, rejectWithValue),
);
export const fetchMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/users/me");
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message);
  }
});
export const updateProfile = createAsyncThunk("auth/updateProfile", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.patch("/users/me", payload);
    return data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    authenticated: Boolean(storedToken),
    loading: false,
    initialized: !storedToken,
    error: null,
  },
  reducers: {
    logout(state) {
      localStorage.removeItem("access_token");
      state.user = null;
      state.authenticated = false;
      state.initialized = true;
    },
    authInitialized(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.authenticated = true;
        state.initialized = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.authenticated = false;
        state.initialized = true;
        localStorage.removeItem("access_token");
      })
      .addCase(updateProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateProfile.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(updateProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addMatcher(
        (action) => [login.pending.type, register.pending.type, googleLogin.pending.type].includes(action.type),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => [login.fulfilled.type, register.fulfilled.type, googleLogin.fulfilled.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.authenticated = true;
          state.initialized = true;
          state.user = action.payload.user;
        },
      )
      .addMatcher(
        (action) => [login.rejected.type, register.rejected.type, googleLogin.rejected.type].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export const { authInitialized, logout } = authSlice.actions;
export default authSlice.reducer;
