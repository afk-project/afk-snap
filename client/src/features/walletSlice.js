import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../services/api";
import { googleLogin, login, register } from "./authSlice";

export const fetchBalance = createAsyncThunk("wallet/balance", async () => {
  const { data } = await api.get("/credits/balance");
  return data.balance;
});

export const fetchTransactions = createAsyncThunk("wallet/transactions", async () => {
  const { data } = await api.get("/credits/transactions");
  return data.data;
});

const walletSlice = createSlice({
  name: "wallet",
  initialState: { balance: 0, transactions: [], loading: false },
  reducers: { setBalance: (state, action) => void (state.balance = action.payload) },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.fulfilled, (state, action) => void (state.balance = action.payload))
      .addCase(fetchTransactions.pending, (state) => void (state.loading = true))
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addMatcher(
        (action) => [login.fulfilled.type, register.fulfilled.type, googleLogin.fulfilled.type].includes(action.type),
        (state, action) => void (state.balance = action.payload.credit),
      );
  },
});

export const { setBalance } = walletSlice.actions;
export default walletSlice.reducer;
